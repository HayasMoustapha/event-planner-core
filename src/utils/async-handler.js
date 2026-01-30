/**
 * Handler standard pour les fonctions async
 * Prévient les erreurs non capturées et garantit une réponse
 */

/**
 * Wrapper standard pour les controllers async
 * @param {Function} fn - Fonction async à wrapper
 * @returns {Function} Middleware Express wrappé
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    console.log(`[ASYNC_HANDLER] Entering ${req.method} ${req.originalUrl}`);
    
    Promise.resolve(fn(req, res, next))
      .then(() => {
        console.log(`[ASYNC_HANDLER] Success ${req.method} ${req.originalUrl}`);
      })
      .catch((error) => {
        console.error(`[ASYNC_HANDLER] Error in ${req.method} ${req.originalUrl}:`, error.message);
        
        // Si la réponse n'a pas encore été envoyée
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'ASYNC_HANDLER_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            path: req.originalUrl
          });
        } else {
          // Si les headers sont déjà envoyés, on ne peut plus envoyer de JSON
          console.error('[ASYNC_HANDLER] Cannot send error response - headers already sent');
        }
        
        next(error);
      });
  };
}

/**
 * Handler pour les routes avec timeout intégré
 * @param {Function} fn - Fonction async à wrapper
 * @param {number} timeoutMs - Timeout en millisecondes
 * @returns {Function} Middleware Express wrappé
 */
function asyncHandlerWithTimeout(fn, timeoutMs = 10000) {
  return (req, res, next) => {
    console.log(`[ASYNC_HANDLER_TIMEOUT] Entering ${req.method} ${req.originalUrl} (timeout: ${timeoutMs}ms)`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Route timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    Promise.race([
      Promise.resolve(fn(req, res, next)),
      timeoutPromise
    ])
    .then(() => {
      console.log(`[ASYNC_HANDLER_TIMEOUT] Success ${req.method} ${req.originalUrl}`);
    })
    .catch((error) => {
      console.error(`[ASYNC_HANDLER_TIMEOUT] Error in ${req.method} ${req.originalUrl}:`, error.message);
      
      if (!res.headersSent) {
        if (error.message.includes('timeout')) {
          res.status(504).json({
            success: false,
            error: 'Request timeout',
            code: 'ROUTE_TIMEOUT',
            timeout: timeoutMs,
            path: req.originalUrl
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'ASYNC_HANDLER_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            path: req.originalUrl
          });
        }
      }
      
      next(error);
    });
  };
}

module.exports = {
  asyncHandler,
  asyncHandlerWithTimeout
};
