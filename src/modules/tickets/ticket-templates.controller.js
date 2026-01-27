const ticketTemplatesService = require('./ticket-templates.service');

// Constante par défaut pour l'utilisateur ID
const DEFAULT_USER_ID = 1;

class TicketTemplatesController {
  async createTemplate(req, res) {
    try {
      const result = await ticketTemplatesService.createTemplate(req.body, DEFAULT_USER_ID);
      
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
      const result = await ticketTemplatesService.getTemplateById(id, DEFAULT_USER_ID);
      
      if (!result.success) {
        return res.status(404).json({
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

  async getTemplates(req, res) {
    try {
      const { page, limit, event_id } = req.query;
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        event_id: event_id ? parseInt(event_id) : null,
        userId: DEFAULT_USER_ID
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
        data: result.data,
        pagination: result.pagination,
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

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketTemplatesService.updateTemplate(id, req.body, DEFAULT_USER_ID);
      
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
      const result = await ticketTemplatesService.deleteTemplate(id, DEFAULT_USER_ID);
      
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

  async getPopularTemplates(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      
      const result = await ticketTemplatesService.getPopularTemplates(parseInt(limit));
      
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

  async validateTemplateForEvent(req, res, next) {
    try {
      const { id } = req.params;
      const { eventId } = req.body;
      
      if (!id || !eventId) {
        return res.status(400).json({
          success: false,
          error: 'Template ID and Event ID required'
        });
      }

      const result = await ticketTemplatesService.validateTemplateForEvent(parseInt(id), parseInt(eventId));
      
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

  async cloneTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID required'
        });
      }

      const result = await ticketTemplatesService.cloneTemplate(parseInt(id), {
        name,
        description,
        userId: DEFAULT_USER_ID
      });
      
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
}

module.exports = new TicketTemplatesController();
