const guestsRepository = require('./guests.repository');
const { v4: uuidv4 } = require('uuid');

class GuestsService {
  async createGuest(guestData, userId) {
    try {
      // Check if email already exists
      if (guestData.email) {
        const existingGuest = await guestsRepository.findByEmail(guestData.email);
        if (existingGuest) {
          return {
            success: false,
            error: 'Guest with this email already exists'
          };
        }
      }

      const guestDataWithCreator = {
        ...guestData,
        id: uuidv4(),
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const guest = await guestsRepository.create(guestDataWithCreator);
      
      return {
        success: true,
        data: guest
      };
    } catch (error) {
      console.error('Error creating guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to create guest'
      };
    }
  }

  async getGuestById(guestId, userId) {
    try {
      const guest = await guestsRepository.findById(guestId);
      
      if (!guest) {
        return {
          success: false,
          error: 'Guest not found'
        };
      }

      return {
        success: true,
        data: guest
      };
    } catch (error) {
      console.error('Error getting guest by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get guest'
      };
    }
  }

  async getGuests(options = {}) {
    try {
      const { page, limit, status, search, userId } = options;
      const guests = await guestsRepository.findAll({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search,
        userId
      });
      
      return {
        success: true,
        data: guests,
        pagination: guests.pagination
      };
    } catch (error) {
      console.error('Error getting guests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get guests'
      };
    }
  }

  async updateGuest(guestId, updateData, userId) {
    try {
      const existingGuest = await guestsRepository.findById(guestId);
      
      if (!existingGuest) {
        return {
          success: false,
          error: 'Guest not found'
        };
      }

      const updatedGuest = await guestsRepository.update(guestId, {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: updatedGuest
      };
    } catch (error) {
      console.error('Error updating guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to update guest'
      };
    }
  }

  async deleteGuest(guestId, userId) {
    try {
      const existingGuest = await guestsRepository.findById(guestId);
      
      if (!existingGuest) {
        return {
          success: false,
          error: 'Guest not found'
        };
      }

      await guestsRepository.delete(guestId);

      return {
        success: true,
        data: { id: guestId, deleted: true }
      };
    } catch (error) {
      console.error('Error deleting guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete guest'
      };
    }
  }

  async getEventGuests(eventId, options = {}) {
    try {
      const { page, limit, status, userId } = options;
      const guests = await guestsRepository.findByEventId(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      return {
        success: true,
        data: guests,
        pagination: guests.pagination
      };
    } catch (error) {
      console.error('Error getting event guests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event guests'
      };
    }
  }

  async addGuestsToEvent(eventId, guests, userId) {
    try {
      // Validation des entrées
      if (!eventId) {
        throw new Error('Event ID is required');
      }
      
      if (!guests || !Array.isArray(guests)) {
        throw new Error('Guests must be an array');
      }
      
      if (guests.length === 0) {
        throw new Error('At least one guest is required');
      }
      
      const guestsWithIds = guests.map(guest => {
        // Gérer le nom (split name en first_name et last_name)
        let firstName = guest.first_name;
        let lastName = guest.last_name;
        
        if (guest.name && !guest.first_name && !guest.last_name) {
          const nameParts = guest.name.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        return {
          ...guest,
          first_name: firstName,
          last_name: lastName,
          id: uuidv4(),
          event_id: eventId,
          created_by: userId,
          updated_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const addedGuests = await guestsRepository.bulkCreate(guestsWithIds);
      
      // Créer les liaisons event_guests
      const eventGuestsData = addedGuests.map(guest => ({
        guest_id: guest.id,
        event_id: eventId,
        created_by: userId,
        updated_by: userId
      }));
      
      await guestsRepository.bulkCreateEventGuests(eventGuestsData);
      
      return {
        success: true,
        data: addedGuests
      };
    } catch (error) {
      console.error('Error adding guests to event:', error);
      return {
        success: false,
        error: error.message || 'Failed to add guests to event'
      };
    }
  }

  async bulkAddGuestsToEvent(eventId, guests, userId) {
    try {
      const guestsWithIds = guests.map(guest => ({
        ...guest,
        id: uuidv4(),
        event_id: eventId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const addedGuests = await guestsRepository.bulkCreate(guestsWithIds);
      
      return {
        success: true,
        data: addedGuests
      };
    } catch (error) {
      console.error('Error bulk adding guests to event:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk add guests to event'
      };
    }
  }

  async checkInGuest(guestId, eventId, userId) {
    try {
      const checkInData = {
        guest_id: guestId,
        event_id: eventId,
        checked_in_at: new Date().toISOString()
      };

      const checkIn = await guestsRepository.checkIn(checkInData);
      
      return {
        success: true,
        data: checkIn
      };
    } catch (error) {
      console.error('Error checking in guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to check in guest'
      };
    }
  }

  async checkInGuestById(guestId, eventId, userId) {
    try {
      // Vérifier si l'invité existe et est lié à l'événement
      const eventGuest = await guestsRepository.findEventGuest(guestId, eventId);
      
      if (!eventGuest) {
        return {
          success: false,
          error: 'Guest does not belong to this event'
        };
      }

      const checkInData = {
        guest_id: guestId,
        event_id: eventId,
        checked_in_at: new Date().toISOString()
      };

      const checkIn = await guestsRepository.checkIn(checkInData);
      
      return {
        success: true,
        data: checkIn
      };
    } catch (error) {
      console.error('Error checking in guest by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to check in guest'
      };
    }
  }

  async getEventGuestStats(eventId, userId) {
    try {
      const stats = await guestsRepository.getEventStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting event guest stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event guest statistics'
      };
    }
  }
}

module.exports = new GuestsService();
