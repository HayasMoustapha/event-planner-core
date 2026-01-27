const marketplaceService = require('./marketplace.service');
const { 
  ErrorHandler, 
  ValidationError, 
  NotFoundError, 
  AuthorizationError,
  SecurityErrorHandler,
  ConflictError,
  DatabaseError 
} = require('../../utils/errors');

class MarketplaceController {
  async becomeDesigner(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate request data
      const { user_id, brand_name, portfolio_url } = req.body;
      
      if (!user_id || isNaN(parseInt(user_id))) {
        throw new ValidationError('Valid user ID is required');
      }

      if (!brand_name || brand_name.length < 2 || brand_name.length > 255) {
        throw new ValidationError('Brand name must be between 2 and 255 characters');
      }

      // Security: Check for suspicious patterns in brand name
      if (brand_name.includes('<script>') || brand_name.includes('javascript:') || brand_name.includes('onload=')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in brand name');
      }

      if (portfolio_url && !/^https?:\/\/.+/.test(portfolio_url)) {
        throw new ValidationError('Portfolio URL must be a valid HTTP/HTTPS URL');
      }

      // Security: Check for SQL injection in user ID
      if (user_id.toString().includes(';') || user_id.toString().includes('--') || user_id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in user ID');
      }

      const result = await marketplaceService.becomeDesigner(parseInt(user_id), { brand_name, portfolio_url }, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError(result.error);
        }
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('User');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getDesigners(req, res, next) {
    try {
      // Security: Validate query parameters
      const { page, limit, is_verified, search } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (search && search.length > 255) {
        throw new ValidationError('Search query too long (max 255 characters)');
      }

      // Security: Check for XSS patterns in search
      if (search && (search.includes('<script>') || search.includes('javascript:') || search.includes('onload='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in search query');
      }

      if (is_verified !== undefined && !['true', 'false'].includes(is_verified)) {
        throw new ValidationError('Invalid is_verified parameter');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        is_verified: is_verified !== undefined ? is_verified === 'true' : undefined,
        search
      };

      const result = await marketplaceService.getDesigners(options);
      
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

  async getDesigner(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid designer ID provided');
      }

      const designerId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in designer ID');
      }

      const result = await marketplaceService.getDesignerById(designerId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Designer');
        }
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

  async updateDesigner(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid designer ID provided');
      }

      const designerId = parseInt(id);
      
      // Security: Check ownership before update
      const existingDesigner = await marketplaceService.getDesignerById(designerId);
      if (!existingDesigner.success) {
        throw new NotFoundError('Designer');
      }

      if (existingDesigner.data.user_id !== req.user.id) {
        throw new AuthorizationError('Only designers can update their own profiles');
      }

      // Security: Validate update data
      const updateData = req.body;
      
      if (updateData.brand_name && (updateData.brand_name.length < 2 || updateData.brand_name.length > 255)) {
        throw new ValidationError('Brand name must be between 2 and 255 characters');
      }

      if (updateData.portfolio_url && !/^https?:\/\/.+/.test(updateData.portfolio_url)) {
        throw new ValidationError('Portfolio URL must be a valid HTTP/HTTPS URL');
      }

      // Security: Check for XSS patterns in brand name
      if (updateData.brand_name && (updateData.brand_name.includes('<script>') || updateData.brand_name.includes('javascript:'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in brand name');
      }

      const result = await marketplaceService.updateDesigner(designerId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Designer');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate request data
      const { designer_id, name, description, preview_url, source_files_path, price, currency } = req.body;
      
      if (!designer_id || isNaN(parseInt(designer_id))) {
        throw new ValidationError('Valid designer ID is required');
      }

      if (!name || name.length < 3 || name.length > 255) {
        throw new ValidationError('Template name must be between 3 and 255 characters');
      }

      if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
        throw new ValidationError('Price must be a positive number');
      }

      if (currency && !/^[A-Z]{3}$/.test(currency)) {
        throw new ValidationError('Currency must be a valid 3-letter code');
      }

      if (preview_url && !/^https?:\/\/.+/.test(preview_url)) {
        throw new ValidationError('Preview URL must be a valid HTTP/HTTPS URL');
      }

      // Security: Check for suspicious patterns
      if (name.includes('<script>') || name.includes('javascript:')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in template name');
      }

      if (source_files_path && (source_files_path.includes('..') || source_files_path.includes('~'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'Suspicious file path detected');
      }

      // Security: Check for SQL injection in designer ID
      if (designer_id.toString().includes(';') || designer_id.toString().includes('--') || designer_id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in designer ID');
      }

      const result = await marketplaceService.createTemplate({
        designer_id: parseInt(designer_id),
        name,
        description,
        preview_url,
        source_files_path,
        price: price ? parseFloat(price) : 0,
        currency: currency || 'EUR'
      }, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Designer');
        }
        if (result.error && result.error.includes('already exists')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getTemplates(req, res, next) {
    try {
      // Security: Validate query parameters
      const { page, limit, status, designer_id, category, min_price, max_price } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (status && !['pending_review', 'approved', 'rejected'].includes(status)) {
        throw new ValidationError('Invalid status parameter');
      }

      // Security: Validate numeric parameters
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status,
        designer_id: designer_id ? parseInt(designer_id) : undefined,
        category,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined
      };

      // Security: Check for SQL injection in IDs
      const ids = [designer_id].filter(Boolean);
      for (const id of ids) {
        if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
          throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in query parameters');
        }
      }

      const result = await marketplaceService.getTemplates(options);
      
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

  async getTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID parameter
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid template ID provided');
      }

      const templateId = parseInt(id);
      
      // Security: Check for potential SQL injection patterns
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in template ID');
      }

      const result = await marketplaceService.getTemplateById(templateId);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
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

  async updateTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid template ID provided');
      }

      const templateId = parseInt(id);
      
      // Security: Check ownership before update
      const existingTemplate = await marketplaceService.getTemplateById(templateId);
      if (!existingTemplate.success) {
        throw new NotFoundError('Template');
      }

      // Security: Check if user is the template designer
      if (existingTemplate.data.designer.user_id !== req.user.id) {
        throw new AuthorizationError('Only template designers can update their own templates');
      }

      // Security: Validate update data
      const updateData = req.body;
      
      if (updateData.name && (updateData.name.length < 3 || updateData.name.length > 255)) {
        throw new ValidationError('Template name must be between 3 and 255 characters');
      }

      if (updateData.price !== undefined && (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0)) {
        throw new ValidationError('Price must be a positive number');
      }

      if (updateData.currency && !/^[A-Z]{3}$/.test(updateData.currency)) {
        throw new ValidationError('Currency must be a valid 3-letter code');
      }

      if (updateData.preview_url && !/^https?:\/\/.+/.test(updateData.preview_url)) {
        throw new ValidationError('Preview URL must be a valid HTTP/HTTPS URL');
      }

      // Security: Check for XSS patterns
      if (updateData.name && (updateData.name.includes('<script>') || updateData.name.includes('javascript:'))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in template name');
      }

      const result = await marketplaceService.updateTemplate(templateId, updateData, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate ID and permissions
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Invalid template ID provided');
      }

      const templateId = parseInt(id);
      
      // Security: Check ownership and business rules
      const existingTemplate = await marketplaceService.getTemplateById(templateId);
      if (!existingTemplate.success) {
        throw new NotFoundError('Template');
      }

      // Security: Check if user is the template designer
      if (existingTemplate.data.designer.user_id !== req.user.id) {
        throw new AuthorizationError('Only template designers can delete their own templates');
      }

      // Security: Check if template has been sold
      if (existingTemplate.data.purchases_count > 0) {
        throw new ValidationError('Cannot delete template with purchases. Archive it instead.');
      }

      const result = await marketplaceService.deleteTemplate(templateId, req.user.id);
      
      if (!result.success) {
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async purchaseTemplate(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate request data
      const { template_id, amount, currency, transaction_id } = req.body;
      
      if (!template_id || isNaN(parseInt(template_id))) {
        throw new ValidationError('Valid template ID is required');
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new ValidationError('Valid positive amount is required');
      }

      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        throw new ValidationError('Valid 3-letter currency code is required');
      }

      if (!transaction_id || transaction_id.length < 6 || transaction_id.length > 255) {
        throw new ValidationError('Valid transaction ID is required');
      }

      // Security: Check for suspicious patterns in transaction ID
      if (transaction_id.includes(';') || transaction_id.includes('--') || transaction_id.includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in transaction ID');
      }

      const result = await marketplaceService.purchaseTemplate({
        template_id: parseInt(template_id),
        amount: parseFloat(amount),
        currency,
        transaction_id,
        user_id: req.user.id
      });
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
        if (result.error && result.error.includes('already purchased')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Rate limiting check
      if (req.rateLimit && req.rateLimit.remaining === 0) {
        throw SecurityErrorHandler.handleRateLimit(req);
      }

      // Security: Validate request data
      const { template_id, rating, comment } = req.body;
      
      if (!template_id || isNaN(parseInt(template_id))) {
        throw new ValidationError('Valid template ID is required');
      }

      if (!rating || isNaN(parseInt(rating)) || parseInt(rating) < 1 || parseInt(rating) > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      if (comment && comment.length > 1000) {
        throw new ValidationError('Comment too long (max 1000 characters)');
      }

      // Security: Check for XSS patterns in comment
      if (comment && (comment.includes('<script>') || comment.includes('javascript:') || comment.includes('onload='))) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in review comment');
      }

      const result = await marketplaceService.createReview({
        template_id: parseInt(template_id),
        rating: parseInt(rating),
        comment,
        user_id: req.user.id
      });
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
        if (result.error && result.error.includes('already reviewed')) {
          throw new ConflictError(result.error);
        }
        throw new ValidationError(result.error, result.details);
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserPurchases(req, res, next) {
    try {
      // Security: Validate user permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      // Security: Validate query parameters
      const { page, limit, status } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (status && !['pending', 'completed', 'failed'].includes(status)) {
        throw new ValidationError('Invalid status parameter');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        status
      };

      const result = await marketplaceService.getUserPurchases(req.user.id, options);
      
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

  async approveTemplate(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user approving template');
      }

      // Security: Validate template ID
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Valid template ID is required');
      }

      const templateId = parseInt(id);
      
      // Security: Check for SQL injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in template ID');
      }

      // Security: Log template approval
      console.warn('Template approved by admin:', {
        adminId: req.user.id,
        templateId,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await marketplaceService.approveTemplate(templateId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Template approved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user rejecting template');
      }

      // Security: Validate template ID
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Valid template ID is required');
      }

      const templateId = parseInt(id);
      
      // Security: Validate reason
      if (!reason || reason.length < 10 || reason.length > 1000) {
        throw new ValidationError('Reason must be between 10 and 1000 characters');
      }

      // Security: Check for XSS in reason
      if (reason.includes('<script>') || reason.includes('javascript:') || reason.includes('onload=')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'XSS attempt in rejection reason');
      }

      // Security: Check for SQL injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in template ID');
      }

      // Security: Log template rejection
      console.warn('Template rejected by admin:', {
        adminId: req.user.id,
        templateId,
        reason,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await marketplaceService.rejectTemplate(templateId, reason, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Template rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getTemplateReviews(req, res, next) {
    try {
      const { templateId } = req.params;
      
      // Security: Validate template ID
      if (!templateId || isNaN(parseInt(templateId))) {
        throw new ValidationError('Invalid template ID provided');
      }

      const templateIdInt = parseInt(templateId);
      
      // Security: Check for potential SQL injection patterns
      if (templateId.toString().includes(';') || templateId.toString().includes('--') || templateId.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in template ID');
      }

      // Security: Validate query parameters
      const { page, limit, rating } = req.query;
      
      if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
        throw new ValidationError('Invalid page parameter');
      }
      
      if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        throw new ValidationError('Invalid limit parameter (must be between 1 and 100)');
      }

      if (rating && (isNaN(parseInt(rating)) || parseInt(rating) < 1 || parseInt(rating) > 5)) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        rating: rating ? parseInt(rating) : undefined
      };

      const result = await marketplaceService.getTemplateReviews(templateIdInt, options);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Template');
        }
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

  async getMarketplaceStats(req, res, next) {
    try {
      // Security: Check user permissions for stats access
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('User authentication required');
      }

      const result = await marketplaceService.getMarketplaceStats(req.user.id);
      
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

  async verifyDesigner(req, res, next) {
    try {
      const { id } = req.params;
      
      // Security: Validate admin permissions
      if (!req.user || !req.user.id) {
        throw new AuthorizationError('Admin authentication required');
      }

      // Security: Check if user has admin role
      if (!req.user.roles || !req.user.roles.includes('admin')) {
        throw SecurityErrorHandler.handleSuspiciousActivity(req, 'Non-admin user verifying designer');
      }

      // Security: Validate designer ID
      if (!id || isNaN(parseInt(id))) {
        throw new ValidationError('Valid designer ID is required');
      }

      const designerId = parseInt(id);
      
      // Security: Check for SQL injection
      if (id.toString().includes(';') || id.toString().includes('--') || id.toString().includes('/*')) {
        throw SecurityErrorHandler.handleInvalidInput(req, 'SQL injection attempt in designer ID');
      }

      // Security: Log designer verification
      console.warn('Designer verified by admin:', {
        adminId: req.user.id,
        designerId,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      const result = await marketplaceService.verifyDesigner(designerId, req.user.id);
      
      if (!result.success) {
        if (result.error && result.error.includes('not found')) {
          throw new NotFoundError('Designer');
        }
        throw new ValidationError(result.error, result.details);
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Designer verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MarketplaceController();
