const adminRepository = require('./admin.repository');
const serviceClients = require('../../config/clients');
const db = require('../../config/database');

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

      // Send notification to user about status change
      try {
        if (updatedUser.email) {
          const statusMessages = {
            active: 'Votre compte a été activé.',
            inactive: 'Votre compte a été désactivé.',
            suspended: 'Votre compte a été suspendu. Contactez le support pour plus d\'informations.'
          };

          await serviceClients.notification.sendEmail({
            to: updatedUser.email,
            template: 'account-status-change',
            data: {
              firstName: updatedUser.first_name || 'Utilisateur',
              status: status,
              message: statusMessages[status],
              supportEmail: process.env.SUPPORT_EMAIL || 'support@eventplanner.com'
            }
          });
        }
      } catch (notifError) {
        // Log but don't fail the operation if notification fails
        console.error('Failed to send status change notification:', notifError.message);
      }

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
      const startTime = Date.now();

      // Check database connectivity
      let databaseStatus = 'unhealthy';
      let dbResponseTime = 0;
      try {
        const dbStart = Date.now();
        await db.query('SELECT 1');
        dbResponseTime = Date.now() - dbStart;
        databaseStatus = dbResponseTime < 1000 ? 'healthy' : 'degraded';
      } catch (dbError) {
        console.error('Database health check failed:', dbError.message);
        databaseStatus = 'unhealthy';
      }

      // Check all external services health in parallel
      const servicesHealth = await serviceClients.checkAllServicesHealth();

      // Calculate overall system health
      const allServicesHealthy = servicesHealth.overall.healthy;
      const criticalServicesHealthy = servicesHealth.services.auth?.success ?? false;

      let overallStatus = 'healthy';
      if (!criticalServicesHealthy || databaseStatus === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (!allServicesHealthy || databaseStatus === 'degraded') {
        overallStatus = 'degraded';
      }

      const totalResponseTime = Date.now() - startTime;

      const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        database: {
          status: databaseStatus,
          responseTime: dbResponseTime
        },
        services: {
          auth: {
            status: servicesHealth.services.auth?.status || 'unknown',
            healthy: servicesHealth.services.auth?.success || false,
            responseTime: servicesHealth.services.auth?.responseTime
          },
          notification: {
            status: servicesHealth.services.notification?.status || 'unknown',
            healthy: servicesHealth.services.notification?.success || false,
            responseTime: servicesHealth.services.notification?.responseTime
          },
          payment: {
            status: servicesHealth.services.payment?.status || 'unknown',
            healthy: servicesHealth.services.payment?.success || false,
            responseTime: servicesHealth.services.payment?.responseTime
          },
          ticketGenerator: {
            status: servicesHealth.services.ticketGenerator?.status || 'unknown',
            healthy: servicesHealth.services.ticketGenerator?.success || false,
            responseTime: servicesHealth.services.ticketGenerator?.responseTime
          },
          scanValidation: {
            status: servicesHealth.services.scanValidation?.status || 'unknown',
            healthy: servicesHealth.services.scanValidation?.success || false,
            responseTime: servicesHealth.services.scanValidation?.responseTime
          }
        },
        performance: {
          totalHealthCheckTime: totalResponseTime,
          status: totalResponseTime < 3000 ? 'good' : totalResponseTime < 10000 ? 'acceptable' : 'slow'
        },
        summary: {
          totalServices: 5,
          healthyServices: servicesHealth.overall.healthyCount,
          unhealthyServices: 5 - servicesHealth.overall.healthyCount
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
        error: error.message || 'Failed to check system health',
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          message: 'Health check encountered an error'
        }
      };
    }
  }
}

module.exports = new AdminService();
