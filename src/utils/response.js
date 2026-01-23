/**
 * Crée une réponse API standardisée pour Event Planner Core
 * Inspiré d'event-planner-auth pour la cohérence
 * @param {boolean} success - Succès de l'opération
 * @param {string} message - Message de la réponse
 * @param {any} data - Données à retourner (optionnel)
 * @param {Object} meta - Métadonnées (optionnel)
 * @returns {Object} Réponse formatée
 */
const createResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

const successResponse = (message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

const errorResponse = (message, errors = null, code = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (errors !== null) {
    response.errors = errors;
  }

  if (code !== null) {
    response.code = code;
  }

  return response;
};

const paginatedResponse = (message, data, pagination) => {
  return successResponse(message, data, {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasNext: pagination.page < pagination.pages,
      hasPrev: pagination.page > 1
    }
  });
};

const createdResponse = (message, data = null) => {
  return {
    ...successResponse(message, data),
    statusCode: 201
  };
};

const noContentResponse = (message = 'Opération réussie') => {
  return {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 204
  };
};

const validationErrorResponse = (errors) => {
  return errorResponse('Erreur de validation', errors, 'VALIDATION_ERROR');
};

const notFoundResponse = (resource = 'Ressource') => {
  return errorResponse(`${resource} non trouvée`, null, 'NOT_FOUND');
};

const unauthorizedResponse = (message = 'Accès non autorisé') => {
  return errorResponse(message, null, 'UNAUTHORIZED');
};

const forbiddenResponse = (message = 'Accès refusé') => {
  return errorResponse(message, null, 'FORBIDDEN');
};

const conflictResponse = (message = 'Conflit de données') => {
  return errorResponse(message, null, 'CONFLICT');
};

const serverErrorResponse = (message = 'Erreur interne du serveur') => {
  return errorResponse(message, null, 'INTERNAL_SERVER_ERROR');
};

const badRequestResponse = (message = 'Requête invalide') => {
  return errorResponse(message, null, 'BAD_REQUEST');
};

const tooManyRequestsResponse = (message = 'Trop de requêtes') => {
  return errorResponse(message, null, 'TOO_MANY_REQUESTS');
};

const serviceUnavailableResponse = (message = 'Service indisponible') => {
  return errorResponse(message, null, 'SERVICE_UNAVAILABLE');
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  serverErrorResponse,
  badRequestResponse,
  tooManyRequestsResponse,
  serviceUnavailableResponse
};
