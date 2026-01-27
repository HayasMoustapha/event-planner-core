const marketplaceService = require('./marketplace.service');
const { ResponseFormatter } = require('../../../../shared');

class MarketplaceController {
  async becomeDesigner(req, res, next) {
    try {
      const { brand_name, portfolio_url } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.becomeDesigner(userId, { brand_name, portfolio_url });
      
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
      const { page, limit, status, search } = req.query;
      const userId = req.user?.id;
      
      const result = await marketplaceService.getDesigners({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search,
        userId
      });
      
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
      const { name, description, category, price, preview_url } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.createTemplate({
        name,
        description,
        category,
        price,
        preview_url
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
      const userId = req.user?.id;
      
      const result = await marketplaceService.getTemplates({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
        search,
        designer_id,
        userId
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

  async purchaseTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      const { payment_method } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await marketplaceService.purchaseTemplate(templateId, { payment_method }, userId);
      
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
      
      const result = await marketplaceService.getTemplateReviews(templateId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10
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
