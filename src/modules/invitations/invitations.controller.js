const invitationsService = require('./invitations.service');
const ResponseFormatter = require('../../../../shared/utils/response-formatter');

class InvitationsController {
  async sendInvitations(req, res, next) {
    try {
      const { event_id, guests } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }
      
      if (!event_id || !guests || !Array.isArray(guests)) {
        return res.status(400).json(ResponseFormatter.error('Invalid request data', null, 'VALIDATION_ERROR'));
      }
      
      const result = await invitationsService.sendInvitations(event_id, guests, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, null, 'VALIDATION_ERROR'));
      }
      
      res.status(201).json(ResponseFormatter.created('Invitations sent', result.data));
    } catch (error) {
      next(error);
    }
  }

  async respondToInvitation(req, res, next) {
    try {
      const { invitation_code } = req.params;
      const { action } = req.body; // 'accept' | 'decline'
      const userId = req.user?.id;
      
      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json(ResponseFormatter.error('Invalid action. Must be "accept" or "decline"', null, 'VALIDATION_ERROR'));
      }
      
      const result = await invitationsService.respondToInvitation(invitation_code, action, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, null, 'VALIDATION_ERROR'));
      }
      
      res.json(ResponseFormatter.success(`Invitation ${action}ed`, result.data));
    } catch (error) {
      next(error);
    }
  }

  async getInvitationsByEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      
      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status
      };
      
      const result = await invitationsService.getInvitationsByEvent(eventId, options);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, null, 'VALIDATION_ERROR'));
      }
      
      res.json(ResponseFormatter.success('Invitations retrieved', {
        invitations: result.data,
        pagination: result.pagination
      }));
    } catch (error) {
      next(error);
    }
  }

  async getInvitationByCode(req, res, next) {
    try {
      const { invitation_code } = req.params;
      
      const result = await invitationsService.getInvitationByCode(invitation_code);
      
      if (!result.success) {
        return res.status(404).json(ResponseFormatter.notFound(result.error));
      }
      
      res.json(ResponseFormatter.success('Invitation retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getInvitationStats(req, res, next) {
    try {
      const { eventId } = req.params;
      
      const result = await invitationsService.getInvitationStats(eventId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, null, 'VALIDATION_ERROR'));
      }
      
      res.json(ResponseFormatter.success('Invitation stats retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async deleteInvitation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }
      
      const result = await invitationsService.deleteInvitation(id, userId);
      
      if (!result.success) {
        return res.status(404).json(ResponseFormatter.notFound(result.error));
      }
      
      res.json(ResponseFormatter.success('Invitation deleted', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvitationsController();
