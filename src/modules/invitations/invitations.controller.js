const invitationsService = require('./invitations.service');
const ResponseFormatter = require('../../../../shared/utils/response-formatter');

class InvitationsController {
  async sendInvitations(req, res, next) {
    try {
      const { event_guest_ids, send_method } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }
      
      // Validation des entrées
      if (!event_guest_ids || !Array.isArray(event_guest_ids) || event_guest_ids.length === 0) {
        return res.status(400).json(ResponseFormatter.error('event_guest_ids must be a non-empty array', null, 'VALIDATION_ERROR'));
      }
      
      const validSendMethods = ['email', 'sms', 'both'];
      if (!send_method || !validSendMethods.includes(send_method)) {
        return res.status(400).json(ResponseFormatter.error(`send_method must be one of: ${validSendMethods.join(', ')}`, null, 'VALIDATION_ERROR'));
      }
      
      const result = await invitationsService.sendInvitations(event_guest_ids, send_method, userId);
      
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
      
      // Validation basique de l'action (déjà faite dans le service mais pour une réponse rapide)
      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json(ResponseFormatter.error('Invalid action. Must be "accept" or "decline"', null, 'VALIDATION_ERROR'));
      }
      
      const result = await invitationsService.respondToInvitation(invitation_code, action, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, null, 'VALIDATION_ERROR'));
      }
      
      res.json(ResponseFormatter.success(`Invitation ${action}ed successfully`, result.data));
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
