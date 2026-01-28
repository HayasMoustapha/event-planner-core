const ResponseFormatter = require('../../../../shared/utils/response-formatter');

const invitationsErrorHandler = (error, req, res, next) => {
  console.error('Invitations module error:', error);

  // Handle specific invitation errors
  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json(
      ResponseFormatter.error('Invitation already exists', null, 'DUPLICATE_INVITATION')
    );
  }

  if (error.code === '23503') { // Foreign key violation
    return res.status(400).json(
      ResponseFormatter.error('Invalid event or guest reference', null, 'INVALID_REFERENCE')
    );
  }

  if (error.message.includes('Event not found')) {
    return res.status(404).json(
      ResponseFormatter.notFound('Event not found')
    );
  }

  if (error.message.includes('Access denied')) {
    return res.status(403).json(
      ResponseFormatter.error('Access denied', null, 'ACCESS_DENIED')
    );
  }

  // Default error handling
  res.status(500).json(
    ResponseFormatter.error('Internal server error', null, 'INTERNAL_ERROR')
  );
};

module.exports = invitationsErrorHandler;
