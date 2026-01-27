const ticketsService = require('./tickets.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError,
  ConflictError,
  DatabaseError 
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

class TicketsController {
  async createTicketType(req, res, next) {
    try {
      const { event_id, name, type, price, quantity, currency, description } = req.body;
      
      // Validation de l'event_id
      if (!event_id || isNaN(parseInt(event_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'event_id',
          message: 'Valid event ID is required'
        }));
      }

      // Validation du nom
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json(validationErrorResponse({
          field: 'name',
          message: 'Le nom est requis et doit contenir au moins 2 caractères'
        }));
      }

      if (name.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'name',
          message: 'Le nom ne peut pas dépasser 255 caractères'
        }));
      }

      // Validation du type
      if (!type || !['free', 'paid', 'donation'].includes(type)) {
        return res.status(400).json(validationErrorResponse({
          field: 'type',
          message: 'Le type doit être free, paid ou donation'
        }));
      }

      // Validation du prix
      if (type === 'paid') {
        if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
          return res.status(400).json(validationErrorResponse({
            field: 'price',
            message: 'Le prix est requis et doit être un nombre positif'
          }));
        }
      } else {
        if (price !== undefined && parseFloat(price) !== 0) {
          return res.status(400).json(validationErrorResponse({
            field: 'price',
            message: 'Le prix doit être 0 pour les billets gratuits'
          }));
        }
      }

      // Validation de la quantité
      if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 1) {
        return res.status(400).json(validationErrorResponse({
          field: 'quantity',
          message: 'La quantité est requise et doit être un entier positif'
        }));
      }

      // Validation de la devise si payant
      if (type === 'paid') {
        if (!currency || !/^[A-Z]{3}$/.test(currency)) {
          return res.status(400).json(validationErrorResponse({
            field: 'currency',
            message: 'La devise est requise et doit être un code ISO 4217 valide (3 lettres majuscules)'
          }));
        }
      }

      // Validation de la description (optionnelle)
      if (description && (typeof description !== 'string' || description.length > 1000)) {
        return res.status(400).json(validationErrorResponse({
          field: 'description',
          message: 'La description ne peut pas dépasser 1000 caractères'
        }));
      }

      const ticketTypeData = {
        event_id: parseInt(event_id),
        name: name.trim(),
        type,
        price: type === 'paid' ? parseFloat(price) : 0,
        quantity: parseInt(quantity),
        currency: type === 'paid' ? currency : null,
        description: description ? description.trim() : null
      };

      const result = await ticketsService.createTicketType(ticketTypeData, DEFAULT_USER_ID);
      
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
        result.message || 'Type de billet créé avec succès',
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

  async getTicketTypes(req, res, next) {
    try {
      const { event_id, page, limit } = req.query;
      
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

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        event_id: event_id ? parseInt(event_id) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.getTicketTypes(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Types de billets récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Types de billets récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du type de billet est requis et doit être un nombre entier'
        }));
      }

      const result = await ticketsService.getTicketTypeById(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Type de billet récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du type de billet est requis et doit être un nombre entier'
        }));
      }

      const updateData = req.body;
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json(badRequestResponse(
          'Au moins un champ doit être fourni pour la mise à jour'
        ));
      }

      // Validation des champs de mise à jour
      if (updateData.name) {
        if (typeof updateData.name !== 'string' || updateData.name.trim().length < 2) {
          return res.status(400).json(validationErrorResponse({
            field: 'name',
            message: 'Le nom doit contenir au moins 2 caractères'
          }));
        }
        if (updateData.name.length > 255) {
          return res.status(400).json(validationErrorResponse({
            field: 'name',
            message: 'Le nom ne peut pas dépasser 255 caractères'
          }));
        }
      }

      if (updateData.type && !['free', 'paid', 'donation'].includes(updateData.type)) {
        return res.status(400).json(validationErrorResponse({
          field: 'type',
          message: 'Le type doit être free, paid ou donation'
        }));
      }

      if (updateData.price !== undefined) {
        if (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0) {
          return res.status(400).json(validationErrorResponse({
            field: 'price',
            message: 'Le prix doit être un nombre positif'
          }));
        }
      }

      if (updateData.quantity !== undefined) {
        if (isNaN(parseInt(updateData.quantity)) || parseInt(updateData.quantity) < 0) {
          return res.status(400).json(validationErrorResponse({
            field: 'quantity',
            message: 'La quantité doit être un entier positif'
          }));
        }
      }

      if (updateData.currency && !/^[A-Z]{3}$/.test(updateData.currency)) {
        return res.status(400).json(validationErrorResponse({
          field: 'currency',
          message: 'La devise doit être un code ISO 4217 valide (3 lettres majuscules)'
        }));
      }

      if (updateData.description && (typeof updateData.description !== 'string' || updateData.description.length > 1000)) {
        return res.status(400).json(validationErrorResponse({
          field: 'description',
          message: 'La description ne peut pas dépasser 1000 caractères'
        }));
      }

      // Vérification que le type de billet existe
      const existingTicketType = await ticketsService.getTicketTypeById(parseInt(id), DEFAULT_USER_ID);
      if (!existingTicketType.success) {
        if (existingTicketType.error && (existingTicketType.error.includes('non trouvé') || existingTicketType.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        throw new ValidationError(existingTicketType.error, existingTicketType.details);
      }

      const result = await ticketsService.updateTicketType(parseInt(id), updateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Type de billet mis à jour avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async deleteTicketType(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du type de billet est requis et doit être un nombre entier'
        }));
      }

      // Vérification que le type de billet existe
      const existingTicketType = await ticketsService.getTicketTypeById(parseInt(id), DEFAULT_USER_ID);
      if (!existingTicketType.success) {
        if (existingTicketType.error && (existingTicketType.error.includes('non trouvé') || existingTicketType.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        throw new ValidationError(existingTicketType.error, existingTicketType.details);
      }

      // Validation: Vérifier s'il y a des billets vendus
      if (existingTicketType.data.tickets_sold && existingTicketType.data.tickets_sold > 0) {
        return res.status(400).json(badRequestResponse(
          'Impossible de supprimer un type de billet avec des billets vendus'
        ));
      }

      const result = await ticketsService.deleteTicketType(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Type de billet supprimé avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async purchaseTicket(req, res, next) {
    try {
      const { ticket_type_id, quantity, payment_method_id } = req.body;
      
      // Validation du ticket_type_id
      if (!ticket_type_id || isNaN(parseInt(ticket_type_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'ticket_type_id',
          message: 'L\'ID du type de billet est requis et doit être un nombre entier'
        }));
      }

      // Validation de la quantité
      if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 1) {
        return res.status(400).json(validationErrorResponse({
          field: 'quantity',
          message: 'La quantité est requise et doit être un entier positif'
        }));
      }

      // Validation du payment_method_id
      if (!payment_method_id || isNaN(parseInt(payment_method_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'payment_method_id',
          message: 'L\'ID du moyen de paiement est requis et doit être un nombre entier'
        }));
      }

      const purchaseData = {
        ticket_type_id: parseInt(ticket_type_id),
        quantity: parseInt(quantity),
        payment_method_id: parseInt(payment_method_id)
      };

      const result = await ticketsService.purchaseTicket(purchaseData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet ou moyen de paiement'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && result.error.includes('insuffisant')) {
          return res.status(400).json(badRequestResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse(
        result.message || 'Billet acheté avec succès',
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

  async getTickets(req, res, next) {
    try {
      const { event_id, ticket_type_id, page, limit, status } = req.query;
      
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

      // Validation du ticket_type_id si fourni
      if (ticket_type_id && isNaN(parseInt(ticket_type_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'ticket_type_id',
          message: 'L\'ID du type de billet doit être un nombre entier'
        }));
      }

      // Validation du statut si fourni
      const validStatuses = ['pending', 'paid', 'cancelled', 'used'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: `Le statut doit être l'une des valeurs suivantes: ${validStatuses.join(', ')}`
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        event_id: event_id ? parseInt(event_id) : null,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : null,
        status,
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.getTickets(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Billets récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Billets récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getTicket(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du billet est requis et doit être un nombre entier'
        }));
      }

      const result = await ticketsService.getTicketById(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Billet'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Billet récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async validateTicket(req, res, next) {
    try {
      const { id } = req.params;
      const { qr_code } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du billet est requis et doit être un nombre entier'
        }));
      }

      if (!qr_code || typeof qr_code !== 'string') {
        return res.status(400).json(validationErrorResponse({
          field: 'qr_code',
          message: 'Le code QR est requis'
        }));
      }

      const result = await ticketsService.validateTicket(parseInt(id), qr_code, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Billet'));
        }
        if (result.error && result.error.includes('déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && result.error.includes('invalide')) {
          return res.status(400).json(badRequestResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Billet validé avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
