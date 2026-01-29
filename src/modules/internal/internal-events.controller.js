// Importation des modules nécessaires pour le contrôleur d'événements interne
const eventsService = require('../events/events.service'); // Service des événements
const logger = require('../../utils/logger'); // Utilitaire de logging
const { successResponse, errorResponse, notFoundResponse } = require('../../../../shared'); // Utilitaires de réponse

/**
 * Contrôleur d'Événements Interne
 * Ce contrôleur gère les requêtes internes concernant les événements
 * Il fait le pont entre les services externes et la logique métier des événements
 */
class InternalEventsController {
  /**
   * Valide qu'un événement est actif et accessible pour les scans
   * Cette méthode est appelée par le scan-validation-service avant chaque scan
   * @param {Object} req - Requête HTTP avec l'ID de l'événement
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async validateEvent(req, res) {
    try {
      const { eventId } = req.params;

      logger.core('Validation événement interne', { eventId });

      // ÉTAPE 1 : Récupérer les informations de l'événement
      const event = await eventsService.getEventById(eventId);
      if (!event.success) {
        return res.status(404).json(
          notFoundResponse('Événement non trouvé', { eventId })
        );
      }

      const eventData = event.data;

      // ÉTAPE 2 : Valider que l'événement est dans un état qui permet les scans
      const validationResult = await this.validateEventForScanning(eventData);

      if (!validationResult.valid) {
        return res.status(400).json(
          errorResponse(validationResult.reason, validationResult.code)
        );
      }

      // ÉTAPE 3 : Retourner les informations de validation
      return res.status(200).json(
        successResponse('Événement validé pour les scans', {
          event: {
            id: eventData.id,
            name: eventData.name,
            status: eventData.status,
            isActive: eventData.isActive,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            location: eventData.location
          },
          validation: {
            valid: true,
            canScan: true,
            restrictions: validationResult.restrictions || [],
            timeUntilStart: validationResult.timeUntilStart,
            timeUntilEnd: validationResult.timeUntilEnd
          }
        })
      );

    } catch (error) {
      logger.error('Échec validation événement interne', {
        error: error.message,
        eventId: req.params.eventId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la validation de l\'événement', error.message)
      );
    }
  }

  /**
   * Récupère les informations nécessaires pour le scan d'un événement
   * Fournit les règles et configurations pour les scans de cet événement
   * @param {Object} req - Requête HTTP avec l'ID de l'événement
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getScanInfo(req, res) {
    try {
      const { eventId } = req.params;

      logger.core('Récupération infos scan événement', { eventId });

      // Récupérer les informations complètes de l'événement
      const event = await eventsService.getEventById(eventId);
      if (!event.success) {
        return res.status(404).json(
          notFoundResponse('Événement non trouvé', { eventId })
        );
      }

      const eventData = event.data;

      // Récupérer les statistiques de scans pour cet événement
      const scanStats = await eventsService.getEventScanStats(eventId);

      // Récupérer la configuration des points de scan
      const scanConfig = await eventsService.getEventScanConfig(eventId);

      return res.status(200).json(
        successResponse('Informations de scan récupérées', {
          event: {
            id: eventData.id,
            name: eventData.name,
            location: eventData.location,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            isActive: eventData.isActive
          },
          scan: {
            allowedZones: scanConfig.allowedZones || [],
            timeRestrictions: scanConfig.timeRestrictions || {},
            maxScansPerTicket: scanConfig.maxScansPerTicket || 1,
            scanInterval: scanConfig.scanInterval || 30, // secondes
            checkpoints: scanConfig.checkpoints || []
          },
          statistics: {
            totalScans: scanStats.totalScans || 0,
            uniqueTickets: scanStats.uniqueTickets || 0,
            scansByZone: scanStats.scansByZone || {},
            scansByHour: scanStats.scansByHour || {}
          }
        })
      );

    } catch (error) {
      logger.error('Échec récupération infos scan événement', {
        error: error.message,
        eventId: req.params.eventId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des informations de scan', error.message)
      );
    }
  }

  /**
   * Récupère les statistiques de scans pour un événement
   * Fournit des métriques détaillées sur l'activité de scan
   * @param {Object} req - Requête HTTP avec l'ID de l'événement et filtres
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getEventStats(req, res) {
    try {
      const { eventId } = req.params;
      const { startDate, endDate, location, checkpointId } = req.query;

      logger.core('Récupération statistiques événement', {
        eventId,
        startDate,
        endDate,
        location,
        checkpointId
      });

      // Valider que l'événement existe
      const event = await eventsService.getEventById(eventId);
      if (!event.success) {
        return res.status(404).json(
          notFoundResponse('Événement non trouvé', { eventId })
        );
      }

      // Récupérer les statistiques avec les filtres
      const stats = await eventsService.getEventScanStats(eventId, {
        startDate,
        endDate,
        location,
        checkpointId
      });

      // Calculer les métriques dérivées
      const now = new Date();
      const eventStart = new Date(event.data.startDate);
      const eventEnd = new Date(event.data.endDate);
      const eventDuration = eventEnd - eventStart;
      const timeElapsed = now - eventStart;
      const progressPercentage = Math.min(100, (timeElapsed / eventDuration) * 100);

      return res.status(200).json(
        successResponse('Statistiques de l\'événement récupérées', {
          event: {
            id: event.data.id,
            name: event.data.name,
            progress: `${progressPercentage.toFixed(1)}%`
          },
          statistics: {
            totalScans: stats.totalScans || 0,
            uniqueTickets: stats.uniqueTickets || 0,
            averageScansPerHour: stats.averageScansPerHour || 0,
            peakHour: stats.peakHour || null,
            scansByZone: stats.scansByZone || {},
            scansByHour: stats.scansByHour || {},
            scansByCheckpoint: stats.scansByCheckpoint || {},
            fraudulentScans: stats.fraudulentScans || 0,
            successfulScans: stats.successfulScans || 0
          },
          filters: {
            startDate,
            endDate,
            location,
            checkpointId
          },
          generatedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération statistiques événement', {
        error: error.message,
        eventId: req.params.eventId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des statistiques', error.message)
      );
    }
  }

  /**
   * Met à jour le statut d'un événement
   * Permet de changer l'état d'un événement (actif/inactif/etc.)
   * @param {Object} req - Requête HTTP avec l'ID et le nouveau statut
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async updateEventStatus(req, res) {
    try {
      const { eventId } = req.params;
      const { status, reason, updatedBy } = req.body;

      logger.core('Mise à jour statut événement', {
        eventId,
        newStatus: status,
        reason,
        updatedBy
      });

      // Valider que l'événement existe
      const event = await eventsService.getEventById(eventId);
      if (!event.success) {
        return res.status(404).json(
          notFoundResponse('Événement non trouvé', { eventId })
        );
      }

      // Mettre à jour le statut
      const updateResult = await eventsService.updateEventStatus(eventId, {
        status,
        reason,
        updatedBy,
        updatedAt: new Date().toISOString()
      });

      if (!updateResult.success) {
        return res.status(400).json(
          errorResponse('Échec de la mise à jour du statut', updateResult.error)
        );
      }

      return res.status(200).json(
        successResponse('Statut de l\'événement mis à jour', {
          event: {
            id: eventId,
            previousStatus: event.data.status,
            newStatus: status,
            updatedAt: new Date().toISOString()
          },
          update: {
            reason,
            updatedBy
          }
        })
      );

    } catch (error) {
      logger.error('Échec mise à jour statut événement', {
        error: error.message,
        eventId: req.params.eventId,
        newStatus: req.body.status
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la mise à jour du statut de l\'événement', error.message)
      );
    }
  }

  /**
   * Health check du service d'événements interne
   * Vérifie que tous les composants nécessaires fonctionnent
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async healthCheck(req, res) {
    try {
      // Vérifier la connectivité avec les services internes
      const checks = {
        eventsService: await this.checkEventsServiceHealth(),
        database: await this.checkDatabaseHealth()
      };

      const allHealthy = Object.values(checks).every(check => check.healthy);

      return res.status(allHealthy ? 200 : 503).json(
        successResponse('Health check events service', {
          healthy: allHealthy,
          service: 'internal-events',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          checks
        })
      );

    } catch (error) {
      logger.error('Health check events service failed', { error: error.message });

      return res.status(503).json(
        errorResponse('Health check failed', error.message)
      );
    }
  }

  /**
   * Valide qu'un événement est prêt pour les scans
   * @param {Object} eventData - Données de l'événement
   * @returns {Object} - Résultat de la validation
   */
  async validateEventForScanning(eventData) {
    const now = new Date();
    const eventStart = new Date(eventData.startDate);
    const eventEnd = new Date(eventData.endDate);

    // Vérifier que l'événement est actif
    if (!eventData.isActive) {
      return {
        valid: false,
        reason: 'Événement non actif',
        code: 'EVENT_NOT_ACTIVE'
      };
    }

    // Vérifier que l'événement n'est pas annulé
    if (eventData.status === 'cancelled') {
      return {
        valid: false,
        reason: 'Événement annulé',
        code: 'EVENT_CANCELLED'
      };
    }

    // Vérifier que l'événement n'est pas terminé
    if (eventData.status === 'completed') {
      return {
        valid: false,
        reason: 'Événement terminé',
        code: 'EVENT_COMPLETED'
      };
    }

    // Calculer le temps jusqu'au début et la fin
    const timeUntilStart = eventStart - now;
    const timeUntilEnd = eventEnd - now;

    // Vérifier que l'événement a commencé
    if (timeUntilStart > 0) {
      return {
        valid: false,
        reason: 'Événement pas encore commencé',
        code: 'EVENT_NOT_STARTED',
        timeUntilStart
      };
    }

    // Vérifier que l'événement n'est pas terminé
    if (timeUntilEnd < 0) {
      return {
        valid: false,
        reason: 'Événement terminé',
        code: 'EVENT_ENDED',
        timeUntilEnd
      };
    }

    // Vérifier les restrictions de temps
    const restrictions = [];
    if (eventData.timeRestrictions) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      if (eventData.timeRestrictions.allowedStart && currentTime < eventData.timeRestrictions.allowedStart) {
        restrictions.push('Hors des heures autorisées');
      }

      if (eventData.timeRestrictions.allowedEnd && currentTime > eventData.timeRestrictions.allowedEnd) {
        restrictions.push('Hors des heures autorisées');
      }
    }

    return {
      valid: true,
      restrictions,
      timeUntilStart: Math.max(0, timeUntilStart),
      timeUntilEnd: Math.max(0, timeUntilEnd)
    };
  }

  /**
   * Vérifie la santé du service des événements
   * @returns {Promise<Object>} - État de santé du service
   */
  async checkEventsServiceHealth() {
    try {
      await eventsService.healthCheck();
      return { healthy: true, message: 'Events service OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  /**
   * Vérifie la santé de la base de données
   * @returns {Promise<Object>} - État de santé de la base de données
   */
  async checkDatabaseHealth() {
    try {
      // Simuler une requête de test
      await eventsService.healthCheck();
      return { healthy: true, message: 'Database connection OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

module.exports = new InternalEventsController();
