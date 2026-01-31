/**
 * Validateur unifié pour la génération de tickets
 * Structure optimisée pour event-planner-core → ticket-generator
 */

const Joi = require('joi');

/**
 * Schéma pour les données de ticket enrichi
 */
const enrichedTicketDataSchema = Joi.object({
  ticket_id: Joi.number().integer().positive().required().description('ID du ticket'),
  ticket_code: Joi.string().required().description('Code unique du ticket'),
  guest: Joi.object({
    name: Joi.string().required().description('Nom complet de l\'invité'),
    phone: Joi.string().optional().description('Téléphone de l\'invité'),
    email: Joi.string().email().required().description('Email de l\'invité')
  }).required(),
  ticket_type: Joi.object({
    id: Joi.number().integer().positive().required().description('ID du type de ticket'),
    name: Joi.string().required().description('Nom du type de ticket')
  }).required(),
  template: Joi.object({
    id: Joi.number().integer().positive().allow(null).description('ID du template'),
    preview_url: Joi.string().uri().allow(null).optional().description('URL de prévisualisation'),
    source_files_path: Joi.string().required().description('Chemin des fichiers source')
  }).required(),
  event: Joi.object({
    id: Joi.number().integer().positive().required().description('ID de l\'événement'),
    title: Joi.string().required().description('Titre de l\'événement'),
    location: Joi.string().required().description('Lieu de l\'événement'),
    date: Joi.string().isoDate().required().description('Date de l\'événement')
  }).required()
}).required();

/**
 * Schéma pour les options de génération
 */
const generationOptionsSchema = Joi.object({
  qrFormat: Joi.string().valid('base64', 'png', 'svg').default('base64').description('Format du QR code'),
  qrSize: Joi.string().valid('small', 'medium', 'large').default('medium').description('Taille du QR code'),
  pdfFormat: Joi.boolean().default(true).description('Générer un PDF ou non'),
  includeLogo: Joi.boolean().default(false).description('Inclure un logo ou non')
}).optional();

/**
 * Schéma principal pour la création de job de génération
 */
const createTicketGenerationJobSchema = Joi.object({
  job_id: Joi.number().integer().positive().required().description('ID du job'),
  event_id: Joi.number().integer().positive().required().description('ID de l\'événement'),
  tickets: Joi.array().items(enrichedTicketDataSchema).min(1).required().description('Liste des tickets à générer'),
  options: generationOptionsSchema
}).required();

/**
 * Schéma pour la mise à jour du statut d'un job (webhook)
 */
const updateJobStatusSchema = Joi.object({
  job_id: Joi.number().integer().positive().required().description('ID du job'),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').required().description('Statut du job'),
  timestamp: Joi.string().isoDate().required().description('Timestamp du traitement'),
  processing_time_ms: Joi.number().integer().min(0).optional().description('Temps de traitement en ms'),
  tickets: Joi.when('status', {
    is: Joi.string().valid('completed'),
    then: Joi.array().items(
      Joi.object({
        ticket_id: Joi.number().integer().positive().required().description('ID du ticket'),
        qr_code_data: Joi.string().optional().description('Données du QR code en base64'),
        pdf_file: Joi.object({
          url: Joi.string().required().description('URL du fichier PDF'),
          path: Joi.string().required().description('Chemin du fichier PDF'),
          size_bytes: Joi.number().integer().min(0).required().description('Taille du fichier en octets')
        }).required(),
        generated_at: Joi.string().isoDate().required().description('Date de génération'),
        success: Joi.boolean().required().description('Succès de la génération'),
        error_message: Joi.string().optional().description('Message d\'erreur si échec')
      })
    ).required().description('Résultats de génération des tickets'),
    otherwise: Joi.array().optional().description('Résultats de génération des tickets')
  }),
  summary: Joi.when('status', {
    is: Joi.string().valid('completed'),
    then: Joi.object({
      total: Joi.number().integer().min(0).required().description('Nombre total de tickets'),
      successful: Joi.number().integer().min(0).required().description('Nombre de tickets générés avec succès'),
      failed: Joi.number().integer().min(0).required().description('Nombre de tickets en échec')
    }).required().description('Résumé du traitement'),
    otherwise: Joi.object().optional().description('Résumé du traitement')
  })
}).required();

module.exports = {
  createTicketGenerationJobSchema,
  updateJobStatusSchema,
  enrichedTicketDataSchema,
  generationOptionsSchema
};
