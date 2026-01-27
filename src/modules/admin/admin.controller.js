const adminService = require('./admin.service');
const { ResponseFormatter } = require('../../../../shared');

class AdminController {
  async getDashboard(req, res, next) {
    try {
      const result = await adminService.getDashboardData(req.user.id);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Dashboard data retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getGlobalStats(req, res, next) {
    try {
      const { period, metric } = req.query;
      const result = await adminService.getGlobalStats({ period, metric, userId: req.user.id });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Global statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req, res, next) {
    try {
      const result = await adminService.getRecentActivity(req.user.id);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Recent activity retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getSystemLogs(req, res, next) {
    try {
      const { page, limit, level, start_date, end_date } = req.query;
      const result = await adminService.getSystemLogs({ 
        page, limit, level, start_date, end_date, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('System logs retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async createSystemLog(req, res, next) {
    try {
      const { level, message, context } = req.body;
      const result = await adminService.createSystemLog({ 
        level, message, context, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('System log created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const { page, limit, status, search, role } = req.query;
      const result = await adminService.getUsers({ 
        page, limit, status, search, role, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Users retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.getUserById({ id, userId: req.user.id });
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          return res.status(404).json(ResponseFormatter.notFound('User'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('User retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await adminService.getEvents({ 
        page, limit, status, search, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Events retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getTemplatesPendingApproval(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await adminService.getTemplatesPendingApproval({ 
        page, limit, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Templates pending approval retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getDesignersPendingApproval(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await adminService.getDesignersPendingApproval({ 
        page, limit, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Designers pending approval retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async moderateContent(req, res, next) {
    try {
      const { action, entityType, entityId, reason } = req.body;
      const result = await adminService.moderateContent({ 
        action, entityType, entityId, reason, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Content moderated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getRevenueAnalytics(req, res, next) {
    try {
      const { period, start_date, end_date } = req.query;
      const result = await adminService.getRevenueAnalytics({ 
        period, start_date, end_date, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Revenue analytics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventGrowthStats(req, res, next) {
    try {
      const { period, start_date, end_date } = req.query;
      const result = await adminService.getEventGrowthStats({ 
        period, start_date, end_date, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event growth statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async exportData(req, res, next) {
    try {
      const { type, format, filters } = req.query;
      const result = await adminService.exportData({ 
        type, format, filters, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Data export initiated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getSystemHealth(req, res, next) {
    try {
      const result = await adminService.getSystemHealth({ userId: req.user.id });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('System health retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async createBackup(req, res, next) {
    try {
      const { type, include } = req.body;
      const result = await adminService.createBackup({ 
        type, include, userId: req.user.id 
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Backup created', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
