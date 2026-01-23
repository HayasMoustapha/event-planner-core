const adminRepository = require('./admin.repository');

class AdminService {
  async getGlobalStats() {
    try {
      const stats = await adminRepository.getGlobalStats();
      
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

  async getRecentActivity(limit = 50) {
    try {
      const activity = await adminRepository.getRecentActivity(limit);
      
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
      const logs = await adminRepository.getSystemLogs(options);
      
      return {
        success: true,
        data: logs
      };
    } catch (error) {
      console.error('Error getting system logs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get system logs'
      };
    }
  }

  async getUsersList(options = {}) {
    try {
      const users = await adminRepository.getUsersList(options);
      
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Error getting users list:', error);
      return {
        success: false,
        error: error.message || 'Failed to get users list'
      };
    }
  }

  async getEventsList(options = {}) {
    try {
      const events = await adminRepository.getEventsList(options);
      
      return {
        success: true,
        data: events
      };
    } catch (error) {
      console.error('Error getting events list:', error);
      return {
        success: false,
        error: error.message || 'Failed to get events list'
      };
    }
  }

  async getTemplatesPendingApproval(options = {}) {
    try {
      const templates = await adminRepository.getTemplatesPendingApproval(options);
      
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      console.error('Error getting pending templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to get pending templates'
      };
    }
  }

  async getDesignersPendingVerification(options = {}) {
    try {
      const designers = await adminRepository.getDesignersPendingVerification(options);
      
      return {
        success: true,
        data: designers
      };
    } catch (error) {
      console.error('Error getting pending designers:', error);
      return {
        success: false,
        error: error.message || 'Failed to get pending designers'
      };
    }
  }

  async updateUserStatus(userId, status, adminId) {
    try {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: 'Invalid status. Must be active, inactive, or suspended'
        };
      }

      const updatedUser = await adminRepository.updateUserStatus(userId, status, adminId);
      
      if (!updatedUser) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Log the action
      await this.createSystemLog('info', `User status updated to ${status}`, {
        user_id: userId,
        old_status: updatedUser.status,
        new_status: status
      }, adminId);

      // TODO: Send notification to user
      
      return {
        success: true,
        data: updatedUser,
        message: 'User status updated successfully'
      };
    } catch (error) {
      console.error('Error updating user status:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user status'
      };
    }
  }

  async createSystemLog(level, message, context = {}, userId = null) {
    try {
      const validLevels = ['info', 'warning', 'error'];
      if (!validLevels.includes(level)) {
        throw new Error('Invalid log level. Must be info, warning, or error');
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

  async getRevenueStats(period = 'month') {
    try {
      const stats = await adminRepository.getRevenueStats(period);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting revenue stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get revenue statistics'
      };
    }
  }

  async getEventGrowthStats(period = 'month') {
    try {
      const stats = await adminRepository.getEventGrowthStats(period);
      
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

  async getDashboardData() {
    try {
      // Get all dashboard data in parallel
      const [globalStats, recentActivity, revenueStats, eventGrowthStats] = await Promise.all([
        adminRepository.getGlobalStats(),
        adminRepository.getRecentActivity(10),
        adminRepository.getRevenueStats('month'),
        adminRepository.getEventGrowthStats('month')
      ]);

      return {
        success: true,
        data: {
          globalStats,
          recentActivity,
          revenueStats,
          eventGrowthStats
        }
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        success: false,
        error: error.message || 'Failed to get dashboard data'
      };
    }
  }

  async moderateContent(contentType, contentId, action, reason = '', adminId) {
    try {
      const validActions = ['approve', 'reject', 'suspend'];
      if (!validActions.includes(action)) {
        return {
          success: false,
          error: 'Invalid action. Must be approve, reject, or suspend'
        };
      }

      let result;
      let logMessage;

      switch (contentType) {
        case 'template':
          // This would integrate with marketplace service
          if (action === 'approve') {
            // TODO: Call marketplace service to approve template
            logMessage = `Template ${contentId} approved`;
          } else if (action === 'reject') {
            // TODO: Call marketplace service to reject template
            logMessage = `Template ${contentId} rejected: ${reason}`;
          }
          break;

        case 'designer':
          // This would integrate with marketplace service
          if (action === 'approve') {
            // TODO: Call marketplace service to verify designer
            logMessage = `Designer ${contentId} verified`;
          } else if (action === 'suspend') {
            // TODO: Call marketplace service to suspend designer
            logMessage = `Designer ${contentId} suspended: ${reason}`;
          }
          break;

        case 'event':
          // TODO: Implement event moderation
          logMessage = `Event ${contentId} ${action}ed: ${reason}`;
          break;

        default:
          return {
            success: false,
            error: 'Invalid content type'
          };
      }

      // Log the moderation action
      await this.createSystemLog('info', logMessage, {
        content_type: contentType,
        content_id: contentId,
        action,
        reason
      }, adminId);

      return {
        success: true,
        message: `Content ${action}d successfully`
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        success: false,
        error: error.message || 'Failed to moderate content'
      };
    }
  }

  async exportData(dataType, options = {}) {
    try {
      let data;
      let filename;

      switch (dataType) {
        case 'users':
          data = await adminRepository.getUsersList({ ...options, limit: 10000 });
          filename = `users_export_${Date.now()}.json`;
          break;

        case 'events':
          data = await adminRepository.getEventsList({ ...options, limit: 10000 });
          filename = `events_export_${Date.now()}.json`;
          break;

        case 'logs':
          data = await adminRepository.getSystemLogs({ ...options, limit: 10000 });
          filename = `logs_export_${Date.now()}.json`;
          break;

        default:
          return {
            success: false,
            error: 'Invalid data type for export'
          };
      }

      // Log the export action
      await this.createSystemLog('info', `Data exported: ${dataType}`, {
        data_type: dataType,
        options,
        record_count: Array.isArray(data) ? data.length : (data[dataType] || []).length
      }, options.adminId);

      return {
        success: true,
        data: {
          filename,
          content: data,
          exported_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return {
        success: false,
        error: error.message || 'Failed to export data'
      };
    }
  }

  async getSystemHealth() {
    try {
      // This would check various system health indicators
      const health = {
        database: 'healthy', // TODO: Implement actual DB health check
        auth_service: 'healthy', // TODO: Check Auth Service connectivity
        services: {
          notification: 'healthy', // TODO: Check notification service
          payment: 'healthy', // TODO: Check payment service
          ticket_generator: 'healthy' // TODO: Check ticket generator service
        },
        performance: {
          response_time: 'good', // TODO: Measure actual response times
          error_rate: 'low' // TODO: Calculate actual error rates
        }
      };

      return {
        success: true,
        data: health
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        success: false,
        error: error.message || 'Failed to check system health'
      };
    }
  }
}

module.exports = new AdminService();
