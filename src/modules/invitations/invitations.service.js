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

  async sendInvitations(eventId, guestsData, userId) {
    const results = [];
    
    // Vérifier que l'utilisateur a les droits sur l'événement
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      return {
        success: false,
        error: 'Event not found'
      };
    }
    
    // Autoriser si l'utilisateur est l'organizer OU s'il est l'admin (ID 1)
    if (event.organizer_id !== userId && userId !== '1') {
      return {
        success: false,
        error: 'Access denied: You are not the organizer of this event'
      };
    }
    
    for (const guestData of guestsData) {
      try {
        // 1. Créer/ récupérer le guest
        const existingGuest = await guestsRepository.findByEmail(guestData.email);
        let guest;
        
        if (existingGuest) {
          guest = existingGuest;
        } else {
          guest = await guestsRepository.create({
            ...guestData,
            created_by: userId,
            updated_by: userId
          });
        }
        
        // 2. Vérifier si le guest est déjà lié à l'événement
        const existingEventGuest = await guestsRepository.findEventGuest(guest.id, eventId);
        let eventGuest;
        
        if (existingEventGuest) {
          eventGuest = existingEventGuest;
        } else {
          eventGuest = await guestsRepository.createEventGuest({
            event_id: eventId,
            guest_id: guest.id,
            created_by: userId,
            updated_by: userId
          });
        }
        
        // 3. Vérifier si une invitation existe déjà
        const existingInvitation = await invitationsRepository.findByEventId(eventId, {
          guest_id: guest.id
        });
        
        if (existingInvitation.length > 0) {
          results.push({
            success: false,
            guest: guest.email,
            error: 'Invitation already sent'
          });
          continue;
        }
        
        // 4. Créer l'invitation
        const invitation = await invitationsRepository.createInvitation(eventGuest.id, userId);
        
        // 5. Envoyer notification (email/SMS)
        await this.sendNotification(guest, invitation, event);
        
        // 6. Marquer comme envoyée
        await invitationsRepository.updateStatus(invitation.id, 'sent');
        
        results.push({
          success: true,
          invitation: invitation,
          guest: guest.email
        });
        
      } catch (error) {
        console.error(`Failed to send invitation to ${guestData.email}:`, error);
        results.push({
          success: false,
          guest: guestData.email,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      data: results
    };
  }

  async sendNotification(guest, invitation, event) {
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

      const results = [];
      
      // Envoyer l'email si disponible
      if (guest.email) {
        try {
          const emailResponse = await fetch('http://localhost:3002/api/notifications/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Token': process.env.NOTIFICATION_SERVICE_API_KEY || process.env.SHARED_SERVICE_TOKEN || 'default-token'
            },
            body: JSON.stringify({
              to: guest.email,
              template: 'event_invitation',
              data: notificationData.data
            })
          });
          
          if (emailResponse.ok) {
            results.push({ type: 'email', success: true, to: guest.email });
          } else {
            results.push({ type: 'email', success: false, to: guest.email, error: `HTTP ${emailResponse.status}` });
          }
        } catch (error) {
          results.push({ type: 'email', success: false, to: guest.email, error: error.message });
        }
      }
      
      // Envoyer le SMS si disponible
      if (guest.phone) {
        try {
          const smsResponse = await fetch('http://localhost:3002/api/notifications/sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Token': process.env.NOTIFICATION_SERVICE_API_KEY || process.env.SHARED_SERVICE_TOKEN || 'default-token'
            },
            body: JSON.stringify({
              phoneNumber: guest.phone,
              template: 'event_invitation',
              data: notificationData.data
            })
          });
          
          if (smsResponse.ok) {
            results.push({ type: 'sms', success: true, to: guest.phone });
          } else {
            results.push({ type: 'sms', success: false, to: guest.phone, error: `HTTP ${smsResponse.status}` });
          }
        } catch (error) {
          results.push({ type: 'sms', success: false, to: guest.phone, error: error.message });
        }
      }

      return {
        success: results.some(r => r.success),
        results
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  async respondToInvitation(invitationCode, action, userId = null) {
    try {
      const invitation = await invitationsRepository.findByCode(invitationCode);
      
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        };
      }
      
      const newStatus = action === 'accept' ? 'confirmed' : 'cancelled';
      
      // Mettre à jour le statut de l'invitation
      await invitationsRepository.updateStatus(invitation.id, newStatus, userId);
      
      // Mettre à jour le statut du guest si accepté
      if (action === 'accept') {
        await guestsRepository.update(invitation.guest_id, {
          status: 'confirmed',
          updated_by: userId
        });
      }
      
      return {
        success: true,
        data: {
          invitationCode,
          action,
          status: newStatus
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
