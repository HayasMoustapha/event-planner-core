const ticketTemplatesService = require('./ticket-templates.service');

class TicketTemplatesController {
  async createTemplate(req, res) {
    try {
      const result = await ticketTemplatesService.createTemplate(req.body, req.user.id);
      
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

  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketTemplatesService.getTemplateById(parseInt(id));
      
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

  async getTemplates(req, res) {
    try {
      const { page, limit, is_customizable, search } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        is_customizable: is_customizable !== undefined ? is_customizable === 'true' : undefined,
        search
      };

      const result = await ticketTemplatesService.getTemplates(options);
      
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

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketTemplatesService.updateTemplate(parseInt(id), req.body, req.user.id);
      
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

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketTemplatesService.deleteTemplate(parseInt(id), req.user?.id);

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

  async getPopularTemplates(req, res) {
    try {
      const { limit } = req.query;
      const result = await ticketTemplatesService.getPopularTemplates(parseInt(limit) || 10);
      
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

  async validateTemplateForEvent(req, res) {
    try {
      const { id } = req.params;
      const { eventId } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      try {
        const result = await ticketTemplatesService.validateTemplateForEvent(parseInt(id), parseInt(eventId || 0));

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error || 'Failed to validate template'
          });
        }

        res.status(200).json({
          success: true,
          data: result.data
        });
      } catch (serviceError) {
        console.error('Service error in validateTemplateForEvent:', serviceError);
        return res.status(400).json({
          success: false,
          error: 'Template validation service unavailable'
        });
      }
    } catch (error) {
      console.error('Controller error in validateTemplateForEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during template validation'
      });
    }
  }

  async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketTemplatesService.getTemplateById(parseInt(id));
      
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

  async cloneTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      try {
        const result = await ticketTemplatesService.cloneTemplate(parseInt(id), name, req.user?.id);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error || 'Failed to clone template'
          });
        }

        res.status(201).json({
          success: true,
          data: result.data
        });
      } catch (serviceError) {
        console.error('Service error in cloneTemplate:', serviceError);
        return res.status(400).json({
          success: false,
          error: 'Template cloning service unavailable'
        });
      }
    } catch (error) {
      console.error('Controller error in cloneTemplate:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during template cloning'
      });
    }
  }

  async getPreview(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      const result = await ticketTemplatesService.getTemplateById(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Template not found'
        });
      }

      res.json({
        success: true,
        data: {
          template: result.data,
          previewUrl: `/api/tickets/templates/${id}/preview-image`
        }
      });
    } catch (error) {
      console.error('Controller error in getPreview:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during preview generation'
      });
    }
  }
}

module.exports = new TicketTemplatesController();
