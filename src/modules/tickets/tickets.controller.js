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
  async generateTicket(req, res, next) {
    try {
      const { eventId, ticketTypeId, quantity = 1, metadata = {} } = req.body;
      
      if (!eventId || !ticketTypeId) {
        return res.status(400).json(badRequestResponse('Event ID et Ticket Type ID requis'));
      }

      const result = await ticketsService.generateTicket({
        eventId: parseInt(eventId),
        ticketTypeId: parseInt(ticketTypeId),
        quantity: parseInt(quantity),
        metadata,
        userId: DEFAULT_USER_ID
      });
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.status(201).json(createdResponse('Billet généré', result.data));
    } catch (error) {
      next(error);
    }
  }

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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(existingTicketType.error));
      }

      const result = await ticketsService.updateTicketType(parseInt(id), updateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Type de billet'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse(
        result.message || 'Type de billet mis à jour avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getTicketTypesByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json(badRequestResponse('Event ID requis'));
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        eventId: parseInt(eventId),
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.getTicketTypesByEvent(options);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Types de billets récupérés', result.data));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(existingTicketType.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
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
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse(
        result.message || 'Billet validé avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getTicketByCode(req, res, next) {
    try {
      const { ticketCode } = req.params;
      
      if (!ticketCode) {
        return res.status(400).json(badRequestResponse('Code du billet requis'));
      }

      const result = await ticketsService.getTicketByCode(ticketCode, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Billet'));
        }
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Billet récupéré', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTicketsByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json(badRequestResponse('Event ID invalide'));
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        eventId: parseInt(eventId),
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.getTicketsByEvent(options);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Billets récupérés', result.data));
    } catch (error) {
      next(error);
    }
  }

  async validateTicketByCode(req, res, next) {
    try {
      const { ticketCode, qrCode } = req.body;
      
      if (!ticketCode) {
        return res.status(400).json(badRequestResponse('Code du billet requis'));
      }

      const result = await ticketsService.validateTicketByCode(ticketCode, qrCode, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('invalide')) {
          return res.status(400).json(badRequestResponse(result.error));
        }
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Billet validé', result.data));
    } catch (error) {
      next(error);
    }
  }

  async bulkGenerateTickets(req, res, next) {
    try {
      const { tickets } = req.body;
      
      if (!tickets || !Array.isArray(tickets)) {
        return res.status(400).json(badRequestResponse('Liste de billets requise'));
      }

      const result = await ticketsService.bulkGenerateTickets(tickets, DEFAULT_USER_ID);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.status(201).json(createdResponse('Billets générés en masse', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createJob(req, res, next) {
    try {
      const { jobData } = req.body;
      
      if (!jobData) {
        return res.status(400).json(badRequestResponse('Données du job requises'));
      }

      const result = await ticketsService.createJob(jobData, DEFAULT_USER_ID);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.status(201).json(createdResponse('Job créé', result.data));
    } catch (error) {
      next(error);
    }
  }

  async processJob(req, res, next) {
    try {
      const { jobId } = req.params;
      
      if (!jobId) {
        return res.status(400).json(badRequestResponse('Job ID requis'));
      }

      const result = await ticketsService.processJob(jobId, DEFAULT_USER_ID);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Job traité', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTicketStats(req, res, next) {
    try {
      const { eventId } = req.params;
      const { period = 'day' } = req.query;
      
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json(badRequestResponse('Event ID invalide'));
      }

      const result = await ticketsService.getTicketStats(parseInt(eventId), period, DEFAULT_USER_ID);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Statistiques billets', result.data));
    } catch (error) {
      next(error);
    }
  }

  async downloadTicket(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(badRequestResponse('ID du billet requis'));
      }

      const result = await ticketsService.downloadTicket(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Billet'));
        }
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Téléchargement billet', result.data));
    } catch (error) {
      next(error);
    }
  }

  async downloadQRCode(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(badRequestResponse('ID du billet requis'));
      }

      const result = await ticketsService.downloadQRCode(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('QR code'));
        }
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Téléchargement QR code', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getQueueStats(req, res, next) {
    try {
      const result = await ticketsService.getQueueStats();
      
      res.json(successResponse('Statistiques queue', result.data));
    } catch (error) {
      next(error);
    }
  }

  async cleanCompletedJobs(req, res, next) {
    try {
      const result = await ticketsService.cleanCompletedJobs();
      
      res.json(successResponse('Jobs nettoyés', result.data));
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.listJobs(options);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Jobs listés', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventTickets(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json(badRequestResponse('Event ID invalide'));
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        eventId: parseInt(eventId),
        userId: DEFAULT_USER_ID
      };

      const result = await ticketsService.getEventTickets(options);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Billets événement', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventTicketStats(req, res, next) {
    try {
      const { eventId } = req.params;
      
      if (!eventId || isNaN(parseInt(eventId))) {
        return res.status(400).json(badRequestResponse('Event ID invalide'));
      }

      const result = await ticketsService.getEventTicketStats(parseInt(eventId), DEFAULT_USER_ID);
      
      if (!result.success) {
        // Gérer les autres erreurs sans lancer d'exception
        return res.status(400).json(errorResponse(result.error));
      }

      res.json(successResponse('Statistiques billets événement', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketsController();
