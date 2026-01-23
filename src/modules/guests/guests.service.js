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
        created_by: userId
      };

      const guest = await guestsRepository.create(guestDataWithCreator);
      
      return {
        success: true,
        data: guest,
        message: 'Guest created successfully'
      };
    } catch (error) {
      console.error('Error creating guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to create guest'
      };
    }
  }

  async getGuestById(guestId) {
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
      console.error('Error getting guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to get guest'
      };
    }
  }

  async getGuests(options = {}) {
    try {
      const result = await guestsRepository.findAll(options);
      
      return {
        success: true,
        data: result
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
      // First check if guest exists
      const existingGuest = await guestsRepository.findById(guestId);
      
      if (!existingGuest) {
        return {
          success: false,
          error: 'Guest not found'
        };
      }

      // Check if email is being updated and if it already exists
      if (updateData.email && updateData.email !== existingGuest.email) {
        const emailExists = await guestsRepository.findByEmail(updateData.email);
        if (emailExists) {
          return {
            success: false,
            error: 'Guest with this email already exists'
          };
        }
      }

      const updatedGuest = await guestsRepository.update(guestId, updateData, userId);
      
      return {
        success: true,
        data: updatedGuest,
        message: 'Guest updated successfully'
      };
    } catch (error) {
      console.error('Error updating guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to update guest'
      };
    }
  }

  async deleteGuest(guestId) {
    try {
      const existingGuest = await guestsRepository.findById(guestId);
      
      if (!existingGuest) {
        return {
          success: false,
          error: 'Guest not found'
        };
      }

      const deletedGuest = await guestsRepository.delete(guestId);
      
      return {
        success: true,
        data: deletedGuest,
        message: 'Guest deleted successfully'
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
      const result = await guestsRepository.getEventGuests(eventId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting event guests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event guests'
      };
    }
  }

  async addGuestToEvent(eventId, guestId, userId) {
    try {
      // Generate unique invitation code
      const invitationCode = this.generateInvitationCode();
      
      const eventGuest = await guestsRepository.addGuestToEvent(
        eventId, 
        guestId, 
        invitationCode, 
        userId
      );
      
      // TODO: Send invitation notification
      
      return {
        success: true,
        data: eventGuest,
        message: 'Guest added to event successfully'
      };
    } catch (error) {
      console.error('Error adding guest to event:', error);
      return {
        success: false,
        error: error.message || 'Failed to add guest to event'
      };
    }
  }

  async checkInGuest(invitationCode) {
    try {
      const eventGuest = await guestsRepository.checkInGuest(invitationCode);
      
      if (!eventGuest) {
        return {
          success: false,
          error: 'Invalid invitation code or guest already checked in'
        };
      }

      // TODO: Send check-in confirmation
      
      return {
        success: true,
        data: eventGuest,
        message: 'Guest checked in successfully'
      };
    } catch (error) {
      console.error('Error checking in guest:', error);
      return {
        success: false,
        error: error.message || 'Failed to check in guest'
      };
    }
  }

  async getGuestStats(eventId) {
    try {
      const stats = await guestsRepository.getGuestStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting guest stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get guest statistics'
      };
    }
  }

  generateInvitationCode() {
    const prefix = 'INV';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${random}-${timestamp}`;
  }

  async bulkAddGuestsToEvent(eventId, guestsData, userId) {
    try {
      const results = [];
      
      for (const guestData of guestsData) {
        // First, create or find the guest
        let guest;
        if (guestData.email) {
          guest = await guestsRepository.findByEmail(guestData.email);
        }
        
        if (!guest) {
          const createResult = await this.createGuest(guestData, userId);
          if (!createResult.success) {
            results.push({
              success: false,
              guest: guestData,
              error: createResult.error
            });
            continue;
          }
          guest = createResult.data;
        }
        
        // Add guest to event
        const addResult = await this.addGuestToEvent(eventId, guest.id, userId);
        results.push({
          success: addResult.success,
          guest: guest,
          error: addResult.error || null
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      return {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failures: failureCount
          }
        },
        message: `Processed ${results.length} guests: ${successCount} successful, ${failureCount} failed`
      };
    } catch (error) {
      console.error('Error bulk adding guests to event:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk add guests to event'
      };
    }
  }
}

module.exports = new GuestsService();
