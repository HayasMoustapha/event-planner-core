const guestsService = require('./guests.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError,
  ConflictError 
} = require('../../utils/errors');
const { 
  createResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
  badRequestResponse,
  createdResponse,
  paginatedResponse
} = require('../../utils/response');

// Constante par défaut pour l'utilisateur ID
const DEFAULT_USER_ID = 1;

class GuestsController {
  async createGuest(req, res, next) {
    try {
      // Validation des entrées
      const { first_name, last_name, email, phone, event_id } = req.body;
      
      // Validation du prénom
      if (!first_name || typeof first_name !== 'string' || first_name.trim().length < 2) {
        return res.status(400).json(validationErrorResponse({
          field: 'first_name',
          message: 'Le prénom est requis et doit contenir au moins 2 caractères'
        }));
      }
      
      if (first_name.length > 100) {
        return res.status(400).json(validationErrorResponse({
          field: 'first_name',
          message: 'Le prénom ne peut pas dépasser 100 caractères'
        }));
      }
      
      // Validation du nom
      if (!last_name || typeof last_name !== 'string' || last_name.trim().length < 2) {
        return res.status(400).json(validationErrorResponse({
          field: 'last_name',
          message: 'Le nom est requis et doit contenir au moins 2 caractères'
        }));
      }
      
      if (last_name.length > 100) {
        return res.status(400).json(validationErrorResponse({
          field: 'last_name',
          message: 'Le nom ne peut pas dépasser 100 caractères'
        }));
      }
      
      // Validation de l'email
      if (!email || typeof email !== 'string') {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email est requis'
        }));
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email n\'est pas valide'
        }));
      }
      
      if (email.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'email',
          message: 'L\'email ne peut pas dépasser 255 caractères'
        }));
      }
      
      // Validation du téléphone (optionnel)
      if (phone && (typeof phone !== 'string' || phone.length > 20)) {
        return res.status(400).json(validationErrorResponse({
          field: 'phone',
          message: 'Le téléphone ne peut pas dépasser 20 caractères'
        }));
      }
      
      // Validation de l'event_id
      if (!event_id || isNaN(parseInt(event_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'event_id',
          message: 'L\'ID de l\'événement est requis et doit être un nombre entier'
        }));
      }

      const result = await guestsService.createGuest({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        event_id: parseInt(event_id)
      }, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('existe déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Événement'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse(
        result.message || 'Invité créé avec succès',
        result.data
      ));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async getGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'invité est requis et doit être un nombre entier'
        }));
      }

      const result = await guestsService.getGuestById(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Invité récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getGuests(req, res, next) {
    try {
      const { page, limit, event_id, search } = req.query;
      
      // Validation du paramètre page
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        return res.status(400).json(validationErrorResponse({
          field: 'page',
          message: 'Le numéro de page doit être un entier positif'
        }));
      }
      
      // Validation du paramètre limit
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json(validationErrorResponse({
          field: 'limit',
          message: 'La limite doit être un entier entre 1 et 100'
        }));
      }

      // Validation du event_id si fourni
      if (event_id && isNaN(parseInt(event_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'event_id',
          message: 'L\'ID de l\'événement doit être un nombre entier'
        }));
      }

      // Validation du paramètre search
      if (search && search.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'search',
          message: 'La recherche ne peut pas dépasser 255 caractères'
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        event_id: event_id ? parseInt(event_id) : null,
        search,
        userId: DEFAULT_USER_ID
      };

      const result = await guestsService.getGuests(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Invités récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Invités récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async updateGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'invité est requis et doit être un nombre entier'
        }));
      }

      const updateData = req.body;
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json(badRequestResponse(
          'Au moins un champ doit être fourni pour la mise à jour'
        ));
      }

      // Validation des champs de mise à jour
      if (updateData.first_name) {
        if (typeof updateData.first_name !== 'string' || updateData.first_name.trim().length < 2) {
          return res.status(400).json(validationErrorResponse({
            field: 'first_name',
            message: 'Le prénom doit contenir au moins 2 caractères'
          }));
        }
        if (updateData.first_name.length > 100) {
          return res.status(400).json(validationErrorResponse({
            field: 'first_name',
            message: 'Le prénom ne peut pas dépasser 100 caractères'
          }));
        }
      }

      if (updateData.last_name) {
        if (typeof updateData.last_name !== 'string' || updateData.last_name.trim().length < 2) {
          return res.status(400).json(validationErrorResponse({
            field: 'last_name',
            message: 'Le nom doit contenir au moins 2 caractères'
          }));
        }
        if (updateData.last_name.length > 100) {
          return res.status(400).json(validationErrorResponse({
            field: 'last_name',
            message: 'Le nom ne peut pas dépasser 100 caractères'
          }));
        }
      }

      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json(validationErrorResponse({
            field: 'email',
            message: 'L\'email n\'est pas valide'
          }));
        }
        if (updateData.email.length > 255) {
          return res.status(400).json(validationErrorResponse({
            field: 'email',
            message: 'L\'email ne peut pas dépasser 255 caractères'
          }));
        }
      }

      if (updateData.phone && (typeof updateData.phone !== 'string' || updateData.phone.length > 20)) {
        return res.status(400).json(validationErrorResponse({
          field: 'phone',
          message: 'Le téléphone ne peut pas dépasser 20 caractères'
        }));
      }

      // Vérification que l'invité existe
      const existingGuest = await guestsService.getGuestById(parseInt(id), DEFAULT_USER_ID);
      if (!existingGuest.success) {
        if (existingGuest.error && (existingGuest.error.includes('non trouvé') || existingGuest.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        throw new ValidationError(existingGuest.error, existingGuest.details);
      }

      const result = await guestsService.updateGuest(parseInt(id), updateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Invité mis à jour avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async deleteGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'invité est requis et doit être un nombre entier'
        }));
      }

      // Vérification que l'invité existe
      const existingGuest = await guestsService.getGuestById(parseInt(id), DEFAULT_USER_ID);
      if (!existingGuest.success) {
        if (existingGuest.error && (existingGuest.error.includes('non trouvé') || existingGuest.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        throw new ValidationError(existingGuest.error, existingGuest.details);
      }

      const result = await guestsService.deleteGuest(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Invité supprimé avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async checkInGuest(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'invité est requis et doit être un nombre entier'
        }));
      }

      // Vérification que l'invité existe
      const existingGuest = await guestsService.getGuestById(parseInt(id), DEFAULT_USER_ID);
      if (!existingGuest.success) {
        if (existingGuest.error && (existingGuest.error.includes('non trouvé') || existingGuest.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        throw new ValidationError(existingGuest.error, existingGuest.details);
      }

      const result = await guestsService.checkInGuest(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Invité'));
        }
        if (result.error && result.error.includes('déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Invité enregistré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GuestsController();
