const adminRepository = require('./admin.repository');
const db = require('../../config/database');

class AdminService {
  async getDashboardData(userId) {
    try {
      const dashboardData = await adminRepository.getDashboardData(userId);
      
      return {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        success: false,
        error: error.message || 'Failed to get dashboard data'
      };
    }
  }

  async getGlobalStats(options = {}) {
    try {
      const { period, metric, userId } = options;
      const stats = await adminRepository.getGlobalStats({ period, metric, userId });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting global stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get global statistics'
      };
    }
  }

  async getRecentActivity(userId) {
    try {
      const activity = await adminRepository.getRecentActivity(userId);
      
      return {
        success: true,
        data: activity
      };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return {
        success: false,
        error: error.message || 'Failed to get recent activity'
      };
    }
  }

  async getSystemLogs(options = {}) {
    try {
      const { page, limit, level, start_date, end_date, userId } = options;
      const logs = await adminRepository.getSystemLogs({ 
        page, limit, level, start_date, end_date, userId 
      });
      
      return {
        success: true,
        data: logs,
        pagination: logs.pagination
      };
    } catch (error) {
      console.error('Error getting system logs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get system logs'
      };
    }
  }

  async createSystemLog(options = {}) {
    try {
      const { level, message, context, userId } = options;
      const validLevels = ['info', 'warning', 'error'];
      
      if (!validLevels.includes(level)) {
        return {
          success: false,
          error: 'Invalid log level',
          details: {
            field: 'level',
            message: 'Invalid log level. Must be info, warning, or error',
            allowedLevels: validLevels,
            providedLevel: level
          }
        };
      }

      const logData = {
        level,
        message,
        context,
        created_by: userId
      };

      const log = await adminRepository.createSystemLog(logData);
      
      return {
        success: true,
        data: log
      };
    } catch (error) {
      console.error('Error creating system log:', error);
      return {
        success: false,
        error: error.message || 'Failed to create system log'
      };
    }
  }

  async getUsers(options = {}) {
    try {
      const { page, limit, status, search, role, userId } = options;
      const users = await adminRepository.getUsers({ 
        page, limit, status, search, role, userId 
      });
      
      return {
        success: true,
        data: users,
        pagination: users.pagination
      };
    } catch (error) {
      console.error('Error getting users:', error);
      return {
        success: false,
        error: error.message || 'Failed to get users'
      };
    }
  }

  async getUserById(options = {}) {
    try {
      const { id, userId } = options;
      const user = await adminRepository.getUserById({ id, userId });
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user'
      };
    }
  }

  async getEvents(options = {}) {
    try {
      const { page, limit, status, search, userId } = options;
      const events = await adminRepository.getEvents({ 
        page, limit, status, search, userId 
      });
      
      return {
        success: true,
        data: events,
        pagination: events.pagination
      };
    } catch (error) {
      console.error('Error getting events:', error);
      return {
        success: false,
        error: error.message || 'Failed to get events'
      };
    }
  }

  async getTemplatesPendingApproval(options = {}) {
    try {
      const { page, limit, userId } = options;
      const templates = await adminRepository.getTemplatesPendingApproval({ 
        page, limit, userId 
      });
      
      return {
        success: true,
        data: templates,
        pagination: templates.pagination
      };
    } catch (error) {
      console.error('Error getting templates pending approval:', error);
      return {
        success: false,
        error: error.message || 'Failed to get templates pending approval'
      };
    }
  }

  async getDesignersPendingApproval(options = {}) {
    try {
      const { page, limit, userId } = options;
      const designers = await adminRepository.getDesignersPendingApproval({ 
        page, limit, userId 
      });
      
      return {
        success: true,
        data: designers,
        pagination: designers.pagination
      };
    } catch (error) {
      console.error('Error getting designers pending approval:', error);
      return {
        success: false,
        error: error.message || 'Failed to get designers pending approval'
      };
    }
  }

  async moderateContent(options = {}) {
    try {
      const { action, entityType, entityId, reason, userId } = options;
      const result = await adminRepository.moderateContent({ 
        action, entityType, entityId, reason, userId 
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        success: false,
        error: error.message || 'Failed to moderate content'
      };
    }
  }

  async getRevenueAnalytics(options = {}) {
    try {
      const { period, start_date, end_date, userId } = options;
      const stats = await adminRepository.getRevenueAnalytics({ 
        period, start_date, end_date, userId 
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get revenue analytics'
      };
    }
  }

  async getEventGrowthStats(options = {}) {
    try {
      const { period, start_date, end_date, userId } = options;
      const stats = await adminRepository.getEventGrowthStats({ 
        period, start_date, end_date, userId 
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting event growth stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event growth statistics'
      };
    }
  }

  async exportData(options = {}) {
    try {
      const { type, format, filters, userId } = options;
      const exportResult = await adminRepository.exportData({ 
        type, format, filters, userId 
      });
      
      return {
        success: true,
        data: exportResult
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        error: error.message || 'Failed to export data'
      };
    }
  }

  async getSystemHealth(options = {}) {
    try {
      const { userId } = options;
      const health = await adminRepository.getSystemHealth({ userId });
      
      return {
        success: true,
        data: health
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        success: false,
        error: error.message || 'Failed to get system health'
      };
    }
  }

  async createBackup(options = {}) {
    try {
      const { type, include, userId } = options;
      const backup = await adminRepository.createBackup({ 
        type, include, userId 
      });
      
      return {
        success: true,
        data: backup
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error.message || 'Failed to create backup'
      };
    }
  }
}

module.exports = new AdminService();
