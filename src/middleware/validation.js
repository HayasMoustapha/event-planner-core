const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        errors
      });
    }

    req[property] = value;
    next();
  };
};

// Common validation schemas - Aligned with 001_initial_schema.sql
const schemas = {
  // ============================================
  // EVENT VALIDATIONS
  // Schema: id, title, description, event_date, location, status, organizer_id
  // ============================================
  createEvent: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(5000).optional(),
    event_date: Joi.date().iso().min('now').required(),
    location: Joi.string().max(255).required()
  }),

  updateEvent: Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(5000).optional(),
    event_date: Joi.date().iso().min('now').optional(),
    location: Joi.string().max(255).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional()
  }).min(1),

  // ============================================
  // GUEST VALIDATIONS
  // Schema: id, first_name, last_name (nullable), email (unique), phone (unique), status
  // ============================================
  createGuest: Joi.object({
    first_name: Joi.string().min(1).max(255).required(),
    last_name: Joi.string().max(255).optional().allow('', null),
    email: Joi.string().email().max(255).required(),
    phone: Joi.string().max(50).pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
  }),

  updateGuest: Joi.object({
    first_name: Joi.string().min(1).max(255).optional(),
    last_name: Joi.string().max(255).optional().allow('', null),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().max(50).pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
  }).min(1),

  // ============================================
  // EVENT_GUEST VALIDATIONS
  // Schema: id, event_id, guest_id, is_present, check_in_time, invitation_code (unique), status
  // ============================================
  addGuestToEvent: Joi.object({
    guest_id: Joi.number().integer().positive().required(),
    invitation_code: Joi.string().min(6).max(255).required()
  }),

  updateEventGuest: Joi.object({
    is_present: Joi.boolean().optional(),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
  }).min(1),

  checkInGuest: Joi.object({
    invitation_code: Joi.string().min(6).max(255).required()
  }),

  // ============================================
  // INVITATION VALIDATIONS
  // Schema: id, event_guest_id, invitation_code (unique), sent_at, opened_at, status
  // ============================================
  createInvitation: Joi.object({
    event_guest_id: Joi.number().integer().positive().required(),
    invitation_code: Joi.string().min(6).max(255).required()
  }),

  updateInvitation: Joi.object({
    status: Joi.string().valid('pending', 'sent', 'opened', 'failed').optional(),
    sent_at: Joi.date().iso().optional(),
    opened_at: Joi.date().iso().optional()
  }).min(1),

  // ============================================
  // TICKET TYPE VALIDATIONS
  // Schema: id, event_id, name, description, type, quantity, price, currency, available_from, available_to
  // ============================================
  createTicketType: Joi.object({
    event_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(5000).optional(),
    type: Joi.string().valid('free', 'paid', 'donation').required(),
    quantity: Joi.number().integer().min(0).required(),
    price: Joi.number().precision(2).min(0).default(0),
    currency: Joi.string().length(3).default('EUR'),
    available_from: Joi.date().iso().optional(),
    available_to: Joi.date().iso().optional()
  }),

  updateTicketType: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(5000).optional(),
    type: Joi.string().valid('free', 'paid', 'donation').optional(),
    quantity: Joi.number().integer().min(0).optional(),
    price: Joi.number().precision(2).min(0).optional(),
    currency: Joi.string().length(3).optional(),
    available_from: Joi.date().iso().optional(),
    available_to: Joi.date().iso().optional()
  }).min(1),

  // ============================================
  // TICKET TEMPLATE VALIDATIONS
  // Schema: id, name, description, preview_url, source_files_path, is_customizable
  // ============================================
  createTicketTemplate: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(5000).optional(),
    preview_url: Joi.string().uri().max(500).optional(),
    source_files_path: Joi.string().max(500).optional(),
    is_customizable: Joi.boolean().default(false)
  }),

  updateTicketTemplate: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(5000).optional(),
    preview_url: Joi.string().uri().max(500).optional(),
    source_files_path: Joi.string().max(500).optional(),
    is_customizable: Joi.boolean().optional()
  }).min(1),

  // ============================================
  // TICKET VALIDATIONS
  // Schema: id, ticket_code (unique), qr_code_data, ticket_type_id, ticket_template_id, event_guest_id, is_validated, validated_at, price, currency
  // ============================================
  generateTicket: Joi.object({
    event_guest_id: Joi.number().integer().positive().required(),
    ticket_type_id: Joi.number().integer().positive().required(),
    ticket_template_id: Joi.number().integer().positive().optional()
  }),

  validateTicketByCode: Joi.object({
    ticket_code: Joi.string().max(255).required()
  }),

  // ============================================
  // DESIGNER VALIDATIONS (Marketplace)
  // Schema: id, user_id (unique), brand_name, portfolio_url, is_verified
  // ============================================
  createDesigner: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    brand_name: Joi.string().min(1).max(255).required(),
    portfolio_url: Joi.string().uri().max(500).optional()
  }),

  updateDesigner: Joi.object({
    brand_name: Joi.string().min(1).max(255).optional(),
    portfolio_url: Joi.string().uri().max(500).optional(),
    is_verified: Joi.boolean().optional()
  }).min(1),

  // ============================================
  // TEMPLATE VALIDATIONS (Marketplace)
  // Schema: id, designer_id, name, description, preview_url, source_files_path, price, currency, status
  // ============================================
  createTemplate: Joi.object({
    designer_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(5000).optional(),
    preview_url: Joi.string().uri().max(500).optional(),
    source_files_path: Joi.string().max(500).optional(),
    price: Joi.number().precision(2).min(0).default(0),
    currency: Joi.string().length(3).default('EUR')
  }),

  updateTemplate: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(5000).optional(),
    preview_url: Joi.string().uri().max(500).optional(),
    source_files_path: Joi.string().max(500).optional(),
    price: Joi.number().precision(2).min(0).optional(),
    currency: Joi.string().length(3).optional(),
    status: Joi.string().valid('pending_review', 'approved', 'rejected').optional()
  }).min(1),

  // ============================================
  // PURCHASE VALIDATIONS (Marketplace)
  // Schema: id, user_id, template_id, purchase_date, amount, currency, transaction_id
  // ============================================
  createPurchase: Joi.object({
    template_id: Joi.number().integer().positive().required(),
    amount: Joi.number().precision(2).min(0).required(),
    currency: Joi.string().length(3).default('EUR'),
    transaction_id: Joi.string().max(255).optional()
  }),

  // ============================================
  // REVIEW VALIDATIONS
  // Schema: id, user_id, template_id, rating (1-5), comment
  // ============================================
  createReview: Joi.object({
    template_id: Joi.number().integer().positive().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(5000).optional()
  }),

  updateReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    comment: Joi.string().max(5000).optional()
  }).min(1),

  // ============================================
  // SYSTEM LOG VALIDATIONS (Admin)
  // Schema: id, level, message, context, created_by
  // ============================================
  createSystemLog: Joi.object({
    level: Joi.string().valid('info', 'warning', 'error').required(),
    message: Joi.string().required(),
    context: Joi.object().optional()
  }),

  // ============================================
  // ADMIN VALIDATIONS
  // ============================================
  moderateContent: Joi.object({
    contentType: Joi.string().valid('template', 'designer', 'event').required(),
    contentId: Joi.number().integer().positive().required(),
    action: Joi.string().valid('approve', 'reject', 'suspend').required(),
    reason: Joi.string().max(500).optional()
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // ID parameter
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Event-specific parameter
  eventIdParam: Joi.object({
    eventId: Joi.number().integer().positive().required()
  }),

  // Guest-specific parameter
  guestIdParam: Joi.object({
    guestId: Joi.number().integer().positive().required()
  }),

  // Ticket-specific parameter
  ticketIdParam: Joi.object({
    ticketId: Joi.number().integer().positive().required()
  }),

  // Ticket type parameter
  ticketTypeIdParam: Joi.object({
    ticketTypeId: Joi.number().integer().positive().required()
  }),

  // Template-specific parameter
  templateIdParam: Joi.object({
    templateId: Joi.number().integer().positive().required()
  }),

  // Designer-specific parameter
  designerIdParam: Joi.object({
    designerId: Joi.number().integer().positive().required()
  }),

  // Purchase-specific parameter
  purchaseIdParam: Joi.object({
    purchaseId: Joi.number().integer().positive().required()
  }),

  // Review-specific parameter
  reviewIdParam: Joi.object({
    reviewId: Joi.number().integer().positive().required()
  }),

  // Check-in parameter
  checkInParam: Joi.object({
    eventId: Joi.number().integer().positive().required(),
    guestId: Joi.number().integer().positive().required()
  }),

  // Event guest parameter
  eventGuestParam: Joi.object({
    eventId: Joi.number().integer().positive().required(),
    guestId: Joi.number().integer().positive().required()
  })
};

module.exports = {
  validate,
  schemas
};
