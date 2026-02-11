const { v4: uuidv4 } = require('uuid');
const ticketsRepository = require('./tickets.repository');
const guestsRepository = require('../guests/guests.repository');
const scanValidationClient = require('../../../../shared/clients/scan-validation-client'); // Client pour communiquer avec le service de validation
const notificationClient = require('../../../../shared/clients/notification-client');

class TicketsService {
  async createTicketType(ticketTypeData, userId) {
    try {
      const validTypes = ['free', 'paid', 'donation'];
      if (!validTypes.includes(ticketTypeData.type)) {
        return {
          success: false,
          error: 'Invalid ticket type. Must be free, paid, or donation'
        };
      }

      const ticketTypeDataWithCreator = {
        ...ticketTypeData,
        id: uuidv4(),
        organizer_id: userId,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const ticketType = await ticketsRepository.createTicketType(ticketTypeDataWithCreator);
      
      return {
        success: true,
        data: ticketType
      };
    } catch (error) {
      console.error('Error creating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket type'
      };
    }
  }

  async getAllTicketTypes({ page = 1, limit = 10, event_id = null, userId }) {
    try {
      const result = await ticketsRepository.getAllTicketTypes({
        page,
        limit,
        event_id,
        userId
      });
      
      return {
        success: true,
        data: result.ticketTypes,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error getting all ticket types:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket types'
      };
    }
  }

  async getTicketTypeById(ticketTypeId, userId) {
    try {
      const ticketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!ticketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (ticketType.organizer_id !== userId && String(ticketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      return {
        success: true,
        data: ticketType
      };
    } catch (error) {
      console.error('Error getting ticket type by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket type'
      };
    }
  }

  async updateTicketType(ticketTypeId, updateData, userId) {
    try {
      const existingTicketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (existingTicketType.organizer_id !== userId && String(existingTicketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const updatedTicketType = await ticketsRepository.updateTicketType(ticketTypeId, {
        ...updateData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: updatedTicketType
      };
    } catch (error) {
      console.error('Error updating ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to update ticket type'
      };
    }
  }

  async deleteTicketType(ticketTypeId, userId) {
    try {
      const existingTicketType = await ticketsRepository.getTicketTypeById(ticketTypeId);
      
      if (!existingTicketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Check if user is the organizer
      if (existingTicketType.organizer_id !== userId && String(existingTicketType.organizer_id) !== String(userId)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      // Check if tickets have been sold for this type
      if (existingTicketType.tickets_sold > 0) {
        return {
          success: false,
          error: 'Cannot delete ticket type with sold tickets'
        };
      }

      await ticketsRepository.deleteTicketType(ticketTypeId);

      return {
        success: true,
        data: { id: ticketTypeId, deleted: true }
      };
    } catch (error) {
      console.error('Error deleting ticket type:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete ticket type'
      };
    }
  }

  async createTicket(ticketData, userId) {
    try {
      // Générer automatiquement le ticket_code comme pour les invitations
      const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Récupérer le ticket_type pour obtenir l'eventId
      const ticketType = await ticketsRepository.findTicketTypeById(ticketData.ticket_type_id);
      
      if (!ticketType) {
        return {
          success: false,
          error: 'Ticket type not found'
        };
      }

      // Récupérer la liaison event_guests avec le bon eventId
      let eventGuest = null;

      // 1) Interpréter event_guest_id comme ID de la table event_guests (conforme au schéma)
      if (ticketData.event_guest_id) {
        const eventGuestById = await guestsRepository.findEventGuestById(ticketData.event_guest_id);
        if (eventGuestById && eventGuestById.event_id === ticketType.event_id) {
          eventGuest = eventGuestById;
        }
      }

      // 2) Compatibilité: si non trouvé, traiter event_guest_id comme guest_id (ancien comportement)
      if (!eventGuest) {
        eventGuest = await guestsRepository.findEventGuest(ticketData.event_guest_id, ticketType.event_id);
      }
      
      if (!eventGuest) {
        // Si l'association n'existe pas, la créer pour le test
        console.log('Association event_guest non trouvée, création automatique...');
        eventGuest = await guestsRepository.createEventGuest({
          event_id: ticketType.event_id,
          guest_id: ticketData.event_guest_id,
          created_by: userId,
          updated_by: userId
        });
        
        if (!eventGuest) {
          return {
            success: false,
            error: 'Failed to create event guest association'
          };
        }
      }

      const ticketDataWithId = {
        ...ticketData,
        ticket_code: ticketCode, // Généré automatiquement
        event_guest_id: eventGuest.id, // Utiliser l'ID de la liaison event_guests
        created_by: userId,
        updated_by: userId
      };

      // Validation du ticket_template_id
      if (ticketDataWithId.ticket_template_id) {
        const templateExists = await ticketsRepository.ticketTemplateExists(ticketDataWithId.ticket_template_id);
        if (!templateExists) {
          return {
            success: false,
            error: `Ticket template with ID ${ticketDataWithId.ticket_template_id} does not exist`
          };
        }
      } else {
        // Si ticket_template_id n'est pas fourni ou est null, le mettre explicitement à null
        ticketDataWithId.ticket_template_id = null;
      }

      const ticket = await ticketsRepository.create(ticketDataWithId);
      
      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket'
      };
    }
  }

  async processJob(jobId, userId) {
    try {
      // Appeler le service ticket-generator pour traiter le job
      const response = await fetch(`http://localhost:3003/api/jobs/${jobId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TICKET_GENERATOR_TOKEN || 'default-token'}`
        },
        body: JSON.stringify({
          user_id: userId,
          service: 'event-planner-core'
        })
      });

      if (!response.ok) {
        throw new Error(`Ticket generator service error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error processing job:', error);
      return {
        success: false,
        error: error.message || 'Failed to process job'
      };
    }
  }

  async getTickets(options = {}) {
    try {
      const { page, limit, status, event_id, userId } = options;
      const tickets = await ticketsRepository.getTickets({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        event_id,
        user_id: userId
      });
      
      return {
        success: true,
        data: tickets,
        pagination: tickets.pagination
      };
    } catch (error) {
      console.error('Error getting tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to get tickets'
      };
    }
  }

  async getTicketById(ticketId, userId) {
    try {
      const ticket = await ticketsRepository.findTicketById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Vérifier que l'utilisateur a les permissions nécessaires
      if (String(ticket.organizer_id) !== String(userId) && !await this.checkUserRole(userId, 'organizer') && !await this.checkUserRole(userId, 'super_admin')) {
        return {
          success: false,
          error: 'Access denied: You are not the organizer of this event'
        };
      }

      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      console.error('Error getting ticket by ID:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket by ID'
      };
    }
  }

  async getTicketByCode(ticketCode, userId) {
    try {
      const ticket = await ticketsRepository.findByCode(ticketCode);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      return {
        success: true,
        data: ticket
      };
    } catch (error) {
      console.error('Error getting ticket by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket by code'
      };
    }
  }

  async getEventTickets(eventId, options = {}) {
    try {
      const { page, limit, status, userId } = options;
      const tickets = await ticketsRepository.findByEventId(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        userId
      });
      
      return {
        success: true,
        data: tickets,
        pagination: tickets.pagination
      };
    } catch (error) {
      console.error('Error getting event tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event tickets'
      };
    }
  }

  async getTicketTypesByEvent(eventId, options = {}) {
    try {
      const { page, limit, userId } = options;
      const ticketTypes = await ticketsRepository.findTicketTypesByEventId(eventId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        userId
      });
      
      return {
        success: true,
        data: ticketTypes,
        pagination: ticketTypes.pagination
      };
    } catch (error) {
      console.error('Error getting event ticket types:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event ticket types'
      };
    }
  }

  async validateTicket(ticketId, userId, scanContext = {}) {
    try {
      // ÉTAPE 1 : Récupérer le ticket depuis la base de données
      const ticket = await ticketsRepository.findById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // ÉTAPE 2 : Vérifier que l'utilisateur a le droit de valider ce ticket
      // L'utilisateur doit être l'organisateur de l'événement ou un admin
      if (String(ticket.organizer_id) !== String(userId) && !await this.checkUserRole(userId, 'super_admin')) {
        return {
          success: false,
          error: 'Access denied: You are not the organizer of this event'
        };
      }

      // ÉTAPE 3 : Préparer le contexte de scan avec valeurs par défaut
      const defaultScanContext = {
        location: scanContext.location || 'default',
        deviceId: scanContext.deviceId || `device_${userId}`,
        timestamp: scanContext.timestamp || new Date().toISOString(),
        operatorId: scanContext.operatorId || String(userId),
        checkpointId: scanContext.checkpointId || 'main'
      };

      // ÉTAPE 4 : Appeler le service de validation externe
      console.log(`Validation du ticket ${ticketId} via Scan Validation Service`);
      const validationResult = await scanValidationClient.validateTicket(ticket, defaultScanContext);

      // ÉTAPE 5 : Traiter le résultat de la validation
      if (!validationResult.success) {
        // La validation a échoué côté service de validation
        return {
          success: false,
          error: validationResult.error || 'Validation service error',
          code: validationResult.code,
          details: validationResult.details
        };
      }

      // ÉTAPE 6 : Si la validation est réussie, mettre à jour le ticket
      if (validationResult.valid) {
        const updateData = {
          is_validated: true,
          validated_at: new Date().toISOString(),
          validated_by: userId
        };

        const updatedTicket = await ticketsRepository.update(ticketId, updateData);
        if (ticket.guest_id && ticket.event_id) {
          await guestsRepository.checkIn({
            guest_id: ticket.guest_id,
            event_id: ticket.event_id,
            checked_in_at: new Date().toISOString()
          });
        }

        return {
          success: true,
          data: {
            ...updatedTicket,
            validation: validationResult.validation
          },
          message: 'Ticket validé avec succès'
        };
      } else {
        // Le ticket n'est pas valide selon le service de validation
        return {
          success: false,
          valid: false,
          error: 'Ticket invalide',
          details: validationResult.validation,
          fraudFlags: validationResult.validation.fraudFlags || []
        };
      }

    } catch (error) {
      console.error('Error validating ticket:', error);
      
      // En cas d'erreur de communication avec le service de validation,
      // on peut essayer une validation locale en fallback
      if (error.code === 'VALIDATION_COMMUNICATION_ERROR' || error.code === 'VALIDATION_TIMEOUT') {
        console.log('Fallback vers validation locale pour le ticket', ticketId);
        return this.validateTicketLocally(ticketId, userId, scanContext);
      }

      return {
        success: false,
        error: error.message || 'Failed to validate ticket'
      };
    }
  }

  /**
   * Validation locale en fallback si le service externe est indisponible
   * @param {string} ticketId - ID du ticket
   * @param {string} userId - ID de l'utilisateur qui valide
   * @param {Object} scanContext - Contexte du scan
   * @returns {Object} - Résultat de la validation locale
   */
  async validateTicketLocally(ticketId, userId, scanContext = {}) {
    try {
      console.log(`Validation locale du ticket ${ticketId} (fallback)`);

      const ticket = await ticketsRepository.findById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Validation locale simplifiée
      if (ticket.status === 'used' || ticket.status === 'cancelled') {
        return {
          success: false,
          error: `Ticket already ${ticket.status}`
        };
      }

      // Mettre à jour le ticket localement
      const updatedTicket = await ticketsRepository.update(ticketId, {
        is_validated: true,
        validated_at: new Date().toISOString(),
        validated_by: userId
      });

      if (ticket.guest_id && ticket.event_id) {
        await guestsRepository.checkIn({
          guest_id: ticket.guest_id,
          event_id: ticket.event_id,
          checked_in_at: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: updatedTicket,
        warning: 'Validated locally - scan validation service unavailable'
      };

    } catch (error) {
      console.error('Error in local ticket validation:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket locally'
      };
    }
  }

  async validateTicketByCode(ticketCode, userId) {
    try {
      const ticket = await ticketsRepository.findByCode(ticketCode);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found'
        };
      }

      // Check if user owns the ticket or has admin permissions
      // L'utilisateur doit être l'organisateur de l'événement ou un admin
      if (String(ticket.organizer_id) !== String(userId) && !await this.checkUserRole(userId, 'super_admin')) {
        return {
          success: false,
          error: 'Access denied: You are not the organizer of this event'
        };
      }

      const validationResult = {
        ticket_id: ticket.id,
        qr_code: ticket.qr_code,
        status: 'validated',
        validated_at: new Date().toISOString(),
        scanner: userId
      };

      const updatedTicket = await ticketsRepository.update(ticket.id, {
        is_validated: true,
        validated_at: new Date().toISOString(),
        validated_by: userId
      });

      if (ticket.guest_id && ticket.event_id) {
        await guestsRepository.checkIn({
          guest_id: ticket.guest_id,
          event_id: ticket.event_id,
          checked_in_at: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: updatedTicket
      };
    } catch (error) {
      console.error('Error validating ticket by code:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket by code'
      };
    }
  }

  /**
   * Validation de ticket par QR code avec appel au scan-validation-service
   * @param {string} qrCode - QR code du ticket à valider
   * @param {string} userId - ID de l'utilisateur qui fait la validation
   * @param {Object} scanContext - Contexte du scan
   * @param {Object} options - Options de validation
   * @returns {Object} - Résultat de la validation
   */
  async validateTicketByQRCode(qrCode, userId, scanContext = {}, options = {}) {
    try {
      console.log(`Validation QR code: ${qrCode.substring(0, 20)}... par utilisateur ${userId}`);

      // ÉTAPE 1 : Décoder et valider le QR code
      let decodedQRData;
      try {
        decodedQRData = this.decodeQRCode(qrCode);
      } catch (decodeError) {
        return {
          success: false,
          error: 'Invalid QR code format',
          details: decodeError.message
        };
      }

      // ÉTAPE 2 : Vérifier que le QR code contient les informations requises
      if (!decodedQRData.ticketId && !decodedQRData.ticket_id) {
        return {
          success: false,
          error: 'QR code missing ticket identifier',
          details: 'QR code must contain ticketId or ticket_id field'
        };
      }

      const ticketId = decodedQRData.ticketId || decodedQRData.ticket_id;

      // ÉTAPE 3 : Récupérer le ticket depuis la base de données
      const ticket = await ticketsRepository.findById(ticketId);
      
      if (!ticket) {
        return {
          success: false,
          error: 'Ticket not found',
          details: `Ticket with ID ${ticketId} not found in database`
        };
      }

      // ÉTAPE 4 : Vérifier que le QR code correspond au ticket
      if (ticket.qr_code && ticket.qr_code !== qrCode) {
        return {
          success: false,
          error: 'QR code mismatch',
          details: 'Provided QR code does not match stored QR code'
        };
      }

      // ÉTAPE 5 : Vérifier les permissions de l'utilisateur
      if (ticket.user_id !== userId && !ticket.is_admin) {
        return {
          success: false,
          error: 'Access denied',
          details: 'User does not have permission to validate this ticket'
        };
      }

      // ÉTAPE 6 : Vérifier le statut actuel du ticket
      if (ticket.status === 'cancelled') {
        return {
          success: false,
          error: 'Ticket cancelled',
          details: 'Cannot validate a cancelled ticket'
        };
      }

      if (ticket.status === 'expired') {
        return {
          success: false,
          error: 'Ticket expired',
          details: 'Ticket has expired and cannot be validated'
        };
      }

      if (ticket.status === 'used' && !options.allow_used) {
        return {
          success: false,
          error: 'Ticket already used',
          details: 'Ticket has already been used and cannot be validated again'
        };
      }

      // ÉTAPE 7 : Vérifier la date de l'événement
      if (decodedQRData.eventId || decodedQRData.event_id) {
        const eventId = decodedQRData.eventId || decodedQRData.event_id;
        
        // Si un eventId est fourni dans le contexte, vérifier la cohérence
        if (scanContext.eventId && scanContext.eventId !== eventId) {
          return {
            success: false,
            error: 'Event mismatch',
            details: `QR code event (${eventId}) does not match scan context event (${scanContext.eventId})`
          };
        }
      }

      // ÉTAPE 8 : Appeler le scan-validation-service si option activée
      let validationResult = { valid: true, fraudFlags: [], restrictions: [] };
      
      if (options.check_fraud) {
        try {
          console.log(`Appel au scan-validation-service pour détection de fraude...`);
          const scanValidationResult = await scanValidationClient.validateTicket(ticket, scanContext);
          
          if (scanValidationResult.success) {
            validationResult = {
              valid: scanValidationResult.valid,
              fraudFlags: scanValidationResult.validation?.fraudFlags || [],
              restrictions: scanValidationResult.validation?.restrictions || []
            };
          } else {
            // En cas d'échec du service externe, on continue en mode dégradé
            console.warn('Scan-validation-service indisponible, validation locale uniquement');
          }
        } catch (serviceError) {
          console.warn('Erreur appel scan-validation-service:', serviceError.message);
          // Continuer en mode dégradé
        }
      }

      // ÉTAPE 9 : Vérifier les flags de fraude
      if (validationResult.fraudFlags && validationResult.fraudFlags.length > 0 && options.strict_mode) {
        return {
          success: false,
          error: 'Fraud detected',
          details: 'Ticket flagged for potential fraud',
          fraudFlags: validationResult.fraudFlags
        };
      }

      // ÉTAPE 10 : Mettre à jour le ticket si validation réussie
      if (validationResult.valid) {
        const updateData = {
          is_validated: true,
          validated_at: new Date().toISOString(),
          validated_by: userId
        };

        const updatedTicket = await ticketsRepository.update(ticketId, updateData);
        if (ticket.guest_id && ticket.event_id) {
          await guestsRepository.checkIn({
            guest_id: ticket.guest_id,
            event_id: ticket.event_id,
            checked_in_at: new Date().toISOString()
          });
        }

        console.log(`Ticket ${ticketId} validé avec succès par QR code`);

        return {
          success: true,
          data: {
            ...updatedTicket,
            validation_result: validationResult
          },
          message: 'Ticket validated successfully by QR code'
        };
      } else {
        return {
          success: false,
          error: 'Validation failed',
          details: validationResult.restrictions?.join(', ') || 'Unknown validation error',
          fraudFlags: validationResult.fraudFlags,
          restrictions: validationResult.restrictions
        };
      }

    } catch (error) {
      console.error('Error validating ticket by QR code:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate ticket by QR code',
        details: 'Internal server error during QR code validation'
      };
    }
  }

  /**
   * Décodage d'un QR code de ticket
   * @param {string} qrCode - QR code à décoder
   * @returns {Object} - Données décodées du QR code
   */
  decodeQRCode(qrCode) {
    try {
      // Essayer de décoder en JSON (format le plus courant)
      if (qrCode.startsWith('{') || qrCode.startsWith('[')) {
        return JSON.parse(qrCode);
      }

      // Essayer de décoder en Base64
      try {
        const decoded = Buffer.from(qrCode, 'base64').toString('utf8');
        if (decoded.startsWith('{') || decoded.startsWith('[')) {
          return JSON.parse(decoded);
        }
        // Si c'est du texte simple, essayer de parser comme JSON
        return JSON.parse(decoded);
      } catch (base64Error) {
        // Le Base64 n'a pas fonctionné, continuer avec d'autres méthodes
      }

      // Format simple: ticketId:eventId:userId
      if (qrCode.includes(':')) {
        const parts = qrCode.split(':');
        if (parts.length >= 2) {
          return {
            ticketId: parts[0],
            eventId: parts[1],
            userId: parts[2] || null,
            format: 'simple'
          };
        }
      }

      // Format UUID simple
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(qrCode)) {
        return {
          ticketId: qrCode,
          format: 'uuid'
        };
      }

      // Si aucun format ne correspond, retourner le QR code brut
      return {
        raw: qrCode,
        format: 'unknown'
      };

    } catch (error) {
      throw new Error(`Failed to decode QR code: ${error.message}`);
    }
  }

  async bulkGenerateTickets(bulkData, userId) {
    try {
      const { event_id, ticket_type_id, quantity } = bulkData;
      
      // Créer des invités fictifs pour les tickets
      const guestsData = [];
      for (let i = 0; i < quantity; i++) {
        guestsData.push({
          first_name: `Guest`,
          last_name: `${i + 1}`,
          email: `guest${i + 1}@bulk.generated`,
          phone: `+336000000${i.toString().padStart(3, '0')}`
        });
      }

      // Créer les invités et les lier à l'événement
      const createdGuests = await guestsRepository.bulkCreate(guestsData.map(guest => ({
        ...guest,
        created_by: userId,
        updated_by: userId
      })));

      const eventGuestsData = createdGuests.map(guest => ({
        guest_id: guest.id,
        event_id: event_id,
        created_by: userId,
        updated_by: userId
      }));
      
      await guestsRepository.bulkCreateEventGuests(eventGuestsData);

      // Créer les tickets avec les event_guest_id
      const tickets = [];
      for (let i = 0; i < createdGuests.length; i++) {
        const guest = createdGuests[i];
        const eventGuest = await guestsRepository.findEventGuest(guest.id, event_id);
        
        const ticketData = {
          ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          qr_code_data: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ticket_type_id,
          event_guest_id: eventGuest.id,
          price: 0, // Prix par défaut pour les tickets bulk
          currency: 'EUR',
          created_by: userId,
          updated_by: userId
        };
        tickets.push(ticketData);
      }

      const createdTickets = await ticketsRepository.bulkCreate(tickets);
      
      return {
        success: true,
        data: createdTickets
      };
    } catch (error) {
      console.error('Error bulk generating tickets:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk generate tickets'
      };
    }
  }

  async createJob(jobData, userId) {
    try {
      // Créer le job directement dans la base de données locale
      const job = await ticketsRepository.createJob({
        event_id: jobData.event_id,
        status: 'pending',
        details: jobData.details || {},
        created_by: userId
      });
      
      return {
        success: true,
        data: job
      };
    } catch (error) {
      console.error('Error creating job:', error);
      return {
        success: false,
        error: error.message || 'Failed to create job'
      };
    }
  }

  async processJob(jobId, userId) {
    try {
      const job = await ticketsRepository.getJobById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      // Check if user owns the job
      if (job.user_id !== userId) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      const processedJob = await ticketsRepository.updateJob(jobId, {
        status: 'processing',
        started_at: new Date().toISOString(),
        started_by: userId
      });

      // Simulate job processing (in real implementation, this would be async)
      setTimeout(async () => {
        try {
          await ticketsRepository.updateJob(jobId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId
        });
        } catch (error) {
          console.error('Error completing job:', error);
        }
      }, 1000);

      return {
        success: true,
        data: processedJob
      };
    } catch (error) {
      console.error('Error processing job:', error);
      return {
        success: false,
        error: error.message || 'Failed to process job'
      };
    }
  }

  async getEventTicketStats(eventId, userId) {
    try {
      const stats = await ticketsRepository.getEventStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting event ticket statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get event ticket statistics'
      };
    }
  }

  /**
   * Envoie une notification de ticket généré
   * @param {Object} ticketData - Données du ticket
   * @param {Object} userData - Données de l'utilisateur
   * @param {Object} eventData - Données de l'événement
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendTicketNotification(ticketData, userData, eventData) {
    try {
      const result = await notificationClient.sendTicketEmail(userData.email, {
        eventName: eventData.title,
        eventDate: eventData.event_date,
        eventLocation: eventData.location,
        ticketCount: 1,
        ticketIds: [ticketData.id],
        downloadUrl: `http://localhost:3001/api/tickets/${ticketData.id}/download`,
        qrCode: ticketData.qr_code
      });

      if (!result.success) {
        console.error('Failed to send ticket notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending ticket notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie une notification d'annulation d'événement
   * @param {Object} eventData - Données de l'événement
   * @param {Array} participants - Liste des participants
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendEventCancellationNotification(eventData, participants) {
    try {
      const recipients = participants.map(p => ({
        to: p.email,
        data: {
          firstName: p.first_name,
          lastName: p.last_name
        }
      }));

      const result = await notificationClient.sendBulkEmail(
        recipients,
        'event-cancelled',
        `Important : L'événement "${eventData.title}" a été annulé`,
        {
          eventName: eventData.title,
          eventDate: eventData.event_date,
          cancellationReason: eventData.cancellation_reason || 'Raison non spécifiée',
          refundInfo: eventData.refund_info || 'Contactez le support pour plus d\'informations',
          organizerName: eventData.organizer_name || 'L\'équipe Event Planner'
        },
        'high'
      );

      if (!result.success) {
        console.error('Failed to send event cancellation notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending event cancellation notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un rappel d'événement
   * @param {Object} eventData - Données de l'événement
   * @param {Array} participants - Liste des participants
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendEventReminderNotification(eventData, participants) {
    try {
      const recipients = participants.map(p => ({
        to: p.email,
        data: {
          firstName: p.first_name,
          lastName: p.last_name,
          ticketCount: p.ticket_count || 1
        }
      }));

      const result = await notificationClient.sendBulkEmail(
        recipients,
        'event-reminder',
        `Rappel : ${eventData.title} demain !`,
        {
          eventName: eventData.title,
          eventDate: new Date(eventData.event_date).toLocaleDateString('fr-FR'),
          eventTime: new Date(eventData.event_date).toLocaleTimeString('fr-FR'),
          eventLocation: eventData.location,
          organizerName: eventData.organizer_name
        },
        'normal'
      );

      if (!result.success) {
        console.error('Failed to send event reminder notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending event reminder notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie une notification d'invitation à un événement
   * @param {Object} invitationData - Données de l'invitation
   * @param {Object} eventData - Données de l'événement
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async sendInvitationNotification(invitationData, eventData) {
    try {
      const result = await notificationClient.sendInvitationEmail(invitationData.email, {
        eventName: eventData.title,
        eventDate: eventData.event_date,
        eventLocation: eventData.location,
        organizerName: eventData.organizer_name,
        invitationToken: invitationData.token,
        responseUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitations/${invitationData.token}/respond`
      });

      if (!result.success) {
        console.error('Failed to send invitation notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending invitation notification:', error);
      return { success: false, error: error.message };
    }
  }

    /**
   * Vérifie si un utilisateur a un rôle spécifique
   * @param {number} userId - ID de l'utilisateur
   * @param {string} roleCode - Code du rôle à vérifier
   * @returns {Promise<boolean>} True si l'utilisateur a le rôle
   */
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
}

module.exports = new TicketsService();
