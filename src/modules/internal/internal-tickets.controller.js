// Importation des modules nécessaires pour le contrôleur de tickets interne
const ticketsService = require('../tickets/tickets.service'); // Service des tickets
const logger = require('../../utils/logger'); // Utilitaire de logging
const { successResponse, errorResponse, notFoundResponse } = require('../../../../shared'); // Utilitaires de réponse

/**
 * Contrôleur de Tickets Interne
 * Ce contrôleur gère les requêtes internes concernant les tickets
 * Il fait le pont entre les services externes et la logique métier des tickets
 */
class InternalTicketsController {
  /**
   * Vérifie le statut actuel d'un ticket
   * Cette méthode est appelée avant chaque validation de scan
   * @param {Object} req - Requête HTTP avec l'ID du ticket
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getTicketStatus(req, res) {
    try {
      const { ticketId } = req.params;

      logger.core('Vérification statut ticket interne', { ticketId });

      // ÉTAPE 1 : Récupérer les informations du ticket
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      const ticketData = ticket.data;

      // ÉTAPE 2 : Récupérer l'historique des scans
      const scanHistory = await ticketsService.getTicketScanHistory(ticketId);

      // ÉTAPE 3 : Calculer les métriques de scan
      const scanMetrics = this.calculateScanMetrics(scanHistory);

      // ÉTAPE 4 : Vérifier si le ticket peut être scanné
      const canScan = this.canTicketBeScanned(ticketData, scanHistory);

      return res.status(200).json(
        successResponse('Statut du ticket récupéré', {
          ticket: {
            id: ticketData.id,
            type: ticketData.type,
            status: ticketData.status,
            userId: ticketData.userId,
            eventId: ticketData.eventId,
            createdAt: ticketData.createdAt,
            updatedAt: ticketData.updatedAt,
            maxScans: ticketData.maxScans || 1
          },
          scanning: {
            canScan,
            remainingScans: scanMetrics.remainingScans,
            totalScans: scanMetrics.totalScans,
            lastScan: scanHistory.lastScan,
            nextScanAllowed: scanMetrics.nextScanAllowed
          },
          history: {
            totalScans: scanMetrics.totalScans,
            scanLocations: scanMetrics.scanLocations,
            scanTimes: scanMetrics.scanTimes,
            recentScans: scanHistory.history?.slice(0, 5) || []
          },
          restrictions: {
            timeBetweenScans: ticketData.timeBetweenScans || 30, // secondes
            maxScansPerDay: ticketData.maxScansPerDay || 10,
            allowedZones: ticketData.allowedZones || []
          }
        })
      );

    } catch (error) {
      logger.error('Échec vérification statut ticket interne', {
        error: error.message,
        ticketId: req.params.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la vérification du statut du ticket', error.message)
      );
    }
  }

  /**
   * Enregistre un scan de ticket dans l'historique
   * Cette méthode est appelée après une validation réussie
   * @param {Object} req - Requête HTTP avec les données du scan
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async recordScan(req, res) {
    try {
      const {
        ticketId,
        eventId,
        userId,
        scanContext,
        validationMetadata,
        scanResult
      } = req.body;

      logger.core('Enregistrement scan ticket interne', {
        ticketId,
        eventId,
        userId,
        scanLocation: scanContext.location,
        scanValid: scanResult.valid
      });

      // ÉTAPE 1 : Vérifier que le ticket existe
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      // ÉTAPE 2 : Créer l'enregistrement du scan
      const scanRecord = {
        ticketId,
        eventId,
        userId,
        scanContext: {
          ...scanContext,
          recordedAt: new Date().toISOString()
        },
        validationMetadata: {
          ...validationMetadata,
          recordedAt: new Date().toISOString()
        },
        scanResult: {
          ...scanResult,
          recordedAt: new Date().toISOString()
        },
        recordedBy: 'scan-validation-service',
        recordedAt: new Date().toISOString()
      };

      // ÉTAPE 3 : Enregistrer le scan dans la base de données
      const recordResult = await ticketsService.recordTicketScan(scanRecord);

      if (!recordResult.success) {
        return res.status(500).json(
          errorResponse('Échec de l\'enregistrement du scan', recordResult.error)
        );
      }

      // ÉTAPE 4 : Mettre à jour le statut du ticket si nécessaire
      if (scanResult.valid && scanResult.status === 'validated') {
        await this.updateTicketAfterValidation(ticketId, scanContext);
      }

      // ÉTAPE 5 : Détecter les schémas de fraude
      const fraudDetection = await this.detectFraudPatterns(ticketId, scanContext);

      return res.status(201).json(
        successResponse('Scan enregistré avec succès', {
          scan: {
            id: recordResult.data.id,
            ticketId,
            eventId,
            userId,
            scanContext,
            scanResult,
            recordedAt: new Date().toISOString()
          },
          fraudDetection,
          ticket: {
            id: ticketId,
            status: ticket.data.status,
            totalScans: (await ticketsService.getTicketScanHistory(ticketId)).total
          }
        })
      );

    } catch (error) {
      logger.error('Échec enregistrement scan ticket interne', {
        error: error.message,
        ticketId: req.body.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de l\'enregistrement du scan', error.message)
      );
    }
  }

  /**
   * Récupère l'historique complet des scans d'un ticket
   * Fournit un suivi détaillé de toutes les utilisations du ticket
   * @param {Object} req - Requête HTTP avec l'ID du ticket et filtres
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getScanHistory(req, res) {
    try {
      const { ticketId } = req.params;
      const { limit, offset, startDate, endDate, location } = req.query;

      logger.core('Récupération historique scans ticket', {
        ticketId,
        limit,
        offset,
        startDate,
        endDate,
        location
      });

      // ÉTAPE 1 : Vérifier que le ticket existe
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      // ÉTAPE 2 : Récupérer l'historique des scans avec filtres
      const scanHistory = await ticketsService.getTicketScanHistory(ticketId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        startDate,
        endDate,
        location
      });

      // ÉTAPE 3 : Calculer les statistiques de l'historique
      const statistics = this.calculateScanStatistics(scanHistory.history || []);

      return res.status(200).json(
        successResponse('Historique des scans récupéré', {
          ticket: {
            id: ticketId,
            type: ticket.data.type,
            status: ticket.data.status
          },
          history: {
            scans: scanHistory.history || [],
            total: scanHistory.total || 0,
            hasMore: scanHistory.hasMore || false
          },
          statistics,
          filters: {
            limit,
            offset,
            startDate,
            endDate,
            location
          },
          retrievedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération historique scans ticket', {
        error: error.message,
        ticketId: req.params.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération de l\'historique des scans', error.message)
      );
    }
  }

  /**
   * Met à jour le statut d'un ticket
   * Permet de changer l'état d'un ticket après validation ou autre événement
   * @param {Object} req - Requête HTTP avec l'ID et le nouveau statut
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async updateTicketStatus(req, res) {
    try {
      const { ticketId } = req.params;
      const { status, reason, updatedBy, metadata } = req.body;

      logger.core('Mise à jour statut ticket interne', {
        ticketId,
        newStatus: status,
        reason,
        updatedBy
      });

      // ÉTAPE 1 : Vérifier que le ticket existe
      const ticket = await ticketsService.getTicketById(ticketId);
      if (!ticket.success) {
        return res.status(404).json(
          notFoundResponse('Ticket non trouvé', { ticketId })
        );
      }

      // ÉTAPE 2 : Valider la transition de statut
      const transitionValid = this.validateStatusTransition(ticket.data.status, status);
      if (!transitionValid.valid) {
        return res.status(400).json(
          errorResponse('Transition de statut invalide', transitionValid.reason)
        );
      }

      // ÉTAPE 3 : Mettre à jour le statut
      const updateResult = await ticketsService.updateTicketStatus(ticketId, {
        status,
        reason,
        updatedBy,
        metadata: {
          ...metadata,
          previousStatus: ticket.data.status,
          updatedAt: new Date().toISOString()
        }
      });

      if (!updateResult.success) {
        return res.status(500).json(
          errorResponse('Échec de la mise à jour du statut', updateResult.error)
        );
      }

      // ÉTAPE 4 : Si le ticket est marqué comme utilisé, notifier les services concernés
      if (status === 'used') {
        await this.notifyTicketUsed(ticketId, ticket.data, updatedBy);
      }

      return res.status(200).json(
        successResponse('Statut du ticket mis à jour', {
          ticket: {
            id: ticketId,
            previousStatus: ticket.data.status,
            newStatus: status,
            updatedAt: new Date().toISOString()
          },
          update: {
            reason,
            updatedBy,
            metadata
          }
        })
      );

    } catch (error) {
      logger.error('Échec mise à jour statut ticket interne', {
        error: error.message,
        ticketId: req.params.ticketId,
        newStatus: req.body.status
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la mise à jour du statut du ticket', error.message)
      );
    }
  }

  /**
   * Vérifie plusieurs tickets en une seule requête
   * Optimisé pour les traitements en lot
   * @param {Object} req - Requête HTTP avec le tableau de tickets
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async verifyBatch(req, res) {
    try {
      const { ticketIds, eventId, includeHistory, metadata } = req.body;

      logger.core('Vérification batch tickets', {
        ticketCount: ticketIds.length,
        eventId,
        includeHistory
      });

      const results = [];
      let validCount = 0;
      let invalidCount = 0;

      // Traiter chaque ticket individuellement
      for (const ticketId of ticketIds) {
        try {
          // Récupérer le statut du ticket
          const ticket = await ticketsService.getTicketById(ticketId);
          
          if (!ticket.success) {
            invalidCount++;
            results.push({
              ticketId,
              valid: false,
              error: 'Ticket non trouvé'
            });
            continue;
          }

          // Récupérer l'historique si demandé
          let scanHistory = null;
          if (includeHistory) {
            scanHistory = await ticketsService.getTicketScanHistory(ticketId);
          }

          // Vérifier si le ticket peut être scanné
          const canScan = this.canTicketBeScanned(ticket.data, scanHistory);

          if (canScan) {
            validCount++;
          } else {
            invalidCount++;
          }

          results.push({
            ticketId,
            valid: canScan,
            ticket: {
              id: ticket.data.id,
              type: ticket.data.type,
              status: ticket.data.status,
              userId: ticket.data.userId,
              eventId: ticket.data.eventId
            },
            scanHistory: includeHistory ? {
              totalScans: scanHistory?.total || 0,
              lastScan: scanHistory?.lastScan
            } : null
          });

        } catch (error) {
          invalidCount++;
          results.push({
            ticketId,
            valid: false,
            error: error.message
          });
        }
      }

      return res.status(200).json(
        successResponse('Vérification batch terminée', {
          batch: {
            totalTickets: ticketIds.length,
            validCount,
            invalidCount,
            successRate: `${((validCount / ticketIds.length) * 100).toFixed(1)}%`
          },
          results,
          filters: {
            eventId,
            includeHistory
          },
          processedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec vérification batch tickets', {
        error: error.message,
        ticketCount: req.body.ticketIds?.length
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la vérification batch', error.message)
      );
    }
  }

  /**
   * Health check du service de tickets interne
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async healthCheck(req, res) {
    try {
      const checks = {
        ticketsService: await this.checkTicketsServiceHealth(),
        database: await this.checkDatabaseHealth()
      };

      const allHealthy = Object.values(checks).every(check => check.healthy);

      return res.status(allHealthy ? 200 : 503).json(
        successResponse('Health check tickets service', {
          healthy: allHealthy,
          service: 'internal-tickets',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          checks
        })
      );

    } catch (error) {
      logger.error('Health check tickets service failed', { error: error.message });

      return res.status(503).json(
        errorResponse('Health check failed', error.message)
      );
    }
  }

  /**
   * Calcule les métriques de scan pour un ticket
   * @param {Object} scanHistory - Historique des scans
   * @returns {Object} - Métriques calculées
   */
  calculateScanMetrics(scanHistory) {
    const totalScans = scanHistory.total || 0;
    const maxScans = 1; // Par défaut, un ticket peut être scanné une fois
    const remainingScans = Math.max(0, maxScans - totalScans);

    // Calculer quand le prochain scan est autorisé (anti-fraude)
    let nextScanAllowed = null;
    if (scanHistory.lastScan) {
      const lastScanTime = new Date(scanHistory.lastScan.timestamp);
      const nextAllowedTime = new Date(lastScanTime.getTime() + 30000); // 30 secondes
      nextScanAllowed = nextAllowedTime > new Date() ? nextAllowedTime : null;
    }

    // Extraire les localisations et temps de scan
    const scanLocations = {};
    const scanTimes = [];
    
    if (scanHistory.history) {
      scanHistory.history.forEach(scan => {
        // Compter par localisation
        const location = scan.scanContext?.location || 'unknown';
        scanLocations[location] = (scanLocations[location] || 0) + 1;
        
        // Extraire les heures de scan
        const scanTime = new Date(scan.scanContext?.timestamp);
        scanTimes.push(scanTime.getHours());
      });
    }

    return {
      totalScans,
      remainingScans,
      nextScanAllowed,
      scanLocations,
      scanTimes,
      averageScansPerHour: totalScans > 0 ? totalScans / 24 : 0
    };
  }

  /**
   * Vérifie si un ticket peut être scanné
   * @param {Object} ticket - Données du ticket
   * @param {Object} scanHistory - Historique des scans
   * @returns {boolean} - True si le ticket peut être scanné
   */
  canTicketBeScanned(ticket, scanHistory) {
    // Vérifier le statut du ticket
    if (ticket.status !== 'active') {
      return false;
    }

    // Vérifier le nombre maximum de scans
    const totalScans = scanHistory.total || 0;
    const maxScans = ticket.maxScans || 1;
    
    if (totalScans >= maxScans) {
      return false;
    }

    // Vérifier le délai entre scans (anti-fraude)
    if (scanHistory.lastScan) {
      const lastScanTime = new Date(scanHistory.lastScan.timestamp);
      const now = new Date();
      const timeDiff = now - lastScanTime;
      
      // Si le scan précédent date de moins de 30 secondes, bloquer
      if (timeDiff < 30000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Détecte les schémas de fraude dans les scans
   * @param {string} ticketId - ID du ticket
   * @param {Object} scanContext - Contexte du scan actuel
   * @returns {Object} - Résultat de la détection de fraude
   */
  async detectFraudPatterns(ticketId, scanContext) {
    const scanHistory = await ticketsService.getTicketScanHistory(ticketId);
    const fraudFlags = [];

    // Flag 1 : Scans trop rapprochés
    if (scanHistory.lastScan) {
      const lastScanTime = new Date(scanHistory.lastScan.timestamp);
      const now = new Date();
      const timeDiff = now - lastScanTime;
      
      if (timeDiff < 10000) { // Moins de 10 secondes
        fraudFlags.push({
          type: 'RAPID_SCANS',
          severity: 'high',
          description: 'Scans trop rapprochés',
          timeDiff
        });
      }
    }

    // Flag 2 : Scans depuis plusieurs localisations simultanées
    const recentScans = (scanHistory.history || [])
      .filter(scan => {
        const scanTime = new Date(scan.scanContext.timestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return scanTime > fiveMinutesAgo;
      });

    const uniqueLocations = new Set(recentScans.map(scan => scan.scanContext.location));
    if (uniqueLocations.size > 1) {
      fraudFlags.push({
        type: 'MULTIPLE_LOCATIONS',
        severity: 'high',
        description: 'Scans depuis plusieurs localisations',
        locations: Array.from(uniqueLocations)
      });
    }

    // Flag 3 : Scans depuis plusieurs devices
    const uniqueDevices = new Set(recentScans.map(scan => scan.scanContext.deviceId));
    if (uniqueDevices.size > 1) {
      fraudFlags.push({
        type: 'MULTIPLE_DEVICES',
        severity: 'medium',
        description: 'Scans depuis plusieurs devices',
        devices: Array.from(uniqueDevices)
      });
    }

    return {
      detected: fraudFlags.length > 0,
      flags: fraudFlags,
      riskLevel: fraudFlags.length > 2 ? 'high' : fraudFlags.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Met à jour le ticket après validation réussie
   * @param {string} ticketId - ID du ticket
   * @param {Object} scanContext - Contexte du scan
   */
  async updateTicketAfterValidation(ticketId, scanContext) {
    // Pour l'instant, on ne change pas le statut automatiquement
    // Le statut sera changé par le service de scan-validation si nécessaire
    logger.core('Mise à jour ticket après validation', {
      ticketId,
      scanLocation: scanContext.location
    });
  }

  /**
   * Notifie les services concernés quand un ticket est utilisé
   * @param {string} ticketId - ID du ticket
   * @param {Object} ticketData - Données du ticket
   * @param {string} updatedBy - Service qui a fait la mise à jour
   */
  async notifyTicketUsed(ticketId, ticketData, updatedBy) {
    // Envoyer une notification au service de scan-validation
    // et aux autres services concernés
    logger.core('Notification ticket utilisé', {
      ticketId,
      eventId: ticketData.eventId,
      userId: ticketData.userId,
      updatedBy
    });

    // TODO: Implémenter la notification aux autres services
  }

  /**
   * Valide qu'une transition de statut est valide
   * @param {string} currentStatus - Statut actuel
   * @param {string} newStatus - Nouveau statut
   * @returns {Object} - Résultat de la validation
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'active': ['used', 'cancelled', 'expired'],
      'used': ['void'],
      'cancelled': ['void'],
      'expired': ['void'],
      'void': []
    };

    if (!validTransitions[currentStatus]) {
      return {
        valid: false,
        reason: `Statut actuel "${currentStatus}" non reconnu`
      };
    }

    if (!validTransitions[currentStatus].includes(newStatus)) {
      return {
        valid: false,
        reason: `Transition "${currentStatus}" -> "${newStatus}" non autorisée`
      };
    }

    return { valid: true };
  }

  /**
   * Calcule les statistiques d'un historique de scans
   * @param {Array} scans - Liste des scans
   * @returns {Object} - Statistiques calculées
   */
  calculateScanStatistics(scans) {
    if (!scans || scans.length === 0) {
      return {
        totalScans: 0,
        averageScansPerHour: 0,
        peakHour: null,
        scanLocations: {},
        scanDays: {}
      };
    }

    const scanLocations = {};
    const scanDays = {};
    const scanHours = [];

    scans.forEach(scan => {
      // Localisations
      const location = scan.scanContext?.location || 'unknown';
      scanLocations[location] = (scanLocations[location] || 0) + 1;

      // Jours
      const scanDate = new Date(scan.scanContext?.timestamp);
      const day = scanDate.toISOString().split('T')[0];
      scanDays[day] = (scanDays[day] || 0) + 1;

      // Heures
      scanHours.push(scanDate.getHours());
    });

    // Calculer l'heure de pointe
    const hourCounts = {};
    scanHours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );

    return {
      totalScans: scans.length,
      averageScansPerHour: scans.length / 24,
      peakHour: parseInt(peakHour),
      scanLocations,
      scanDays,
      firstScan: scans[0]?.scanContext?.timestamp,
      lastScan: scans[scans.length - 1]?.scanContext?.timestamp
    };
  }

  /**
   * Vérifie la santé du service des tickets
   * @returns {Promise<Object>} - État de santé du service
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
   * Vérifie la santé de la base de données
   * @returns {Promise<Object>} - État de santé de la base de données
   */
  async checkDatabaseHealth() {
    try {
      await ticketsService.healthCheck();
      return { healthy: true, message: 'Database connection OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
}

module.exports = new InternalTicketsController();
