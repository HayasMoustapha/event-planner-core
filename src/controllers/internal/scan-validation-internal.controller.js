/**
 * Controller interne pour la validation de tickets (appelé par Scan-Validation Service)
 * 
 * IMPORTANT : Ce controller est utilisé UNIQUEMENT par Scan-Validation Service
 * Il effectue la validation métier LOCALE sans appeler en retour Scan-Validation Service
 * 
 * Architecture :
 * Scan-Validation Service -> Event-Planner-Core (ce controller) -> Base de données
 * PAS D'APPEL RETOUR à Scan-Validation Service
 */

/**
 * Valide un ticket via appel interne de Scan-Validation Service
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function validateTicketInternal(req, res, db) {
  const startTime = Date.now();
  
  try {
    const { ticketId, eventId, ticketType, userId, scanContext, validationMetadata } = req.body;
    
    console.log(`[INTERNAL_SCAN_VALIDATION] Validation ticket ${ticketId} pour événement ${eventId}`);
    
    // 1. Validation des données d'entrée
    if (!ticketId || !eventId) {
      return res.status(400).json({
        success: false,
        error: 'ticketId et eventId sont obligatoires',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // 2. Récupérer le ticket avec toutes les informations nécessaires
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
        e.status as event_status,
        e.event_date,
        e.max_attendees
      FROM tickets t
      JOIN event_guests eg ON t.event_guest_id = eg.id
      JOIN events e ON eg.event_id = e.id
      WHERE t.id = $1 AND eg.event_id = $2
    `;
    
    const ticketResult = await db.query(ticketQuery, [ticketId, eventId]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé pour cet événement',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    const ticket = ticketResult.rows[0];
    
    // 3. Vérifier si le ticket est déjà validé
    if (ticket.is_validated) {
      return res.status(409).json({
        success: false,
        error: 'Ticket déjà validé',
        code: 'TICKET_ALREADY_VALIDATED',
        validated_at: ticket.validated_at
      });
    }
    
    // 4. Validation métier complète
    const businessValidation = await validateTicketBusinessRules(ticket, scanContext, db);
    
    if (!businessValidation.success) {
      return res.status(400).json({
        success: false,
        error: businessValidation.error,
        code: businessValidation.code,
        details: businessValidation.details
      });
    }
    
    // 5. Mettre à jour le statut du ticket
    await updateTicketStatus(ticketId, scanContext, db);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`[INTERNAL_SCAN_VALIDATION] Ticket ${ticketId} validé en ${processingTime}ms`);
    
    // 6. Retourner le succès avec les informations complètes
    res.status(200).json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          ticket_code: ticket.ticket_code,
          guest_name: ticket.guest_name,
          status: 'VALIDATED'
        },
        event: {
          id: eventId,
          title: ticket.event_title,
          status: ticket.event_status
        },
        validation: {
          validated_at: new Date().toISOString(),
          operator_id: scanContext?.operatorId,
          location: scanContext?.location,
          device_id: scanContext?.deviceId
        },
        metadata: {
          processing_time_ms: processingTime,
          validation_metadata: validationMetadata
        }
      },
      message: 'Ticket validé avec succès'
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[INTERNAL_SCAN_VALIDATION] Erreur validation:', error.message);
    
    // Gestion des erreurs de base de données
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ticket déjà utilisé (race condition)',
        code: 'TICKET_ALREADY_USED',
        processing_time_ms: processingTime
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Référence invalide',
        code: 'INVALID_REFERENCE',
        processing_time_ms: processingTime
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la validation',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processing_time_ms: processingTime
    });
  }
}

/**
 * Valide les règles métier pour un ticket
 * @param {Object} ticket - Données du ticket
 * @param {Object} scanContext - Contexte du scan
 * @param {Object} db - Instance de base de données
 * @returns {Promise<Object>} Résultat de la validation
 */
async function validateTicketBusinessRules(ticket, scanContext, db) {
  try {
    // 1. Vérifier que l'événement est actif
    if (ticket.event_status !== 'active') {
      return {
        success: false,
        error: 'Événement non actif',
        code: 'EVENT_NOT_ACTIVE'
      };
    }
    
    // 2. Vérifier que l'événement n'est pas terminé
    const eventDate = new Date(ticket.event_date);
    const now = new Date();
    
    if (eventDate < now) {
      return {
        success: false,
        error: 'Événement terminé',
        code: 'EVENT_ENDED'
      };
    }
    
    // 3. Vérifier la capacité maximale
    if (ticket.max_attendees) {
      const capacityQuery = `
        SELECT COUNT(*) as validated_count
        FROM tickets t
        JOIN event_guests eg ON t.event_guest_id = eg.id
        WHERE eg.event_id = $1 AND t.is_validated = TRUE
      `;
      
      const capacityResult = await db.query(capacityQuery, [ticket.event_id]);
      const validatedCount = parseInt(capacityResult.rows[0].validated_count);
      
      if (validatedCount >= ticket.max_attendees) {
        return {
          success: false,
          error: 'Capacité maximale atteinte',
          code: 'EVENT_FULL'
        };
      }
    }
    
    // 4. Validation du QR code (si présent)
    if (ticket.qr_code_data) {
      try {
        const qrData = JSON.parse(ticket.qr_code_data);
        
        if (!qrData.id || !qrData.eventId || !qrData.timestamp) {
          return {
            success: false,
            error: 'Format du QR code invalide',
            code: 'INVALID_QR_FORMAT'
          };
        }
        
        if (qrData.id !== ticket.id) {
          return {
            success: false,
            error: 'Incohérence QR code / ticket',
            code: 'QR_TICKET_MISMATCH'
          };
        }
        
      } catch (parseError) {
        return {
          success: false,
          error: 'QR code corrompu',
          code: 'CORRUPTED_QR_CODE'
        };
      }
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    console.error('[INTERNAL_SCAN_VALIDATION] Erreur validation métier:', error.message);
    return {
      success: false,
      error: 'Erreur lors de la validation métier',
      code: 'BUSINESS_VALIDATION_ERROR'
    };
  }
}

/**
 * Met à jour le statut d'un ticket
 * @param {number} ticketId - ID du ticket
 * @param {Object} scanContext - Contexte du scan
 * @param {Object} db - Instance de base de données
 */
async function updateTicketStatus(ticketId, scanContext, db) {
  try {
    // 1. Mettre à jour le ticket
    const updateTicketQuery = `
      UPDATE tickets 
      SET 
        is_validated = TRUE,
        validated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(updateTicketQuery, [ticketId]);
    
    // 2. Enregistrer dans les logs de scan
    if (scanContext?.operatorId) {
      const logQuery = `
        INSERT INTO scan_logs (ticket_id, operator_id, scan_time, location, device_id, created_at)
        VALUES ($1, $2, NOW(), $3, $4, NOW())
      `;
      
      await db.query(logQuery, [
        ticketId,
        scanContext.operatorId,
        scanContext.location || null,
        scanContext.deviceId || null
      ]);
    }
    
    console.log(`[INTERNAL_SCAN_VALIDATION] Ticket ${ticketId} mis à jour avec succès`);
    
  } catch (error) {
    console.error('[INTERNAL_SCAN_VALIDATION] Erreur mise à jour ticket:', error.message);
    throw new Error('Impossible de mettre à jour le ticket');
  }
}

/**
 * Vérifie le statut d'un ticket
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function checkTicketStatus(req, res, db) {
  try {
    const { ticketId } = req.params;
    
    const query = `
      SELECT 
        t.id,
        t.ticket_code,
        t.is_validated,
        t.validated_at,
        eg.event_id,
        e.title as event_title
      FROM tickets t
      JOIN event_guests eg ON t.event_guest_id = eg.id
      JOIN events e ON eg.event_id = e.id
      WHERE t.id = $1
    `;
    
    const result = await db.query(query, [ticketId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    const ticket = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          ticket_code: ticket.ticket_code,
          is_validated: ticket.is_validated,
          validated_at: ticket.validated_at
        },
        event: {
          id: ticket.event_id,
          title: ticket.event_title
        }
      }
    });
    
  } catch (error) {
    console.error('[INTERNAL_SCAN_VALIDATION] Erreur vérification statut:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du statut',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  validateTicketInternal,
  checkTicketStatus
};
