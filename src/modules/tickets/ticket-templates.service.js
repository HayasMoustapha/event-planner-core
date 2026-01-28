const ticketTemplatesRepository = require('./ticket-templates.repository');

class TicketTemplatesService {
  async createTemplate(templateData, userId) {
    try {
      // Validate required fields
      if (!templateData.name || templateData.name.trim().length === 0) {
        return {
          success: false,
          error: 'Template name is required'
        };
      }

      const templateDataWithCreator = {
        ...templateData,
        created_by: userId
      };

      const template = await ticketTemplatesRepository.create(templateDataWithCreator);
      
      return {
        success: true,
        data: template,
        message: 'Ticket template created successfully'
      };
    } catch (error) {
      console.error('Error creating ticket template:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket template'
      };
    }
  }

  async getTemplateById(templateId) {
    try {
      const template = await ticketTemplatesRepository.findById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Ticket template not found'
        };
      }

      // Get usage statistics
      const usageStats = await ticketTemplatesRepository.getUsageStats(templateId);
      
      return {
        success: true,
        data: {
          ...template,
          usage_stats: usageStats
        }
      };
    } catch (error) {
      console.error('Error getting ticket template:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket template'
      };
    }
  }

  async getTemplates(options = {}) {
    try {
      const result = await ticketTemplatesRepository.findAll(options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting ticket templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket templates'
      };
    }
  }

  async updateTemplate(templateId, updateData, userId) {
    try {
      // First check if template exists
      const existingTemplate = await ticketTemplatesRepository.findById(templateId);
      
      if (!existingTemplate) {
        return {
          success: false,
          error: 'Ticket template not found'
        };
      }

      const updatedTemplate = await ticketTemplatesRepository.update(templateId, updateData, userId);
      
      return {
        success: true,
        data: updatedTemplate,
        message: 'Ticket template updated successfully'
      };
    } catch (error) {
      console.error('Error updating ticket template:', error);
      return {
        success: false,
        error: error.message || 'Failed to update ticket template'
      };
    }
  }

  async deleteTemplate(templateId, userId = null) {
    try {
      // Check if template is being used
      const usageStats = await ticketTemplatesRepository.getUsageStats(templateId);

      if (usageStats && parseInt(usageStats.usage_count) > 0) {
        return {
          success: false,
          error: 'Cannot delete template that is in use. Archive it instead.'
        };
      }

      const deletedTemplate = await ticketTemplatesRepository.delete(templateId, userId);

      if (!deletedTemplate) {
        return {
          success: false,
          error: 'Ticket template not found'
        };
      }

      return {
        success: true,
        data: deletedTemplate,
        message: 'Ticket template deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting ticket template:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete ticket template'
      };
    }
  }

  async getPopularTemplates(limit = 10) {
    try {
      const templates = await ticketTemplatesRepository.getPopularTemplates(limit);
      
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      console.error('Error getting popular templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get popular templates'
      };
    }
  }

  async validateTemplateForEvent(templateId, eventId) {
    try {
      const template = await ticketTemplatesRepository.findById(templateId);
      
      if (!template) {
        return {
          success: false,
          error: 'Ticket template not found'
        };
      }

      // TODO: Add more validation logic based on event requirements
      // For example: check if template is suitable for event type, size, etc.
      
      return {
        success: true,
        data: {
          template,
          is_suitable: true,
          recommendations: []
        }
      };
    } catch (error) {
      console.error('Error validating template for event:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate template for event'
      };
    }
  }

  async cloneTemplate(templateId, newName, userId) {
    try {
      const originalTemplate = await ticketTemplatesRepository.findById(templateId);
      
      if (!originalTemplate) {
        return {
          success: false,
          error: 'Original template not found'
        };
      }

      const clonedTemplateData = {
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        preview_url: originalTemplate.preview_url,
        source_files_path: originalTemplate.source_files_path,
        is_customizable: originalTemplate.is_customizable
      };

      const clonedTemplate = await ticketTemplatesRepository.create({
        ...clonedTemplateData,
        created_by: userId
      });
      
      return {
        success: true,
        data: clonedTemplate,
        message: 'Ticket template cloned successfully'
      };
    } catch (error) {
      console.error('Error cloning template:', error);
      return {
        success: false,
        error: error.message || 'Failed to clone template'
      };
    }
  }
}

module.exports = new TicketTemplatesService();
