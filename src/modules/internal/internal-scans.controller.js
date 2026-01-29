// Importation des modules nécessaires pour le contrôleur de scans interne
const logger = require('../../utils/logger'); // Utilitaire de logging
const { successResponse, errorResponse } = require('../../../../shared'); // Utilitaires de réponse

/**
 * Contrôleur de Scans Interne
 * Ce contrôleur gère les requêtes internes concernant les scans de tickets
 * Il fait le pont entre les services externes et la logique métier des scans
 */
class InternalScansController {
  constructor() {
    // En production, ces données viendraient de la base de données
    // Pour l'instant, on utilise une mémoire interne pour les tests
    this.scanRecords = new Map(); // Stockage temporaire des scans
    this.fraudPatterns = new Map(); // Stockage des schémas de fraude
  }

  /**
   * Enregistre un scan de ticket dans le système
   * Cette méthode est appelée après chaque validation réussie
   * @param {Object} req - Requête HTTP avec les données du scan
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async recordScan(req, res) {
    try {
      const {
        ticketId,
        eventId,
        userId,
        scanType,
        scanContext,
        validationResult,
        metadata
      } = req.body;

      logger.core('Enregistrement scan interne', {
        ticketId,
        eventId,
        userId,
        scanType,
        scanLocation: scanContext.location,
        scanValid: validationResult.valid
      });

      // ÉTAPE 1 : Créer l'enregistrement du scan
      const scanRecord = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId,
        eventId,
        userId,
        scanType,
        scanContext: {
          ...scanContext,
          recordedAt: new Date().toISOString()
        },
        validationResult: {
          ...validationResult,
          recordedAt: new Date().toISOString()
        },
        metadata: {
          ...metadata,
          recordedBy: 'scan-validation-service',
          recordedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };

      // ÉTAPE 2 : Stocker l'enregistrement (simulé)
      this.scanRecords.set(scanRecord.id, scanRecord);

      // ÉTAPE 3 : Ajouter à l'historique du ticket
      const ticketKey = `ticket_${ticketId}`;
      if (!this.scanRecords.has(ticketKey)) {
        this.scanRecords.set(ticketKey, []);
      }
      const ticketScans = this.scanRecords.get(ticketKey);
      ticketScans.push(scanRecord);

      // ÉTAPE 4 : Ajouter aux statistiques de l'événement
      const eventKey = `event_${eventId}`;
      if (!this.scanRecords.has(eventKey)) {
        this.scanRecords.set(eventKey, []);
      }
      const eventScans = this.scanRecords.get(eventKey);
      eventScans.push(scanRecord);

      // ÉTAPE 5 : Analyser pour la détection de fraude
      const fraudAnalysis = await this.analyzeForFraud(scanRecord, ticketScans);

      return res.status(201).json(
        successResponse('Scan enregistré avec succès', {
          scan: scanRecord,
          fraudAnalysis,
          statistics: {
            totalEventScans: eventScans.length,
            totalTicketScans: ticketScans.length,
            globalScans: this.scanRecords.size
          }
        })
      );

    } catch (error) {
      logger.error('Échec enregistrement scan interne', {
        error: error.message,
        ticketId: req.body.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de l\'enregistrement du scan', error.message)
      );
    }
  }

  /**
   * Récupère tous les scans pour un événement spécifique
   * Fournit des données pour les tableaux de bord et monitoring
   * @param {Object} req - Requête HTTP avec l'ID de l'événement et filtres
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getEventScans(req, res) {
    try {
      const { eventId } = req.params;
      const { startDate, endDate, location, checkpointId, scanType, limit, offset } = req.query;

      logger.core('Récupération scans événement', {
        eventId,
        filters: { startDate, endDate, location, checkpointId, scanType }
      });

      // ÉTAPE 1 : Récupérer tous les scans de l'événement
      const eventKey = `event_${eventId}`;
      const allScans = this.scanRecords.get(eventKey) || [];

      // ÉTAPE 2 : Filtrer les scans selon les critères
      let filteredScans = allScans.filter(scan => {
        // Filtre par date
        if (startDate) {
          const scanDate = new Date(scan.createdAt);
          if (scanDate < new Date(startDate)) return false;
        }
        if (endDate) {
          const scanDate = new Date(scan.createdAt);
          if (scanDate > new Date(endDate)) return false;
        }

        // Filtre par localisation
        if (location && scan.scanContext.location !== location) return false;

        // Filtre par point de contrôle
        if (checkpointId && scan.scanContext.checkpointId !== checkpointId) return false;

        // Filtre par type de scan
        if (scanType && scan.scanType !== scanType) return false;

        return true;
      });

      // ÉTAPE 3 : Trier par date (plus récent d'abord)
      filteredScans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // ÉTAPE 4 : Appliquer la pagination
      const startIndex = parseInt(offset) || 0;
      const endIndex = startIndex + parseInt(limit);
      const paginatedScans = filteredScans.slice(startIndex, endIndex);

      // ÉTAPE 5 : Calculer les statistiques
      const statistics = this.calculateEventScanStatistics(filteredScans);

      return res.status(200).json(
        successResponse('Scans de l\'événement récupérés', {
          eventId,
          scans: paginatedScans,
          pagination: {
            total: filteredScans.length,
            offset: startIndex,
            limit: parseInt(limit),
            hasMore: endIndex < filteredScans.length
          },
          statistics,
          filters: {
            startDate,
            endDate,
            location,
            checkpointId,
            scanType
          },
          retrievedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération scans événement', {
        error: error.message,
        eventId: req.params.eventId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des scans de l\'événement', error.message)
      );
    }
  }

  /**
   * Récupère tous les scans pour un ticket spécifique
   * Fournit l'historique complet d'utilisation d'un ticket
   * @param {Object} req - Requête HTTP avec l'ID du ticket et filtres
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getTicketScans(req, res) {
    try {
      const { ticketId } = req.params;
      const { limit, offset, startDate, endDate } = req.query;

      logger.core('Récupération scans ticket', {
        ticketId,
        filters: { startDate, endDate }
      });

      // ÉTAPE 1 : Récupérer tous les scans du ticket
      const ticketKey = `ticket_${ticketId}`;
      const allScans = this.scanRecords.get(ticketKey) || [];

      // ÉTAPE 2 : Filtrer par date si spécifié
      let filteredScans = allScans;
      if (startDate || endDate) {
        filteredScans = allScans.filter(scan => {
          const scanDate = new Date(scan.createdAt);
          if (startDate && scanDate < new Date(startDate)) return false;
          if (endDate && scanDate > new Date(endDate)) return false;
          return true;
        });
      }

      // ÉTAPE 3 : Trier par date (plus récent d'abord)
      filteredScans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // ÉTAPE 4 : Appliquer la pagination
      const startIndex = parseInt(offset) || 0;
      const endIndex = startIndex + parseInt(limit);
      const paginatedScans = filteredScans.slice(startIndex, endIndex);

      // ÉTAPE 5 : Calculer les statistiques du ticket
      const statistics = this.calculateTicketScanStatistics(filteredScans);

      return res.status(200).json(
        successResponse('Scans du ticket récupérés', {
          ticketId,
          scans: paginatedScans,
          pagination: {
            total: filteredScans.length,
            offset: startIndex,
            limit: parseInt(limit),
            hasMore: endIndex < filteredScans.length
          },
          statistics,
          filters: {
            startDate,
            endDate
          },
          retrievedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération scans ticket', {
        error: error.message,
        ticketId: req.params.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des scans du ticket', error.message)
      );
    }
  }

  /**
   * Fournit des statistiques en temps réel sur les scans
   * Utilisé pour les tableaux de bord et monitoring
   * @param {Object} req - Requête HTTP avec les filtres
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getRealtimeStats(req, res) {
    try {
      const { eventId, location, checkpointId, timeWindow } = req.query;

      logger.core('Récupération statistiques temps réel scans', {
        filters: { eventId, location, checkpointId, timeWindow }
      });

      // ÉTAPE 1 : Calculer la fenêtre de temps
      const windowMs = (parseInt(timeWindow) || 300) * 1000; // 5 minutes par défaut
      const windowStart = new Date(Date.now() - windowMs);

      // ÉTAPE 2 : Récupérer tous les scans récents
      const recentScans = [];
      for (const [key, value] of this.scanRecords.entries()) {
        if (key.startsWith('event_') || key.startsWith('ticket_')) {
          continue; // Ignorer les clés d'index
        }
        
        if (value.createdAt && new Date(value.createdAt) >= windowStart) {
          recentScans.push(value);
        }
      }

      // ÉTAPE 3 : Filtrer selon les critères
      let filteredScans = recentScans;
      if (eventId) {
        filteredScans = filteredScans.filter(scan => scan.eventId === eventId);
      }
      if (location) {
        filteredScans = filteredScans.filter(scan => scan.scanContext.location === location);
      }
      if (checkpointId) {
        filteredScans = filteredScans.filter(scan => scan.scanContext.checkpointId === checkpointId);
      }

      // ÉTAPE 4 : Calculer les statistiques temps réel
      const realtimeStats = this.calculateRealtimeStatistics(filteredScans, windowMs);

      return res.status(200).json(
        successResponse('Statistiques temps réel récupérées', {
          timeWindow: windowMs / 1000, // en secondes
          windowStart: windowStart.toISOString(),
          windowEnd: new Date().toISOString(),
          stats: realtimeStats,
          filters: {
            eventId,
            location,
            checkpointId
          },
          generatedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération statistiques temps réel scans', {
        error: error.message
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des statistiques temps réel', error.message)
      );
    }
  }

  /**
   * Analyse un scan pour détecter des schémas de fraude
   * Utilisé pour la validation avancée et la sécurité
   * @param {Object} req - Requête HTTP avec les données à analyser
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async detectFraud(req, res) {
    try {
      const { ticketId, scanContext, historicalData } = req.body;

      logger.core('Détection de fraude scan', {
        ticketId,
        scanLocation: scanContext.location,
        deviceId: scanContext.deviceId
      });

      // ÉTAPE 1 : Récupérer les scans récents du ticket
      const ticketKey = `ticket_${ticketId}`;
      const ticketScans = this.scanRecords.get(ticketKey) || [];

      // ÉTAPE 2 : Analyser les schémas de fraude
      const fraudAnalysis = this.performFraudAnalysis(scanContext, ticketScans, historicalData);

      // ÉTAPE 3 : Stocker l'analyse pour référence future
      const analysisKey = `fraud_${ticketId}_${Date.now()}`;
      this.fraudPatterns.set(analysisKey, fraudAnalysis);

      return res.status(200).json(
        successResponse('Analyse de fraude terminée', {
          ticketId,
          scanContext,
          fraudAnalysis,
          recommendation: this.getFraudRecommendation(fraudAnalysis)
        })
      );

    } catch (error) {
      logger.error('Échec détection de fraude scan', {
        error: error.message,
        ticketId: req.body.ticketId
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la détection de fraude', error.message)
      );
    }
  }

  /**
   * Fournit des données agrégées sur les scans
   * Utilisé pour les rapports et analytiques
   * @param {Object} req - Requête HTTP avec les paramètres d'agrégation
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async getAggregatedScans(req, res) {
    try {
      const { eventId, groupBy, startDate, endDate, metrics } = req.query;

      logger.core('Récupération scans agrégés', {
        filters: { eventId, groupBy, startDate, endDate, metrics }
      });

      // ÉTAPE 1 : Récupérer tous les scans dans la période
      const allScans = [];
      for (const [key, value] of this.scanRecords.entries()) {
        if (key.startsWith('event_') && (!eventId || key === `event_${eventId}`)) {
          allScans.push(...value);
        }
      }

      // ÉTAPE 2 : Filtrer par période
      let filteredScans = allScans;
      if (startDate) {
        filteredScans = filteredScans.filter(scan => 
          new Date(scan.createdAt) >= new Date(startDate)
        );
      }
      if (endDate) {
        filteredScans = filteredScans.filter(scan => 
          new Date(scan.createdAt) <= new Date(endDate)
        );
      }

      // ÉTAPE 3 : Agréger selon le groupBy demandé
      const aggregatedData = this.aggregateScans(filteredScans, groupBy, metrics);

      return res.status(200).json(
        successResponse('Données agrégées récupérées', {
          aggregation: {
            groupBy,
            metrics,
            period: { startDate, endDate },
            totalScans: filteredScans.length
          },
          data: aggregatedData,
          generatedAt: new Date().toISOString()
        })
      );

    } catch (error) {
      logger.error('Échec récupération scans agrégés', {
        error: error.message
      });

      return res.status(500).json(
        errorResponse('Erreur lors de la récupération des données agrégées', error.message)
      );
    }
  }

  /**
   * Health check du service de scans interne
   * @param {Object} req - Requête HTTP
   * @param {Object} res - Réponse HTTP à renvoyer
   */
  async healthCheck(req, res) {
    try {
      // Vérifier l'état du stockage interne
      const storageHealth = {
        totalRecords: this.scanRecords.size,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

      // Simuler une vérification de connectivité
      const connectivityHealth = {
        database: this.checkDatabaseConnectivity(),
        eventCore: this.checkEventCoreConnectivity()
      };

      const allHealthy = connectivityHealth.database && connectivityHealth.eventCore;

      return res.status(allHealthy ? 200 : 503).json(
        successResponse('Health check scans service', {
          healthy: allHealthy,
          service: 'internal-scans',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          storage: storageHealth,
          connectivity: connectivityHealth
        })
      );

    } catch (error) {
      logger.error('Health check scans service failed', { error: error.message });

      return res.status(503).json(
        errorResponse('Health check failed', error.message)
      );
    }
  }

  /**
   * Analyse un scan pour la détection de fraude
   * @param {Object} scanContext - Contexte du scan actuel
   * @param {Array} ticketScans - Scans précédents du ticket
   * @param {Object} historicalData - Données historiques additionnelles
   * @returns {Object} - Analyse de fraude
   */
  async analyzeForFraud(scanRecord, ticketScans) {
    const fraudFlags = [];
    const riskScore = 0;

    // Flag 1 : Scans trop rapprochés
    if (ticketScans.length > 0) {
      const lastScan = ticketScans[ticketScans.length - 1];
      const lastScanTime = new Date(lastScan.createdAt);
      const currentScanTime = new Date(scanRecord.createdAt);
      const timeDiff = currentScanTime - lastScanTime;
      
      if (timeDiff < 10000) { // Moins de 10 secondes
        fraudFlags.push({
          type: 'RAPID_SCANS',
          severity: 'high',
          description: 'Scans trop rapprochés',
          timeDiff
        });
        riskScore += 30;
      } else if (timeDiff < 30000) { // Moins de 30 secondes
        fraudFlags.push({
          type: 'FREQUENT_SCANS',
          severity: 'medium',
          description: 'Scans fréquents',
          timeDiff
        });
        riskScore += 15;
      }
    }

    // Flag 2 : Localisations multiples
    const recentScans = ticketScans.slice(-5); // 5 derniers scans
    const uniqueLocations = new Set(recentScans.map(scan => scan.scanContext.location));
    if (uniqueLocations.size > 1) {
      fraudFlags.push({
        type: 'MULTIPLE_LOCATIONS',
        severity: 'high',
        description: 'Scans depuis plusieurs localisations',
        locations: Array.from(uniqueLocations)
      });
      riskScore += 25;
    }

    // Flag 3 : Devices multiples
    const uniqueDevices = new Set(recentScans.map(scan => scan.scanContext.deviceId));
    if (uniqueDevices.size > 1) {
      fraudFlags.push({
        type: 'MULTIPLE_DEVICES',
        severity: 'medium',
        description: 'Scans depuis plusieurs devices',
        devices: Array.from(uniqueDevices)
      });
      riskScore += 20;
    }

    // Flag 4 : Heures inhabituelles
    const scanHour = new Date(scanRecord.createdAt).getHours();
    if (scanHour < 6 || scanHour > 22) {
      fraudFlags.push({
        type: 'UNUSUAL_HOURS',
        severity: 'low',
        description: 'Scan à des heures inhabituelles',
        hour: scanHour
      });
      riskScore += 10;
    }

    return {
      detected: fraudFlags.length > 0,
      flags: fraudFlags,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      recommendation: this.getFraudRecommendation({ detected: fraudFlags.length > 0, riskScore })
    };
  }

  /**
   * Effectue une analyse complète de fraude
   * @param {Object} scanContext - Contexte du scan
   * @param {Array} ticketScans - Scans du ticket
   * @param {Object} historicalData - Données historiques
   * @returns {Object} - Analyse complète
   */
  performFraudAnalysis(scanContext, ticketScans, historicalData) {
    // Analyse temporelle
    const temporalAnalysis = this.analyzeTemporalPatterns(scanContext, ticketScans);
    
    // Analyse géographique
    const geographicAnalysis = this.analyzeGeographicPatterns(scanContext, ticketScans);
    
    // Analyse de devices
    const deviceAnalysis = this.analyzeDevicePatterns(scanContext, ticketScans);
    
    // Analyse comportementale
    const behavioralAnalysis = this.analyzeBehavioralPatterns(scanContext, ticketScans);

    return {
      temporal: temporalAnalysis,
      geographic: geographicAnalysis,
      device: deviceAnalysis,
      behavioral: behavioralAnalysis,
      overall: {
        riskScore: temporalAnalysis.riskScore + geographicAnalysis.riskScore + 
                   deviceAnalysis.riskScore + behavioralAnalysis.riskScore,
        flags: [...temporalAnalysis.flags, ...geographicAnalysis.flags, 
                ...deviceAnalysis.flags, ...behavioralAnalysis.flags],
        detected: (temporalAnalysis.flags.length + geographicAnalysis.flags.length + 
                 deviceAnalysis.flags.length + behavioralAnalysis.flags.length) > 0
      }
    };
  }

  /**
   * Analyse les patterns temporels
   */
  analyzeTemporalPatterns(scanContext, ticketScans) {
    const flags = [];
    let riskScore = 0;

    // Analyse des intervalles entre scans
    if (ticketScans.length > 1) {
      const intervals = [];
      for (let i = 1; i < ticketScans.length; i++) {
        const current = new Date(ticketScans[i].createdAt);
        const previous = new Date(ticketScans[i-1].createdAt);
        intervals.push(current - previous);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const minInterval = Math.min(...intervals);

      if (avgInterval < 60000) { // Moins d'une minute en moyenne
        flags.push({
          type: 'HIGH_FREQUENCY',
          severity: 'high',
          description: 'Fréquence de scans anormalement élevée',
          avgInterval
        });
        riskScore += 25;
      }

      if (minInterval < 5000) { // Moins de 5 secondes minimum
        flags.push({
          type: 'IMPOSSIBLE_FREQUENCY',
          severity: 'critical',
          description: 'Fréquence de scans impossible',
          minInterval
        });
        riskScore += 50;
      }
    }

    return { flags, riskScore };
  }

  /**
   * Analyse les patterns géographiques
   */
  analyzeGeographicPatterns(scanContext, ticketScans) {
    const flags = [];
    let riskScore = 0;

    const locations = ticketScans.map(scan => scan.scanContext.location);
    const uniqueLocations = [...new Set(locations)];

    if (uniqueLocations.length > 3) {
      flags.push({
        type: 'GEOGRAPHIC_SPREAD',
        severity: 'high',
        description: 'Scans depuis trop de localisations différentes',
        locations: uniqueLocations
      });
      riskScore += 20;
    }

    // Vérifier les distances entre localisations (si coordonnées disponibles)
    const coordinates = ticketScans
      .filter(scan => scan.scanContext.coordinates)
      .map(scan => scan.scanContext.coordinates);

    if (coordinates.length > 1) {
      // Calculer les distances (simplifié)
      for (let i = 1; i < coordinates.length; i++) {
        const distance = this.calculateDistance(coordinates[i-1], coordinates[i]);
        if (distance > 10000) { // Plus de 10km
          flags.push({
            type: 'IMPOSSIBLE_DISTANCE',
            severity: 'critical',
            description: 'Distance entre scans impossible',
            distance
          });
          riskScore += 40;
        }
      }
    }

    return { flags, riskScore };
  }

  /**
   * Analyse les patterns de devices
   */
  analyzeDevicePatterns(scanContext, ticketScans) {
    const flags = [];
    let riskScore = 0;

    const devices = ticketScans.map(scan => scan.scanContext.deviceId);
    const uniqueDevices = [...new Set(devices)];

    if (uniqueDevices.length > 2) {
      flags.push({
        type: 'DEVICE_SHARING',
        severity: 'medium',
        description: 'Utilisation de multiples devices',
        devices: uniqueDevices
      });
      riskScore += 15;
    }

    return { flags, riskScore };
  }

  /**
   * Analyse les patterns comportementaux
   */
  analyzeBehavioralPatterns(scanContext, ticketScans) {
    const flags = [];
    let riskScore = 0;

    // Analyse des heures de scan
    const hours = ticketScans.map(scan => new Date(scan.createdAt).getHours());
    const nightScans = hours.filter(hour => hour < 6 || hour > 22);

    if (nightScans.length > ticketScans.length * 0.5) {
      flags.push({
        type: 'NIGHT_ACTIVITY',
        severity: 'low',
        description: 'Activité de scan nocturne inhabituelle',
        nightScans: nightScans.length,
        totalScans: ticketScans.length
      });
      riskScore += 10;
    }

    return { flags, riskScore };
  }

  /**
   * Calcule la distance entre deux coordonnées GPS (simplifié)
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance en mètres
  }

  /**
   * Détermine le niveau de risque
   */
  getRiskLevel(score) {
    if (score >= 50) return 'critical';
    if (score >= 30) return 'high';
    if (score >= 15) return 'medium';
    if (score >= 5) return 'low';
    return 'minimal';
  }

  /**
   * Fournit une recommandation basée sur l'analyse
   */
  getFraudRecommendation(analysis) {
    if (!analysis.detected) {
      return {
        action: 'allow',
        message: 'Aucun risque détecté',
        confidence: 0.95
      };
    }

    if (analysis.riskScore >= 50) {
      return {
        action: 'block',
        message: 'Risque critique - Bloquer le scan',
        confidence: 0.9
      };
    }

    if (analysis.riskScore >= 30) {
      return {
        action: 'review',
        message: 'Risque élevé - Validation manuelle requise',
        confidence: 0.8
      };
    }

    return {
      action: 'monitor',
      message: 'Risque modéré - Surveillance accrue',
      confidence: 0.7
    };
  }

  /**
   * Calcule les statistiques d'un événement
   */
  calculateEventScanStatistics(scans) {
    const totalScans = scans.length;
    const validScans = scans.filter(scan => scan.validationResult.valid).length;
    const invalidScans = totalScans - validScans;

    const locations = {};
    const checkpoints = {};
    const scanTypes = {};
    const hourlyStats = {};

    scans.forEach(scan => {
      // Localisations
      const location = scan.scanContext.location;
      locations[location] = (locations[location] || 0) + 1;

      // Points de contrôle
      const checkpoint = scan.scanContext.checkpointId;
      if (checkpoint) {
        checkpoints[checkpoint] = (checkpoints[checkpoint] || 0) + 1;
      }

      // Types de scan
      const scanType = scan.scanType;
      scanTypes[scanType] = (scanTypes[scanType] || 0) + 1;

      // Statistiques horaires
      const hour = new Date(scan.createdAt).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    return {
      totalScans,
      validScans,
      invalidScans,
      validityRate: totalScans > 0 ? (validScans / totalScans * 100).toFixed(2) : 0,
      locations,
      checkpoints,
      scanTypes,
      hourlyStats,
      peakHour: Object.keys(hourlyStats).reduce((a, b) => 
        hourlyStats[a] > hourlyStats[b] ? a : b
      ),
      firstScan: scans.length > 0 ? scans[scans.length - 1].createdAt : null,
      lastScan: scans.length > 0 ? scans[0].createdAt : null
    };
  }

  /**
   * Calcule les statistiques d'un ticket
   */
  calculateTicketScanStatistics(scans) {
    const totalScans = scans.length;
    const validScans = scans.filter(scan => scan.validationResult.valid).length;

    const locations = {};
    const devices = {};
    const operators = {};

    scans.forEach(scan => {
      // Localisations
      const location = scan.scanContext.location;
      locations[location] = (locations[location] || 0) + 1;

      // Devices
      const device = scan.scanContext.deviceId;
      devices[device] = (devices[device] || 0) + 1;

      // Opérateurs
      const operator = scan.scanContext.operatorId;
      if (operator) {
        operators[operator] = (operators[operator] || 0) + 1;
      }
    });

    return {
      totalScans,
      validScans,
      invalidScans,
      validityRate: totalScans > 0 ? (validScans / totalScans * 100).toFixed(2) : 0,
      uniqueLocations: Object.keys(locations).length,
      uniqueDevices: Object.keys(devices).length,
      locations,
      devices,
      operators,
      firstScan: scans.length > 0 ? scans[scans.length - 1].createdAt : null,
      lastScan: scans.length > 0 ? scans[0].createdAt : null
    };
  }

  /**
   * Calcule les statistiques en temps réel
   */
  calculateRealtimeStatistics(scans, windowMs) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const recentScans = scans.filter(scan => 
      new Date(scan.createdAt) >= windowStart
    );

    const scansPerSecond = recentScans.length / (windowMs / 1000);
    const validScans = recentScans.filter(scan => scan.validationResult.valid).length;

    return {
      totalScans: recentScans.length,
      validScans,
      invalidScans: recentScans.length - validScans,
      scansPerSecond: scansPerSecond.toFixed(2),
      validityRate: recentScans.length > 0 ? (validScans / recentScans.length * 100).toFixed(2) : 0,
      windowSize: windowMs / 1000,
      windowStart: windowStart.toISOString(),
      windowEnd: now.toISOString()
    };
  }

  /**
   * Agrège les données de scans selon différents critères
   */
  aggregateScans(scans, groupBy, metrics) {
    const aggregated = {};

    scans.forEach(scan => {
      let groupKey;

      switch (groupBy) {
        case 'hour':
          groupKey = new Date(scan.createdAt).toISOString().slice(0, 13); // YYYY-MM-DDTHH
          break;
        case 'day':
          groupKey = new Date(scan.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
          break;
        case 'location':
          groupKey = scan.scanContext.location;
          break;
        case 'checkpoint':
          groupKey = scan.scanContext.checkpointId || 'unknown';
          break;
        default:
          groupKey = 'all';
      }

      if (!aggregated[groupKey]) {
        aggregated[groupKey] = {
          count: 0,
          validScans: 0,
          uniqueTickets: new Set(),
          fraudFlags: 0
        };
      }

      const group = aggregated[groupKey];
      group.count++;
      
      if (scan.validationResult.valid) {
        group.validScans++;
      }
      
      group.uniqueTickets.add(scan.ticketId);
      
      // Compter les flags de fraude (simplifié)
      if (scan.validationResult.fraudFlags && scan.validationResult.fraudFlags.length > 0) {
        group.fraudFlags += scan.validationResult.fraudFlags.length;
      }
    });

    // Convertir les Sets en nombres
    Object.keys(aggregated).forEach(key => {
      aggregated[key].uniqueTickets = aggregated[key].uniqueTickets.size;
      if (metrics.includes('fraud_rate')) {
        aggregated[key].fraudRate = aggregated[key].count > 0 ? 
          (aggregated[key].fraudFlags / aggregated[key].count * 100).toFixed(2) : 0;
      }
      if (metrics.includes('avg_time')) {
        // Moyenne du temps de traitement (simulé)
        aggregated[key].avgTime = 150; // ms
      }
    });

    return aggregated;
  }

  /**
   * Vérifie la connectivité avec la base de données
   */
  checkDatabaseConnectivity() {
    // Simuler une vérification de base de données
    return true;
  }

  /**
   * Vérifie la connectivité avec Event Core
   */
  checkEventCoreConnectivity() {
    // Simuler une vérification du service Event Core
    return true;
  }
}

module.exports = new InternalScansController();
