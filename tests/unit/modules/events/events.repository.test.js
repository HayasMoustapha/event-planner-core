/**
 * ========================================
 * TESTS UNITAIRES - EVENTS REPOSITORY
 * ========================================
 * Tests complets pour le repository des événements
 * Couverture: CRUD, requêtes SQL, gestion d'erreurs
 */

const EventsRepository = require('../../../src/modules/events/events.repository');

// Mock de la base de données
jest.mock('../../../src/config/database', () => ({
  database: {
    query: jest.fn()
  }
}));

const { database } = require('../../../src/config/database');

describe('EventsRepository', () => {
  let eventsRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    eventsRepository = new EventsRepository();
  });

  // ========================================
  // TESTS DE CRÉATION
  // ========================================
  describe('create', () => {
    it('✅ devrait créer un événement avec succès', async () => {
      // Arrange
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        event_date: '2025-06-15T10:00:00Z',
        location: 'Test Location',
        organizer_id: 1
      };
      
      const mockResult = {
        rows: [{
          id: 1,
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.event_date,
          location: eventData.location,
          organizer_id: eventData.organizer_id,
          status: 'draft',
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z'
        }]
      };
      
      database.query.mockResolvedValue(mockResult);
      
      // Act
      const result = await eventsRepository.create(eventData);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        [
          eventData.title,
          eventData.description,
          eventData.event_date,
          eventData.location,
          eventData.organizer_id
        ]
      );
      
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('❌ devrait gérer les erreurs de contrainte unique', async () => {
      // Arrange
      const eventData = {
        title: 'Duplicate Event',
        event_date: '2025-06-15T10:00:00Z',
        location: 'Test Location',
        organizer_id: 1
      };
      
      const error = new Error('duplicate key value violates unique constraint');
      error.code = '23505';
      database.query.mockRejectedValue(error);
      
      // Act & Assert
      await expect(eventsRepository.create(eventData)).rejects.toThrow(
        'Un événement avec ces informations existe déjà'
      );
    });

    it('❌ devrait gérer les erreurs de validation', async () => {
      // Arrange
      const eventData = {
        title: 'Invalid Event',
        event_date: 'invalid-date',
        location: 'Test Location',
        organizer_id: 1
      };
      
      const error = new Error('check constraint violation');
      error.code = '23514';
      database.query.mockRejectedValue(error);
      
      // Act & Assert
      await expect(eventsRepository.create(eventData)).rejects.toThrow(
        'Erreur de validation des données: check constraint violation'
      );
    });
  });

  // ========================================
  // TESTS DE LECTURE
  // ========================================
  describe('findById', () => {
    it('✅ devrait trouver un événement par ID', async () => {
      // Arrange
      const eventId = 1;
      const mockEvent = {
        id: eventId,
        title: 'Test Event',
        deleted_at: null
      };
      
      database.query.mockResolvedValue({ rows: [mockEvent] });
      
      // Act
      const result = await eventsRepository.findById(eventId);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
        [eventId]
      );
      
      expect(result).toEqual(mockEvent);
    });

    it('❌ devrait retourner null si événement non trouvé', async () => {
      // Arrange
      const eventId = 999;
      database.query.mockResolvedValue({ rows: [] });
      
      // Act
      const result = await eventsRepository.findById(eventId);
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByOrganizer', () => {
    it('✅ devrait récupérer les événements d\'un organisateur', async () => {
      // Arrange
      const organizerId = 1;
      const options = {
        page: 1,
        limit: 10,
        status: 'published'
      };
      
      const mockEvents = [
        { id: 1, title: 'Event 1', organizer_id: organizerId },
        { id: 2, title: 'Event 2', organizer_id: organizerId }
      ];
      
      const mockCount = { total: 2 };
      
      // Mock pour la requête principale
      database.query
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [mockCount] });
      
      // Act
      const result = await eventsRepository.findByOrganizer(organizerId, options);
      
      // Assert
      expect(database.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        events: mockEvents,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('✅ devrait gérer la pagination par défaut', async () => {
      // Arrange
      const organizerId = 1;
      const options = {}; // Options par défaut
      
      database.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });
      
      // Act
      const result = await eventsRepository.findByOrganizer(organizerId, options);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([organizerId, 10, 0])
      );
      
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    });
  });

  // ========================================
  // TESTS DE MISE À JOUR
  // ========================================
  describe('update', () => {
    it('✅ devrait mettre à jour un événement avec succès', async () => {
      // Arrange
      const eventId = 1;
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description'
      };
      const updatedBy = 1;
      
      const mockUpdatedEvent = {
        id: eventId,
        title: 'Updated Title',
        description: 'Updated Description',
        updated_at: '2025-01-01T11:00:00Z'
      };
      
      database.query.mockResolvedValue({ rows: [mockUpdatedEvent] });
      
      // Act
      const result = await eventsRepository.update(eventId, updateData, updatedBy);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE events SET "title" = \$1, "description" = \$2/),
        expect.arrayContaining(['Updated Title', 'Updated Description', updatedBy, eventId])
      );
      
      expect(result).toEqual(mockUpdatedEvent);
    });

    it('❌ devrait rejeter les champs non autorisés', async () => {
      // Arrange
      const eventId = 1;
      const updateData = {
        title: 'Valid Title',
        malicious_field: 'hack attempt'
      };
      const updatedBy = 1;
      
      database.query.mockResolvedValue({ rows: [{}] });
      
      // Act
      const result = await eventsRepository.update(eventId, updateData, updatedBy);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.not.stringContaining('malicious_field'),
        expect.any(Array)
      );
    });

    it('❌ devrait rejeter les mises à jour vides', async () => {
      // Arrange
      const eventId = 1;
      const updateData = {}; // Aucun champ
      const updatedBy = 1;
      
      // Act & Assert
      await expect(eventsRepository.update(eventId, updateData, updatedBy))
        .rejects.toThrow('Aucun champ valide à mettre à jour');
    });

    it('❌ devrait gérer les événements non trouvés', async () => {
      // Arrange
      const eventId = 999;
      const updateData = { title: 'Updated' };
      const updatedBy = 1;
      
      database.query.mockResolvedValue({ rows: [] }); // Aucune ligne affectée
      
      // Act & Assert
      await expect(eventsRepository.update(eventId, updateData, updatedBy))
        .rejects.toThrow('Événement non trouvé ou non mis à jour');
    });
  });

  // ========================================
  // TESTS DE SUPPRESSION
  // ========================================
  describe('delete', () => {
    it('✅ devrait supprimer un événement (soft delete)', async () => {
      // Arrange
      const eventId = 1;
      const deletedBy = 1;
      
      const mockDeletedEvent = {
        id: eventId,
        title: 'Test Event',
        deleted_at: expect.any(String),
        deleted_by: deletedBy
      };
      
      database.query.mockResolvedValue({ rows: [mockDeletedEvent] });
      
      // Act
      const result = await eventsRepository.delete(eventId, deletedBy);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SET deleted_at = NOW(), deleted_by = $2'),
        [eventId, deletedBy]
      );
      
      expect(result).toEqual(mockDeletedEvent);
    });

    it('❌ devrait retourner null si événement déjà supprimé', async () => {
      // Arrange
      const eventId = 999;
      const deletedBy = 1;
      
      database.query.mockResolvedValue({ rows: [] });
      
      // Act
      const result = await eventsRepository.delete(eventId, deletedBy);
      
      // Assert
      expect(result).toBeNull();
    });
  });

  // ========================================
  // TESTS MÉTIER
  // ========================================
  describe('publish', () => {
    it('✅ devrait publier un événement', async () => {
      // Arrange
      const eventId = 1;
      const organizerId = 1;
      
      const mockPublishedEvent = {
        id: eventId,
        title: 'Test Event',
        status: 'published',
        updated_at: '2025-01-01T11:00:00Z'
      };
      
      database.query.mockResolvedValue({ rows: [mockPublishedEvent] });
      
      // Act
      const result = await eventsRepository.publish(eventId, organizerId);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'published\''),
        [eventId, organizerId]
      );
      
      expect(result).toEqual(mockPublishedEvent);
    });
  });

  describe('archive', () => {
    it('✅ devrait archiver un événement', async () => {
      // Arrange
      const eventId = 1;
      const organizerId = 1;
      
      const mockArchivedEvent = {
        id: eventId,
        title: 'Test Event',
        status: 'archived',
        updated_at: '2025-01-01T11:00:00Z'
      };
      
      database.query.mockResolvedValue({ rows: [mockArchivedEvent] });
      
      // Act
      const result = await eventsRepository.archive(eventId, organizerId);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'archived\''),
        [eventId, organizerId]
      );
      
      expect(result).toEqual(mockArchivedEvent);
    });
  });

  describe('getEventStats', () => {
    it('✅ devrait récupérer les statistiques d\'un organisateur', async () => {
      // Arrange
      const organizerId = 1;
      
      const mockStats = {
        total_events: 10,
        published_events: 7,
        draft_events: 2,
        archived_events: 1,
        upcoming_events: 5,
        past_events: 5
      };
      
      database.query.mockResolvedValue({ rows: [mockStats] });
      
      // Act
      const result = await eventsRepository.getEventStats(organizerId);
      
      // Assert
      expect(database.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total_events'),
        [organizerId]
      );
      
      expect(result).toEqual(mockStats);
    });
  });
});
