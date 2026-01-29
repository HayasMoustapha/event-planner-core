/**
 * Middleware d'authentification pour les routes de génération de tickets
 * Vérifie que l'utilisateur est authentifié et a les permissions nécessaires
 * 
 * Principes :
- Validation du token JWT
- Vérification des permissions utilisateur
- Gestion des erreurs d'authentification
- Logs structurés pour sécurité
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware qui vérifie que l'utilisateur est authentifié
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
function requireAuth(req, res, next) {
  try {
    // Récupération du token depuis l'en-tête Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajout des informations utilisateur à la requête
    req.user = decoded;
    
    console.log(`[AUTH] Utilisateur authentifié: ${decoded.id} (${decoded.email})`);
    
    next();
    
  } catch (error) {
    console.error('[AUTH] Erreur authentification:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification invalide',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'authentification',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Middleware qui vérifie que l'utilisateur est organisateur d'un événement
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
async function requireEventOrganizer(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // Récupération de l'event_id depuis les params ou le body
    const eventId = req.params.event_id || req.body.event_id;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'ID de l\'événement manquant',
        code: 'MISSING_EVENT_ID'
      });
    }
    
    // Vérification que l'utilisateur est organisateur de l'événement
    const query = `
      SELECT e.id, e.organizer_id 
      FROM events e 
      WHERE e.id = $1 AND e.organizer_id = $2
    `;
    
    const result = await req.db.query(query, [eventId, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Permissions insuffisantes pour cet événement',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    console.log(`[AUTH] Utilisateur ${req.user.id} vérifié comme organisateur de l'événement ${eventId}`);
    
    next();
    
  } catch (error) {
    console.error('[AUTH] Erreur vérification permissions:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des permissions',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
}

/**
 * Middleware optionnel - si le token est présent, il est vérifié, sinon continue
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
function optionalAuth(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log(`[AUTH] Utilisateur authentifié (optionnel): ${decoded.id}`);
    } else {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur
    req.user = null;
    console.warn('[AUTH] Token invalide ignoré (auth optionnelle):', error.message);
    next();
  }
}

module.exports = {
  requireAuth,
  requireEventOrganizer,
  optionalAuth
};
