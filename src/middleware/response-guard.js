/**
 * Middleware de garde pour détecter les routes sans réponse
 * Prévient les requêtes bloquées en forçant une réponse
 */

/**
 * Middleware qui garantit que chaque route termine avec une réponse
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Middleware suivant
 */
function responseGuard(req, res, next) {
  const startTime = Date.now();
  let responseSent = false;
  
  // Wrapper pour suivre si une réponse a été envoyée
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  const originalStatus = res.status;
  
  // Marquer qu'une réponse a été envoyée
  function markResponseSent() {
    responseSent = true;
    const duration = Date.now() - startTime;
    console.log(`[RESPONSE_GUARD] Response sent for ${req.method} ${req.originalUrl} in ${duration}ms`);
  }
  
  // Wrapper des méthodes de réponse
  res.json = function(data) {
    markResponseSent();
    return originalJson.call(this, data);
  };
  
  res.send = function(data) {
    markResponseSent();
    return originalSend.call(this, data);
  };
  
  res.end = function(data) {
    markResponseSent();
    return originalEnd.call(this, data);
  };
  
  res.status = function(code) {
    const result = originalStatus.call(this, code);
    return result;
  };
  
  // Timeout global pour la route
  const routeTimeout = setTimeout(() => {
    if (!responseSent && !res.headersSent) {
      console.error(`[RESPONSE_GUARD] TIMEOUT: No response sent for ${req.method} ${req.originalUrl} after 30s`);
      
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout',
          code: 'ROUTE_TIMEOUT',
          duration: Date.now() - startTime,
          path: req.originalUrl
        });
      }
    }
  }, 30000); // 30 secondes timeout
  
  // Nettoyer le timeout à la fin
  const originalEndCleanup = res.end;
  res.end = function(data) {
    clearTimeout(routeTimeout);
    return originalEndCleanup.call(this, data);
  };
  
  // Intercepter les erreurs non gérées
  const originalNext = next;
  next = function(error) {
    clearTimeout(routeTimeout);
    if (!responseSent && !res.headersSent) {
      if (error) {
        console.error(`[RESPONSE_GUARD] ERROR: Unhandled error in ${req.method} ${req.originalUrl}:`, error.message);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'UNHANDLED_ERROR',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else {
        originalNext.call(this, error);
      }
    }
  };
  
  console.log(`[RESPONSE_GUARD] Starting ${req.method} ${req.originalUrl}`);
  originalNext();
}

module.exports = responseGuard;
