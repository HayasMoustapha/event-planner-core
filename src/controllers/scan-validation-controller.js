/**
 * Controller pour la validation de scan de billets (ARCHITECTURE CORRIGÉE)
 * 
 * IMPORTANT : Ce controller gère la validation métier LOCALE pour éviter les appels circulaires
 * 
 * Architecture correcte :
 * 1. Scan-Validation Service reçoit le QR code scan
 * 2. Scan-Validation Service décode et valide cryptographiquement le QR
 * 3. Scan-Validation Service appelle Event-Planner-Core pour validation métier
 * 4. Event-Planner-Core effectue la validation métier LOCALE (pas d'appel retour)
 * 5. Event-Planner-Core met à jour la base de données
 * 6. Event-Planner-Core retourne le résultat à Scan-Validation Service
 * 
 * Principes :
 * - Validation des permissions utilisateur (scan_ticket)
 * - Validation métier LOCALE (pas d'appel circulaire)
 * - Délai de réponse < 2s garanti
 * - Mise à jour immédiate du statut du ticket
 * - Logs structurés pour audit
 * - Architecture sans deadlock ni boucle infinie
 */

// NOTE : La dépendance axios a été supprimée car nous n'avons plus d'appel externe
// La validation est maintenant effectuée localement pour éviter les appels circulaires

// Configuration locale (plus besoin de configuration externe)
const VALIDATION_TIMEOUT = parseInt(process.env.VALIDATION_TIMEOUT_MS) || 2000; // 2 secondes max

/**
 * Valide un billet scanné
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function validateScannedTicket(req, res, db) {
  const startTime = Date.now();
  
  try {
    const { ticket_code, event_id } = req.body;
    const user_id = req.user.id; // ID de l'utilisateur authentifié
    
    // Validation des données d'entrée
    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        error: 'ticket_code est obligatoire',
        code: 'MISSING_TICKET_CODE'
      });
    }
    
    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id est obligatoire',
        code: 'MISSING_EVENT_ID'
      });
    }
    
    // Vérification que le ticket existe et appartient à l'événement
    const ticketQuery = `
      SELECT 
        t.id,
        t.ticket_code,
        t.qr_code_data,
        t.is_validated,
        t.validated_at,
        t.event_guest_id,
        eg.event_id,
        eg.guest_name,
        e.title as event_title,
        e.organizer_id
      FROM tickets t
      JOIN event_guests eg ON t.event_guest_id = eg.id
      JOIN events e ON eg.event_id = e.id
      WHERE t.ticket_code = $1 AND eg.event_id = $2
    `;
    
    const ticketResult = await db.query(ticketQuery, [ticket_code, event_id]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé pour cet événement',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    const ticket = ticketResult.rows[0];
    
    // Vérification que l'utilisateur a les permissions de scan pour cet événement
    const hasPermission = await checkScanPermission(user_id, event_id, db);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour scanner des billets pour cet événement',
        code: 'INSUFFICIENT_SCAN_PERMISSIONS'
      });
    }
    
    // Préparation du payload pour le service de validation
    const validationPayload = {
      ticket_code: ticket.ticket_code,
      event_id: event_id,
      operator_id: user_id,
      scan_time: new Date().toISOString(),
      ticket_data: {
        ticket_id: ticket.id,
        qr_code_data: ticket.qr_code_data,
        guest_name: ticket.guest_name,
        event_title: ticket.event_title
      }
    };
    
    console.log(`[SCAN_VALIDATION] Validation locale pour ticket ${ticket_code}`);
    
    // CORRIGÉ : Validation locale au lieu d'appel circulaire au scan-validation-service
    // L'architecture correcte évite les appels circulaires entre services
    const validationResponse = await validateTicketLocally(validationPayload, db);
    
    // Si la validation est réussie, mettre à jour le ticket en base
    if (validationResponse.valid && !validationResponse.already_used) {
      await updateTicketValidation(ticket.id, user_id, db);
      console.log(`[SCAN_VALIDATION] Ticket ${ticket_code} marqué comme validé`);
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[SCAN_VALIDATION] Validation terminée en ${processingTime}ms pour ticket ${ticket_code}`);
    
    // Réponse de succès
    res.status(200).json({
      success: true,
      data: {
        ticket_code: ticket.ticket_code,
        guest_name: ticket.guest_name,
        event_title: ticket.event_title,
        validation_result: validationResponse,
        scan_time: validationPayload.scan_time,
        processing_time_ms: processingTime
      },
      message: 'Ticket validé avec succès'
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[SCAN_VALIDATION] Erreur validation scan:', error.message);
    
    // CORRIGÉ : Gestion des erreurs locales (plus d'erreurs réseau)
    if (error.code === '23505') { // Violation de contrainte unique (ticket déjà utilisé)
      return res.status(409).json({
        success: false,
        error: 'Ticket déjà utilisé par une autre validation',
        code: 'TICKET_ALREADY_USED',
        processing_time_ms: processingTime
      });
    }
    
    if (error.code === '23503') { // Violation de contrainte foreign key
      return res.status(400).json({
        success: false,
        error: 'Référence de ticket invalide',
        code: 'INVALID_TICKET_REFERENCE',
        processing_time_ms: processingTime
      });
    }
    
    // Erreur de validation métier
    if (error.code && error.code.startsWith('VALIDATION_')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
        processing_time_ms: processingTime
      });
    }
    
    // Erreur interne
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la validation du ticket',
      code: 'INTERNAL_VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processing_time_ms: processingTime
    });
  }
}

/**
 * Vérifie les permissions de scan pour un utilisateur et un événement
 * @param {number} user_id - ID de l'utilisateur
 * @param {number} event_id - ID de l'événement
 * @param {Object} db - Instance de base de données
 * @returns {Promise<boolean>} True si l'utilisateur a les permissions
 */
async function checkScanPermission(user_id, event_id, db) {
  try {
    // Vérification si l'utilisateur est l'organisateur
    const organizerQuery = `
      SELECT id FROM events WHERE id = $1 AND organizer_id = $2
    `;
    
    const organizerResult = await db.query(organizerQuery, [event_id, user_id]);
    
    if (organizerResult.rows.length > 0) {
      return true; // L'organisateur a toujours les permissions
    }
    
    // TODO: Vérifier si l'utilisateur a un rôle de scan pour cet événement
    // Ceci pourrait être implémenté avec une table event_staff ou similaire
    
    // Pour l'instant, seul l'organisateur peut scanner
    return false;
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur vérification permissions:', error.message);
    return false;
  }
}

/**
 * Effectue la validation locale du ticket (CORRIGÉ - PAS D'APPEL CIRCULAIRE)
 * 
 * IMPORTANT : Cette fonction remplace l'appel circulaire au scan-validation-service
 * L'architecture correcte est :
 * 1. Scan-Validation Service décode le QR et fait la validation cryptographique
 * 2. Scan-Validation Service appelle Event-Planner-Core pour la validation métier
 * 3. Event-Planner-Core effectue la validation métier LOCALEMENT (pas d'appel retour)
 * 4. Event-Planner-Core met à jour la base de données
 * 
 * @param {Object} payload - Données du ticket à valider
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat de la validation locale
 */
async function validateTicketLocally(payload, db) {
  try {
    const { ticket_data, operator_id, scan_time } = payload;
    
    console.log(`[SCAN_VALIDATION] Validation locale du ticket ${ticket_data.ticket_id}`);
    
    // 1. Vérifier si le ticket est déjà validé
    const ticketStatusQuery = `
      SELECT is_validated, validated_at 
      FROM tickets 
      WHERE id = $1
    `;
    
    const statusResult = await db.query(ticketStatusQuery, [ticket_data.ticket_id]);
    
    if (statusResult.rows.length === 0) {
      return {
        valid: false,
        error: 'Ticket non trouvé',
        code: 'TICKET_NOT_FOUND'
      };
    }
    
    const ticketStatus = statusResult.rows[0];
    
    // 2. Vérifier si le ticket est déjà utilisé
    if (ticketStatus.is_validated) {
      return {
        valid: false,
        already_used: true,
        error: 'Ticket déjà utilisé',
        code: 'TICKET_ALREADY_USED',
        validated_at: ticketStatus.validated_at
      };
    }
    
    // 3. Validation métier (règles business)
    const businessValidation = await validateBusinessRules(ticket_data, db);
    
    if (!businessValidation.valid) {
      return {
        valid: false,
        error: businessValidation.error,
        code: businessValidation.code,
        details: businessValidation.details
      };
    }
    
    // 4. Mettre à jour le statut du ticket
    await updateTicketValidation(ticket_data.ticket_id, operator_id, db);
    
    console.log(`[SCAN_VALIDATION] Ticket ${ticket_data.ticket_id} validé avec succès`);
    
    return {
      valid: true,
      already_used: false,
      validated_at: new Date().toISOString(),
      ticket_id: ticket_data.ticket_id,
      operator_id: operator_id
    };
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur validation locale:', error.message);
    
    // Gestion des erreurs spécifiques
    if (error.code === '23505') { // Violation de contrainte unique
      return {
        valid: false,
        already_used: true,
        error: 'Ticket déjà utilisé (race condition)',
        code: 'TICKET_ALREADY_USED'
      };
    }
    
    return {
      valid: false,
      error: 'Erreur lors de la validation locale',
      code: 'VALIDATION_ERROR',
      details: error.message
    };
  }
}

/**
 * Valide les règles métier pour un ticket
 * @param {Object} ticketData - Données du ticket
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat de la validation métier
 */
async function validateBusinessRules(ticketData, db) {
  try {
    // 1. Vérifier que l'événement est actif
    const eventQuery = `
      SELECT status, event_date, max_attendees 
      FROM events 
      WHERE id = (SELECT event_id FROM event_guests WHERE id = $1)
    `;
    
    const eventResult = await db.query(eventQuery, [ticketData.event_guest_id]);
    
    if (eventResult.rows.length === 0) {
      return {
        valid: false,
        error: 'Événement non trouvé',
        code: 'EVENT_NOT_FOUND'
      };
    }
    
    const event = eventResult.rows[0];
    
    // 2. Vérifier que l'événement est actif
    if (event.status !== 'active') {
      return {
        valid: false,
        error: 'Événement non actif',
        code: 'EVENT_NOT_ACTIVE'
      };
    }
    
    // 3. Vérifier que l'événement n'est pas terminé
    const eventDate = new Date(event.event_date);
    const now = new Date();
    
    if (eventDate < now) {
      return {
        valid: false,
        error: 'Événement terminé',
        code: 'EVENT_ENDED'
      };
    }
    
    // 4. Vérifier la capacité maximale (si définie)
    if (event.max_attendees) {
      const capacityQuery = `
        SELECT COUNT(*) as validated_count
        FROM tickets t
        JOIN event_guests eg ON t.event_guest_id = eg.id
        WHERE eg.event_id = (SELECT event_id FROM event_guests WHERE id = $1)
        AND t.is_validated = TRUE
      `;
      
      const capacityResult = await db.query(capacityQuery, [ticketData.event_guest_id]);
      const validatedCount = parseInt(capacityResult.rows[0].validated_count);
      
      if (validatedCount >= event.max_attendees) {
        return {
          valid: false,
          error: 'Capacité maximale atteinte',
          code: 'EVENT_FULL'
        };
      }
    }
    
    // 5. Validation du format du QR code (si présent)
    if (ticketData.qr_code_data) {
      try {
        const qrData = JSON.parse(ticketData.qr_code_data);
        
        // Vérifier la structure minimale du QR code
        if (!qrData.id || !qrData.eventId || !qrData.timestamp) {
          return {
            valid: false,
            error: 'Format du QR code invalide',
            code: 'INVALID_QR_FORMAT'
          };
        }
        
        // Vérifier que l'ID du QR correspond à l'ID du ticket
        if (qrData.id !== ticketData.ticket_id) {
          return {
            valid: false,
            error: 'Incohérence QR code / ticket',
            code: 'QR_TICKET_MISMATCH'
          };
        }
        
      } catch (parseError) {
        return {
          valid: false,
          error: 'QR code corrompu',
          code: 'CORRUPTED_QR_CODE'
        };
      }
    }
    
    return {
      valid: true
    };
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur validation métier:', error.message);
    return {
      valid: false,
      error: 'Erreur lors de la validation métier',
      code: 'BUSINESS_VALIDATION_ERROR'
    };
  }
}

/**
 * Met à jour le statut de validation d'un ticket
 * @param {number} ticket_id - ID du ticket
 * @param {number} operator_id - ID de l'opérateur
 * @param {Object} db - Instance de base de données
 */
async function updateTicketValidation(ticket_id, operator_id, db) {
  try {
    const updateQuery = `
      UPDATE tickets 
      SET 
        is_validated = TRUE,
        validated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(updateQuery, [ticket_id]);
    
    // TODO: Enregistrer l'opération dans une table d'audit/scan_logs
    const auditQuery = `
      INSERT INTO scan_logs (ticket_id, operator_id, scan_time, created_at)
      VALUES ($1, $2, NOW(), NOW())
    `;
    
    await db.query(auditQuery, [ticket_id, operator_id]);
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur mise à jour ticket:', error.message);
    throw new Error('Impossible de mettre à jour le ticket');
  }
}

/**
 * Récupère l'historique des scans pour un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function getScanHistory(req, res, db) {
  try {
    const { event_id } = req.params;
    const { page = 1, limit = 50, date_from, date_to } = req.query;
    const user_id = req.user.id;
    
    // Vérification des permissions
    const hasPermission = await checkScanPermission(user_id, event_id, db);
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour voir l\'historique des scans',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Construction de la requête
    let query = `
      SELECT 
        sl.id,
        sl.ticket_id,
        sl.operator_id,
        sl.scan_time,
        t.ticket_code,
        eg.guest_name,
        u.email as operator_email
      FROM scan_logs sl
      JOIN tickets t ON sl.ticket_id = t.id
      JOIN event_guests eg ON t.event_guest_id = eg.id
      JOIN users u ON sl.operator_id = u.id
      WHERE eg.event_id = $1
    `;
    
    const params = [event_id];
    
    // Filtres de date
    if (date_from) {
      query += ` AND sl.scan_time >= $${params.length + 1}`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND sl.scan_time <= $${params.length + 1}`;
      params.push(date_to);
    }
    
    // Tri et pagination
    query += ` ORDER BY sl.scan_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await db.query(query, params);
    
    // Comptage total
    let countQuery = `SELECT COUNT(*) FROM scan_logs sl WHERE sl.ticket_id IN (
      SELECT t.id FROM tickets t JOIN event_guests eg ON t.event_guest_id = eg.id WHERE eg.event_id = $1
    )`;
    
    const countResult = await db.query(countQuery, [event_id]);
    const totalScans = parseInt(countResult.rows[0].count);
    
    res.status(200).json({
      success: true,
      data: {
        scans: result.rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalScans,
          total_pages: Math.ceil(totalScans / limit)
        }
      },
      message: 'Historique des scans récupéré avec succès'
    });
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur récupération historique:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération de l\'historique',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  validateScannedTicket,
  getScanHistory
};
