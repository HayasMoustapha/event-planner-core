const adminService = require('./admin.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler,
  ConflictError,
  DatabaseError 
} = require('../../utils/errors');

class AdminController {
  async getDashboard(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing admin dashboard');
      }

      // Security: Rate limiting check for sensitive admin operations
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Log admin dashboard access
      console.info('Admin dashboard accessed:', {
        adminId: req.user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      const result = await adminService.getDashboardData(req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getGlobalStats(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing global stats');
      }

      // Security: Validate query parameters
      const { period, metric } = req.query;
      
      if (period && !['7d', '30d', '90d', '1y'].includes(period)) {
        throw new ValidationError('Invalid period parameter. Use: 7d, 30d, 90d, 1y');
      }

      if (metric && !['events', 'users', 'tickets', 'revenue'].includes(metric)) {
        throw new ValidationError('Invalid metric parameter. Use: events, users, tickets, revenue');
      }

      // Security: Log stats access
      console.info('Admin global stats accessed:', {
        adminId: req.user.id,
        period: period || '30d',
        metric,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await adminService.getGlobalStats({
        period: period || '30d',
        metric,
        adminId: req.user.id
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemLogs(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing system logs');
      }

      // Security: Validate query parameters
      const { page, limit, level, start_date, end_date } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 1000)');
      }

      if (level && !['info', 'warning', 'error', 'critical'].includes(level)) {
        throw new ValidationError('Invalid log level. Use: info, warning, error, critical');
      }

      // Security: Validate date format
      if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
        throw new ValidationError('Invalid start_date format. Use YYYY-MM-DD');
      }

      if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        throw new ValidationError('Invalid end_date format. Use YYYY-MM-DD');
      }

      // Security: Check for SQL injection in parameters
      const params = [page, limit].filter(Boolean);
      for (const param of params) {
        if (param.toString().includes(';') || param.toString().includes('--') || param.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in logs query');
        }
      }

      // Security: Log sensitive logs access
      console.warn('System logs accessed by admin:', {
        adminId: req.user.id,
        level,
        dateRange: { start_date, end_date },
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 100,
        level,
        start_date,
        end_date,
        adminId: req.user.id
      };

      const result = await adminService.getSystemLogs(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async createSystemLog(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user creating system logs');
      }

      // Security: Validate log data
      const { level, message, context } = req.body;
      
      if (!level || !['info', 'warning', 'error', 'critical'].includes(level)) {
        throw new ValidationError('Valid log level is required: info, warning, error, critical');
      }

      if (!message || message.length < 1 || message.length > 10000) {
        throw new ValidationError('Message must be between 1 and 10000 characters');
      }

      if (context && typeof context !== 'object') {
        throw new ValidationError('Context must be a valid JSON object');
      }

      // Security: Check for XSS in message
      if (message.includes('<script>') || message.includes('javascript:') || message.includes('onload=')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in system log message');
      }

      // Security: Log manual log creation
      console.info('Manual system log created:', {
        adminId: req.user.id,
        level,
        messageLength: message.length,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await adminService.createSystemLog({
        level,
        message,
        context,
        adminId: req.user.id
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'System log created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing user list');
      }

      // Security: Validate query parameters
      const { page, limit, status, search, role } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (status && !['active', 'inactive', 'suspended', 'pending'].includes(status)) {
        throw new ValidationError('Invalid status parameter');
      }

      if (search && search.length > 255) {
        throw new ValidationError('Search query too long (max 255 characters)');
      }

      // Security: Check for XSS in search
      if (search && (search.includes('<script>') || search.includes('javascript:') || search.includes('onload='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in user search');
      }

      // Security: Log user list access
      console.info('User list accessed by admin:', {
        adminId: req.user.id,
        status,
        search,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        search,
        role,
        adminId: req.user.id
      };

      const result = await adminService.getUsers(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user updating user status');
      }

      // Security: Validate user ID
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Valid user ID is required');
      }

      const userId = parseInt(id);
      
      // Security: Check for SQL injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in user ID');
      }

      // Security: Prevent self-modification
      if (userId === req.user.id) {
        throw new ValidationError('Admins cannot modify their own status through this endpoint');
      }

      // Security: Validate status
      const { status } = req.body;
      
      if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        throw new ValidationError('Valid status is required: active, inactive, suspended');
      }

      // Security: Log status change
      console.warn('User status changed by admin:', {
        adminId: req.user.id,
        targetUserId: userId,
        newStatus: status,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await adminService.updateUserStatus(userId, status, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('User');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      next(error);
    }
  }

  async moderateContent(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user moderating content');
      }

      // Security: Validate request data
      const { contentType, contentId, action, reason } = req.body;
      
      if (!contentType || !['template', 'designer', 'event', 'review'].includes(contentType)) {
        throw new ValidationError('Valid content type is required: template, designer, event, review');
      }

      if (!contentId || isNaN(parseInt(contentId))) {
        throw new ValidationError('Valid content ID is required');
      }

      if (!action || !['approve', 'reject', 'suspend'].includes(action)) {
        throw new ValidationError('Valid action is required: approve, reject, suspend');
      }

      if (reason && reason.length > 1000) {
        throw new ValidationError('Reason too long (max 1000 characters)');
      }

      // Security: Check for XSS in reason
      if (reason && (reason.includes('<script>') || reason.includes('javascript:') || reason.includes('onload='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in moderation reason');
      }

      // Security: Check for SQL injection
      if (contentId.toString().includes(';') || contentId.toString().includes('--') || contentId.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in content ID');
      }

      // Security: Log moderation action
      console.warn('Content moderation by admin:', {
        adminId: req.user.id,
        contentType,
        contentId: parseInt(contentId),
        action,
        reason,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await adminService.moderateContent({
        contentType,
        contentId: parseInt(contentId),
        action,
        reason,
        adminId: req.user.id
      });
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError(`${contentType} content`);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: `Content ${action}d successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing analytics');
      }

      // Security: Validate query parameters
      const { period, metric, group_by } = req.query;
      
      if (period && !['7d', '30d', '90d', '1y'].includes(period)) {
        throw new ValidationError('Invalid period parameter. Use: 7d, 30d, 90d, 1y');
      }

      if (metric && !['events', 'users', 'tickets', 'revenue', 'engagement'].includes(metric)) {
        throw new ValidationError('Invalid metric parameter. Use: events, users, tickets, revenue, engagement');
      }

      if (group_by && !['day', 'week', 'month', 'year'].includes(group_by)) {
        throw new ValidationError('Invalid group_by parameter. Use: day, week, month, year');
      }

      // Security: Log analytics access
      console.info('Analytics accessed by admin:', {
        adminId: req.user.id,
        period: period || '30d',
        metric,
        group_by,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const options = {
        period: period || '30d',
        metric,
        group_by,
        adminId: req.user.id
      };

      const result = await adminService.getAnalytics(options);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async exportData(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user exporting data');
      }

      // Security: Rate limiting for data export
      if (req.rateLimit && req.rateLimit.remaining < 10) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate request data
      const { dataType, format, filters } = req.body;
      
      if (!dataType || !['events', 'users', 'tickets', 'transactions', 'logs'].includes(dataType)) {
        throw new ValidationError('Valid data type is required: events, users, tickets, transactions, logs');
      }

      if (!format || !['csv', 'json', 'xlsx'].includes(format)) {
        throw new ValidationError('Valid format is required: csv, json, xlsx');
      }

      // Security: Validate filters
      if (filters && typeof filters !== 'object') {
        throw new ValidationError('Filters must be a valid JSON object');
      }

      if (filters && filters.date_from && !/^\d{4}-\d{2}-\d{2}$/.test(filters.date_from)) {
        throw new ValidationError('Invalid date_from format. Use YYYY-MM-DD');
      }

      if (filters && filters.date_to && !/^\d{4}-\d{2}-\d{2}$/.test(filters.date_to)) {
        throw new ValidationError('Invalid date_to format. Use YYYY-MM-DD');
      }

      // Security: Check for suspicious filter patterns
      if (filters && JSON.stringify(filters).includes('<script>')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in export filters');
      }

      // Security: Log data export
      console.warn('Data export initiated by admin:', {
        adminId: req.user.id,
        dataType,
        format,
        filters,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await adminService.exportData({
        dataType,
        format,
        filters: filters || {},
        adminId: req.user.id
      });
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Data export initiated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req, res, next) {
    try {
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user accessing admin health check');
      }

      const result = await adminService.getSystemHealth();
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
