const authClient = require('../config/clients/auth-client');
const logger = require('../utils/logger');
const { errorResponse, forbiddenResponse } = require('../utils/response');

/**
 * Middlewares RBAC améliorés pour le Core Service
 * Gère l'authentification et les autorisations avec cache et fallbacks
 */
class EnhancedRBACMiddleware {
  constructor() {
    this.permissionCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes de cache pour les permissions
  }

  /**
   * Middleware d'authentification principal
   * Valide le token JWT via Auth Service
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json(
            errorResponse('Token manquant ou mal formaté', null, 'MISSING_TOKEN')
          );
        }

        const token = authHeader.substring(7);

        // Validation du token via Auth Service
        const result = await authClient.validateToken(token);

        if (!result.success || !result.valid) {
          logger.security('Authentication failed', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            error: result.error
          });

          return res.status(401).json(
            errorResponse('Token invalide ou expiré', null, 'INVALID_TOKEN')
          );
        }

        // Attacher les infos utilisateur à la requête
        req.user = result.user;
        req.token = token;
        req.authenticatedAt = new Date().toISOString();

        logger.auth('User authenticated successfully', {
          userId: req.user.id,
          ip: req.ip
        });

        next();
      } catch (error) {
        logger.error('Authentication middleware error', {
          error: error.message,
          ip: req.ip
        });

        return res.status(500).json(
          errorResponse('Erreur d\'authentification', null, 'AUTH_ERROR')
        );
      }
    };
  }

  /**
   * Middleware de vérification de permission simple
   * @param {string} permission - Permission requise
   */
  requirePermission(permission) {
    return async (req, res, next) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json(
            errorResponse('Authentification requise', null, 'NOT_AUTHENTICATED')
          );
        }

        const cacheKey = `${req.user.id}:${permission}`;
        const cached = this.permissionCache.get(cacheKey);

        // Vérifier le cache
        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
          if (!cached.allowed) {
            return res.status(403).json(
              forbiddenResponse('Permission insuffisante', permission)
            );
          }
          return next();
        }

        // Vérifier la permission via Auth Service
        const result = await authClient.checkPermission(req.user.id, permission);

        if (!result.success) {
          logger.security('Permission check failed', {
            userId: req.user.id,
            permission,
            error: result.error
          });

          return res.status(500).json(
            errorResponse('Erreur de vérification des permissions', null, 'PERMISSION_ERROR')
          );
        }

        const allowed = result.allowed;

        // Mettre en cache
        this.permissionCache.set(cacheKey, {
          allowed,
          timestamp: Date.now()
        });

        if (!allowed) {
          logger.security('Access denied - insufficient permission', {
            userId: req.user.id,
            permission,
            ip: req.ip
          });

          return res.status(403).json(
            forbiddenResponse('Permission insuffisante', permission)
          );
        }

        logger.auth('Permission granted', {
          userId: req.user.id,
          permission,
          ip: req.ip
        });

        next();
      } catch (error) {
        logger.error('Permission middleware error', {
          error: error.message,
          userId: req.user?.id,
          permission
        });

        return res.status(500).json(
          errorResponse('Erreur de vérification des permissions', null, 'RBAC_ERROR')
        );
      }
    };
  }

  /**
   * Middleware de vérification de rôle
   * @param {string|Array} roles - Rôle(s) requis
   */
  requireRole(roles) {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return async (req, res, next) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json(
            errorResponse('Authentification requise', null, 'NOT_AUTHENTICATED')
          );
        }

        // Récupérer les rôles de l'utilisateur
        const result = await authClient.getUserRoles(req.user.id);

        if (!result.success) {
          logger.security('Role check failed', {
            userId: req.user.id,
            requiredRoles,
            error: result.error
          });

          return res.status(500).json(
            errorResponse('Impossible de vérifier les rôles', null, 'ROLE_ERROR')
          );
        }

        const userRoles = result.roles || [];
        const userRoleNames = userRoles.map(r => r.name).filter(Boolean);

        // Vérifier si l'utilisateur a un des rôles requis
        const hasRequiredRole = requiredRoles.some(role => 
          userRoleNames.includes(role)
        );

        if (!hasRequiredRole) {
          logger.security('Access denied - insufficient role', {
            userId: req.user.id,
            userRoles: userRoleNames,
            requiredRoles,
            ip: req.ip
          });

          return res.status(403).json(
            forbiddenResponse('Rôle insuffisant', requiredRoles.join(' ou '))
          );
        }

        // Attacher les rôles à la requête pour usage ultérieur
        req.userRoles = userRoleNames;

        logger.auth('Role access granted', {
          userId: req.user.id,
          userRoles: userRoleNames,
          ip: req.ip
        });

        next();
      } catch (error) {
        logger.error('Role middleware error', {
          error: error.message,
          userId: req.user?.id,
          requiredRoles
        });

        return res.status(500).json(
          errorResponse('Erreur de vérification des rôles', null, 'RBAC_ERROR')
        );
      }
    };
  }

  /**
   * Middleware de vérification de permissions multiples
   * @param {Array} permissions - Liste des permissions requises
   * @param {string} mode - Mode de vérification ('all' ou 'any')
   */
  requirePermissions(permissions, mode = 'all') {
    return async (req, res, next) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json(
            errorResponse('Authentification requise', null, 'NOT_AUTHENTICATED')
          );
        }

        // Vérifier les permissions multiples
        const result = await authClient.checkMultiplePermissions(req.user.id, permissions);

        if (!result.success) {
          logger.security('Multiple permissions check failed', {
            userId: req.user.id,
            permissions,
            mode,
            error: result.error
          });

          return res.status(500).json(
            errorResponse('Erreur de vérification des permissions', null, 'PERMISSION_ERROR')
          );
        }

        const results = result.results || {};
        let hasAccess = false;

        if (mode === 'all') {
          // Toutes les permissions doivent être accordées
          hasAccess = Object.values(results).every(r => r.allowed);
        } else {
          // Au moins une permission doit être accordée
          hasAccess = Object.values(results).some(r => r.allowed);
        }

        if (!hasAccess) {
          logger.security('Access denied - insufficient permissions', {
            userId: req.user.id,
            permissions,
            mode,
            results,
            ip: req.ip
          });

          return res.status(403).json(
            forbiddenResponse('Permissions insuffisantes', permissions.join(', '))
          );
        }

        // Attacher les permissions à la requête
        req.userPermissions = results;

        logger.auth('Multiple permissions granted', {
          userId: req.user.id,
          permissions,
          mode,
          ip: req.ip
        });

        next();
      } catch (error) {
        logger.error('Multiple permissions middleware error', {
          error: error.message,
          userId: req.user?.id,
          permissions,
          mode
        });

        return res.status(500).json(
          errorResponse('Erreur de vérification des permissions', null, 'RBAC_ERROR')
        );
      }
    };
  }

  /**
   * Middleware de vérification de propriété de ressource
   * @param {string} resourceType - Type de ressource (event, ticket, etc.)
   * @param {string} resourceIdParam - Nom du paramètre d'ID
   */
  requireOwnership(resourceType, resourceIdParam = 'id') {
    return async (req, res, next) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json(
            errorResponse('Authentification requise', null, 'NOT_AUTHENTICATED')
          );
        }

        const resourceId = req.params[resourceIdParam];
        if (!resourceId) {
          return res.status(400).json(
            errorResponse('ID de ressource manquant', null, 'MISSING_RESOURCE_ID')
          );
        }

        // Vérifier la propriété via le service approprié
        // Cette logique dépendra de votre implémentation spécifique
        const isOwner = await this.checkResourceOwnership(
          req.user.id,
          resourceType,
          resourceId
        );

        if (!isOwner) {
          logger.security('Access denied - not resource owner', {
            userId: req.user.id,
            resourceType,
            resourceId,
            ip: req.ip
          });

          return res.status(403).json(
            forbiddenResponse('Accès non autorisé - ressource non possédée')
          );
        }

        logger.auth('Resource ownership verified', {
          userId: req.user.id,
          resourceType,
          resourceId,
          ip: req.ip
        });

        next();
      } catch (error) {
        logger.error('Ownership middleware error', {
          error: error.message,
          userId: req.user?.id,
          resourceType,
          resourceId
        });

        return res.status(500).json(
          errorResponse('Erreur de vérification de propriété', null, 'OWNERSHIP_ERROR')
        );
      }
    };
  }

  /**
   * Vérifie si un utilisateur est propriétaire d'une ressource
   * @param {number} userId - ID de l'utilisateur
   * @param {string} resourceType - Type de ressource
   * @param {string} resourceId - ID de la ressource
   * @returns {Promise<boolean>} True si propriétaire
   */
  async checkResourceOwnership(userId, resourceType, resourceId) {
    try {
      // Implémentation à adapter selon votre logique métier
      // Pour l'instant, retourne true (à implémenter avec les repositories appropriés)
      
      // Exemple:
      // switch (resourceType) {
      //   case 'event':
      //     const event = await eventRepository.findById(resourceId);
      //     return event && event.created_by === userId;
      //   case 'ticket':
      //     const ticket = await ticketRepository.findById(resourceId);
      //     return ticket && ticket.user_id === userId;
      //   default:
      //     return false;
      // }

      return true; // Placeholder - à implémenter
    } catch (error) {
      logger.error('Resource ownership check failed', {
        error: error.message,
        userId,
        resourceType,
        resourceId
      });
      return false;
    }
  }

  /**
   * Middleware optionnel - authentification si token présent
   */
  optionalAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
          // Pas de token, continuer sans authentification
          return next();
        }

        const token = authHeader.substring(7);
        const result = await authClient.validateToken(token);

        if (result.success && result.valid) {
          req.user = result.user;
          req.token = token;
          req.authenticatedAt = new Date().toISOString();
        }

        next();
      } catch (error) {
        // En cas d'erreur, continuer sans authentification
        logger.warn('Optional auth failed', {
          error: error.message,
          ip: req.ip
        });
        next();
      }
    };
  }

  /**
   * Nettoie le cache des permissions
   */
  clearPermissionCache() {
    this.permissionCache.clear();
    logger.info('Permission cache cleared');
  }

  /**
   * Nettoie le cache pour un utilisateur spécifique
   * @param {number} userId - ID de l'utilisateur
   */
  clearUserPermissionCache(userId) {
    const keysToDelete = [];
    
    for (const [key] of this.permissionCache) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.permissionCache.delete(key));
    
    logger.info(`Cleared permission cache for user ${userId}`, {
      clearedKeys: keysToDelete.length
    });
  }

  /**
   * Récupère les statistiques du cache
   * @returns {Object} Statistiques du cache
   */
  getCacheStats() {
    return {
      size: this.permissionCache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.permissionCache.keys())
    };
  }
}

module.exports = new EnhancedRBACMiddleware();
