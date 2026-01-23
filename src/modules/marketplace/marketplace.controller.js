const marketplaceService = require('./marketplace.service');

class MarketplaceController {
  async becomeDesigner(req, res) {
    try {
      const { user_id, brand_name, portfolio_url } = req.body;
      
      const result = await marketplaceService.becomeDesigner(user_id, { brand_name, portfolio_url }, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getDesigners(req, res) {
    try {
      const { page, limit, is_verified, search } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        is_verified: is_verified !== undefined ? is_verified === 'true' : undefined,
        search
      };

      const result = await marketplaceService.getDesigners(options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getDesigner(req, res) {
    try {
      const { id } = req.params;
      const result = await marketplaceService.getDesignerById(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateDesigner(req, res) {
    try {
      const { id } = req.params;
      const result = await marketplaceService.updateDesigner(parseInt(id), req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async createTemplate(req, res) {
    try {
      const result = await marketplaceService.createTemplate(req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTemplates(req, res) {
    try {
      const { page, limit, designer_id, status, min_price, max_price, search } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        designer_id: designer_id ? parseInt(designer_id) : undefined,
        status,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        search
      };

      const result = await marketplaceService.getTemplates(options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await marketplaceService.getTemplateById(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await marketplaceService.updateTemplate(parseInt(id), req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async purchaseTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { transaction_id } = req.body;
      
      const result = await marketplaceService.purchaseTemplate(parseInt(templateId), req.user.id, { transaction_id });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async createReview(req, res) {
    try {
      const { templateId } = req.params;
      const { rating, comment } = req.body;
      
      const result = await marketplaceService.createReview(parseInt(templateId), req.user.id, { rating, comment });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTemplateReviews(req, res) {
    try {
      const { templateId } = req.params;
      const { page, limit } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await marketplaceService.getTemplateReviews(parseInt(templateId), options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getUserPurchases(req, res) {
    try {
      const { page, limit } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await marketplaceService.getUserPurchases(req.user.id, options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getMarketplaceStats(req, res) {
    try {
      const result = await marketplaceService.getMarketplaceStats();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async approveTemplate(req, res) {
    try {
      const { id } = req.params;
      
      const result = await marketplaceService.approveTemplate(parseInt(id), req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async rejectTemplate(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const result = await marketplaceService.rejectTemplate(parseInt(id), req.user.id, reason);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async verifyDesigner(req, res) {
    try {
      const { id } = req.params;
      
      const result = await marketplaceService.verifyDesigner(parseInt(id), req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new MarketplaceController();
