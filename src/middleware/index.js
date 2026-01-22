const { authenticate, optionalAuthenticate } = require('./auth');
const {
  requirePermission,
  requirePermissions,
  requireRole,
  requireAdmin,
  requireSuperAdmin
} = require('./rbac');
const { validate, schemas } = require('./validation');

module.exports = {
  // Authentication
  authenticate,
  optionalAuthenticate,
  
  // Authorization
  requirePermission,
  requirePermissions,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  
  // Validation
  validate,
  schemas
};
