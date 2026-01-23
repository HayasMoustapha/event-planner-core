const { ErrorHandler } = require('../utils/errors');
const { recordSecurityEvent, recordError } = require('./metrics');

/**
 * Middleware unifié de gestion d'erreurs pour tous les modules
 * Inspiré d'event-planner-auth pour la cohérence
 * Gère tous les types d'erreurs de manière centralisée
 */
const unifiedErrorHandler = (err, req, res, next) => {
  // Enregistrer l'erreur dans les métriques
  recordError(err.name || 'UnknownError', err.severity || 'medium');
  
  // Utiliser le gestionnaire d'erreurs existant
  ErrorHandler.globalHandler(err, req, res, next);
};

/**
 * Middleware pour capturer les erreurs asynchrones dans les routes
 * Wrapper standard pour toutes les routes async
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de validation des paramètres communs
 * Valide ID, pagination, et autres paramètres standards
 */
const validateCommonParams = (req, res, next) => {
  try {
    // Validation des paramètres de pagination
    const { page, limit } = req.query;
    
    if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'Le numéro de page doit être un entier positif',
        code: 'INVALID_PAGE'
      });
    }
    
    if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'La limite doit être un entier entre 1 et 100',
        code: 'INVALID_LIMIT'
      });
    }
    
    // Validation des paramètres ID
    const { id } = req.params;
    if (id && (isNaN(parseInt(id)) || parseInt(id) <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        message: 'L\'ID doit être un nombre entier positif',
        code: 'INVALID_ID'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de sécurité pour les paramètres
 * Détecte les patterns d'injection et XSS
 */
const securityParamsCheck = (req, res, next) => {
  try {
    const suspiciousPatterns = [
      /;/,
      /--/,
      /\*\//,
      /DROP/i,
      /DELETE/i,
      /UPDATE/i,
      /INSERT/i,
      /<script>/i,
      /javascript:/i,
      /onerror=/i,
      /onclick=/i
    ];
    
    // Vérifier tous les paramètres
    const allParams = { ...req.params, ...req.query, ...req.body };
    
    for (const [key, value] of Object.entries(allParams)) {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            recordSecurityEvent('injection_attempt', 'high');
            return res.status(403).json({
              success: false,
              error: 'Violation de sécurité détectée',
              message: 'Paramètre invalide détecté',
              code: 'SECURITY_VIOLATION',
              field: key
            });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware d'authentification unifié
 * Vérifie la présence de l'utilisateur et ses permissions
 */
const requireAuth = (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      recordSecurityEvent('unauthorized_access', 'high');
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
        message: 'Utilisateur non authentifié',
        code: 'AUTH_REQUIRED'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de validation des entrées standards
 * Valide les champs communs comme email, téléphone, etc.
 */
const validateStandardInputs = (req, res, next) => {
  try {
    const { email, phone } = req.body;
    
    // Validation email si présent
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          message: 'L\'email n\'est pas valide',
          code: 'INVALID_EMAIL',
          field: 'email'
        });
      }
      
      if (email.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          message: 'L\'email ne peut pas dépasser 255 caractères',
          code: 'EMAIL_TOO_LONG',
          field: 'email'
        });
      }
    }
    
    // Validation téléphone si présent
    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          message: 'Le numéro de téléphone n\'est pas valide',
          code: 'INVALID_PHONE',
          field: 'phone'
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  unifiedErrorHandler,
  asyncHandler,
  validateCommonParams,
  securityParamsCheck,
  requireAuth,
  validateStandardInputs
};
