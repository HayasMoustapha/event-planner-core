const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ========================================
// CONFIGURATION SWAGGER COMPLÈTE
// ========================================
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Planner Core API',
      version: '2.0.0',
      description: `
        ## 🎯 API Event Planner Core v2.0
        
        API REST complète et optimisée pour la gestion d'événements, participants et tickets.
        
        ### ✨ Fonctionnalités principales
        - 🎪 **Gestion complète des événements** (CRUD, cycle de vie, duplication)
        - 👥 **Gestion avancée des participants** (invitations, check-in, statistiques)
        - 🎫 **Système de tickets sophistiqué** (types, génération, validation)
        - 📊 **Tableaux de bord et rapports** en temps réel
        - 🔐 **Sécurité RBAC** avec permissions granulaires
        - 📝 **Validation robuste** avec messages d'erreur détaillés
        - 🚀 **Performance optimisée** avec cache et indexation
        - 📱 **API RESTful** conforme aux standards
        
        ### 🔒 Sécurité
        - **Authentification JWT** obligatoire sur tous les endpoints
        - **Permissions RBAC** par ressource et action
        - **Rate limiting** intelligent (1000 req/15min par IP)
        - **Validation stricte** des entrées avec Joi
        - **Protection anti-injection** SQL et XSS
        
        ### 📊 Performance
        - **Pagination** optimisée (max 100 items/page)
        - **Recherche** textuelle full-text
        - **Cache Redis** pour les données fréquentes
        - **Indexation** avancée des tables critiques
        - **Compression** GZIP des réponses
        
        ### 📋 Format des réponses
        Toutes les réponses suivent le format standardisé:
        
        **Succès:**
        \`\`\`json
        {
          "success": true,
          "data": { ... },
          "timestamp": "2025-01-01T10:00:00Z"
        }
        \`\`\`
        
        **Erreur:**
        \`\`\`json
        {
          "success": false,
          "error": "Message d'erreur",
          "errorId": "err_1704110800_abc123",
          "code": "ERROR_CODE",
          "details": { ... },
          "timestamp": "2025-01-01T10:00:00Z"
        }
        \`\`\`
        
        ### 🚀 Démarrage rapide
        1. Obtenir un token JWT via l'auth service
        2. Inclure le token dans l'en-tête: \`Authorization: Bearer <token>\`
        3. Utiliser l'explorer API ci-dessous pour tester les endpoints
      `,
      contact: {
        name: 'API Support Team',
        email: 'api-support@eventplanner.com',
        url: 'https://eventplanner.com/support'
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '🔧 Serveur de développement',
        'x-description': 'Environnement local pour les tests et développement'
      },
      {
        url: 'https://staging-api.eventplanner.com/v1',
        description: '🧪 Serveur de staging',
        'x-description': 'Environnement de pré-production'
      },
      {
        url: 'https://api.eventplanner.com/v1',
        description: '🚀 Serveur de production',
        'x-description': 'Environnement de production haute disponibilité'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `
            **Token JWT d'authentification**
            
            Obtenu via l'auth service (port 3000):
            - POST /api/auth/login
            - POST /api/auth/refresh
            
            Format: \`Authorization: Bearer <jwt_token>\`
          `
        }
      },
      schemas: {
        // ========================================
        // SCHÉMAS DE RÉPONSE STANDARD
        // ========================================
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Indique si la requête a réussi'
            },
            data: {
              type: 'object',
              description: 'Données de réponse (présent uniquement si success: true)'
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
              description: 'Informations de pagination (pour les listes)'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T10:00:00Z',
              description: 'Horodatage de la réponse'
            }
          }
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Indique si la requête a échoué'
            },
            error: {
              type: 'string',
              example: 'Validation failed',
              description: 'Message d\'erreur principal'
            },
            errorId: {
              type: 'string',
              example: 'err_1704110800_abc123def',
              description: 'ID unique pour le suivi de l\'erreur'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR',
              description: 'Code d\'erreur technique'
            },
            category: {
              type: 'string',
              enum: ['validation', 'authorization', 'business', 'technical', 'external'],
              example: 'validation',
              description: 'Catégorie de l\'erreur'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'medium',
              description: 'Niveau de sévérité'
            },
            details: {
              type: 'object',
              description: 'Détails supplémentaires sur l\'erreur',
              properties: {
                field: {
                  type: 'string',
                  example: 'email',
                  description: 'Champ concerné (pour les erreurs de validation)'
                },
                message: {
                  type: 'string',
                  example: 'Email format is invalid',
                  description: 'Message d\'erreur détaillé'
                },
                value: {
                  description: 'Valeur qui a causé l\'erreur'
                },
                allowedValues: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Valeurs acceptées (pour les erreurs de validation)'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T10:00:00Z',
              description: 'Horodatage de l\'erreur'
            }
          }
        },

        // ========================================
        // SCHÉMAS MÉTIER COMPLETS
        // ========================================
        Event: {
          type: 'object',
          required: ['title', 'event_date', 'location'],
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'ID unique de l\'événement (auto-généré)'
            },
            uid: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
              description: 'UUID unique pour l\'intégration externe'
            },
            title: {
              type: 'string',
              minLength: 3,
              maxLength: 255,
              example: 'Conférence Tech 2025 - L\'avenir du web',
              description: 'Titre complet de l\'événement'
            },
            description: {
              type: 'string',
              maxLength: 5000,
              example: 'Une conférence immersive sur les dernières tendances du développement web, mobile et cloud. Venez découvrir les nouvelles technologies et rencontrer les experts du secteur.',
              description: 'Description détaillée avec mise en forme HTML supportée'
            },
            event_date: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-15T10:00:00Z',
              description: 'Date et heure de début de l\'événement (doit être dans le futur)'
            },
            location: {
              type: 'string',
              minLength: 3,
              maxLength: 255,
              example: 'Paris Expo Porte de Versailles - Hall 7.2',
              description: 'Adresse complète du lieu de l\'événement'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              example: 'published',
              description: `
                **Statut de l\'événement:**
                - \`draft\`: Brouillon (non visible publiquement)
                - \`published\`: Publié (visible et accessible)
                - \`archived\`: Archivé (consultable mais inactif)
              `
            },
            organizer_id: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'organisateur (référence vers auth service)'
            },
            created_by: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'utilisateur qui a créé l\'événement'
            },
            updated_by: {
              type: 'integer',
              example: 1,
              description: 'ID du dernier utilisateur à modifier l\'événement'
            },
            deleted_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Date de suppression (soft delete)'
            },
            deleted_by: {
              type: 'integer',
              nullable: true,
              description: 'ID de l\'utilisateur qui a supprimé l\'événement'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T10:00:00Z',
              description: 'Date de création (auto-générée)'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T15:30:00Z',
              description: 'Date de dernière mise à jour (auto-générée)'
            }
          }
        },

        EventStats: {
          type: 'object',
          properties: {
            event_id: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'événement'
            },
            total_guests: {
              type: 'integer',
              example: 150,
              description: 'Nombre total d\'invités'
            },
            confirmed_guests: {
              type: 'integer',
              example: 120,
              description: 'Nombre d\'invités confirmés'
            },
            pending_guests: {
              type: 'integer',
              example: 25,
              description: 'Nombre d\'invités en attente de réponse'
            },
            cancelled_guests: {
              type: 'integer',
              example: 5,
              description: 'Nombre d\'invités ayant annulé'
            },
            checked_in_guests: {
              type: 'integer',
              example: 85,
              description: 'Nombre de participants ayant fait le check-in'
            },
            checkin_rate: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 1,
              example: 0.708,
              description: 'Taux de check-in (0-1)'
            },
            total_tickets: {
              type: 'integer',
              example: 120,
              description: 'Nombre total de tickets générés'
            },
            validated_tickets: {
              type: 'integer',
              example: 85,
              description: 'Nombre de tickets validés'
            },
            revenue: {
              type: 'number',
              format: 'decimal',
              example: 12500.00,
              description: 'Revenu total généré (en euros)'
            }
          }
        },

        Guest: {
          type: 'object',
          required: ['first_name', 'email'],
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'ID unique de l\'invité'
            },
            uid: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
              description: 'UUID unique pour l\'intégration'
            },
            first_name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'Jean',
              description: 'Prénom de l\'invité'
            },
            last_name: {
              type: 'string',
              maxLength: 255,
              example: 'Dupont',
              description: 'Nom de famille de l\'invité'
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              example: 'jean.dupont@example.com',
              description: 'Email de l\'invité (unique dans le système)'
            },
            phone: {
              type: 'string',
              maxLength: 50,
              pattern: '^\\+?[1-9]\\d{1,14}$',
              example: '+33612345678',
              description: 'Téléphone (format international, optionnel)'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled'],
              example: 'confirmed',
              description: 'Statut de l\'invité'
            },
            created_by: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'utilisateur qui a créé l\'invité'
            },
            updated_by: {
              type: 'integer',
              example: 1,
              description: 'ID du dernier utilisateur à modifier l\'invité'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T10:00:00Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T15:30:00Z'
            }
          }
        },

        TicketType: {
          type: 'object',
          required: ['event_id', 'name', 'type', 'quantity'],
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'ID unique du type de ticket'
            },
            event_id: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'événement associé'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255,
              example: 'VIP Premium',
              description: 'Nom du type de ticket'
            },
            description: {
              type: 'string',
              maxLength: 5000,
              example: 'Accès VIP avec cocktail exclusif, badge prioritaire et goodies premium',
              description: 'Description détaillée des avantages'
            },
            type: {
              type: 'string',
              enum: ['free', 'paid', 'donation'],
              example: 'paid',
              description: 'Type de tarification'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              example: 100,
              description: 'Quantité disponible (0 = illimité)'
            },
            price: {
              type: 'number',
              minimum: 0,
              format: 'decimal',
              precision: 2,
              example: 299.99,
              description: 'Prix unitaire en euros'
            },
            currency: {
              type: 'string',
              length: 3,
              example: 'EUR',
              description: 'Devise (code ISO 4217)'
            },
            available_from: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00Z',
              description: 'Date de début de disponibilité'
            },
            available_to: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-10T23:59:59Z',
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
              example: 1,
              description: 'ID unique du ticket'
            },
            ticket_code: {
              type: 'string',
              maxLength: 255,
              example: 'EVT2025-TKT-ABC123-XYZ789',
              description: 'Code unique du ticket (format: EVT{YEAR}-TKK-{ALPHA}-{NUM})'
            },
            qr_code_data: {
              type: 'string',
              example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
              description: 'Données du code QR (base64 ou URL)'
            },
            ticket_type_id: {
              type: 'integer',
              example: 1,
              description: 'ID du type de ticket'
            },
            ticket_template_id: {
              type: 'integer',
              nullable: true,
              example: 1,
              description: 'ID du template de ticket (optionnel)'
            },
            event_guest_id: {
              type: 'integer',
              example: 1,
              description: 'ID de l\'invité associé'
            },
            is_validated: {
              type: 'boolean',
              example: false,
              description: 'Statut de validation du ticket'
            },
            validated_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2025-06-15T14:30:00Z',
              description: 'Date et heure de validation'
            },
            ticket_file_url: {
              type: 'string',
              nullable: true,
              example: 'https://cdn.eventplanner.com/tickets/EVT2025-TKT-ABC123-XYZ789.pdf',
              description: 'URL du fichier PDF du ticket'
            },
            ticket_file_path: {
              type: 'string',
              nullable: true,
              example: '/tickets/2025/06/EVT2025-TKT-ABC123-XYZ789.pdf',
              description: 'Chemin local du fichier'
            },
            generation_job_id: {
              type: 'integer',
              nullable: true,
              example: 123,
              description: 'ID du job de génération'
            },
            price: {
              type: 'number',
              minimum: 0,
              format: 'decimal',
              precision: 2,
              example: 299.99,
              description: 'Prix payé pour le ticket'
            },
            currency: {
              type: 'string',
              length: 3,
              example: 'EUR',
              description: 'Devise utilisée'
            }
          }
        },

        // ========================================
        // SCHÉMAS UTILITAIRES
        // ========================================
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1,
              description: 'Page actuelle (commence à 1)'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20,
              description: 'Nombre d\'éléments par page (max: 100)'
            },
            total: {
              type: 'integer',
              minimum: 0,
              example: 150,
              description: 'Nombre total d\'éléments'
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              example: 8,
              description: 'Nombre total de pages'
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Indique s\'il y a une page suivante'
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Indique s\'il y a une page précédente'
            }
          }
        },

        SearchParams: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              example: 'conférence',
              description: 'Terme de recherche (recherche full-text)'
            },
            filters: {
              type: 'object',
              description: 'Filtres de recherche avancés',
              properties: {
                status: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['published', 'draft'],
                  description: 'Filtrer par statut(s)'
                },
                date_from: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filtrer les événements à partir de cette date'
                },
                date_to: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filtrer les événements jusqu\'à cette date'
                }
              }
            },
            sort: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'event_date',
                  description: 'Champ de tri'
                },
                order: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  example: 'desc',
                  description: 'Ordre de tri'
                }
              }
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
    './src/modules/invitations/invitations.routes.js',
    './src/modules/marketplace/marketplace.routes.js',
    './src/modules/admin/admin.routes.js'
  ]
};

const specs = swaggerJsdoc(options);

// ========================================
// CONFIGURATION AVANCÉE DE SWAGGER UI
// ========================================
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      // Ajout automatique du token si disponible
      const token = localStorage.getItem('jwt_token');
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    },
    responseInterceptor: (response) => {
      // Log des réponses pour debugging
      if (response.status >= 400) {
        console.warn('API Error:', response);
      }
      return response;
    }
  },
  customCss: `
    .swagger-ui .topbar { 
      display: none; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .swagger-ui .info { 
      margin: 20px 0; 
      padding: 20px;
      border-radius: 8px;
      background: #f8f9fa;
    }
    .swagger-ui .scheme-container { 
      margin: 20px 0; 
      border: 1px solid #e9ecef;
      border-radius: 6px;
    }
    .swagger-ui .opblock.opblock-post { 
      border-color: #28a745; 
      background: rgba(40, 167, 69, 0.1);
    }
    .swagger-ui .opblock.opblock-get { 
      border-color: #007bff; 
      background: rgba(0, 123, 255, 0.1);
    }
    .swagger-ui .opblock.opblock-put { 
      border-color: #ffc107; 
      background: rgba(255, 193, 7, 0.1);
    }
    .swagger-ui .opblock.opblock-delete { 
      border-color: #dc3545; 
      background: rgba(220, 53, 69, 0.1);
    }
    .swagger-ui .opblock.opblock-patch { 
      border-color: #17a2b8; 
      background: rgba(23, 162, 184, 0.1);
    }
    .swagger-ui .btn.authorize {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
  `,
  customSiteTitle: '🎯 Event Planner Core API v2.0 - Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions
};
