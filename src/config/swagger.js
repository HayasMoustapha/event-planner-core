const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Planner Core API',
      version: '1.0.0',
      description: 'API pour la gestion des événements, invités et tickets - Service Core',
      contact: {
        name: 'Hassid Belkassim',
        email: 'contact@eventplanner.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.eventplanner.com/core',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT d\'authentification'
        }
      },
      schemas: {
        Event: {
          type: 'object',
          required: ['title', 'event_date', 'location'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID unique de l\'événement',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Titre de l\'événement',
              minLength: 3,
              maxLength: 255,
              example: 'Conférence Tech 2025'
            },
            description: {
              type: 'string',
              description: 'Description détaillée de l\'événement',
              maxLength: 5000,
              example: 'Une conférence sur les dernières technologies'
            },
            event_date: {
              type: 'string',
              format: 'date-time',
              description: 'Date et heure de l\'événement (doit être dans le futur)',
              example: '2025-06-15T10:00:00Z'
            },
            location: {
              type: 'string',
              description: 'Lieu de l\'événement',
              maxLength: 255,
              example: 'Paris Expo Porte de Versailles'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              description: 'Statut de l\'événement',
              example: 'published'
            },
            organizer_id: {
              type: 'integer',
              description: 'ID de l\'organisateur',
              example: 1
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Date de dernière mise à jour'
            }
          }
        },
        Guest: {
          type: 'object',
          required: ['first_name', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID unique de l\'invité',
              example: 1
            },
            first_name: {
              type: 'string',
              description: 'Prénom de l\'invité',
              minLength: 1,
              maxLength: 255,
              example: 'Jean'
            },
            last_name: {
              type: 'string',
              description: 'Nom de l\'invité (optionnel)',
              maxLength: 255,
              example: 'Dupont'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email de l\'invité (unique)',
              maxLength: 255,
              example: 'jean.dupont@example.com'
            },
            phone: {
              type: 'string',
              description: 'Téléphone de l\'invité (optionnel, format international)',
              maxLength: 50,
              pattern: '^\\+?[1-9]\\d{1,14}$',
              example: '+33612345678'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled'],
              description: 'Statut de l\'invité',
              example: 'confirmed'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Date de dernière mise à jour'
            }
          }
        },
        TicketType: {
          type: 'object',
          required: ['event_id', 'name', 'type', 'quantity'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID unique du type de ticket',
              example: 1
            },
            event_id: {
              type: 'integer',
              description: 'ID de l\'événement associé',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Nom du type de ticket',
              minLength: 1,
              maxLength: 255,
              example: 'VIP'
            },
            description: {
              type: 'string',
              description: 'Description du type de ticket',
              maxLength: 5000,
              example: 'Accès VIP avec avantages exclusifs'
            },
            type: {
              type: 'string',
              enum: ['free', 'paid', 'donation'],
              description: 'Type de ticket',
              example: 'paid'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'Quantité disponible',
              example: 100
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Prix du ticket',
              example: 99.99
            },
            currency: {
              type: 'string',
              length: 3,
              description: 'Devise (ISO 4217)',
              example: 'EUR'
            },
            available_from: {
              type: 'string',
              format: 'date-time',
              description: 'Date de début de disponibilité'
            },
            available_to: {
              type: 'string',
              format: 'date-time',
              description: 'Date de fin de disponibilité'
            }
          }
        },
        Ticket: {
          type: 'object',
          required: ['ticket_code', 'ticket_type_id', 'event_guest_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID unique du ticket',
              example: 1
            },
            ticket_code: {
              type: 'string',
              description: 'Code unique du ticket',
              maxLength: 255,
              example: 'TKT-ABC123-XYZ789'
            },
            qr_code_data: {
              type: 'string',
              description: 'Données du code QR',
              example: 'QR_DATA_BASE64'
            },
            ticket_type_id: {
              type: 'integer',
              description: 'ID du type de ticket',
              example: 1
            },
            ticket_template_id: {
              type: 'integer',
              description: 'ID du template de ticket (optionnel)',
              example: 1
            },
            event_guest_id: {
              type: 'integer',
              description: 'ID de l\'invité associé',
              example: 1
            },
            is_validated: {
              type: 'boolean',
              description: 'Statut de validation du ticket',
              example: false
            },
            validated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Date de validation'
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Prix payé pour le ticket',
              example: 99.99
            },
            currency: {
              type: 'string',
              length: 3,
              description: 'Devise',
              example: 'EUR'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Type d\'erreur',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              description: 'Message d\'erreur détaillé',
              example: 'Invalid input data'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Champ concerné',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    description: 'Message d\'erreur du champ',
                    example: 'Email is required'
                  },
                  value: {
                    description: 'Valeur invalide',
                    example: null
                  }
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Page actuelle',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Nombre d\'éléments par page',
              example: 20
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Nombre total d\'éléments',
              example: 150
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Nombre total de pages',
              example: 8
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/modules/events/events.routes.js',
    './src/modules/guests/guests.routes.js', 
    './src/modules/tickets/tickets.routes.js',
    './src/modules/tickets/ticket-types.routes.js',
    './src/modules/marketplace/marketplace.routes.js',
    './src/modules/admin/admin.routes.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
