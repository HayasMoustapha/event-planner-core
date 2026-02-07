const marketplaceService = require('./marketplace.service');
const { ResponseFormatter } = require('../../../../shared');

class MarketplaceController {
  async becomeDesigner(req, res, next) {
    try {
      const { brand_name, portfolio_url } = req.body;
      const userId = req.user?.id;
      const token = req.headers.authorization?.replace('Bearer ', '') || req.token;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.becomeDesigner(userId, { brand_name, portfolio_url }, token);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Designer application submitted', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getDesigners(req, res, next) {
    try {
      // Security: Validate query parameters
      const { page, limit, verified, search } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter');
      }
      
      if (search && !SecurityValidator.isValidString(search, 100)) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in search query');
      }

      if (verified !== undefined && !['true', 'false'].includes(verified)) {
        throw new ValidationError('Invalid verified parameter');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        verified: verified !== undefined ? verified === 'true' : undefined,
        search
      };

      const userId = req.user?.id;
      
      const result = await marketplaceService.getDesigners(options, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Designers retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getDesignerById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.getDesignerById(id, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Designer'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Designer retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async updateDesigner(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.updateDesigner(id, req.body, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Designer'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Designer updated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      // CORRECTION: Extraire uniquement les champs qui existent dans la table SQL templates
      const { 
        name, 
        description, 
        preview_url, 
        source_files_path, 
        price, 
        currency 
      } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.createTemplate({
        name,
        description,
        preview_url,
        source_files_path,
        price,
        currency
      }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Template created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTemplates(req, res, next) {
    try {
      const { page, limit, category, search, designer_id } = req.query;
      const user = req.user;
      
      const result = await marketplaceService.getTemplates({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
        search,
        designer_id,
        user
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Templates retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getTemplateById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.getTemplateById(id, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Template'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.updateTemplate(id, req.body, userId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('Template'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template updated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getDesignerStats(req, res, next) {
    try {
      const result = await marketplaceService.getDesignerStats();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Designer stats retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTemplateStats(req, res, next) {
    try {
      const result = await marketplaceService.getTemplateStats();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template stats retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseStats(req, res, next) {
    try {
      const result = await marketplaceService.getPurchaseStats();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Purchase stats retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getReviewStats(req, res, next) {
    try {
      const result = await marketplaceService.getReviewStats();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Review stats retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getAdminDesigners(req, res, next) {
    try {
      const result = await marketplaceService.getAdminDesigners();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Admin designers retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getAdminTemplates(req, res, next) {
    try {
      const result = await marketplaceService.getAdminTemplates();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Admin templates retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getAdminPurchases(req, res, next) {
    try {
      const result = await marketplaceService.getAdminPurchases();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Admin purchases retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getAdminReviews(req, res, next) {
    try {
      const result = await marketplaceService.getAdminReviews();
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Admin reviews retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async purchaseTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      // CORRECTION: payment_method n'existe pas en SQL, on utilise le prix du template
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.purchaseTemplate(templateId, {}, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.payment('Template purchased', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getTemplateReviews(req, res, next) {
    try {
      const { templateId } = req.params;
      const { page, limit } = req.query;
      const token = req.headers.authorization?.replace('Bearer ', '') || req.token;
      
      const result = await marketplaceService.getTemplateReviews(templateId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        token
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Template reviews retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async createReview(req, res, next) {
    try {
      const { templateId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.createReview(templateId, { rating, comment }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Review created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getUserPurchases(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const userId = req.user?.id;
      
      const result = await marketplaceService.getUserPurchases(userId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('User purchases retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getMarketplaceStats(req, res, next) {
    try {
      const userId = req.user?.id;
      
      const result = await marketplaceService.getMarketplaceStats(userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Marketplace statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async approveTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.approveTemplate(id, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template approved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.deleteTemplate(id, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template deleted', result.data));
    } catch (error) {
      next(error);
    }
  }

  async rejectTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;
      
      const result = await marketplaceService.rejectTemplate(id, { reason }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Template rejected', result.data));
    } catch (error) {
      next(error);
    }
  }

  async verifyDesigner(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await marketplaceService.verifyDesigner(id, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Designer verified', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MarketplaceController();
