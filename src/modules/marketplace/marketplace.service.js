const marketplaceRepository = require('./marketplace.repository');
const templateValidationService = require('./template-validation.service');
const notificationClient = require('../../../../shared/clients/notification-client');
const authApiService = require('../../services/auth-api-service');

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

  async getDesigners(options = {}, userId) {
    try {
      const { page, limit, verified, search } = options;
      
      // Security validation
      if (page && (isNaN(page) || page < 1)) {
        return {
          success: false,
          error: 'Invalid page parameter'
        };
      }
      
      if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
        return {
          success: false,
          error: 'Invalid limit parameter'
        };
      }
      
      const result = await marketplaceRepository.getDesigners({
        page: page || 1,
        limit: limit || 20,
        verified,
        search
      });
      
      return {
        success: true,
        data: result.designers,
        pagination: result.pagination
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
      // Récupérer d'abord le designer_id associé à cet utilisateur
      const designer = await marketplaceRepository.getDesignerByUserId(userId);
      
      if (!designer) {
        return {
          success: false,
          error: 'User must be registered as a designer to create templates',
          details: {
            userId,
            message: 'Please register as a designer first'
          }
        };
      }

      // Validation technique du package template (structure + variables + preview)
      const validation = await templateValidationService.validateTemplatePackage(
        templateData.source_files_path,
        templateData.preview_url
      );

      const now = new Date().toISOString();
      const status = validation.valid ? 'approved' : 'rejected';
      const statusFields = validation.valid
        ? { approved_by: userId, approved_at: now }
        : { rejected_by: userId, rejected_at: now };

      // CORRECTION: Mapper uniquement les champs qui existent dans la table SQL templates
      const templateDataWithCreator = {
        designer_id: designer.id, // Utiliser l'ID du designer (pas du user)
        name: templateData.name,
        description: templateData.description || null,
        preview_url: templateData.preview_url || null,
        source_files_path: templateData.source_files_path || null,
        price: templateData.price || null,
        currency: templateData.currency || 'EUR',
        status,
        ...statusFields,
        created_by: userId,
        created_at: now,
        updated_at: now
      };

      const template = await marketplaceRepository.createTemplate(templateDataWithCreator);

      await this.notifyDesignerTemplateStatus(designer, template, validation);
      
      return {
        success: true,
        data: template,
        validation
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
      const { page, limit, category, search, designer_id, user, status } = options;
      let effectiveStatus = status;

      const isAdmin = !!(
        user &&
        (user.email === 'admin@eventplanner.com' ||
          (user.roles || []).includes('super_admin') ||
          (user.permissions || []).includes('marketplace.admin.read'))
      );

      if (!isAdmin && !effectiveStatus) {
        let canSeeAllForDesigner = false;

        if (designer_id && user?.id) {
          const designer = await marketplaceRepository.getDesignerByUserId(user.id);
          if (designer && Number(designer.id) === Number(designer_id)) {
            canSeeAllForDesigner = true;
          }
        }

        if (!canSeeAllForDesigner) {
          effectiveStatus = 'approved';
        }
      }

      const templates = await marketplaceRepository.getTemplates({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
        search,
        designer_id,
        status: effectiveStatus
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

      // CORRECTION: Utiliser le prix du template et générer un transaction_id
      const purchaseDataWithBuyer = {
        template_id: templateId,
        user_id: userId,
        amount: template.price, // Utiliser le prix du template
        currency: template.currency || 'EUR',
        transaction_id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Générer un ID unique
        purchase_date: new Date().toISOString(),
        created_by: userId
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

      const designer = await marketplaceRepository.getDesignerById(template.designer_id);
      await this.notifyDesignerTemplateStatus(designer, approvedTemplate, {
        valid: true,
        reason: 'Template approuvé'
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

      await marketplaceRepository.deleteTemplate(templateId, userId);

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
        rejected_by: userId,
        rejected_at: new Date().toISOString()
      });

      const designer = await marketplaceRepository.getDesignerById(template.designer_id);
      await this.notifyDesignerTemplateStatus(designer, rejectedTemplate, {
        valid: false,
        reason: rejectData.reason || 'Template rejeté'
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

  async getDesignerStats() {
    try {
      const stats = await marketplaceRepository.getDesignerStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting designer stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designer stats'
      };
    }
  }

  async getTemplateStats() {
    try {
      const stats = await marketplaceRepository.getTemplateStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting template stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get template stats'
      };
    }
  }

  async getPurchaseStats() {
    try {
      const stats = await marketplaceRepository.getPurchaseStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting purchase stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get purchase stats'
      };
    }
  }

  async getReviewStats() {
    try {
      const stats = await marketplaceRepository.getReviewStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting review stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get review stats'
      };
    }
  }

  async getAdminDesigners() {
    try {
      const designers = await marketplaceRepository.getDesigners({ page: 1, limit: 100 });
      return {
        success: true,
        data: designers.designers
      };
    } catch (error) {
      console.error('Error getting admin designers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get admin designers'
      };
    }
  }

  async getAdminTemplates() {
    try {
      const templates = await marketplaceRepository.getTemplates({ page: 1, limit: 100 });
      return {
        success: true,
        data: templates.templates
      };
    } catch (error) {
      console.error('Error getting admin templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get admin templates'
      };
    }
  }

  async getAdminPurchases() {
    try {
      const purchases = await marketplaceRepository.getPurchases({ page: 1, limit: 100 });
      return {
        success: true,
        data: purchases.purchases
      };
    } catch (error) {
      console.error('Error getting admin purchases:', error);
      return {
        success: false,
        error: error.message || 'Failed to get admin purchases'
      };
    }
  }

  async getAdminReviews() {
    try {
      const reviews = await marketplaceRepository.getReviews({ page: 1, limit: 100 });
      return {
        success: true,
        data: reviews.reviews
      };
    } catch (error) {
      console.error('Error getting admin reviews:', error);
      return {
        success: false,
        error: error.message || 'Failed to get admin reviews'
      };
    }
  }

  async notifyDesignerTemplateStatus(designer, template, validation) {
    try {
      if (!designer?.user_id) return;

      const designerUser = await authApiService.getUserById(designer.user_id);
      const user = designerUser.data || designerUser;

      if (!user?.email) return;

      const isApproved = validation?.valid === true;
      const statusLabel = isApproved ? 'approuvé' : 'rejeté';
      const reason = validation?.reason || (isApproved ? 'Template approuvé' : 'Template rejeté');

      await notificationClient.sendEmail({
        to: user.email,
        template: 'event-notification',
        subject: `Template ${statusLabel} - ${template?.name || ''}`.trim(),
        data: {
          firstName: user.first_name || user.firstName || 'Designer',
          notificationTitle: `Votre template a été ${statusLabel}`,
          eventName: template?.name || 'Template',
          eventDate: new Date().toLocaleDateString('fr-FR'),
          eventLocation: 'Marketplace',
          organizerName: 'Event Planner',
          message: reason,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
        }
      });
    } catch (error) {
      console.error('Failed to notify designer for template status:', error.message);
    }
  }
}

module.exports = new MarketplaceService();
