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

// Common validation schemas
const schemas = {
  // Event validations
  createEvent: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    event_date: Joi.date().iso().min('now').required(),
    location: Joi.string().max(500).required()
  }),

  updateEvent: Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(2000).optional(),
    event_date: Joi.date().iso().min('now').optional(),
    location: Joi.string().max(500).optional(),
    status: Joi.string().valid('draft', 'published', 'archived').optional()
  }),

  // Guest validations
  createGuest: Joi.object({
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
  }),

  updateGuest: Joi.object({
    first_name: Joi.string().min(2).max(100).optional(),
    last_name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled').optional()
  }),

  // EventGuest validations
  addGuestToEvent: Joi.object({
    guest_id: Joi.number().integer().positive().required(),
    invitation_code: Joi.string().min(6).max(50).optional()
  }),

  checkInGuest: Joi.object({
    invitation_code: Joi.string().min(6).max(50).required()
  }),

  // Ticket Type validations
  createTicketType: Joi.object({
    event_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    type: Joi.string().valid('free', 'paid', 'donation').required(),
    quantity: Joi.number().integer().min(0).required(),
    price: Joi.number().min(0).optional(),
    currency: Joi.string().length(3).default('EUR'),
    available_from: Joi.date().iso().optional(),
    available_to: Joi.date().iso().optional()
  }),

  updateTicketType: Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(2000).optional(),
    type: Joi.string().valid('free', 'paid', 'donation').optional(),
    quantity: Joi.number().integer().min(0).optional(),
    price: Joi.number().min(0).optional(),
    currency: Joi.string().length(3).optional(),
    available_from: Joi.date().iso().optional(),
    available_to: Joi.date().iso().optional()
  }),

  // Ticket validations
  generateTicket: Joi.object({
    event_guest_id: Joi.number().integer().positive().required(),
    ticket_type_id: Joi.number().integer().positive().required()
  }),

  validateTicketByCode: Joi.object({
    ticket_code: Joi.string().required()
  }),

  // Marketplace validations
  createDesigner: Joi.object({
    user_id: Joi.number().integer().positive().required(),
    brand_name: Joi.string().min(2).max(255).required(),
    portfolio_url: Joi.string().uri().optional()
  }),

  createTemplate: Joi.object({
    designer_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    preview_url: Joi.string().uri().optional(),
    source_files_path: Joi.string().max(500).optional(),
    price: Joi.number().min(0).optional(),
    currency: Joi.string().length(3).default('EUR')
  }),

  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional()
  }),

  // Admin validations
  updateUserStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended').required()
  }),

  createSystemLog: Joi.object({
    level: Joi.string().valid('info', 'warning', 'error').required(),
    message: Joi.string().required(),
    context: Joi.object().optional()
  }),

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
  })
};

module.exports = {
  validate,
  schemas
};
