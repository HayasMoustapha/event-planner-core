/**
 * MIDDLEWARE DE GESTION DES ERREURS POUR LE MODULE MARKETPLACE
 * Fournit des messages d'erreur explicites et sécurisés
 * 
 * Ce handler est spécialisé pour le module marketplace avec des types d'erreur
 * spécifiques à la gestion du marketplace et des designers
 */

const { ErrorHandlerFactory } = require('../../../../shared');

const marketplaceErrorHandler = ErrorHandlerFactory.create('marketplace', {
  logLevel: 'error',
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorTypes: {
    'DesignerNotFoundError': {
      category: 'not_found',
      statusCode: 404,
      'severity': 'low'
    },
    'DesignerValidationError': {
      category: 'validation',
      statusCode: 400,
      'severity': 'low'
    },
    'DesignerApplicationError': {
      category: 'business',
      statusCode: 400,
      'severity': 'medium'
    },
    'DesignerAccessError': {
      category: 'authorization',
      statusCode: 403,
      'severity': 'medium'
    },
    'PortfolioError': {
      category: 'validation',
      statusCode: 400,
      'severity': 'low'
    },
    'DesignError': {
      category: 'validation',
      statusCode: 400,
      'severity': 'low'
    },
    'MarketplaceValidationError': {
      category: 'validation',
      statusCode: 400,
      'severity': 'low'
    },
    'DesignConflictError': {
      category: 'conflict',
      statusCode: 409,
      'severity': 'medium'
    },
    'DesignerStatusError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'DesignerStatusTransitionError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'DesignLimitExceededError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'PortfolioValidationError': {
      category: 'validation',
      statusCode: 400,
      severity: 'low'
    },
    'DesignCategoryError': {
      category: 'validation',
      statusCode: 400,
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

module.exports = marketplaceErrorHandler;
