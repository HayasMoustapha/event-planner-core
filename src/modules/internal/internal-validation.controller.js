// Importation des modules nécessaires pour le contrôleur de validation interne
const ticketsService = require('../tickets/tickets.service'); // Service des tickets
const eventsService = require('../events/events.service'); // Service des événements
const logger = require('../../utils/logger'); // Utilitaire de logging
const { successResponse, errorResponse, notFoundResponse } = require('../../../../shared'); // Utilitaires de réponse

/**
 * Contrôleur de Validation Interne
 * Ce contrôleur gère les requêtes de validation provenant des autres services
 * Il fait le pont entre les services externes et la logique métier du Core
 */
class InternalValidationController {
  /**
   * Valide un ticket pour le scan-validation-service
   * Cette méthode vérifie la validité d'un ticket selon plusieurs critères
   * @param {Object} req - Requête HTTP avec les données du ticket
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async validateTicket(req, res) {
    try {
      // Extraction des données de validation depuis le corps de la requête
      const {
        ticketId, // ID du ticket à valider
        eventId, // ID de l'événement associé
        ticketType, // Type de ticket (VIP, standard, etc.)
        userId, // ID du propriétaire du ticket
        scanContext, // Contexte du scan (localisation, device, etc.)
        validationMetadata // Métadonnées de validation (QR code, etc.)
      } = req.body;

      // LOG : Enregistre les informations de validation pour le débogage
      logger.core('Validation de ticket interne', {
        ticketId,
        eventId,
        ticketType,
        userId,
        scanLocation: scanContext.location,
        deviceId: scanContext.deviceId
      });

      // ÉTAPE 1 : Vérifier que le ticket existe dans la base de données
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      const ticketData = ticket.data;

      // ÉTAPE 2 : Valider que le ticket appartient bien à l'utilisateur
      if (ticketData.userId !== userId) {
        return res.status(403).json(
          errorResponse('Ticket non associé à cet utilisateur', 'TICKET_USER_MISMATCH')
        );
      }

      // ÉTAPE 3 : Vérifier que l'événement est valide et actif
      const event = await eventsService.getEventById(eventId);
      if (!event.success) {
        return res.status(404).json(
          notFoundResponse('Événement non trouvé', { eventId })
        );
      }

      const eventData = event.data;

      // Vérifier que l'événement est bien celui du ticket
      if (ticketData.eventId !== eventId) {
        return res.status(400).json(
          errorResponse('Ticket non associé à cet événement', 'TICKET_EVENT_MISMATCH')
        );
      }

      // ÉTAPE 4 : Vérifier que l'événement est actif et accessible
      if (!eventData.isActive) {
        return res.status(400).json(
          errorResponse('Événement non actif', 'EVENT_NOT_ACTIVE')
        );
      }

      // Vérifier que la date actuelle est dans la période de l'événement
      const now = new Date();
      const eventStart = new Date(eventData.startDate);
      const eventEnd = new Date(eventData.endDate);

      if (now < eventStart) {
        return res.status(400).json(
          errorResponse('Événement pas encore commencé', 'EVENT_NOT_STARTED')
        );
      }

      if (now > eventEnd) {
        return res.status(400).json(
          errorResponse('Événement terminé', 'EVENT_ENDED')
        );
      }

      // ÉTAPE 5 : Vérifier le statut du ticket
      if (ticketData.status !== 'active') {
        let errorMessage = 'Ticket non valide';
        if (ticketData.status === 'used') {
          errorMessage = 'Ticket déjà utilisé';
        } else if (ticketData.status === 'cancelled') {
          errorMessage = 'Ticket annulé';
        } else if (ticketData.status === 'expired') {
          errorMessage = 'Ticket expiré';
        }

        return res.status(400).json(
          errorResponse(errorMessage, `TICKET_${ticketData.status.toUpperCase()}`)
        );
      }

      // ÉTAPE 6 : Vérifier les restrictions de temps et de localisation
      const validationResult = await this.validateTicketRestrictions(ticketData, eventData, scanContext);
      if (!validationResult.valid) {
        return res.status(400).json(
          errorResponse(validationResult.reason, validationResult.code)
        );
      }

      // ÉTAPE 7 : Enregistrer la validation (scan) dans l'historique
      const scanRecord = await ticketsService.recordTicketScan({
        ticketId,
        eventId,
        userId,
        scanContext,
        validationMetadata,
        validatedAt: new Date().toISOString(),
        status: 'validated'
      });

      // ÉTAPE 8 : Retourner le résultat de validation positif
      return res.status(200).json(
        successResponse('Ticket validé avec succès', {
          ticket: {
            id: ticketData.id,
            type: ticketData.type,
            status: 'validated',
            validatedAt: new Date().toISOString()
          },
          event: {
            id: eventData.id,
            name: eventData.name,
            location: eventData.location
          },
          scan: {
            id: scanRecord.data?.id,
            location: scanContext.location,
            timestamp: scanContext.timestamp
          },
          validation: {
            valid: true,
            restrictions: validationResult.restrictions || [],
            nextAction: null
          }
        })
      );

    } catch (error) {
      // GESTION DES ERREURS : Si quelque chose se passe mal pendant la validation
      logger.error('Échec validation ticket interne', {
        error: error.message,
        ticketId: req.body.ticketId,
        eventId: req.body.eventId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la validation du ticket', error.message)
      );
    }
  }

  /**
   * Valide un ticket par son code QR
   * Alternative à validateTicket pour les validations basées sur le code
   * @param {Object} req - Requête HTTP avec le code du ticket
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async validateTicketByCode(req, res) {
    try {
      const { ticketCode, scanContext } = req.body;

      logger.core('Validation de ticket par code', {
        ticketCode: ticketCode.substring(0, 10) + '...', // Log partiel pour sécurité
        scanLocation: scanContext.location,
        deviceId: scanContext.deviceId
      });

      // ÉTAPE 1 : Décoder et trouver le ticket par son code
      const ticket = await ticketsService.getTicketByCode(ticketCode);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé pour ce code', { ticketCode: ticketCode.substring(0, 10) + '...' })
        );
      }

      const ticketData = ticket.data;

      // ÉTAPE 2 : Utiliser la méthode de validation standard avec les données du ticket
      const validationRequest = {
        ticketId: ticketData.id,
        eventId: ticketData.eventId,
        ticketType: ticketData.type,
        userId: ticketData.userId,
        scanContext,
        validationMetadata: {
          validatedBy: 'code',
          originalCode: ticketCode
        }
      };

      // Déléguer à la méthode de validation standard
      return this.validateTicket({
        body: validationRequest
      }, res);

    } catch (error) {
      logger.error('Échec validation ticket par code', {
        error: error.message,
        ticketCode: req.body.ticketCode?.substring(0, 10) + '...'
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la validation du ticket par code', error.message)
      );
    }
  }

  /**
   * Récupère le statut d'un ticket
   * Permet aux autres services de vérifier l'état actuel d'un ticket
   * @param {Object} req - Requête HTTP avec l'ID du ticket
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getTicketStatus(req, res) {
    try {
      const { ticketId } = req.params;

      logger.core('Vérification statut ticket', { ticketId });

      // Récupérer le ticket et son statut
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      const ticketData = ticket.data;

      // Récupérer l'historique des scans pour ce ticket
      const scanHistory = await ticketsService.getTicketScanHistory(ticketId);

      return res.status(200).json(
        successResponse('Statut du ticket récupéré', {
          ticket: {
            id: ticketData.id,
            type: ticketData.type,
            status: ticketData.status,
            userId: ticketData.userId,
            eventId: ticketData.eventId,
            createdAt: ticketData.createdAt,
            updatedAt: ticketData.updatedAt
          },
          scans: {
            totalScans: scanHistory.total || 0,
            lastScan: scanHistory.lastScan,
            scanHistory: scanHistory.history || []
          },
          restrictions: {
            canBeScanned: ticketData.status === 'active',
            maxScans: ticketData.maxScans || 1,
            remainingScans: Math.max(0, (ticketData.maxScans || 1) - (scanHistory.total || 0))
          }
        })
      );

    } catch (error) {
      logger.error('Échec récupération statut ticket', {
        error: error.message,
        ticketId: req.params.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération du statut du ticket', error.message)
      );
    }
  }

  /**
   * Valide plusieurs tickets en une seule requête
   * Optimisé pour les scans en lot et vérifications groupées
   * @param {Object} req - Requête HTTP avec le tableau de tickets
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async validateBatch(req, res) {
    try {
      const { tickets, batchId, metadata } = req.body;

      logger.core('Validation batch de tickets', {
        ticketCount: tickets.length,
        batchId
      });

      const results = [];
      let validCount = 0;
      let invalidCount = 0;

      // Traiter chaque ticket individuellement
      for (const ticketRequest of tickets) {
        try {
          // Créer une requête de validation individuelle
          const mockReq = { body: ticketRequest };
          const mockRes = {
            status: () => ({ json: (data) => data }),
            json: (data) => data
          };

          // Utiliser la méthode de validation standard
          const result = await this.validateTicket(mockReq, mockRes);
          
          if (result.success) {
            validCount++;
          } else {
            invalidCount++;
          }

          results.push({
            ticketId: ticketRequest.ticketId,
            success: result.success,
            data: result.data || null,
            error: result.error || null
          });

        } catch (error) {
          invalidCount++;
          results.push({
            ticketId: ticketRequest.ticketId,
            success: false,
            error: error.message
          });
        }
      }

      // Enregistrer le batch de validation
      const batchRecord = await ticketsService.recordValidationBatch({
        batchId: batchId || `batch_${Date.now()}`,
        ticketCount: tickets.length,
        validCount,
        invalidCount,
        results,
        metadata
      });

      return res.status(200).json(
        successResponse('Validation batch terminée', {
          batch: {
            id: batchRecord.data?.id || batchId,
            totalTickets: tickets.length,
            validCount,
            invalidCount,
            successRate: `${((validCount / tickets.length) * 100).toFixed(1)}%`
          },
          results,
          processedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec validation batch', {
        error: error.message,
        ticketCount: req.body.tickets?.length
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la validation batch', error.message)
      );
    }
  }

  /**
   * Health check du service de validation interne
   * Vérifie que tous les composants nécessaires fonctionnent
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async healthCheck(req, res) {
    try {
      // Vérifier la connectivité avec les services internes
      const checks = {
        database: await this.checkDatabaseHealth(),
        ticketsService: await this.checkTicketsServiceHealth(),
        eventsService: await this.checkEventsServiceHealth()
      };

      const allHealthy = Object.values(checks).every(check => check.healthy);

      return res.status(allHealthy ? 200 : 503).json(
        successResponse('Health check validation service', {
          healthy: allHealthy,
          service: 'internal-validation',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          checks
        })
      );

    } catch (error) {
      logger.error('Health check validation service failed', { error: error.message });

      return res.status(503).json(
        errorResponse('Health check failed', error.message)
      );
    }
  }

  /**
   * Vérifie les restrictions spécifiques pour un ticket
   * @param {Object} ticket - Données du ticket
   * @param {Object} event - Données de l'événement
   * @param {Object} scanContext - Contexte du scan
   * @returns {Object} - Résultat de la validation des restrictions
   */
  async validateTicketRestrictions(ticket, event, scanContext) {
    const restrictions = [];

    // Restriction 1 : Vérifier les plages horaires de l'événement
    if (event.timeRestrictions) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      if (event.timeRestrictions.allowedStart && currentTime < event.timeRestrictions.allowedStart) {
        return {
          valid: false,
          reason: 'Hors des heures autorisées',
          code: 'TIME_RESTRICTION'
        };
      }

      if (event.timeRestrictions.allowedEnd && currentTime > event.timeRestrictions.allowedEnd) {
        return {
          valid: false,
          reason: 'Hors des heures autorisées',
          code: 'TIME_RESTRICTION'
        };
      }
    }

    // Restriction 2 : Vérifier les zones de scan autorisées
    if (event.allowedScanZones && !event.allowedScanZones.includes(scanContext.location)) {
      return {
        valid: false,
        reason: 'Zone de scan non autorisée',
        code: 'ZONE_RESTRICTION'
      };
    }

    // Restriction 3 : Vérifier le nombre maximum de scans
    const scanHistory = await ticketsService.getTicketScanHistory(ticket.id);
    if (ticket.maxScans && scanHistory.total >= ticket.maxScans) {
      return {
        valid: false,
        reason: 'Nombre maximum de scans atteint',
        code: 'SCAN_LIMIT_REACHED'
      };
    }

    // Restriction 4 : Vérifier le délai entre scans (anti-fraude)
    if (scanHistory.lastScan) {
      const lastScanTime = new Date(scanHistory.lastScan.timestamp);
      const now = new Date();
      const timeDiff = now - lastScanTime;
      
      // Si le scan précédent date de moins de 30 secondes, bloquer
      if (timeDiff < 30000) {
        return {
          valid: false,
          reason: 'Scan trop rapproché',
          code: 'SCAN_TOO_FREQUENT'
        };
      }
    }

    return {
      valid: true,
      restrictions
    };
  }

  /**
   * Vérifie la santé de la base de données
   * @returns {Promise<Object>} - État de santé de la base de données
   */
  async checkDatabaseHealth() {
    try {
      // Simuler une requête de test
      await ticketsService.healthCheck();
      return { healthy: true, message: 'Database connection OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Vérifie la santé du service des tickets
   * @returns {Promise<Object>} - État de santé du service tickets
   */
  async checkTicketsServiceHealth() {
    try {
      await ticketsService.healthCheck();
      return { healthy: true, message: 'Tickets service OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Vérifie la santé du service des événements
   * @returns {Promise<Object>} - État de santé du service events
   */
  async checkEventsServiceHealth() {
    try {
      await eventsService.healthCheck();
      return { healthy: true, message: 'Events service OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

module.exports = new InternalValidationController();
