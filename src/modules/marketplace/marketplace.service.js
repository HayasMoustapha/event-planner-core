const marketplaceRepository = require('./marketplace.repository');

class MarketplaceService {
  async becomeDesigner(userId, designerData, token) {
    try {
      // Check if user is already a designer
      const existingDesigner = await marketplaceRepository.findDesignerByUserId(userId, token);
      if (existingDesigner) {
        return {
          success: false,
          error: 'User is already registered as a designer'
        };
      }

      const designerDataWithCreator = {
        user_id: userId,
        brand_name: designerData.brand_name,
        portfolio_url: designerData.portfolio_url,
        status: 'pending',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const designer = await marketplaceRepository.createDesigner(designerDataWithCreator);
      
      return {
        success: true,
        data: designer
      };
    } catch (error) {
      console.error('Error creating designer:', error);
      return {
        success: false,
        error: error.message || 'Failed to create designer profile'
      };
    }
  }

  async getDesigners(options = {}) {
    try {
      const { page, limit, status, search, userId } = options;
      const designers = await marketplaceRepository.getDesigners({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search,
        userId
      });
      
      return {
        success: true,
        data: designers,
        pagination: designers.pagination
      };
    } catch (error) {
      console.error('Error getting designers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designers'
      };
    }
  }

  async getDesignerById(designerId, userId) {
    try {
      const designer = await marketplaceRepository.getDesignerById(designerId);
      
      if (!designer) {
        return {
          success: false,
          error: 'Designer not found'
        };
      }

      return {
        success: true,
        data: designer
      };
    } catch (error) {
      console.error('Error getting designer by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designer'
      };
    }
  }

  async updateDesigner(designerId, updateData, userId) {
    try {
      const existingDesigner = await marketplaceRepository.getDesignerById(designerId);
      
      if (!existingDesigner) {
        return {
          success: false,
          error: 'Designer not found'
        };
      }

      const updatedDesigner = await marketplaceRepository.updateDesigner(designerId, {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: updatedDesigner
      };
    } catch (error) {
      console.error('Error updating designer:', error);
      return {
        success: false,
        error: error.message || 'Failed to update designer'
      };
    }
  }

  async createTemplate(templateData, userId) {
    try {
      const templateDataWithCreator = {
        ...templateData,
        designer_id: userId,
        status: 'pending',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const template = await marketplaceRepository.createTemplate(templateDataWithCreator);
      
      return {
        success: true,
        data: template
      };
    } catch (error) {
      console.error('Error creating template:', error);
      return {
        success: false,
        error: error.message || 'Failed to create template'
      };
    }
  }

  async getTemplates(options = {}) {
    try {
      const { page, limit, category, search, designer_id, userId } = options;
      const templates = await marketplaceRepository.getTemplates({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
        search,
        designer_id,
        userId
      });
      
      return {
        success: true,
        data: templates,
        pagination: templates.pagination
      };
    } catch (error) {
      console.error('Error getting templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get templates'
      };
    }
  }

  async getTemplateById(templateId, userId) {
    try {
      const template = await marketplaceRepository.getTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      return {
        success: true,
        data: template
      };
    } catch (error) {
      console.error('Error getting template by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get template'
      };
    }
  }

  async updateTemplate(templateId, updateData, userId) {
    try {
      const existingTemplate = await marketplaceRepository.getTemplateById(templateId);
      
      if (!existingTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const updatedTemplate = await marketplaceRepository.updateTemplate(templateId, {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: updatedTemplate
      };
    } catch (error) {
      console.error('Error updating template:', error);
      return {
        success: false,
        error: error.message || 'Failed to update template'
      };
    }
  }

  async purchaseTemplate(templateId, purchaseData, userId) {
    try {
      const template = await marketplaceRepository.getTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      if (template.status !== 'approved') {
        return {
          success: false,
          error: 'Template is not available for purchase'
        };
      }

      const purchaseDataWithBuyer = {
        template_id: templateId,
        buyer_id: userId,
        payment_method: purchaseData.payment_method,
        amount: template.price,
        status: 'pending',
        purchased_at: new Date().toISOString()
      };

      const purchase = await marketplaceRepository.createPurchase(purchaseDataWithBuyer);
      
      return {
        success: true,
        data: purchase
      };
    } catch (error) {
      console.error('Error purchasing template:', error);
      return {
        success: false,
        error: error.message || 'Failed to purchase template'
      };
    }
  }

  async getTemplateReviews(templateId, options = {}) {
    try {
      const { page, limit, token } = options;
      const reviews = await marketplaceRepository.getTemplateReviews(templateId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10
      }, token);
      
      return {
        success: true,
        data: reviews,
        pagination: reviews.pagination
      };
    } catch (error) {
      console.error('Error getting template reviews:', error);
      return {
        success: false,
        error: error.message || 'Failed to get template reviews'
      };
    }
  }

  async createReview(templateId, reviewData, userId) {
    try {
      const reviewDataWithCreator = {
        template_id: templateId,
        user_id: userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        created_at: new Date().toISOString()
      };

      const review = await marketplaceRepository.createReview(reviewDataWithCreator);
      
      return {
        success: true,
        data: review
      };
    } catch (error) {
      console.error('Error creating review:', error);
      return {
        success: false,
        error: error.message || 'Failed to create review'
      };
    }
  }

  async getUserPurchases(userId, options = {}) {
    try {
      const { page, limit, status } = options;
      const purchases = await marketplaceRepository.getUserPurchases(userId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status
      });
      
      return {
        success: true,
        data: purchases,
        pagination: purchases.pagination
      };
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user purchases'
      };
    }
  }

  async getMarketplaceStats(userId) {
    try {
      const stats = await marketplaceRepository.getMarketplaceStats(userId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting marketplace stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get marketplace statistics'
      };
    }
  }

  async approveTemplate(templateId, userId) {
    try {
      const template = await marketplaceRepository.getTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const approvedTemplate = await marketplaceRepository.updateTemplate(templateId, {
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      });

      return {
        success: true,
        data: approvedTemplate
      };
    } catch (error) {
      console.error('Error approving template:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve template'
      };
    }
  }

  async deleteTemplate(templateId, userId) {
    try {
      const template = await marketplaceRepository.getTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      await marketplaceRepository.deleteTemplate(templateId);

      return {
        success: true,
        data: { id: templateId, deleted: true }
      };
    } catch (error) {
      console.error('Error deleting template:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete template'
      };
    }
  }

  async rejectTemplate(templateId, rejectData, userId) {
    try {
      const template = await marketplaceRepository.getTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const rejectedTemplate = await marketplaceRepository.updateTemplate(templateId, {
        status: 'rejected',
        rejection_reason: rejectData.reason,
        rejected_by: userId,
        rejected_at: new Date().toISOString()
      });

      return {
        success: true,
        data: rejectedTemplate
      };
    } catch (error) {
      console.error('Error rejecting template:', error);
      return {
        success: false,
        error: error.message || 'Failed to reject template'
      };
    }
  }

  async verifyDesigner(designerId, userId) {
    try {
      const designer = await marketplaceRepository.getDesignerById(designerId);
      
      if (!designer) {
        return {
          success: false,
          error: 'Designer not found'
        };
      }

      const verifiedDesigner = await marketplaceRepository.updateDesigner(designerId, {
        status: 'verified',
        verified_by: userId,
        verified_at: new Date().toISOString()
      });

      return {
        success: true,
        data: verifiedDesigner
      };
    } catch (error) {
      console.error('Error verifying designer:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify designer'
      };
    }
  }
}

module.exports = new MarketplaceService();
