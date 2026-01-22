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
