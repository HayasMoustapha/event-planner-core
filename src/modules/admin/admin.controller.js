const adminService = require('./admin.service');

class AdminController {
  async getDashboard(req, res) {
    try {
      const result = await adminService.getDashboardData();
      
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

  async getGlobalStats(req, res) {
    try {
      const result = await adminService.getGlobalStats();
      
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

  async getRecentActivity(req, res) {
    try {
      const { limit } = req.query;
      const result = await adminService.getRecentActivity(parseInt(limit) || 50);
      
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

  async getSystemLogs(req, res) {
    try {
      const { page, limit, level, start_date, end_date } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        level,
        start_date,
        end_date
      };

      const result = await adminService.getSystemLogs(options);
      
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

  async getUsers(req, res) {
    try {
      const { page, limit, search, status } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        search,
        status
      };

      const result = await adminService.getUsersList(options);
      
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

  async getEvents(req, res) {
    try {
      const { page, limit, status, search } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        status,
        search
      };

      const result = await adminService.getEventsList(options);
      
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

  async getTemplatesPendingApproval(req, res) {
    try {
      const { page, limit } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await adminService.getTemplatesPendingApproval(options);
      
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

  async getDesignersPendingVerification(req, res) {
    try {
      const { page, limit } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await adminService.getDesignersPendingVerification(options);
      
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

  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await adminService.updateUserStatus(parseInt(id), status, req.user.id);
      
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

  async createSystemLog(req, res) {
    try {
      const { level, message, context } = req.body;
      
      const result = await adminService.createSystemLog(level, message, context, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
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

  async getRevenueStats(req, res) {
    try {
      const { period } = req.query;
      
      const result = await adminService.getRevenueStats(period || 'month');
      
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

  async getEventGrowthStats(req, res) {
    try {
      const { period } = req.query;
      
      const result = await adminService.getEventGrowthStats(period || 'month');
      
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

  async moderateContent(req, res) {
    try {
      const { contentType, contentId, action, reason } = req.body;
      
      const result = await adminService.moderateContent(contentType, contentId, action, reason, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
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

  async exportData(req, res) {
    try {
      const { dataType, ...options } = req.query;
      
      const result = await adminService.exportData(dataType, { ...options, adminId: req.user.id });
      
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

  async getSystemHealth(req, res) {
    try {
      const result = await adminService.getSystemHealth();
      
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
}

module.exports = new AdminController();
