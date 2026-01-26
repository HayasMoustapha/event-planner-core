const marketplaceRepository = require('./marketplace.repository');

class MarketplaceService {
  async becomeDesigner(userId, designerData, currentUserId) {
    try {
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - ENTRY');
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - userId:', userId);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - designerData:', designerData);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - currentUserId:', currentUserId);
      
      // Check if user is already a designer
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - Checking if user already designer...');
      const existingDesigner = await marketplaceRepository.findDesignerByUserId(userId);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - Existing designer check:', existingDesigner);
      
      if (existingDesigner) {
        console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - ERROR: User already designer');
        return {
          success: false,
          error: 'User is already registered as a designer'
        };
      }

      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - User not designer, proceeding...');
      
      const designerDataWithCreator = {
        user_id: userId,
        brand_name: designerData.brand_name,
        portfolio_url: designerData.portfolio_url,
        created_by: currentUserId
      };

      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - Prepared data:', designerDataWithCreator);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - Calling repository.createDesigner...');
      
      const designer = await marketplaceRepository.createDesigner(designerDataWithCreator);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - Repository result:', designer);
      
      return {
        success: true,
        data: designer,
        message: 'Designer profile created successfully'
      };
    } catch (error) {
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - ERROR:', error.message);
      console.log('🧪 [TEST LOG] MarketplaceService.becomeDesigner - ERROR STACK:', error.stack);
      console.error('Error creating designer:', error);
      return {
        success: false,
        error: error.message || 'Failed to create designer profile'
      };
    }
  }

  async getDesigners(options = {}) {
    try {
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - ENTRY');
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - Options:', options);
      
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - Calling repository.getDesigners...');
      const result = await marketplaceRepository.getDesigners(options);
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - Repository result:', result);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - ERROR:', error.message);
      console.log('🧪 [TEST LOG] MarketplaceService.getDesigners - ERROR STACK:', error.stack);
      console.error('Error getting designers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designers'
      };
    }
  }

  async getDesignerById(designerId) {
    try {
      const designer = await marketplaceRepository.findDesignerById(designerId);
      
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
      console.error('Error getting designer:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designer'
      };
    }
  }

  async updateDesigner(designerId, updateData, userId) {
    try {
      // Check if designer exists and user owns it
      const existingDesigner = await marketplaceRepository.findDesignerById(designerId);
      
      if (!existingDesigner) {
        return {
          success: false,
          error: 'Designer not found'
        };
      }

      if (existingDesigner.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const updatedDesigner = await marketplaceRepository.updateDesigner(designerId, updateData, userId);
      
      return {
        success: true,
        data: updatedDesigner,
        message: 'Designer profile updated successfully'
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
      // Verify user is a designer
      const designer = await marketplaceRepository.findDesignerByUserId(userId);
      if (!designer) {
        return {
          success: false,
          error: 'User is not registered as a designer'
        };
      }

      const templateDataWithCreator = {
        ...templateData,
        designer_id: designer.id,
        created_by: userId
      };

      const template = await marketplaceRepository.createTemplate(templateDataWithCreator);
      
      return {
        success: true,
        data: template,
        message: 'Template created successfully'
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
      const result = await marketplaceRepository.getTemplates(options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get templates'
      };
    }
  }

  async getTemplateById(templateId) {
    try {
      const template = await marketplaceRepository.findTemplateById(templateId);
      
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
      console.error('Error getting template:', error);
      return {
        success: false,
        error: error.message || 'Failed to get template'
      };
    }
  }

  async updateTemplate(templateId, updateData, userId) {
    try {
      // Check if template exists and user owns it
      const existingTemplate = await marketplaceRepository.findTemplateById(templateId);
      
      if (!existingTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      if (existingTemplate.designer_user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const updatedTemplate = await marketplaceRepository.updateTemplate(templateId, updateData, userId);
      
      return {
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      };
    } catch (error) {
      console.error('Error updating template:', error);
      return {
        success: false,
        error: error.message || 'Failed to update template'
      };
    }
  }

  async purchaseTemplate(templateId, userId, purchaseData) {
    try {
      // Check if template exists and is approved
      const template = await marketplaceRepository.findTemplateById(templateId);
      
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

      // Check if user already purchased this template
      // TODO: Implement this check

      const purchaseDataWithUser = {
        user_id: userId,
        template_id: templateId,
        amount: template.price,
        currency: template.currency,
        transaction_id: purchaseData.transaction_id,
        created_by: userId
      };

      const purchase = await marketplaceRepository.createPurchase(purchaseDataWithUser);
      
      // TODO: Process payment via payment service
      // TODO: Grant access to template files
      
      return {
        success: true,
        data: purchase,
        message: 'Template purchased successfully'
      };
    } catch (error) {
      console.error('Error purchasing template:', error);
      return {
        success: false,
        error: error.message || 'Failed to purchase template'
      };
    }
  }

  async createReview(templateId, userId, reviewData) {
    try {
      // Check if template exists
      const template = await marketplaceRepository.findTemplateById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // Check if user purchased this template
      // TODO: Implement this check

      const reviewDataWithUser = {
        user_id: userId,
        template_id: templateId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        created_by: userId
      };

      const review = await marketplaceRepository.createReview(reviewDataWithUser);
      
      return {
        success: true,
        data: review,
        message: 'Review created successfully'
      };
    } catch (error) {
      console.error('Error creating review:', error);
      return {
        success: false,
        error: error.message || 'Failed to create review'
      };
    }
  }

  async getTemplateReviews(templateId, options = {}) {
    try {
      const result = await marketplaceRepository.getTemplateReviews(templateId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting template reviews:', error);
      return {
        success: false,
        error: error.message || 'Failed to get template reviews'
      };
    }
  }

  async getUserPurchases(userId, options = {}) {
    try {
      const result = await marketplaceRepository.getUserPurchases(userId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user purchases'
      };
    }
  }

  async getMarketplaceStats() {
    try {
      const stats = await marketplaceRepository.getMarketplaceStats();
      
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
      const updatedTemplate = await marketplaceRepository.updateTemplate(templateId, { status: 'approved' }, userId);
      
      if (!updatedTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // TODO: Notify designer of approval
      
      return {
        success: true,
        data: updatedTemplate,
        message: 'Template approved successfully'
      };
    } catch (error) {
      console.error('Error approving template:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve template'
      };
    }
  }

  async rejectTemplate(templateId, userId, reason) {
    try {
      const updatedTemplate = await marketplaceRepository.updateTemplate(templateId, { status: 'rejected' }, userId);
      
      if (!updatedTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // TODO: Notify designer of rejection with reason
      
      return {
        success: true,
        data: updatedTemplate,
        message: 'Template rejected successfully'
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
      const updatedDesigner = await marketplaceRepository.updateDesigner(designerId, { is_verified: true }, userId);
      
      if (!updatedDesigner) {
        return {
          success: false,
          error: 'Designer not found'
        };
      }

      // TODO: Notify designer of verification
      
      return {
        success: true,
        data: updatedDesigner,
        message: 'Designer verified successfully'
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
