/**
 * MIDDLEWARE DE NORMALISATION DU CONTEXTE
 * Garantit que tous les champs JWT sont disponibles avant validation
 * 
 * Ce middleware doit être appliqué APRÈS authenticate mais AVANT validate
 */

class ContextNormalizationMiddleware {
  /**
   * Middleware principal de normalisation du contexte
   * Injecte les champs dérivés du JWT dans req.body, req.params, req.query
   * @returns {Function} Middleware Express
   */
  static normalizeContext() {
    return (req, res, next) => {
      try {
        // Vérification que l'utilisateur est authentifié
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'User must be authenticated before context normalization',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        // Injection des champs standards dans req.body (si body existe)
        if (req.body && typeof req.body === 'object') {
          req.body.user_id = req.user.id;
          req.body.organizer_id = req.user.id; // Pour les events
          req.body.creator_id = req.user.id;   // Pour les templates/tickets
        }

        // Injection dans req.params (si params existe)
        if (req.params && typeof req.params === 'object') {
          req.params.user_id = req.user.id;
        }

        // Injection dans req.query (si query existe)
        if (req.query && typeof req.query === 'object') {
          req.query.user_id = req.user.id;
        }

        // Injection des métadonnées d'authentification
        req.context = {
          userId: req.user.id,
          email: req.user.email,
          roles: req.user.roles || [],
          permissions: req.user.permissions || [],
          sessionId: req.user.sessionId,
          authenticatedAt: req.authenticatedAt || new Date().toISOString()
        };

        // Log en développement pour debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 Context normalized for user ${req.user.id}:`, {
            hasBody: !!req.body,
            hasParams: !!req.params,
            hasQuery: !!req.query,
            contextKeys: Object.keys(req.context)
          });
        }

        next();
      } catch (error) {
        console.error('Context normalization error:', error);
        return res.status(500).json({
          success: false,
          error: 'Context normalization error',
          message: 'Failed to normalize request context',
          code: 'CONTEXT_NORMALIZATION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware pour normaliser le contexte des paramètres ID
   * Spécifique pour les routes qui utilisent des IDs dans les params
   * @returns {Function} Middleware Express
   */
  static normalizeIdContext() {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'User must be authenticated',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }

        // Normalisation spécifique pour les routes avec ID
        if (req.params && req.params.id) {
          // Conversion explicite de l'ID en nombre
          const id = parseInt(req.params.id);
          if (isNaN(id) || id <= 0) {
            return res.status(400).json({
              success: false,
              error: 'Invalid ID',
              message: 'ID must be a positive integer',
              code: 'INVALID_ID'
            });
          }
          req.params.id = id;
        }

        // Appliquer la normalisation standard
        return ContextNormalizationMiddleware.normalizeContext()(req, res, next);
      } catch (error) {
        console.error('ID context normalization error:', error);
        return res.status(500).json({
          success: false,
          error: 'ID context normalization error',
          message: 'Failed to normalize ID context',
          code: 'ID_CONTEXT_NORMALIZATION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware pour valider que le contexte est bien normalisé
   * Utilitaire pour debugging et vérification
   * @returns {Function} Middleware Express
   */
  static validateContext() {
    return (req, res, next) => {
      try {
        const errors = [];

        // Vérification de la présence du contexte
        if (!req.context) {
          errors.push('req.context is missing');
        }

        // Vérification des champs requis
        if (!req.context || !req.context.userId) {
          errors.push('req.context.userId is missing');
        }

        if (!req.user || !req.user.id) {
          errors.push('req.user.id is missing');
        }

        if (errors.length > 0) {
          return res.status(500).json({
            success: false,
            error: 'Context validation failed',
            message: 'Request context is not properly normalized',
            code: 'CONTEXT_VALIDATION_FAILED',
            details: errors
          });
        }

        next();
      } catch (error) {
        console.error('Context validation error:', error);
        return res.status(500).json({
          success: false,
          error: 'Context validation error',
          message: 'Failed to validate request context',
          code: 'CONTEXT_VALIDATION_ERROR'
        });
      }
    };
  }
}

module.exports = {
  ContextNormalizationMiddleware,
  normalizeContext: ContextNormalizationMiddleware.normalizeContext,
  normalizeIdContext: ContextNormalizationMiddleware.normalizeIdContext,
  validateContext: ContextNormalizationMiddleware.validateContext
};
