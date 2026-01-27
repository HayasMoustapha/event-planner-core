/**
 * MIDDLEWARE DE GESTION DES ERREURS POUR LE MODULE TICKETS
 * Fournit des messages d'erreur explicites et sécurisés
 * 
 * Ce handler est spécialisé pour le module tickets avec des types d'erreur
 * spécifiques à la gestion des billets et des types de billets
 */

const { ErrorHandlerFactory } = require('../../../shared');

const ticketsErrorHandler = ErrorHandlerFactory.create('tickets', {
  logLevel: 'error',
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorTypes: {
    'TicketNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      severity: 'low'
    },
    'TicketValidationError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'TicketSoldOutError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'TicketAccessError': {
      category: 'authorization',
      statusCode: 403,
      severity: 'medium'
    },
    'TicketTypeNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      severity: 'low'
    },
    'TicketTypeValidationError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'TicketTypeConflictError': {
      category: 'conflict',
      statusCode: 409,
      severity: 'medium'
    },
    'PaymentError': {
      category: 'payment',
      statusCode: 400,
      severity: 'high'
    },
    'QRCodeGenerationError': {
      category: 'technical',
      statusCode: 500,
      severity: 'medium'
    },
    'TicketValidationResult': {
      category: 'business',
      statusCode: 400,
      severity: 'low'
    },
    'TicketDuplicateError': {
      category: 'conflict',
      statusCode: 409,
      severity: 'medium'
    },
    'TicketStatusError': {
      category: 'business',
      statusCode: 400,
      severity: 'low'
    },
    'BatchProcessingError': {
      category: 'technical',
      statusCode: 500,
      severity: 'high'
    },
    // Erreurs de sécurité communes
    'SecurityValidationError': {
      category: 'security',
      statusCode: 400,
      severity: 'high'
    },
    'SQLInjectionError': {
      category: 'security',
      statusCode: 403,
      severity: 'high'
    },
    'XSSAttemptError': {
      category: 'security',
      statusCode: 403,
      severity: 'high'
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

module.exports = ticketsErrorHandler;
