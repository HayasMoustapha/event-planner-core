const ticketGenerationJobsService = require('./ticket-generation-jobs.service');

class TicketGenerationJobsController {
  async createJob(req, res) {
    try {
      const result = await ticketGenerationJobsService.createJob(req.body, req.user.id);
      
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

  async getJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.getJobById(parseInt(id));
      
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

  async getJobsByEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status
      };

      const result = await ticketGenerationJobsService.getJobsByEventId(parseInt(eventId), options);
      
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

  async getJobs(req, res) {
    try {
      const { page, limit, status, event_id } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        event_id: event_id ? parseInt(event_id) : undefined
      };

      const result = await ticketGenerationJobsService.getJobs(options);
      
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

  async updateJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.updateJob(parseInt(id), req.body, req.user.id);
      
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

  async deleteJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.deleteJob(parseInt(id));
      
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

  async processJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.processJob(parseInt(id));
      
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

  async getJobStats(req, res) {
    try {
      const { eventId } = req.query;
      const result = await ticketGenerationJobsService.getJobStats(eventId ? parseInt(eventId) : null);
      
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

  async getFailedJobs(req, res) {
    try {
      const { limit } = req.query;
      const result = await ticketGenerationJobsService.getFailedJobs(parseInt(limit) || 20);
      
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

  async retryFailedJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.retryFailedJob(parseInt(id), req.user.id);
      
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

  async cancelJob(req, res) {
    try {
      const { id } = req.params;
      const result = await ticketGenerationJobsService.cancelJob(parseInt(id), req.user.id);
      
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

module.exports = new TicketGenerationJobsController();
