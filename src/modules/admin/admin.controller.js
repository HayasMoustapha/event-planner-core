const adminService = require('./admin.service');
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

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const result = await adminService.getDashboard(DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Tableau de bord récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, status, role } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        role,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getUsers(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Utilisateurs récupérés', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getSystemStats(req, res, next) {
    try {
      const { period } = req.query;
      
      // Validation de la période si fournie
      const validPeriods = ['day', 'week', 'month', 'year'];
      if (period && !validPeriods.includes(period)) {
        return res.status(400).json(validationErrorResponse({
          field: 'period',
          message: `La période doit être l'une des valeurs suivantes: ${validPeriods.join(', ')}`
        }));
      }

      const result = await adminService.getSystemStats(period || 'month', DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Statistiques système récupérées avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { page, limit, search, status, role } = req.query;
      
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

      // Validation du paramètre search
      if (search && search.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'search',
          message: 'La recherche ne peut pas dépasser 255 caractères'
        }));
      }

      // Validation du statut si fourni
      const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: `Le statut doit être l'une des valeurs suivantes: ${validStatuses.join(', ')}`
        }));
      }

      // Validation du rôle si fourni
      const validRoles = ['admin', 'user', 'event_manager', 'designer'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json(validationErrorResponse({
          field: 'role',
          message: `Le rôle doit être l'une des valeurs suivantes: ${validRoles.join(', ')}`
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
        role,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getUsers(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Utilisateurs récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Utilisateurs récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getUser(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'utilisateur est requis et doit être un nombre entier'
        }));
      }

      const result = await adminService.getUserById(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Utilisateur'));
        }
        if (result.error && result.error.includes('accès')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Utilisateur récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID de l\'utilisateur est requis et doit être un nombre entier'
        }));
      }

      const updateData = req.body;
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json(badRequestResponse(
          'Au moins un champ doit être fourni pour la mise à jour'
        ));
      }

      // Validation des champs de mise à jour
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

      if (updateData.status && !['active', 'inactive', 'suspended', 'pending'].includes(updateData.status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: 'Le statut doit être active, inactive, suspended ou pending'
        }));
      }

      if (updateData.role && !['admin', 'user', 'event_manager', 'designer'].includes(updateData.role)) {
        return res.status(400).json(validationErrorResponse({
          field: 'role',
          message: 'Le rôle doit être admin, user, event_manager ou designer'
        }));
      }

      const result = await adminService.updateUser(parseInt(id), updateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Utilisateur'));
        }
        if (result.error && result.error.includes('conflit')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        result.message || 'Utilisateur mis à jour avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { page, limit, search, status, organizer_id } = req.query;
      
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

      // Validation du paramètre search
      if (search && search.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'search',
          message: 'La recherche ne peut pas dépasser 255 caractères'
        }));
      }

      // Validation du statut si fourni
      const validStatuses = ['draft', 'published', 'archived', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json(validationErrorResponse({
          field: 'status',
          message: `Le statut doit être l'une des valeurs suivantes: ${validStatuses.join(', ')}`
        }));
      }

      // Validation de l'organizer_id si fourni
      if (organizer_id && isNaN(parseInt(organizer_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'organizer_id',
          message: 'L\'ID de l\'organisateur doit être un nombre entier'
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
        organizer_id: organizer_id ? parseInt(organizer_id) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getEvents(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Événements récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Événements récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getTickets(req, res, next) {
    try {
      const { page, limit, search, status, event_id } = req.query;
      
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

      // Validation du paramètre search
      if (search && search.length > 255) {
        return res.status(400).json(validationErrorResponse({
          field: 'search',
          message: 'La recherche ne peut pas dépasser 255 caractères'
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

      // Validation de l'event_id si fourni
      if (event_id && isNaN(parseInt(event_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'event_id',
          message: 'L\'ID de l\'événement doit être un nombre entier'
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
        event_id: event_id ? parseInt(event_id) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getTickets(options);
      
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

  async getRevenue(req, res, next) {
    try {
      const { period, start_date, end_date } = req.query;
      
      // Validation de la période si fournie
      const validPeriods = ['day', 'week', 'month', 'year'];
      if (period && !validPeriods.includes(period)) {
        return res.status(400).json(validationErrorResponse({
          field: 'period',
          message: `La période doit être l'une des valeurs suivantes: ${validPeriods.join(', ')}`
        }));
      }

      // Validation des dates si fournies
      if (start_date) {
        const startDate = new Date(start_date);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json(validationErrorResponse({
            field: 'start_date',
            message: 'La date de début est invalide'
          }));
        }
      }

      if (end_date) {
        const endDate = new Date(end_date);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json(validationErrorResponse({
            field: 'end_date',
            message: 'La date de fin est invalide'
          }));
        }
      }

      const options = {
        period: period || 'month',
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getRevenue(options);
      
      if (!result.success) {
        if (result.error && result.error.includes('non autorisé')) {
          return res.status(403).json(errorResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Revenus récupérés avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async getGlobalStats(req, res, next) {
    try {
      const result = await adminService.getGlobalStats(DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Statistiques globales', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req, res, next) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getRecentActivity(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Activité récente', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getSystemLogs(req, res, next) {
    try {
      const { page = 1, limit = 20, level, startDate, endDate } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        level,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getSystemLogs(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Logs système', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createSystemLog(req, res, next) {
    try {
      const { message, level = 'info', metadata = {} } = req.body;
      
      if (!message) {
        return res.status(400).json(badRequestResponse('Message requis'));
      }

      const result = await adminService.createSystemLog({
        message,
        level,
        metadata,
        userId: DEFAULT_USER_ID
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse('Log créé', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(badRequestResponse('ID utilisateur requis'));
      }

      const result = await adminService.getUserById(parseInt(id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Utilisateur'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Utilisateur récupéré', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getEvents(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Événements récupérés', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTemplatesPendingApproval(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getTemplatesPendingApproval(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Templates en attente', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getDesignersPendingVerification(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getDesignersPendingVerification(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Designers en attente', result.data));
    } catch (error) {
      next(error);
    }
  }

  async moderateContent(req, res, next) {
    try {
      const { contentId, action, reason } = req.body;
      
      if (!contentId || !action) {
        return res.status(400).json(badRequestResponse('Content ID et action requis'));
      }

      const result = await adminService.moderateContent(contentId, action, reason, DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Contenu modéré', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getRevenueStats(req, res, next) {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      
      const options = {
        period,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.getRevenueStats(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Statistiques revenus', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventGrowthStats(req, res, next) {
    try {
      const { period = 'month' } = req.query;
      
      const result = await adminService.getEventGrowthStats(period, DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Statistiques croissance événements', result.data));
    } catch (error) {
      next(error);
    }
  }

  async exportData(req, res, next) {
    try {
      const { type, format = 'json', startDate, endDate } = req.query;
      
      if (!type) {
        return res.status(400).json(badRequestResponse('Type de données requis'));
      }

      const options = {
        type,
        format,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        userId: DEFAULT_USER_ID
      };

      const result = await adminService.exportData(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Données exportées', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getSystemHealth(req, res, next) {
    try {
      const result = await adminService.getSystemHealth();
      
      res.json(successResponse('Santé système', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createBackup(req, res, next) {
    try {
      const { type = 'full', includeMedia = false } = req.body;
      
      const result = await adminService.createBackup({
        type,
        includeMedia,
        userId: DEFAULT_USER_ID
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse('Backup créé', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
