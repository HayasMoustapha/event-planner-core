const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const eventsService = require('../../src/modules/events/events.service');
const eventsRepository = require('../../src/modules/events/events.repository');

// Mock du repository
jest.mock('../../src/modules/events/events.repository');

describe('EventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    test('devrait créer un événement avec des données valides', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        event_date: '2025-01-01T10:00:00Z',
        location: 'Test Location'
      };
      const organizerId = 1;
      const expectedEvent = { id: 1, ...eventData, organizer_id: organizerId };

      eventsRepository.create.mockResolvedValue(expectedEvent);

      const result = await eventsService.createEvent(eventData, organizerId);

      expect(eventsRepository.create).toHaveBeenCalledWith({
        ...eventData,
        organizer_id: organizerId
      });
      expect(result).toEqual(expectedEvent);
    });

    test('devrait rejeter un événement avec une date passée', async () => {
      const eventData = {
        title: 'Test Event',
        event_date: '2020-01-01T10:00:00Z',
        location: 'Test Location'
      };
      const organizerId = 1;

      await expect(eventsService.createEvent(eventData, organizerId))
        .rejects.toThrow('Event date must be in the future');
    });
  });

  describe('getEventById', () => {
    test('devrait retourner un événement existant', async () => {
      const eventId = 1;
      const userId = 1;
      const expectedEvent = { 
        id: eventId, 
        title: 'Test Event', 
        organizer_id: userId 
      };

      eventsRepository.findById.mockResolvedValue(expectedEvent);

      const result = await eventsService.getEventById(eventId, userId);

      expect(eventsRepository.findById).toHaveBeenCalledWith(eventId);
      expect(result).toEqual(expectedEvent);
    });

    test('devrait rejeter l\'accès à un événement non trouvé', async () => {
      const eventId = 999;
      const userId = 1;

      eventsRepository.findById.mockResolvedValue(null);

      await expect(eventsService.getEventById(eventId, userId))
        .rejects.toThrow('Event not found');
    });

    test('devrait rejeter l\'accès non autorisé', async () => {
      const eventId = 1;
      const userId = 1;
      const event = { 
        id: eventId, 
        title: 'Test Event', 
        organizer_id: 2 
      };

      eventsRepository.findById.mockResolvedValue(event);

      await expect(eventsService.getEventById(eventId, userId))
        .rejects.toThrow('Access denied');
    });
  });

  describe('updateEvent', () => {
    test('devrait mettre à jour un événement existant', async () => {
      const eventId = 1;
      const userId = 1;
      const updateData = { title: 'Updated Event' };
      const existingEvent = { 
        id: eventId, 
        title: 'Test Event', 
        organizer_id: userId 
      };
      const updatedEvent = { ...existingEvent, ...updateData };

      eventsRepository.findById.mockResolvedValue(existingEvent);
      eventsRepository.update.mockResolvedValue(updatedEvent);

      const result = await eventsService.updateEvent(eventId, updateData, userId);

      expect(eventsRepository.findById).toHaveBeenCalledWith(eventId);
      expect(eventsRepository.update).toHaveBeenCalledWith(eventId, updateData, userId);
      expect(result).toEqual(updatedEvent);
    });

    test('devrait rejeter la mise à jour d\'un événement non trouvé', async () => {
      const eventId = 999;
      const userId = 1;
      const updateData = { title: 'Updated Event' };

      eventsRepository.findById.mockResolvedValue(null);

      await expect(eventsService.updateEvent(eventId, updateData, userId))
        .rejects.toThrow('Event not found');
    });
  });

  describe('deleteEvent', () => {
    test('devrait supprimer un événement existant', async () => {
      const eventId = 1;
      const userId = 1;
      const existingEvent = { 
        id: eventId, 
        title: 'Test Event', 
        organizer_id: userId,
        status: 'draft'
      };
      const deletedEvent = { ...existingEvent, deleted_at: new Date() };

      eventsRepository.findById.mockResolvedValue(existingEvent);
      eventsRepository.delete.mockResolvedValue(deletedEvent);

      const result = await eventsService.deleteEvent(eventId, userId);

      expect(eventsRepository.findById).toHaveBeenCalledWith(eventId);
      expect(eventsRepository.delete).toHaveBeenCalledWith(eventId, userId);
      expect(result).toEqual(deletedEvent);
    });

    test('devrait rejeter la suppression d\'un événement publié', async () => {
      const eventId = 1;
      const userId = 1;
      const existingEvent = { 
        id: eventId, 
        title: 'Test Event', 
        organizer_id: userId,
        status: 'published'
      };

      eventsRepository.findById.mockResolvedValue(existingEvent);

      await expect(eventsService.deleteEvent(eventId, userId))
        .rejects.toThrow('Cannot delete published events. Archive them instead.');
    });
  });

  describe('getEventsByOrganizer', () => {
    test('devrait retourner les événements d\'un organisateur', async () => {
      const organizerId = 1;
      const options = { page: 1, limit: 10 };
      const expectedEvents = {
        events: [{ id: 1, title: 'Event 1', organizer_id: organizerId }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      eventsRepository.findByOrganizer.mockResolvedValue(expectedEvents);

      const result = await eventsService.getEventsByOrganizer(organizerId, options);

      expect(eventsRepository.findByOrganizer).toHaveBeenCalledWith(organizerId, options);
      expect(result).toEqual(expectedEvents);
    });
  });
});
