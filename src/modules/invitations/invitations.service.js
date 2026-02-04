const invitationsRepository = require('./invitations.repository');
const guestsRepository = require('../guests/guests.repository');
const eventsRepository = require('../events/events.repository');

class InvitationsService {
  async checkUserRole(userId, roleCode) {
    try {
      // Appeler l'API du service d'authentification pour vérifier les rôles
      const response = await fetch('http://localhost:3000/api/users/' + userId + '/roles', {
        method: 'GET',
        headers: {
          'X-Service-Token': process.env.SHARED_SERVICE_TOKEN || 'default-token'
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success && data.data.some(role => role.code === roleCode);
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  async sendInvitations(eventGuestIds, sendMethod, userId) {
    const results = [];
    
    try {
      // 1. Valider que tous les event_guests existent
      const eventGuests = await guestsRepository.findEventGuestsByIds(eventGuestIds);
      
      if (eventGuests.length === 0) {
        return {
          success: false,
          error: 'No valid event_guests found'
        };
      }
      
      // 2. Vérifier les permissions (organizer des événements)
      const eventIds = [...new Set(eventGuests.map(eg => eg.event_id))];
      const hasPermission = await this.validatePermissions(eventIds, userId);
      
      if (!hasPermission) {
        return {
          success: false,
          error: 'Access denied: You are not the organizer of these events'
        };
      }
      
      // 3. Pour chaque event_guest
      for (const eventGuest of eventGuests) {
        try {
          // Vérifier si invitation existe déjà
          const existingInvitation = await invitationsRepository.findByEventGuestId(eventGuest.id);
          if (existingInvitation) {
            results.push({ 
              success: false, 
              event_guest_id: eventGuest.id, 
              error: 'Invitation already exists' 
            });
            continue;
          }
          
          // Créer l'invitation
          const invitation = await invitationsRepository.createInvitation(eventGuest.id, userId);
          
          // Préparer les données de l'événement pour la notification
          const eventData = {
            id: eventGuest.event_id,
            title: eventGuest.event_title,
            description: eventGuest.event_description,
            event_date: eventGuest.event_date,
            location: eventGuest.location
          };
          
          // Envoyer notification selon la méthode
          const notificationResult = await this.sendNotificationByMethod(
            {
              first_name: eventGuest.first_name,
              last_name: eventGuest.last_name,
              email: eventGuest.email,
              phone: eventGuest.phone
            }, 
            invitation, 
            eventData, 
            sendMethod
          );
          
          // Mettre à jour le statut si notification envoyée
          if (notificationResult.success) {
            await invitationsRepository.updateStatus(invitation.id, 'sent', userId);
          }
          
          results.push({
            success: true,
            invitation_id: invitation.id,
            invitation_code: invitation.invitation_code,
            event_guest_id: eventGuest.id,
            guest_email: eventGuest.email,
            notification_sent: notificationResult.success,
            notification_method: sendMethod
          });
          
        } catch (error) {
          console.error(`Failed to send invitation to event_guest ${eventGuest.id}:`, error);
          results.push({
            success: false,
            event_guest_id: eventGuest.id,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        data: results
      };
      
    } catch (error) {
      console.error('Error in sendInvitations:', error);
      return {
        success: false,
        error: error.message || 'Failed to send invitations'
      };
    }
  }
  
  async validatePermissions(eventIds, userId) {
    try {
      // Récupérer tous les événements
      const events = await eventsRepository.findByIds(eventIds);
      
      // Vérifier que l'utilisateur est organizer de tous les événements OU admin
      const userIdNum = parseInt(userId);
      if (userIdNum === 1) return true; // Super admin
      
      return events.every(event => Number(event.organizer_id) === userIdNum);
    } catch (error) {
      console.error('Error validating permissions:', error);
      return false;
    }
  }

  async sendNotificationByMethod(guest, invitation, event, sendMethod) {
    try {
      const notificationData = {
        template: 'event_invitation',
        data: {
          invitationCode: invitation.invitation_code,
          guestName: `${guest.first_name} ${guest.last_name}`,
          eventTitle: event.title,
          eventDescription: event.description,
          eventDate: event.event_date,
          location: event.location,
          acceptUrl: `https://app.eventplanner.com/invitations/${invitation.invitation_code}/accept`,
          declineUrl: `https://app.eventplanner.com/invitations/${invitation.invitation_code}/decline`
        }
      };

      switch (sendMethod) {
        case 'email':
          return guest.email ? await this.sendEmailNotification(guest.email, notificationData) : 
                 { success: false, error: 'No email available' };
          
        case 'sms':
          return guest.phone ? await this.sendSMSNotification(guest.phone, notificationData) : 
                 { success: false, error: 'No phone available' };
          
        case 'both':
          const emailResult = guest.email ? await this.sendEmailNotification(guest.email, notificationData) : 
                              { success: false, error: 'No email', type: 'email' };
          const smsResult = guest.phone ? await this.sendSMSNotification(guest.phone, notificationData) : 
                            { success: false, error: 'No phone', type: 'sms' };
          
          return {
            success: emailResult.success || smsResult.success,
            emailResult,
            smsResult
          };
          
        default:
          return { success: false, error: 'Invalid send method' };
      }
      
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  async sendEmailNotification(email, notificationData) {
    try {
      const response = await fetch('http://localhost:3002/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': process.env.NOTIFICATION_SERVICE_API_KEY || process.env.SHARED_SERVICE_TOKEN || 'default-token'
        },
        body: JSON.stringify({
          to: email,
          template: notificationData.template,
          data: notificationData.data
        })
      });
      
      if (response.ok) {
        return { success: true, type: 'email', to: email };
      } else {
        return { success: false, type: 'email', to: email, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, type: 'email', to: email, error: error.message };
    }
  }
  
  async sendSMSNotification(phone, notificationData) {
    try {
      const response = await fetch('http://localhost:3002/api/notifications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': process.env.NOTIFICATION_SERVICE_API_KEY || process.env.SHARED_SERVICE_TOKEN || 'default-token'
        },
        body: JSON.stringify({
          phoneNumber: phone,
          template: notificationData.template,
          data: notificationData.data
        })
      });
      
      if (response.ok) {
        return { success: true, type: 'sms', to: phone };
      } else {
        return { success: false, type: 'sms', to: phone, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, type: 'sms', to: phone, error: error.message };
    }
  }

  validateInvitationResponse(invitation, action) {
    // 1. Invitation existe ?
    if (!invitation) {
      return { valid: false, error: 'Invitation not found' };
    }
    
    // 2. Invitation déjà répondue ?
    if (['confirmed', 'cancelled'].includes(invitation.status)) {
      return { valid: false, error: 'Invitation already responded' };
    }
    
    // 3. Événement déjà passé ?
    if (new Date(invitation.event_date) < new Date()) {
      return { valid: false, error: 'Event already passed' };
    }
    
    // 4. Action valide ?
    if (!['accept', 'decline'].includes(action)) {
      return { valid: false, error: 'Invalid action. Must be "accept" or "decline"' };
    }
    
    return { valid: true };
  }

  async respondToInvitation(invitationCode, action, userId = null) {
    try {
      // 1. Récupérer l'invitation avec toutes les infos
      const invitation = await invitationsRepository.findByCode(invitationCode);
      
      // 2. Valider la réponse
      const validation = this.validateInvitationResponse(invitation, action);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }
      
      // 3. Déterminer les statuts
      const invitationStatus = action === 'accept' ? 'confirmed' : 'cancelled';
      const guestStatus = action === 'accept' ? 'confirmed' : invitation.guest_status;
      
      // 4. Mettre à jour le statut de l'invitation
      await invitationsRepository.updateStatus(invitation.id, invitationStatus, userId);
      
      // 5. Mettre à jour le statut du guest et du event_guest
      await guestsRepository.update(invitation.guest_id, {
        status: guestStatus,
        updated_by: userId
      });
      
      // 6. Mettre à jour event_guest si accepté
      if (action === 'accept') {
        await guestsRepository.updateEventGuestStatus(invitation.event_guest_id, 'confirmed');
      }
      
      // 7. Envoyer les notifications
      await this.sendResponseNotifications(invitation, action);
      
      return {
        success: true,
        data: {
          invitationCode,
          action,
          invitationStatus,
          guestStatus,
          eventTitle: invitation.event_title,
          guestName: `${invitation.first_name} ${invitation.last_name}`,
          respondedAt: new Date()
        }
      };
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return {
        success: false,
        error: error.message || 'Failed to respond to invitation'
      };
    }
  }

  async sendResponseNotifications(invitation, action) {
    try {
      // Récupérer les infos de l'organisateur
      const event = await eventsRepository.findById(invitation.event_id);
      if (!event) return;
      
      const notificationData = {
        template: `invitation_${action}ed`,
        data: {
          guestName: `${invitation.first_name} ${invitation.last_name}`,
          guestEmail: invitation.email,
          eventTitle: invitation.event_title,
          eventDate: invitation.event_date,
          location: invitation.location,
          action: action,
          respondedAt: new Date().toISOString()
        }
      };

      // Notification à l'organisateur (email)
      if (event.organizer_id) {
        // Pour l'instant, on envoie juste une notification générique
        // Dans une version future, on récupérera l'email de l'organisateur
        console.log(`📧 Notification sent to organizer: Guest ${invitation.first_name} ${invitation.last_name} ${action}ed invitation to ${invitation.event_title}`);
      }
      
      // Confirmation au guest si accepté
      if (action === 'accept' && invitation.email) {
        console.log(`📧 Confirmation sent to guest: ${invitation.email} - Your attendance to ${invitation.event_title} is confirmed`);
      }
      
    } catch (error) {
      console.error('Failed to send response notifications:', error);
      // Ne pas échouer toute l'opération si les notifications échouent
    }
  }

  async getInvitationsByEvent(eventId, options = {}) {
    try {
      const invitations = await invitationsRepository.findByEventId(eventId, options);
      const total = await invitationsRepository.countByEvent(eventId, options.status);
      
      return {
        success: true,
        data: invitations,
        pagination: {
          page: options.page || 1,
          limit: options.limit || 10,
          total,
          totalPages: Math.ceil(total / (options.limit || 10))
        }
      };
    } catch (error) {
      console.error('Error getting invitations by event:', error);
      return {
        success: false,
        error: error.message || 'Failed to get invitations'
      };
    }
  }

  async getInvitationByCode(invitationCode) {
    try {
      const invitation = await invitationsRepository.findByCode(invitationCode);
      
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        };
      }
      
      return {
        success: true,
        data: invitation
      };
    } catch (error) {
      console.error('Error getting invitation by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to get invitation'
      };
    }
  }

  async getInvitationStats(eventId) {
    try {
      const stats = await invitationsRepository.getInvitationStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get invitation stats'
      };
    }
  }

  async deleteInvitation(invitationId, userId) {
    try {
      const invitation = await invitationsRepository.softDelete(invitationId, userId);
      
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        };
      }
      
      return {
        success: true,
        data: invitation
      };
    } catch (error) {
      console.error('Error deleting invitation:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete invitation'
      };
    }
  }
}

module.exports = new InvitationsService();
