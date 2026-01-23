const guestsService = require('./guests.service');

class GuestsController {
  async createGuest(req, res) {
    try {
      const result = await guestsService.createGuest(req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getGuest(req, res) {
    try {
      const { id } = req.params;
      const result = await guestsService.getGuestById(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getGuests(req, res) {
    try {
      const { page, limit, status, search } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        search
      };

      const result = await guestsService.getGuests(options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateGuest(req, res) {
    try {
      const { id } = req.params;
      const result = await guestsService.updateGuest(parseInt(id), req.body, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async deleteGuest(req, res) {
    try {
      const { id } = req.params;
      const result = await guestsService.deleteGuest(parseInt(id));
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getEventGuests(req, res) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status
      };

      const result = await guestsService.getEventGuests(parseInt(eventId), options);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async addGuestToEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { guest_id } = req.body;
      
      const result = await guestsService.addGuestToEvent(parseInt(eventId), guest_id, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async checkInGuest(req, res) {
    try {
      const { invitation_code } = req.body;
      
      const result = await guestsService.checkInGuest(invitation_code);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getGuestStats(req, res) {
    try {
      const { eventId } = req.params;
      
      const result = await guestsService.getGuestStats(parseInt(eventId));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async bulkAddGuestsToEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { guests } = req.body;
      
      if (!Array.isArray(guests) || guests.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Guests array is required and cannot be empty'
        });
      }

      const result = await guestsService.bulkAddGuestsToEvent(parseInt(eventId), guests, req.user.id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new GuestsController();
