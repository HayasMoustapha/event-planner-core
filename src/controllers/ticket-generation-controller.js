/**
 * Controller pour la génération de billets
 * Gère les endpoints HTTP pour créer et suivre les jobs de génération de billets
 * 
 * Principes :
 * - Validation des permissions utilisateur
 * - Validation des données d'entrée
 * - Réponses structurées et cohérentes
 * - Gestion des erreurs appropriée
 */

const { createTicketGenerationJobService, getTicketGenerationJobStatusService } = require('../queues/ticket-generation-service');
const { createTicketGenerationJob: createTicketGeneratorJob } = require('../queues/ticket-generation-producer');
const { createModernTicketJobSchema } = require('../validators/ticket-generation.validator');

/**
 * Crée un nouveau job de génération de billets
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function createTicketGenerationJob(req, res, db) {
  try {
    const { event_id, tickets } = req.body;
    const user_id = req.user.id; // ID de l'utilisateur authentifié
    
    // Validation des données d'entrée
    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id est obligatoire',
        code: 'MISSING_EVENT_ID'
      });
    }
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tickets est obligatoire et doit être un tableau non vide',
        code: 'MISSING_TICKETS'
      });
    }
    
    // Validation de chaque ticket
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      
      if (!ticket.ticket_id) {
        return res.status(400).json({
          success: false,
          error: `ticket_id est obligatoire pour le ticket à l'index ${i}`,
          code: 'MISSING_TICKET_ID'
        });
      }
      
      if (!ticket.ticket_code) {
        return res.status(400).json({
          success: false,
          error: `ticket_code est obligatoire pour le ticket à l'index ${i}`,
          code: 'MISSING_TICKET_CODE'
        });
      }
      
      if (!ticket.template_path) {
        return res.status(400).json({
          success: false,
          error: `template_path est obligatoire pour le ticket à l'index ${i}`,
          code: 'MISSING_TEMPLATE_PATH'
        });
      }
      
      if (!ticket.render_payload) {
        return res.status(400).json({
          success: false,
          error: `render_payload est obligatoire pour le ticket à l'index ${i}`,
          code: 'MISSING_RENDER_PAYLOAD'
        });
      }
    }
    
    // Création du job de génération
    const job = await createTicketGenerationJobService({
      event_id,
      tickets,
      created_by: user_id
    }, db);
    
    res.status(201).json({
      success: true,
      data: {
        job_id: job.job_uid,
        redis_job_id: job.redis_job_id,
        event_id: job.event_id,
        tickets_count: job.tickets_count,
        status: job.status,
        created_at: job.created_at
      },
      message: 'Job de génération de billets créé avec succès'
    });
    
  } catch (error) {
    console.error('[CONTROLLER] Erreur création job génération:', error.message);
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('Permissions insuffisantes')) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour générer des billets pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la création du job de génération',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Récupère le statut d'un job de génération de billets
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function getTicketGenerationJobStatus(req, res, db) {
  try {
    const { job_id } = req.params;
    
    if (!job_id) {
      return res.status(400).json({
        success: false,
        error: 'job_id est obligatoire',
        code: 'MISSING_JOB_ID'
      });
    }
    
    // Récupération du statut du job
    const jobStatus = await getTicketGenerationJobStatusService(job_id, db);
    
    res.status(200).json({
      success: true,
      data: jobStatus,
      message: 'Statut du job récupéré avec succès'
    });
    
  } catch (error) {
    console.error('[CONTROLLER] Erreur récupération statut job:', error.message);
    
    if (error.message.includes('Job non trouvé')) {
      return res.status(404).json({
        success: false,
        error: 'Job non trouvé',
        code: 'JOB_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération du statut du job',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Récupère la liste des jobs de génération pour un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function getEventGenerationJobs(req, res, db) {
  try {
    const { event_id } = req.params;
    const user_id = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    
    if (!event_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id est obligatoire',
        code: 'MISSING_EVENT_ID'
      });
    }
    
    // Vérification des permissions (l'utilisateur doit être organisateur)
    const permissionQuery = `
      SELECT e.id 
      FROM events e 
      WHERE e.id = $1 AND e.organizer_id = $2
    `;
    
    const permissionResult = await db.query(permissionQuery, [event_id, user_id]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // Construction de la requête
    let query = `
      SELECT 
        jg.id,
        jg.uid,
        jg.status,
        jg.tickets_count,
        jg.tickets_processed,
        jg.error_message,
        jg.created_at,
        jg.updated_at,
        jg.completed_at
      FROM ticket_generation_jobs jg
      WHERE jg.event_id = $1
    `;
    
    const params = [event_id];
    
    // Filtre par statut si fourni
    if (status) {
      query += ` AND jg.status = $${params.length + 1}`;
      params.push(status);
    }
    
    // Tri et pagination
    query += ` ORDER BY jg.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await db.query(query, params);
    
    // Comptage total pour pagination
    let countQuery = `SELECT COUNT(*) FROM ticket_generation_jobs WHERE event_id = $1`;
    const countParams = [event_id];
    
    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalJobs = parseInt(countResult.rows[0].count);
    
    res.status(200).json({
      success: true,
      data: {
        jobs: result.rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: totalJobs,
          total_pages: Math.ceil(totalJobs / limit)
        }
      },
      message: 'Jobs de génération récupérés avec succès'
    });
    
  } catch (error) {
    console.error('[CONTROLLER] Erreur récupération jobs événement:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la récupération des jobs',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Crée un job de génération de billets avec la structure moderne
 * Accepte la structure ticketData/options et la convertit pour ticket-generator
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} db - Instance de base de données
 */
async function createModernTicketGenerationJob(req, res, db) {
  try {
    // Validation des données d'entrée avec Joi
    const { error, value } = createModernTicketJobSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }
    
    const { ticketData, options } = value;
    const user_id = req.user.id; // ID de l'utilisateur authentifié
    
    // Conversion vers la structure attendue par ticket-generator-service
    const convertedTicketData = {
      ticket_id: ticketData.id,
      ticket_code: `${ticketData.id}-${ticketData.eventId}`, // Générer un code unique
      template_path: options?.templateId || 'default', // Template par défaut ou spécifié
      render_payload: {
        ticketData: {
          id: ticketData.id,
          eventId: ticketData.eventId,
          userId: ticketData.userId,
          type: ticketData.type || 'standard',
          attendeeName: ticketData.attendeeName,
          attendeeEmail: ticketData.attendeeEmail,
          attendeePhone: ticketData.attendeePhone || null,
          eventTitle: ticketData.eventTitle || 'Événement',
          eventDate: ticketData.eventDate || new Date().toISOString(),
          location: ticketData.location || 'Non spécifié'
        },
        options: {
          qrFormat: options?.qrFormat || 'base64',
          qrSize: options?.qrSize || 'medium',
          pdfFormat: options?.pdfFormat !== false,
          includeLogo: options?.includeLogo || false,
          templateId: options?.templateId,
          customFields: options?.customFields,
          pdfOptions: options?.pdfOptions
        }
      }
    };
    
    // Création du job avec la structure convertie
    const jobData = {
      event_id: ticketData.eventId,
      tickets: [convertedTicketData], // Tableau avec un seul ticket
      created_by: user_id
    };
    
    // Utiliser le service direct pour communiquer avec ticket-generator
    const job = await createTicketGeneratorJob(jobData);
    
    // Créer aussi l'entrée en base pour le suivi
    const dbJob = await createTicketGenerationJobService(jobData, db);
    
    res.status(201).json({
      success: true,
      data: {
        job_id: job.job_id,
        generation_job_id: job.generation_job_id,
        db_job_id: dbJob.job_uid,
        event_id: ticketData.eventId,
        ticket_id: ticketData.id,
        status: 'pending',
        created_at: job.created_at,
        estimated_completion: new Date(Date.now() + 30000).toISOString() // ~30s estimés
      },
      message: 'Job de génération de billet créé avec succès'
    });
    
  } catch (error) {
    console.error('[CONTROLLER] Erreur création job génération moderne:', error.message);
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('Permissions insuffisantes')) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour générer des billets pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne lors de la création du job de génération',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = {
  createTicketGenerationJob,
  createModernTicketGenerationJob,
  getTicketGenerationJobStatus,
  getEventGenerationJobs
};
