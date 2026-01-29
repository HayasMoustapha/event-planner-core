/**
 * Controller pour la validation de scan de billets
 * Gère les endpoints HTTP pour la validation en temps réel des billets scannés
 * 
 * Principes :
 * - Validation des permissions utilisateur (scan_ticket)
 * - Communication synchrone avec scan-validation-service
 * - Délai de réponse < 2s garanti
 * - Mise à jour immédiate du statut du ticket
 * - Logs structurés pour audit
 */

const axios = require('axios');

// Configuration du service de validation
const SCAN_VALIDATION_SERVICE_URL = process.env.SCAN_VALIDATION_SERVICE_URL || 'http://localhost:3005';
const SCAN_TIMEOUT = parseInt(process.env.SCAN_TIMEOUT_MS) || 2000; // 2 secondes max

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
    
    console.log(`[SCAN_VALIDATION] Envoi requête validation pour ticket ${ticket_code}`);
    
    // Appel synchrone au service de validation
    const validationResponse = await callScanValidationService(validationPayload);
    
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
    
    // Gestion des erreurs spécifiques
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Timeout du service de validation',
        code: 'VALIDATION_TIMEOUT',
        processing_time_ms: processingTime
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Service de validation indisponible',
        code: 'VALIDATION_SERVICE_UNAVAILABLE',
        processing_time_ms: processingTime
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la validation du ticket',
      code: 'INTERNAL_VALIDATION_ERROR',
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
 * Appelle le service de validation de scan
 * @param {Object} payload - Données à valider
 * @returns {Promise<Object>} Résultat de la validation
 */
async function callScanValidationService(payload) {
  try {
    const response = await axios.post(
      `${SCAN_VALIDATION_SERVICE_URL}/api/validate`,
      payload,
      {
        timeout: SCAN_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'event-planner-core',
          'X-Request-ID': `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      }
    );
    
    return response.data.data || response.data;
    
  } catch (error) {
    console.error('[SCAN_VALIDATION] Erreur appel service validation:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout du service de validation');
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Service de validation indisponible');
    }
    
    if (error.response) {
      // Le service a répondu avec une erreur
      throw new Error(`Service validation error: ${error.response.data.error || error.response.statusText}`);
    }
    
    throw new Error('Erreur lors de l\'appel au service de validation');
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
