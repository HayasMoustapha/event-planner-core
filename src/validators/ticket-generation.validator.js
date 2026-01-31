/**
 * Schémas de validation pour la génération de tickets
 * Valide les structures de données modernes pour ticket-generator-service
 */

const Joi = require('joi');

/**
 * Schéma de validation pour ticketData dans la structure moderne
 */
const ticketDataSchema = Joi.object({
  id: Joi.string().required().description('ID unique du ticket'),
  eventId: Joi.string().required().description('ID de l\'événement'),
  userId: Joi.string().required().description('ID de l\'utilisateur'),
  type: Joi.string().valid('standard', 'vip', 'premium', 'staff').default('standard').description('Type de ticket'),
  attendeeName: Joi.string().required().description('Nom du participant'),
  attendeeEmail: Joi.string().email().required().description('Email du participant'),
  attendeePhone: Joi.string().optional().description('Téléphone du participant'),
  eventTitle: Joi.string().optional().description('Titre de l\'événement'),
  eventDate: Joi.string().isoDate().optional().description('Date de l\'événement'),
  location: Joi.string().optional().description('Lieu de l\'événement')
});

/**
 * Schéma de validation pour les options de génération
 */
const generationOptionsSchema = Joi.object({
  qrFormat: Joi.string().valid('base64', 'png', 'svg').default('base64').description('Format du QR code'),
  qrSize: Joi.string().valid('small', 'medium', 'large').default('medium').description('Taille du QR code'),
  pdfFormat: Joi.boolean().default(true).description('Générer un PDF ou non'),
  includeLogo: Joi.boolean().default(false).description('Inclure un logo ou non'),
  templateId: Joi.string().optional().description('ID du template PDF'),
  customFields: Joi.object().optional().description('Champs personnalisés'),
  pdfOptions: Joi.object({
    format: Joi.string().valid('A4', 'A5', 'letter').default('A4').description('Format du PDF'),
    margins: Joi.object().optional().description('Marges personnalisées'),
    fontSize: Joi.number().min(8).max(24).optional().description('Taille de la police')
  }).optional().description('Options spécifiques au PDF')
});

/**
 * Schéma principal pour la création de job de génération moderne
 */
const createModernTicketJobSchema = Joi.object({
  ticketData: ticketDataSchema.required(),
  options: generationOptionsSchema.optional()
});

/**
 * Schéma pour la mise à jour du statut d'un job
 */
const updateJobStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').required(),
  progress: Joi.number().min(0).max(100).optional().description('Progression en pourcentage'),
  error_message: Joi.string().optional().description('Message d\'erreur en cas d\'échec'),
  tickets_processed: Joi.number().min(0).optional().description('Nombre de tickets traités')
});

/**
 * Schéma pour les résultats de génération
 */
const generationResultSchema = Joi.object({
  job_id: Joi.string().required(),
  status: Joi.string().valid('completed', 'failed').required(),
  tickets: Joi.array().items(
    Joi.object({
      ticket_id: Joi.string().required(),
      ticket_code: Joi.string().required(),
      qr_code_data: Joi.string().optional().description('Données du QR code en base64'),
      pdf_data: Joi.string().optional().description('Données du PDF en base64'),
      file_url: Joi.string().optional().description('URL du fichier généré'),
      success: Joi.boolean().required(),
      error_message: Joi.string().optional().description('Message d\'erreur si échec')
    })
  ).required(),
  summary: Joi.object({
    total: Joi.number().required(),
    successful: Joi.number().required(),
    failed: Joi.number().required(),
    processing_time: Joi.number().optional().description('Temps de traitement en ms')
  }).required(),
  generated_at: Joi.string().isoDate().required()
});

module.exports = {
  ticketDataSchema,
  generationOptionsSchema,
  createModernTicketJobSchema,
  updateJobStatusSchema,
  generationResultSchema
};
