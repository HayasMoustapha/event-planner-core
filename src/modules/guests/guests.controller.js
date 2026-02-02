const guestsService = require('./guests.service');
const GuestImportService = require('./guest-import.service');
const { ResponseFormatter } = require('../../../../shared');

class GuestsController {
  async createGuest(req, res, next) {
    try {
      const { first_name, last_name, email, phone } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json(ResponseFormatter.unauthorized('Authentication required'));
      }

      const result = await guestsService.createGuest({
        first_name,
        last_name,
        email,
        phone
      }, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.status(201).json(ResponseFormatter.created('Guest created', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getGuests(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const userId = req.user?.id;
      
      const result = await guestsService.getGuests({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        search,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Guests retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getGuestById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await guestsService.getGuestById(id, userId);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Guest'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guest retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async updateGuest(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await guestsService.updateGuest(id, req.body, userId);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Guest'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guest updated', result.data));
    } catch (error) {
      next(error);
    }
  }

  async deleteGuest(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await guestsService.deleteGuest(id, userId);
      
      if (!result.success) {
        if (result.error && (result.error.includes('not found') || result.error.includes('non trouvé'))) {
          return res.status(404).json(ResponseFormatter.notFound('Guest'));
        }
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guest deleted', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventGuests(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      const userId = req.user?.id;
      
      const result = await guestsService.getEventGuests(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Event guests retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getEventGuestAssociations(req, res, next) {
    try {
      const { eventId } = req.params;
      const { page, limit, status } = req.query;
      const userId = req.user?.id;
      
      const result = await guestsService.getEventGuestAssociations(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.paginated('Event guest associations retrieved', result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async addGuestsToEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { guests } = req.body;
      const userId = req.user?.id;
      
      // Validation des entrées
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Event ID is required'
        });
      }
      
      if (!guests || !Array.isArray(guests)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Guests must be an array'
        });
      }
      
      if (guests.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'At least one guest is required'
        });
      }
      
      const result = await guestsService.addGuestsToEvent(eventId, guests, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guests added to event', result.data));
    } catch (error) {
      next(error);
    }
  }

  async bulkAddGuestsToEvent(req, res, next) {
    try {
      const { eventId } = req.params;
      const { guests } = req.body;
      const userId = req.user?.id;
      
      const result = await guestsService.bulkAddGuestsToEvent(eventId, guests, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guests bulk added to event', result.data));
    } catch (error) {
      next(error);
    }
  }

  async checkInGuest(req, res, next) {
    try {
      const { guestId, eventId } = req.body;
      const userId = req.user?.id;
      
      const result = await guestsService.checkInGuest(guestId, eventId, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guest checked in', result.data));
    } catch (error) {
      next(error);
    }
  }

  async checkInGuestById(req, res, next) {
    try {
      const { eventId, guestId } = req.params;
      const userId = req.user?.id;
      
      const result = await guestsService.checkInGuestById(guestId, eventId, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Guest checked in', result.data));
    } catch (error) {
      next(error);
    }
  }

  async getEventGuestStats(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;
      
      const result = await guestsService.getEventGuestStats(eventId, userId);
      
      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'VALIDATION_ERROR'));
      }

      res.json(ResponseFormatter.success('Event guest statistics retrieved', result.data));
    } catch (error) {
      next(error);
    }
  }

  async importGuests(req, res, next) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;
      
      // Vérifier qu'un fichier a été uploadé
      if (!req.file) {
        return res.status(400).json(ResponseFormatter.error('No file uploaded', null, 'VALIDATION_ERROR'));
      }

      // Vérifier que l'ID de l'événement est valide
      if (!eventId) {
        return res.status(400).json(ResponseFormatter.error('Event ID is required', null, 'VALIDATION_ERROR'));
      }

      // Initialiser le service d'import
      const guestImportService = new GuestImportService(req.db);

      // Importer les invités depuis le fichier
      const result = await guestImportService.importGuestsFromFile(eventId, req.file.path, userId);

      if (!result.success) {
        return res.status(400).json(ResponseFormatter.error(result.error, result.details, 'IMPORT_ERROR'));
      }

      // Retourner le résultat détaillé
      res.json(ResponseFormatter.success('Guest import completed', result.data));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GuestsController();
