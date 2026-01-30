/**
 * Utilitaire pour les appels HTTP avec timeout
 * Prévient les blocages lors des appels inter-services
 */

/**
 * Effectue un appel HTTP avec timeout
 * @param {string} url - URL de destination
 * @param {Object} options - Options fetch
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 3000ms)
 * @returns {Promise} Réponse HTTP
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`HTTP request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Wrapper pour les appels inter-services avec retry
 * @param {string} serviceName - Nom du service distant
 * @param {Function} callFn - Fonction d'appel
 * @param {number} maxRetries - Nombre de tentatives (défaut: 2)
 * @param {number} timeoutMs - Timeout par tentative (défaut: 3000ms)
 * @returns {Promise} Résultat de l'appel
 */
async function callWithRetry(serviceName, callFn, maxRetries = 2, timeoutMs = 3000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callFn();
    } catch (error) {
      lastError = error;
      console.warn(`[HTTP_TIMEOUT] Attempt ${attempt}/${maxRetries} failed for ${serviceName}:`, error.message);
      
      if (attempt < maxRetries) {
        // Attendre avant de réessayer (exponentiel backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed for ${serviceName}. Last error: ${lastError.message}`);
}

module.exports = {
  fetchWithTimeout,
  callWithRetry
};
