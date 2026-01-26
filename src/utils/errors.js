/**
 * Centralized Error Management System
 * 
 * This module provides comprehensive error handling for Event Planner Core
 * with security-focused error responses and detailed logging.
 * 
 * Features:
 * - Custom error types with security context
 * - Sanitized error responses
 * - Structured logging with security metadata
 * - Rate limiting for error responses
 * - Error classification and handling
 */

const crypto = require('crypto');
const config = require('../config');

// Error severity levels
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  BUSINESS_LOGIC: 'business_logic',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  SYSTEM: 'system',
  SECURITY: 'security'
};

/**
 * Base Application Error Class
 */
class ApplicationError extends Error {
  constructor(message, category = ERROR_CATEGORIES.SYSTEM, severity = ERROR_SEVERITY.MEDIUM, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Generate errorId with fallback
    try {
      this.errorId = crypto.randomUUID();
    } catch (error) {
      // Fallback if crypto.randomUUID() fails
      this.errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.timestamp = new Date().toISOString();
    this.stack = (new Error()).stack;
    
    // Don't expose stack trace in production
    if (config.nodeEnv === 'production') {
      this.stack = undefined;
    }
  }

  /**
   * Get sanitized error response for client
   */
  toJSON() {
    return {
      success: false,
      error: this.getSanitizedMessage(),
      errorId: this.errorId,
      timestamp: this.timestamp,
      ...(config.nodeEnv === 'development' && { 
        category: this.category,
        severity: this.severity,
        stack: this.stack 
      })
    };
  }

  /**
   * Get sanitized message based on environment and security
   */
  getSanitizedMessage() {
    // In production, don't expose sensitive error details
    if (config.nodeEnv === 'production') {
      if (this.category === ERROR_CATEGORIES.DATABASE || 
          this.category === ERROR_CATEGORIES.SYSTEM) {
        return 'An unexpected error occurred. Please try again later.';
      }
      if (this.category === ERROR_CATEGORIES.SECURITY) {
        return 'Access denied for security reasons.';
      }
    }
    
    return this.message;
  }
}

/**
 * Validation Error
 */
class ValidationError extends ApplicationError {
  constructor(message, details = null) {
    super(message, ERROR_CATEGORIES.VALIDATION, ERROR_SEVERITY.LOW, 400);
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication failed') {
    super(message, ERROR_CATEGORIES.AUTHENTICATION, ERROR_SEVERITY.HIGH, 401);
  }
}

/**
 * Authorization Error
 */
class AuthorizationError extends ApplicationError {
  constructor(message = 'Access denied') {
    super(message, ERROR_CATEGORIES.AUTHORIZATION, ERROR_SEVERITY.HIGH, 403);
  }
}

/**
 * Not Found Error
 */
class NotFoundError extends ApplicationError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ERROR_CATEGORIES.BUSINESS_LOGIC, ERROR_SEVERITY.LOW, 404);
  }
}

/**
 * Conflict Error
 */
class ConflictError extends ApplicationError {
  constructor(message) {
    super(message, ERROR_CATEGORIES.BUSINESS_LOGIC, ERROR_SEVERITY.MEDIUM, 409);
  }
}

/**
 * Database Error
 */
class DatabaseError extends ApplicationError {
  constructor(message, originalError = null) {
    super('Database operation failed', ERROR_CATEGORIES.DATABASE, ERROR_SEVERITY.HIGH, 500);
    this.originalError = originalError;
    
    // Log database errors with full details
    logDatabaseError(originalError);
  }

  getSanitizedMessage() {
    return 'Database operation failed. Please try again later.';
  }
}

/**
 * External Service Error
 */
class ExternalServiceError extends ApplicationError {
  constructor(service, message = 'External service unavailable') {
    super(`${service}: ${message}`, ERROR_CATEGORIES.EXTERNAL_SERVICE, ERROR_SEVERITY.MEDIUM, 503);
    this.service = service;
  }
}

/**
 * Rate Limit Error
 */
class RateLimitError extends ApplicationError {
  constructor(message = 'Too many requests') {
    super(message, ERROR_CATEGORIES.SECURITY, ERROR_SEVERITY.MEDIUM, 429);
  }
}

/**
 * Security Error
 */
class SecurityError extends ApplicationError {
  constructor(message = 'Security violation detected') {
    super(message, ERROR_CATEGORIES.SECURITY, ERROR_SEVERITY.CRITICAL, 403);
  }
}

/**
 * Log database errors securely
 */
function logDatabaseError(error) {
  if (!error) return;
  
  const logData = {
    errorId: crypto.randomUUID(),
    category: ERROR_CATEGORIES.DATABASE,
    severity: ERROR_SEVERITY.HIGH,
    message: error.message,
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    timestamp: new Date().toISOString(),
    // Remove sensitive data from query
    query: error.query ? error.query.replace(/password\s*=\s*['"][^'"]*['"]/gi, 'password=***') : null
  };
  
  console.error('Database Error:', JSON.stringify(logData, null, 2));
}

/**
 * Error Handler Factory
 */
class ErrorHandler {
  /**
   * Handle async errors in route handlers
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Global error handler middleware
   */
  static globalHandler(err, req, res, next) {
    try {
      // Log error with security context
      ErrorHandler.logError(err, req);

      // Handle different error types
      if (err instanceof ApplicationError) {
        return res.status(err.statusCode).json(err.toJSON());
      }

      // Handle JWT errors
      if (err.name === 'JsonWebTokenError') {
        const authError = new AuthenticationError('Invalid token');
        return res.status(authError.statusCode).json(authError.toJSON());
      }

      if (err.name === 'TokenExpiredError') {
        const authError = new AuthenticationError('Token expired');
        return res.status(authError.statusCode).json(authError.toJSON());
      }

      // Handle Joi validation errors
      if (err.isJoi) {
        const validationError = new ValidationError('Validation failed', err.details);
        return res.status(validationError.statusCode).json(validationError.toJSON());
      }

      // Handle PostgreSQL errors
      if (err.code && err.code.startsWith('23')) {
        // Integrity constraint violation
        const conflictError = new ConflictError('Data integrity violation');
        return res.status(conflictError.statusCode).json(conflictError.toJSON());
      }

      // Handle structured service errors
      if (err && typeof err === 'object' && err.success === false) {
        return res.status(400).json({
          success: false,
          error: err.error || 'Service error',
          ...(err.details && { details: err.details }),
          errorId: err.errorId || `svc_${Date.now()}`,
          timestamp: err.timestamp || new Date().toISOString()
        });
      }

      // Default error handler with better error message
      const errorMessage = err.message || 'An unexpected error occurred';
      const defaultError = new ApplicationError(
        errorMessage,
        ERROR_CATEGORIES.SYSTEM,
        ERROR_SEVERITY.HIGH,
        500,
        false
      );

      res.status(defaultError.statusCode).json(defaultError.toJSON());
      
    } catch (handlerError) {
      // Fallback if the error handler itself fails
      console.error('Error handler failed:', handlerError);
      console.error('Original error:', err);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorId: `fallback_${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'system',
        severity: 'critical'
      });
    }
  }

  /**
   * Log errors with security context
   */
  static logError(err, req) {
    try {
      const logData = {
        errorId: err.errorId || (() => {
          try {
            return crypto.randomUUID();
          } catch (e) {
            return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
        })(),
        category: err.category || ERROR_CATEGORIES.SYSTEM,
        severity: err.severity || ERROR_SEVERITY.MEDIUM,
      message: err.message,
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString(),
      request: {
        method: req.method || 'N/A',
        url: req.url || 'N/A',
        ip: req.ip || 'N/A',
        userAgent: req.get && req.get('User-Agent') ? req.get('User-Agent') : 'N/A',
        userId: req.user?.id || null
      },
      ...(config.nodeEnv === 'development' && {
        stack: err.stack,
        body: req.body,
        params: req.params,
        query: req.query
      })
    };

    // Log based on severity
    switch (logData.severity) {
      case ERROR_SEVERITY.CRITICAL:
        console.error('CRITICAL ERROR:', JSON.stringify(logData, null, 2));
        break;
      case ERROR_SEVERITY.HIGH:
        console.error('HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case ERROR_SEVERITY.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      default:
        console.info('LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
    }
    } catch (logError) {
      // Fallback logging if structured logging fails
      console.error('Failed to log error:', logError);
      console.error('Original error:', err.message || 'Unknown error');
    }
  }

  /**
   * Handle 404 errors
   */
  static notFoundHandler(req, res) {
    const error = new NotFoundError(`Route ${req.method} ${req.path}`);
    res.status(error.statusCode).json(error.toJSON());
  }
}

/**
 * Security-focused error utilities
 */
class SecurityErrorHandler {
  /**
   * Handle suspicious activity
   */
  static handleSuspiciousActivity(req, reason) {
    const error = new SecurityError(`Suspicious activity detected: ${reason}`);
    ErrorHandler.logError(error, req);
    
    // Log security event
    console.warn('SECURITY ALERT:', {
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null,
      timestamp: new Date().toISOString()
    });
    
    return error;
  }

  /**
   * Handle rate limiting
   */
  static handleRateLimit(req) {
    const error = new RateLimitError('Rate limit exceeded');
    ErrorHandler.logError(error, req);
    return error;
  }

  /**
   * Handle invalid input patterns
   */
  static handleInvalidInput(req, pattern) {
    const error = new SecurityError(`Invalid input pattern detected: ${pattern}`);
    ErrorHandler.logError(error, req);
    return error;
  }
}

module.exports = {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  SecurityError,
  ErrorHandler,
  SecurityErrorHandler,
  ERROR_SEVERITY,
  ERROR_CATEGORIES
};
