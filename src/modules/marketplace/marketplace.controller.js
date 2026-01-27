const marketplaceService = require('./marketplace.service');
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

class MarketplaceController {
  async becomeDesigner(req, res, next) {
    try {
      const { portfolio_url, experience_years, specialties, bio } = req.body;
      
      // Validation du portfolio_url
      if (!portfolio_url || typeof portfolio_url !== 'string') {
        return res.status(400).json(validationErrorResponse({
          field: 'portfolio_url',
          message: 'L\'URL du portfolio est requise'
        }));
      }

      // Validation simple de l'URL
      try {
        new URL(portfolio_url);
      } catch {
        return res.status(400).json(validationErrorResponse({
          field: 'portfolio_url',
          message: 'L\'URL du portfolio n\'est pas valide'
        }));
      }

      if (portfolio_url.length > 500) {
        return res.status(400).json(validationErrorResponse({
          field: 'portfolio_url',
          message: 'L\'URL du portfolio ne peut pas dépasser 500 caractères'
        }));
      }

      // Validation de l'expérience
      if (experience_years !== undefined) {
        if (isNaN(parseInt(experience_years)) || parseInt(experience_years) < 0 || parseInt(experience_years) > 50) {
          return res.status(400).json(validationErrorResponse({
            field: 'experience_years',
            message: 'Les années d\'expérience doivent être un entier entre 0 et 50'
          }));
        }
      }

      // Validation des spécialités (optionnel)
      if (specialties) {
        if (!Array.isArray(specialties)) {
          return res.status(400).json(validationErrorResponse({
            field: 'specialties',
            message: 'Les spécialités doivent être un tableau'
          }));
        }
        
        if (specialties.length > 10) {
          return res.status(400).json(validationErrorResponse({
            field: 'specialties',
            message: 'Le nombre de spécialités ne peut pas dépasser 10'
          }));
        }

        for (const specialty of specialties) {
          if (typeof specialty !== 'string' || specialty.trim().length < 2) {
            return res.status(400).json(validationErrorResponse({
              field: 'specialties',
              message: 'Chaque spécialité doit contenir au moins 2 caractères'
            }));
          }
          if (specialty.length > 100) {
            return res.status(400).json(validationErrorResponse({
              field: 'specialties',
              message: 'Chaque spécialité ne peut pas dépasser 100 caractères'
            }));
          }
        }
      }

      // Validation de la bio (optionnelle)
      if (bio && (typeof bio !== 'string' || bio.length > 2000)) {
        return res.status(400).json(validationErrorResponse({
          field: 'bio',
          message: 'La biographie ne peut pas dépasser 2000 caractères'
        }));
      }

      const designerData = {
        portfolio_url: portfolio_url.trim(),
        experience_years: experience_years ? parseInt(experience_years) : 0,
        specialties: specialties ? specialties.map(s => s.trim()) : [],
        bio: bio ? bio.trim() : null
      };

      const result = await marketplaceService.becomeDesigner(designerData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('existe déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Utilisateur'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse(
        result.message || 'Demande de designer soumise avec succès',
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

  async getDesigners(req, res, next) {
    try {
      const { page, limit, search, experience_min, experience_max, specialties } = req.query;
      
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

      // Validation de l'expérience minimale
      if (experience_min && (isNaN(parseInt(experience_min)) || parseInt(experience_min) < 0)) {
        return res.status(400).json(validationErrorResponse({
          field: 'experience_min',
          message: 'L\'expérience minimale doit être un entier positif'
        }));
      }

      // Validation de l'expérience maximale
      if (experience_max && (isNaN(parseInt(experience_max)) || parseInt(experience_max) < 0 || parseInt(experience_max) > 50)) {
        return res.status(400).json(validationErrorResponse({
          field: 'experience_max',
          message: 'L\'expérience maximale doit être un entier entre 0 et 50'
        }));
      }

      // Validation des spécialités
      let parsedSpecialties = [];
      if (specialties) {
        if (typeof specialties === 'string') {
          parsedSpecialties = specialties.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(specialties)) {
          parsedSpecialties = specialties;
        } else {
          return res.status(400).json(validationErrorResponse({
            field: 'specialties',
            message: 'Les spécialités doivent être une chaîne séparée par des virgules ou un tableau'
          }));
        }

        if (parsedSpecialties.length > 10) {
          return res.status(400).json(validationErrorResponse({
            field: 'specialties',
            message: 'Le nombre de spécialités ne peut pas dépasser 10'
          }));
        }
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        experience_min: experience_min ? parseInt(experience_min) : null,
        experience_max: experience_max ? parseInt(experience_max) : null,
        specialties: parsedSpecialties
      };

      const result = await marketplaceService.getDesigners(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Designers récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Designers récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getDesigner(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du designer est requis et doit être un nombre entier'
        }));
      }

      const result = await marketplaceService.getDesignerById(parseInt(id));
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Designer'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Designer récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateDesigner(req, res, next) {
    try {
      const { id } = req.params;
      const { portfolio_url, experience_years, specialties, bio } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(badRequestResponse('Designer ID requis'));
      }

      const designerData = {
        portfolio_url: portfolio_url ? portfolio_url.trim() : undefined,
        experience_years: experience_years ? parseInt(experience_years) : undefined,
        specialties: specialties ? specialties.map(s => s.trim()) : undefined,
        bio: bio ? bio.trim() : undefined
      };

      const result = await marketplaceService.updateDesigner(parseInt(id), designerData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Designer'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Designer mis à jour', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async getDesignerPortfolio(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du designer est requis et doit être un nombre entier'
        }));
      }

      const result = await marketplaceService.getDesignerPortfolio(parseInt(id));
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Portfolio du designer'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Portfolio récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      const { name, description, category, price, preview_url, files } = req.body;
      
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

      // Validation de la description
      if (!description || typeof description !== 'string' || description.trim().length < 10) {
        return res.status(400).json(validationErrorResponse({
          field: 'description',
          message: 'La description est requise et doit contenir au moins 10 caractères'
        }));
      }

      if (description.length > 2000) {
        return res.status(400).json(validationErrorResponse({
          field: 'description',
          message: 'La description ne peut pas dépasser 2000 caractères'
        }));
      }

      // Validation de la catégorie
      const validCategories = ['invitation', 'ticket', 'poster', 'banner', 'social', 'other'];
      if (!category || !validCategories.includes(category)) {
        return res.status(400).json(validationErrorResponse({
          field: 'category',
          message: `La catégorie doit être l'une des valeurs suivantes: ${validCategories.join(', ')}`
        }));
      }

      // Validation du prix
      if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'price',
          message: 'Le prix est requis et doit être un nombre positif'
        }));
      }

      // Validation de l'URL de prévisualisation
      if (!preview_url || typeof preview_url !== 'string') {
        return res.status(400).json(validationErrorResponse({
          field: 'preview_url',
          message: 'L\'URL de prévisualisation est requise'
        }));
      }

      try {
        new URL(preview_url);
      } catch {
        return res.status(400).json(validationErrorResponse({
          field: 'preview_url',
          message: 'L\'URL de prévisualisation n\'est pas valide'
        }));
      }

      // Validation des fichiers
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json(validationErrorResponse({
          field: 'files',
          message: 'Au moins un fichier est requis'
        }));
      }

      for (const file of files) {
        if (!file.name || !file.url || !file.type) {
          return res.status(400).json(validationErrorResponse({
            field: 'files',
            message: 'Chaque fichier doit avoir un nom, une URL et un type'
          }));
        }
      }

      const templateData = {
        name: name.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        preview_url: preview_url.trim(),
        files
      };

      const result = await marketplaceService.createTemplate(templateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && result.error.includes('existe déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Designer'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse(
        result.message || 'Template créé avec succès',
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

  async getTemplates(req, res, next) {
    try {
      const { page, limit, search, category, designer_id, price_min, price_max } = req.query;
      
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

      // Validation de la catégorie
      const validCategories = ['invitation', 'ticket', 'poster', 'banner', 'social', 'other'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json(validationErrorResponse({
          field: 'category',
          message: `La catégorie doit être l'une des valeurs suivantes: ${validCategories.join(', ')}`
        }));
      }

      // Validation du designer_id
      if (designer_id && isNaN(parseInt(designer_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'designer_id',
          message: 'L\'ID du designer doit être un nombre entier'
        }));
      }

      // Validation des prix
      if (price_min && (isNaN(parseFloat(price_min)) || parseFloat(price_min) < 0)) {
        return res.status(400).json(validationErrorResponse({
          field: 'price_min',
          message: 'Le prix minimum doit être un nombre positif'
        }));
      }

      if (price_max && (isNaN(parseFloat(price_max)) || parseFloat(price_max) < 0)) {
        return res.status(400).json(validationErrorResponse({
          field: 'price_max',
          message: 'Le prix maximum doit être un nombre positif'
        }));
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        category,
        designer_id: designer_id ? parseInt(designer_id) : null,
        price_min: price_min ? parseFloat(price_min) : null,
        price_max: price_max ? parseFloat(price_max) : null
      };

      const result = await marketplaceService.getTemplates(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }
      
      if (result.pagination) {
        res.json(paginatedResponse(
          'Templates récupérés avec succès',
          result.data,
          result.pagination
        ));
      } else {
        res.json(successResponse(
          'Templates récupérés avec succès',
          result.data
        ));
      }
    } catch (error) {
      next(error);
    }
  }

  async getTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du template est requis et doit être un nombre entier'
        }));
      }

      const result = await marketplaceService.getTemplateById(parseInt(id));
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Template'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse(
        'Template récupéré avec succès',
        result.data
      ));
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, price, category, tags, is_public } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(badRequestResponse('Template ID requis'));
      }

      const templateData = {
        name: name ? name.trim() : undefined,
        description: description ? description.trim() : undefined,
        price: price ? parseFloat(price) : undefined,
        category: category ? category.trim() : undefined,
        tags: tags ? tags.map(t => t.trim()) : undefined,
        is_public: is_public !== undefined ? Boolean(is_public) : undefined
      };

      const result = await marketplaceService.updateTemplate(parseInt(id), templateData, DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Template'));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Template mis à jour', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async purchaseTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { payment_method_id } = req.body;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'id',
          message: 'L\'ID du template est requis et doit être un nombre entier'
        }));
      }

      if (!payment_method_id || isNaN(parseInt(payment_method_id))) {
        return res.status(400).json(validationErrorResponse({
          field: 'payment_method_id',
          message: 'L\'ID du moyen de paiement est requis et doit être un nombre entier'
        }));
      }

      const result = await marketplaceService.purchaseTemplate(parseInt(id), parseInt(payment_method_id), DEFAULT_USER_ID);
      
      if (!result.success) {
        if (result.error && (result.error.includes('non trouvé') || result.error.includes('not found'))) {
          return res.status(404).json(notFoundResponse('Template ou moyen de paiement'));
        }
        if (result.error && result.error.includes('déjà')) {
          return res.status(409).json(conflictResponse(result.error));
        }
        if (result.error && result.error.includes('insuffisant')) {
          return res.status(400).json(badRequestResponse(result.error));
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse(
        result.message || 'Template acheté avec succès',
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

  async createReview(req, res, next) {
    try {
      const { templateId, rating, comment } = req.body;
      
      if (!templateId || rating === undefined) {
        return res.status(400).json(badRequestResponse('Template ID et rating requis'));
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json(badRequestResponse('Rating doit être entre 1 et 5'));
      }

      const result = await marketplaceService.createReview(templateId, {
        rating: parseInt(rating),
        comment,
        userId: DEFAULT_USER_ID
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json(createdResponse('Avis créé', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async getTemplateReviews(req, res, next) {
    try {
      const { templateId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json(badRequestResponse('Template ID invalide'));
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        templateId: parseInt(templateId)
      };

      const result = await marketplaceService.getTemplateReviews(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Avis récupérés', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async getUserPurchases(req, res, next) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        userId: DEFAULT_USER_ID
      };

      const result = await marketplaceService.getUserPurchases(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Achats récupérés', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async getMarketplaceStats(req, res, next) {
    try {
      const result = await marketplaceService.getMarketplaceStats();
      
      res.json(successResponse('Statistiques marketplace', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async approveTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      const { reason } = req.body;
      
      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json(badRequestResponse('Template ID requis'));
      }

      const result = await marketplaceService.approveTemplate(parseInt(templateId), reason, DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Template approuvé', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async rejectTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      const { reason } = req.body;
      
      if (!templateId || isNaN(parseInt(templateId))) {
        return res.status(400).json(badRequestResponse('Template ID requis'));
      }

      const result = await marketplaceService.rejectTemplate(parseInt(templateId), reason, DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Template rejeté', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }

  async verifyDesigner(req, res, next) {
    try {
      const { designerId } = req.params;
      const { verified } = req.body;
      
      if (!designerId || isNaN(parseInt(designerId))) {
        return res.status(400).json(badRequestResponse('Designer ID requis'));
      }

      const result = await marketplaceService.verifyDesigner(parseInt(designerId), verified, DEFAULT_USER_ID);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json(successResponse('Designer vérifié', result.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(validationErrorResponse(
          error.message || 'Erreur de validation'
        ));
      }
      next(error);
    }
  }
}

module.exports = new MarketplaceController();
