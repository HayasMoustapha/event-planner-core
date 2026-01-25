const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const guestsService = require('../../src/modules/guests/guests.service');
const guestsRepository = require('../../src/modules/guests/guests.repository');

// Mock du repository
jest.mock('../../src/modules/guests/guests.repository');

describe('GuestsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGuest', () => {
    test('devrait créer un invité avec des données valides', async () => {
      const guestData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678'
      };
      const created_by = 1;
      const expectedGuest = { id: 1, ...guestData, created_by };

      guestsRepository.create.mockResolvedValue(expectedGuest);

      const result = await guestsService.createGuest(guestData, created_by);

      expect(guestsRepository.create).toHaveBeenCalledWith(guestData, created_by);
      expect(result).toEqual(expectedGuest);
    });

    test('devrait créer un invité sans téléphone', async () => {
      const guestData = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com'
      };
      const created_by = 1;
      const expectedGuest = { id: 1, ...guestData, created_by };

      guestsRepository.create.mockResolvedValue(expectedGuest);

      const result = await guestsService.createGuest(guestData, created_by);

      expect(guestsRepository.create).toHaveBeenCalledWith(guestData, created_by);
      expect(result).toEqual(expectedGuest);
    });
  });

  describe('getGuestById', () => {
    test('devrait retourner un invité existant', async () => {
      const guestId = 1;
      const expectedGuest = { 
        id: guestId, 
        first_name: 'John', 
        last_name: 'Doe',
        email: 'john.doe@example.com'
      };

      guestsRepository.findById.mockResolvedValue(expectedGuest);

      const result = await guestsService.getGuestById(guestId);

      expect(guestsRepository.findById).toHaveBeenCalledWith(guestId);
      expect(result).toEqual(expectedGuest);
    });

    test('devrait rejeter un invité non trouvé', async () => {
      const guestId = 999;

      guestsRepository.findById.mockResolvedValue(null);

      await expect(guestsService.getGuestById(guestId))
        .rejects.toThrow('Guest not found');
    });
  });

  describe('updateGuest', () => {
    test('devrait mettre à jour un invité existant', async () => {
      const guestId = 1;
      const updateData = { first_name: 'Jane' };
      const existingGuest = { 
        id: guestId, 
        first_name: 'John', 
        last_name: 'Doe',
        email: 'john.doe@example.com'
      };
      const updatedGuest = { ...existingGuest, ...updateData };

      guestsRepository.findById.mockResolvedValue(existingGuest);
      guestsRepository.update.mockResolvedValue(updatedGuest);

      const result = await guestsService.updateGuest(guestId, updateData);

      expect(guestsRepository.findById).toHaveBeenCalledWith(guestId);
      expect(guestsRepository.update).toHaveBeenCalledWith(guestId, updateData);
      expect(result).toEqual(updatedGuest);
    });

    test('devrait rejeter la mise à jour d\'un invité non trouvé', async () => {
      const guestId = 999;
      const updateData = { first_name: 'Jane' };

      guestsRepository.findById.mockResolvedValue(null);

      await expect(guestsService.updateGuest(guestId, updateData))
        .rejects.toThrow('Guest not found');
    });
  });

  describe('deleteGuest', () => {
    test('devrait supprimer un invité existant', async () => {
      const guestId = 1;
      const deleted_by = 1;
      const existingGuest = { 
        id: guestId, 
        first_name: 'John', 
        last_name: 'Doe',
        email: 'john.doe@example.com'
      };
      const deletedGuest = { ...existingGuest, deleted_at: new Date() };

      guestsRepository.findById.mockResolvedValue(existingGuest);
      guestsRepository.delete.mockResolvedValue(deletedGuest);

      const result = await guestsService.deleteGuest(guestId, deleted_by);

      expect(guestsRepository.findById).toHaveBeenCalledWith(guestId);
      expect(guestsRepository.delete).toHaveBeenCalledWith(guestId, deleted_by);
      expect(result).toEqual(deletedGuest);
    });

    test('devrait rejeter la suppression d\'un invité non trouvé', async () => {
      const guestId = 999;
      const deleted_by = 1;

      guestsRepository.findById.mockResolvedValue(null);

      await expect(guestsService.deleteGuest(guestId, deleted_by))
        .rejects.toThrow('Guest not found');
    });
  });

  describe('checkInGuest', () => {
    test('devrait faire le check-in d\'un invité', async () => {
      const invitationCode = 'INV123456';
      const checkedInGuest = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        is_present: true,
        check_in_time: new Date()
      };

      guestsRepository.checkInGuest.mockResolvedValue(checkedInGuest);

      const result = await guestsService.checkInGuest(invitationCode);

      expect(guestsRepository.checkInGuest).toHaveBeenCalledWith(invitationCode);
      expect(result).toEqual(checkedInGuest);
    });

    test('devrait rejeter le check-in d\'un invité déjà présent', async () => {
      const invitationCode = 'INV123456';

      guestsRepository.checkInGuest.mockResolvedValue(null);

      await expect(guestsService.checkInGuest(invitationCode))
        .rejects.toThrow('Guest not found or already checked in');
    });
  });

  describe('getEventGuests', () => {
    test('devrait retourner les invités d\'un événement', async () => {
      const eventId = 1;
      const options = { page: 1, limit: 10 };
      const expectedGuests = {
        guests: [
          { id: 1, first_name: 'John', last_name: 'Doe', event_id: eventId },
          { id: 2, first_name: 'Jane', last_name: 'Smith', event_id: eventId }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      guestsRepository.getEventGuests.mockResolvedValue(expectedGuests);

      const result = await guestsService.getEventGuests(eventId, options);

      expect(guestsRepository.getEventGuests).toHaveBeenCalledWith(eventId, options);
      expect(result).toEqual(expectedGuests);
    });
  });
});
