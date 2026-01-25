const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const ticketsService = require('../../src/modules/tickets/tickets.service');
const ticketsRepository = require('../../src/modules/tickets/tickets.repository');

// Mock du repository
jest.mock('../../src/modules/tickets/tickets.repository');

describe('TicketsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTicketType', () => {
    test('devrait créer un type de ticket valide', async () => {
      const ticketTypeData = {
        event_id: 1,
        name: 'VIP Ticket',
        description: 'Premium access',
        type: 'paid',
        quantity: 100,
        price: 99.99,
        currency: 'EUR'
      };
      const created_by = 1;
      const expectedTicketType = { id: 1, ...ticketTypeData, created_by };

      ticketsRepository.createTicketType.mockResolvedValue(expectedTicketType);

      const result = await ticketsService.createTicketType(ticketTypeData, created_by);

      expect(ticketsRepository.createTicketType).toHaveBeenCalledWith(ticketTypeData, created_by);
      expect(result).toEqual(expectedTicketType);
    });

    test('devrait créer un type de ticket gratuit', async () => {
      const ticketTypeData = {
        event_id: 1,
        name: 'Free Ticket',
        type: 'free',
        quantity: 50
      };
      const created_by = 1;
      const expectedTicketType = { id: 1, ...ticketTypeData, price: 0, created_by };

      ticketsRepository.createTicketType.mockResolvedValue(expectedTicketType);

      const result = await ticketsService.createTicketType(ticketTypeData, created_by);

      expect(ticketsRepository.createTicketType).toHaveBeenCalledWith(ticketTypeData, created_by);
      expect(result).toEqual(expectedTicketType);
    });
  });

  describe('getTicketTypeById', () => {
    test('devrait retourner un type de ticket existant', async () => {
      const ticketTypeId = 1;
      const expectedTicketType = { 
        id: ticketTypeId, 
        name: 'VIP Ticket',
        event_id: 1,
        type: 'paid'
      };

      ticketsRepository.findTicketTypeById.mockResolvedValue(expectedTicketType);

      const result = await ticketsService.getTicketTypeById(ticketTypeId);

      expect(ticketsRepository.findTicketTypeById).toHaveBeenCalledWith(ticketTypeId);
      expect(result).toEqual(expectedTicketType);
    });

    test('devrait rejeter un type de ticket non trouvé', async () => {
      const ticketTypeId = 999;

      ticketsRepository.findTicketTypeById.mockResolvedValue(null);

      await expect(ticketsService.getTicketTypeById(ticketTypeId))
        .rejects.toThrow('Ticket type not found');
    });
  });

  describe('generateTicket', () => {
    test('devrait générer un ticket valide', async () => {
      const ticketData = {
        event_guest_id: 1,
        ticket_type_id: 1,
        ticket_template_id: 1
      };
      const created_by = 1;
      const expectedTicket = { 
        id: 1, 
        ticket_code: 'TKT-ABC123',
        qr_code_data: 'QR_DATA',
        ...ticketData,
        created_by 
      };

      ticketsRepository.create.mockResolvedValue(expectedTicket);

      const result = await ticketsService.generateTicket(ticketData, created_by);

      expect(ticketsRepository.create).toHaveBeenCalledWith(ticketData, created_by);
      expect(result).toEqual(expectedTicket);
    });
  });

  describe('validateTicket', () => {
    test('devrait valider un ticket par code', async () => {
      const ticketCode = 'TKT-ABC123';
      const validatedTicket = {
        id: 1,
        ticket_code: ticketCode,
        is_validated: true,
        validated_at: new Date()
      };

      ticketsRepository.validateTicketByCode.mockResolvedValue(validatedTicket);

      const result = await ticketsService.validateTicket(ticketCode);

      expect(ticketsRepository.validateTicketByCode).toHaveBeenCalledWith(ticketCode);
      expect(result).toEqual(validatedTicket);
    });

    test('devrait rejeter la validation d\'un ticket invalide', async () => {
      const ticketCode = 'INVALID';

      ticketsRepository.validateTicketByCode.mockResolvedValue(null);

      await expect(ticketsService.validateTicket(ticketCode))
        .rejects.toThrow('Ticket not found or already validated');
    });
  });

  describe('getTicketTypesByEvent', () => {
    test('devrait retourner les types de tickets d\'un événement', async () => {
      const eventId = 1;
      const options = { page: 1, limit: 10 };
      const expectedTicketTypes = {
        ticket_types: [
          { id: 1, name: 'VIP Ticket', event_id: eventId, type: 'paid' },
          { id: 2, name: 'Free Ticket', event_id: eventId, type: 'free' }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      ticketsRepository.getTicketTypesByEvent.mockResolvedValue(expectedTicketTypes);

      const result = await ticketsService.getTicketTypesByEvent(eventId, options);

      expect(ticketsRepository.getTicketTypesByEvent).toHaveBeenCalledWith(eventId, options);
      expect(result).toEqual(expectedTicketTypes);
    });
  });

  describe('getTicketsByEvent', () => {
    test('devrait retourner les tickets d\'un événement', async () => {
      const eventId = 1;
      const options = { page: 1, limit: 10 };
      const expectedTickets = {
        tickets: [
          { id: 1, ticket_code: 'TKT-001', event_id: eventId },
          { id: 2, ticket_code: 'TKT-002', event_id: eventId }
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
      };

      ticketsRepository.getTicketsByEvent.mockResolvedValue(expectedTickets);

      const result = await ticketsService.getTicketsByEvent(eventId, options);

      expect(ticketsRepository.getTicketsByEvent).toHaveBeenCalledWith(eventId, options);
      expect(result).toEqual(expectedTickets);
    });
  });

  describe('updateTicketType', () => {
    test('devrait mettre à jour un type de ticket existant', async () => {
      const ticketTypeId = 1;
      const updateData = { price: 149.99 };
      const updated_by = 1;
      const existingTicketType = { 
        id: ticketTypeId, 
        name: 'VIP Ticket',
        price: 99.99
      };
      const updatedTicketType = { ...existingTicketType, ...updateData };

      ticketsRepository.updateTicketType.mockResolvedValue(updatedTicketType);

      const result = await ticketsService.updateTicketType(ticketTypeId, updateData, updated_by);

      expect(ticketsRepository.updateTicketType).toHaveBeenCalledWith(ticketTypeId, updateData, updated_by);
      expect(result).toEqual(updatedTicketType);
    });

    test('devrait rejeter la mise à jour d\'un type de ticket non trouvé', async () => {
      const ticketTypeId = 999;
      const updateData = { price: 149.99 };
      const updated_by = 1;

      ticketsRepository.updateTicketType.mockResolvedValue(null);

      await expect(ticketsService.updateTicketType(ticketTypeId, updateData, updated_by))
        .rejects.toThrow('Ticket type not found');
    });
  });

  describe('deleteTicketType', () => {
    test('devrait supprimer un type de ticket existant', async () => {
      const ticketTypeId = 1;
      const deleted_by = 1;
      const deletedTicketType = { 
        id: ticketTypeId, 
        name: 'VIP Ticket',
        deleted_at: new Date()
      };

      ticketsRepository.deleteTicketType.mockResolvedValue(deletedTicketType);

      const result = await ticketsService.deleteTicketType(ticketTypeId, deleted_by);

      expect(ticketsRepository.deleteTicketType).toHaveBeenCalledWith(ticketTypeId, deleted_by);
      expect(result).toEqual(deletedTicketType);
    });

    test('devrait rejeter la suppression d\'un type de ticket non trouvé', async () => {
      const ticketTypeId = 999;
      const deleted_by = 1;

      ticketsRepository.deleteTicketType.mockResolvedValue(null);

      await expect(ticketsService.deleteTicketType(ticketTypeId, deleted_by))
        .rejects.toThrow('Ticket type not found');
    });
  });

  describe('getTicketStats', () => {
    test('devrait retourner les statistiques des tickets d\'un événement', async () => {
      const eventId = 1;
      const expectedStats = {
        total_tickets: 100,
        validated_tickets: 25,
        not_validated_tickets: 75,
        total_revenue: 2499.75,
        free_tickets: 50,
        paid_tickets: 50
      };

      ticketsRepository.getTicketStats.mockResolvedValue(expectedStats);

      const result = await ticketsService.getTicketStats(eventId);

      expect(ticketsRepository.getTicketStats).toHaveBeenCalledWith(eventId);
      expect(result).toEqual(expectedStats);
    });
  });
});
