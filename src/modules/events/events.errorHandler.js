const { ErrorHandlerFactory } = require('../../../../shared');

const eventsErrorHandler = ErrorHandlerFactory.create('events', {
  logLevel: 'error',
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorTypes: {
    'EventNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      severity: 'low'
    },
    'EventDateError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'EventCapacityError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'EventAccessError': {
      category: 'authorization',
      statusCode: 403,
      severity: 'medium'
    },
    'EventConflictError': {
      category: 'conflict',
      statusCode: 409,
      severity: 'medium'
    },
    'EventValidationError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'EventStatusError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'RateLimitError': {
      category: 'security',
      statusCode: 429,
      severity: 'medium'
    },
    'InvalidInputError': {
      category: 'security',
      statusCode: 400,
      severity: 'medium'
    },
    // Erreurs techniques communes
    'DatabaseConnectionError': {
      category: 'technical',
      statusCode: 503,
      severity: 'high'
    },
    'ExternalServiceError': {
      category: 'technical',
      statusCode: 502,
      severity: 'medium'
    },
    'ConfigurationError': {
      category: 'technical',
      statusCode: 500,
      severity: 'medium'
    },
    'TimeoutError': {
      category: 'technical',
      statusCode: 408,
      severity: 'medium'
    }
  }
});

module.exports = eventsErrorHandler;
