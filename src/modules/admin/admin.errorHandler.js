/**
 * MIDDLEWARE DE GESTION DES ERREURS POUR LE MODULE ADMIN
 * Fournit des messages d'erreur explicites et sécurisés
 * 
 * Ce handler est spécialisé pour le module admin avec des types d'erreur
 * spécifiques à la gestion administrative
 */

const { ErrorHandlerFactory } = require('../../../../shared');

const adminErrorHandler = ErrorHandlerFactory.create('admin', {
  logLevel: 'error',
  includeStackTrace: process.env.NODE_ENV === 'development',
  customErrorTypes: {
    'AdminAccessError': {
      category: 'authorization',
      statusCode: 403,
      severity: 'high'
    },
    'SystemConfigError': {
      category: 'system',
      statusCode: 500,
      severity: 'high'
    },
    'UserManagementError': {
      category: 'business',
      statusCode: 400,
      severity: 'medium'
    },
    'RoleAssignmentError': {
      category: 'authorization',
      statusCode: 403,
      severity: 'medium'
    },
    'DashboardAccessError': {
      category: 'authorization',
      statusCode: 403,
      severity: 'high'
    },
    'AuditLogError': {
      category: 'system',
      statusCode: 500,
      severity: 'medium'
    },
    'ReportGenerationError': {
      category: 'system',
      statusCode: 500,
      severity: 'medium'
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

module.exports = adminErrorHandler;
