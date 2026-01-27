/**
 * MIDDLEWARE DE GESTION DES ERREURS POUR LE MODULE GUESTS
 * Fournit des messages d'erreur explicites et sécurisés
 * 
 * Ce handler est spécialisé pour le module guests avec des types d'erreur
 * spécifiques à la gestion des invités
 */

const { ErrorHandlerFactory } = require('../../../shared');

const guestsErrorHandler = ErrorHandlerFactory.create('guests', {
  logLevel: 'error',
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorTypes: {
    'GuestNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      severity: 'low'
    },
    'GuestValidationError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'GuestRegistrationError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'GuestAccessError': {
      category: 'authorization',
      statusCode: '403',
      severity: 'medium'
    },
    'InvitationError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'RSVPError': {
      category: 'business',
      statusCode: 400,
      'severity': 'low'
    },
    'GuestConflictError': {
      category: 'conflict',
      statusCode: 409,
      'severity': 'medium'
    },
    'ContactInfoError': {
      category: 'validation',
      'statusCode': 400,
      'severity': 'low'
    },
    'GuestDuplicateError': {
      category: 'conflict',
      statusCode: 409,
      severity: 'medium'
    },
    'GuestLimitExceededError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'GuestStatusTransitionError': {
      category: 'business',
      statusCode: 400,
      severity: 'low'
    },
    'GuestEventNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      severity: 'low'
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

module.exports = guestsErrorHandler;
