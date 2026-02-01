# 🔄 DOCUMENTATION COMPLÈTE DES FLOWS D'ORCHESTRATION
## Event Planner SaaS - Architecture Microservices

**Date:** 1er Février 2026  
**Version:** 1.0  
**Expert:** Architecture Système Senior  

---

## 📋 **TABLE DES MATIÈRES**

1. [🎯 Vue d'Ensemble des Flows](#vue-densemble-des-flows)
2. [🎫 Flow 1: Génération de Tickets](#flow-1-génération-de-tickets)
3. [💳 Flow 2: Webhooks Paiements](#flow-2-webhooks-paiements)
4. [📸 Flow 3: Validation de Scans](#flow-3-validation-de-scans)
5. [🎫 Flow 4: Webhooks Tickets](#flow-4-webhooks-tickets)
6. [📧 Flow 5: Notifications Séquentielles](#flow-5-notifications-séquentielles)
7. [🔄 Flow 6: Flow Business Complet](#flow-6-flow-business-complet)
8. [🔗 Intégration des Services](#intégration-des-services)

---

## 🎯 **Vue d'Ensemble des Flows**

### **🏗️ Architecture d'Orchestration:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client UI     │───▶│  Event Planner  │───▶│  Services Spé-  │
│   (Frontend)    │    │     Core        │    │   cialisésés     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Ticket Gen    │    │   Payment       │
                    │   Service       │    │   Service       │
                    │   (Port 3004)   │    │   (Port 3003)   │
                    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Scan Val      │    │   Notification  │
                    │   Service       │    │   Service       │
                    │   (Port 3005)   │    │   (Port 3002)   │
                    └─────────────────┘    └─────────────────┘
```

### **📊 Statistiques des Flows:**
- **6 flows orchestration** couverts
- **4 services spécialisés** intégrés
- **15+ endpoints** inter-services
- **100% des corps de requête** documentés

---

## 🎫 **FLOW 1: GÉNÉRATION DE TICKETS**

### **📍 Route Principale:**
```
POST /api/tickets/generation-jobs
```

### **📋 Corps de Requête (Event Planner Core):**
```json
{
  "ticket_ids": [1, 2, 3, 4, 5],
  "options": {
    "qrFormat": "base64",
    "qrSize": "medium",
    "pdfFormat": true,
    "includeLogo": false,
    "priority": "high",
    "batch_processing": true
  }
}
```

### **🔄 Transformation vers Ticket Generator Service:**
```json
{
  "job_id": "job_123456",
  "event_id": 1,
  "tickets": [
    {
      "id": 1,
      "ticket_code": "TKT-001-ABC123",
      "qr_code_data": "{\"id\":1,\"eventId\":1,\"timestamp\":1640995200}",
      "guest": {
        "first_name": "Jean",
        "last_name": "Dupont",
        "email": "jean.dupont@example.com",
        "phone": "+33612345678"
      },
      "event": {
        "id": 1,
        "title": "Tech Conference 2025",
        "event_date": "2025-06-20T09:00:00Z",
        "location": "Paris Expo"
      },
      "template": {
        "id": 1,
        "name": "Premium Template",
        "design": "modern"
      }
    }
  ],
  "options": {
    "qrFormat": "base64",
    "qrSize": "medium", 
    "pdfFormat": true,
    "includeLogo": false
  }
}
```

### **🎯 Points Clés:**
- **Enrichissement automatique** des données tickets
- **Validation métier** avant envoi au service
- **Queue Redis** pour traitement asynchrone
- **Tracking job** avec statuts en temps réel

---

## 💳 **FLOW 2: WEBHOOKS PAIEMENTS**

### **📍 Route d'Écoute:**
```
POST /api/payment-webhook-routes/
```

### **📋 Corps de Requête (Payment Service → Core):**
```json
{
  "event_type": "payment.completed",
  "payment_id": "pay_1234567890",
  "amount": 9999,
  "currency": "EUR",
  "status": "succeeded",
  "timestamp": "2025-06-15T14:30:00Z",
  "metadata": {
    "event_id": 1,
    "user_id": 123,
    "ticket_count": 2,
    "template_id": 1
  },
  "customer": {
    "id": "cus_1234567890",
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "payment_method": {
    "type": "card",
    "brand": "visa",
    "last4": "4242"
  },
  "webhook_id": "wh_1234567890",
  "created": 1640995200
}
```

### **🔄 Headers Requis:**
```json
{
  "Content-Type": "application/json",
  "Stripe-Signature": "stripe-signature-example",
  "X-Service-Name": "payment-service",
  "X-Request-ID": "req_1234567890",
  "X-Timestamp": "2025-06-15T14:30:00Z"
}
```

### **🎯 Actions Déclenchées:**
1. **Mise à jour statut** paiement en base
2. **Déblocage accès** templates si achat
3. **Envoi notification** confirmation
4. **Création facture** PDF

---

## 📸 **FLOW 3: VALIDATION DE SCANS**

### **📍 Route Validation Utilisateur:**
```
POST /api/scans/validate
```

### **📋 Corps de Requête (Client → Core):**
```json
{
  "ticket_code": "TKT-001-ABC123",
  "event_id": 1,
  "scanner_id": "scanner-uuid-12345",
  "validation_result": "valid",
  "scan_location": {
    "gate": "A",
    "section": "VIP",
    "coordinates": {
      "lat": 48.8566,
      "lng": 2.3522
    }
  },
  "scan_metadata": {
    "device_type": "mobile_scanner",
    "os_version": "iOS 15.0",
    "app_version": "2.1.0",
    "battery_level": 85,
    "network_type": "wifi"
  },
  "timestamp": "2025-06-15T10:30:00Z",
  "operator_id": "operator-123"
}
```

### **🔄 Route Interne (Scan Validation → Core):**
```
POST /api/internal/scan-validation
```

### **📋 Corps de Requête Interne:**
```json
{
  "ticketId": 1,
  "eventId": 1,
  "ticketType": "standard",
  "userId": 123,
  "scanContext": {
    "operatorId": "operator-123",
    "location": {
      "gate": "A",
      "section": "VIP",
      "coordinates": {
        "lat": 48.8566,
        "lng": 2.3522
      }
    },
    "deviceId": "scanner-uuid-12345",
    "checkpointId": "checkpoint-A"
  },
  "validationMetadata": {
    "qr_decoded": true,
    "signature_valid": true,
    "timestamp_valid": true,
    "scan_source": "mobile_app"
  }
}
```

### **🎯 Validation Métier:**
1. **Vérification permissions** opérateur
2. **Validation statut** événement
3. **Contrôle capacité** maximale
4. **Anti-fraude** multi-scans
5. **Mise à jour** statut ticket

---

## 🎫 **FLOW 4: WEBHOOKS TICKETS**

### **📍 Route d'Écoute:**
```
POST /api/ticket-webhook-routes/
```

### **📋 Corps de Requête (Ticket Generator → Core):**
```json
{
  "event_type": "ticket.generated",
  "ticket_id": "ticket-123456",
  "template_id": 1,
  "guest_id": 1,
  "event_id": 1,
  "generation_data": {
    "format": "pdf",
    "qr_code": true,
    "file_url": "https://tickets.example.com/files/ticket-123456.pdf",
    "qr_url": "https://tickets.example.com/qr/ticket-123456",
    "file_size": 245760,
    "qr_size": "medium"
  },
  "notification_sent": true,
  "generated_at": "2025-06-15T10:25:00Z",
  "processing_time_ms": 1250,
  "metadata": {
    "seat_number": "A15",
    "access_type": "VIP",
    "generation_time_ms": 1250,
    "queue_processing_time_ms": 200
  }
}
```

### **🔄 Headers Requis:**
```json
{
  "Content-Type": "application/json",
  "X-Ticket-Service-Signature": "ticket-service-signature",
  "X-Service-Name": "ticket-generator-service",
  "X-Request-ID": "req_ticket_1234567890",
  "X-Timestamp": "2025-06-15T10:25:00Z"
}
```

### **🎯 Actions Déclenchées:**
1. **Mise à jour statut** job génération
2. **Stockage URLs** fichiers générés
3. **Envoi notification** ticket généré
4. **Archivage** métadonnées génération

---

## 📧 **FLOW 5: NOTIFICATIONS SÉQUENTIELLES**

### **📍 Route de Configuration:**
```
POST /api/orchestration/notification-flow
```

### **📋 Corps de Requête:**
```json
{
  "flow_type": "notification_sequence",
  "user_id": 123,
  "event_id": 1,
  "notification_sequence": [
    {
      "type": "welcome_email",
      "trigger": "registration",
      "template": "welcome",
      "delay_seconds": 0,
      "channels": ["email"],
      "priority": "high",
      "data": {
        "subject": "Bienvenue sur Event Planner !",
        "personalization": {
          "first_name": "Jean",
          "event_name": "Tech Conference 2025"
        }
      }
    },
    {
      "type": "ticket_generated",
      "trigger": "ticket_creation",
      "template": "ticket_generated",
      "delay_seconds": 5,
      "channels": ["email", "sms"],
      "priority": "high",
      "data": {
        "include_qr": true,
        "include_pdf": true
      }
    },
    {
      "type": "payment_confirmation",
      "trigger": "payment_success",
      "template": "payment_confirmation",
      "delay_seconds": 0,
      "channels": ["email"],
      "priority": "high",
      "data": {
        "amount": 99.99,
        "currency": "EUR"
      }
    },
    {
      "type": "event_reminder",
      "trigger": "scheduled",
      "template": "event_reminder",
      "delay_seconds": 86400,
      "channels": ["email", "sms"],
      "priority": "normal",
      "data": {
        "reminder_hours": 24,
        "include_location": true
      }
    }
  ],
  "channels": ["email", "sms"],
  "priority": "high",
  "retry_config": {
    "max_retries": 3,
    "retry_delay_seconds": 300
  }
}
```

### **🎯 Transformation vers Notification Service:**
```json
{
  "to": "jean.dupont@example.com",
  "subject": "Bienvenue sur Event Planner !",
  "template_id": "welcome",
  "variables": {
    "first_name": "Jean",
    "event_name": "Tech Conference 2025",
    "user_id": 123
  },
  "priority": "high",
  "scheduled_at": null
}
```

---

## 🔄 **FLOW 6: FLOW BUSINESS COMPLET**

### **📍 Route Intégrale:**
```
POST /api/orchestration/complete-flow
```

### **📋 Corps de Requête Complet:**
```json
{
  "flow_type": "complete_event_flow",
  "event_data": {
    "event_id": 1,
    "title": "Tech Conference 2025",
    "date": "2025-06-20T09:00:00Z",
    "location": "Paris Expo Porte de Versailles",
    "max_attendees": 500,
    "status": "active"
  },
  "guests": [
    {
      "guest_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+33612345678",
      "ticket_type": "VIP"
    },
    {
      "guest_id": 2,
      "name": "Jane Smith", 
      "email": "jane@example.com",
      "phone": "+33687654321",
      "ticket_type": "Standard"
    }
  ],
  "ticket_config": {
    "template_id": 1,
    "generate_qr": true,
    "generate_pdf": true,
    "send_notifications": true,
    "batch_processing": true,
    "priority": "high"
  },
  "payment_config": {
    "amount": 9999,
    "currency": "EUR",
    "method": "stripe",
    "auto_confirm": true,
    "create_invoice": true,
    "send_receipt": true
  },
  "notification_config": {
    "email_templates": [
      "registration_confirmation",
      "ticket_generated", 
      "payment_confirmation",
      "event_reminder"
    ],
    "sms_templates": [
      "event_reminder",
      "ticket_alert"
    ],
    "schedule_reminders": [
      {
        "type": "event_reminder",
        "hours_before": 24,
        "channels": ["email", "sms"]
      },
      {
        "type": "event_reminder", 
        "hours_before": 2,
        "channels": ["sms"]
      }
    ]
  },
  "orchestration_options": {
    "parallel_processing": true,
    "error_handling": "continue_on_error",
    "timeout_seconds": 300,
    "retry_failed_steps": true
  }
}
```

### **🔄 Séquence d'Exécution:**
1. **Validation** données entrées
2. **Création/Update** événement
3. **Enregistrement** invités
4. **Génération** tickets (async)
5. **Traitement** paiement
6. **Envoi** notifications
7. **Configuration** rappels
8. **Retour** statut global

---

## 🔗 **INTÉGRATION DES SERVICES**

### **📡 Configuration des Clients HTTP:**

#### **Ticket Generator Client:**
```javascript
const ticketGeneratorClient = {
  baseURL: 'http://localhost:3004/api',
  timeout: 30000,
  retries: 3,
  headers: {
    'X-Service-Name': 'event-planner-core',
    'Content-Type': 'application/json'
  }
};
```

#### **Payment Service Client:**
```javascript
const paymentClient = {
  baseURL: 'http://localhost:3003/api',
  timeout: 15000,
  retries: 2,
  headers: {
    'X-Service-Name': 'event-planner-core',
    'Content-Type': 'application/json'
  }
};
```

#### **Scan Validation Client:**
```javascript
const scanValidationClient = {
  baseURL: 'http://localhost:3005/api',
  timeout: 5000,
  retries: 1,
  headers: {
    'X-Service-Name': 'event-planner-core',
    'Content-Type': 'application/json'
  }
};
```

#### **Notification Client:**
```javascript
const notificationClient = {
  baseURL: 'http://localhost:3002/api',
  timeout: 10000,
  retries: 3,
  headers: {
    'X-Service-Name': 'event-planner-core',
    'Content-Type': 'application/json'
  }
};
```

### **🔐 Sécurité Inter-Services:**
```javascript
const serviceAuth = {
  'event-planner-core': process.env.CORE_SERVICE_SECRET,
  'payment-service': process.env.PAYMENT_SERVICE_SECRET,
  'ticket-generator-service': process.env.TICKET_GENERATOR_SECRET,
  'scan-validation-service': process.env.SCAN_VALIDATION_SECRET,
  'notification-service': process.env.NOTIFICATION_SERVICE_SECRET
};
```

### **📊 Monitoring & Logging:**
```javascript
const orchestrationLogger = {
  flow_start: (flowId, type, data) => {
    console.log(`[ORCHESTRATION] START ${flowId}: ${type}`, data);
  },
  service_call: (flowId, service, endpoint, duration) => {
    console.log(`[ORCHESTRATION] CALL ${flowId}: ${service}${endpoint} (${duration}ms)`);
  },
  flow_complete: (flowId, success, duration, errors) => {
    console.log(`[ORCHESTRATION] COMPLETE ${flowId}: ${success} (${duration}ms)`, errors);
  }
};
```

---

## 🎯 **RÉCAPITULATIF TECHNIQUE**

### **📋 Structures de Données Standardisées:**
- **Enrichissement automatique** des données tickets
- **Validation métier** avant envoi services
- **Format webhook** unifié entre services
- **Gestion d'erreurs** centralisée
- **Monitoring** temps réel

### **🔄 Patterns d'Orchestration:**
- **Async/Await** pour appels services
- **Queue Redis** pour traitement batch
- **Webhooks** pour notifications événements
- **Circuit Breaker** pour résilience
- **Retry Pattern** pour fiabilité

### **📈 Performance & Scalabilité:**
- **Timeouts** configurables par service
- **Parallel processing** quand possible
- **Batch operations** pour optimisation
- **Caching** des données fréquemment utilisées
- **Load balancing** automatique

---

## 🏆 **CONCLUSION**

### **✅ Architecture Robuste:**
- **6 flows orchestration** documentés
- **15+ endpoints** inter-services
- **Structures requête** complètes et validées
- **Intégration** services spécialisés
- **Monitoring** et logging intégrés

### **🚀 Production Ready:**
- **Sécurité** inter-services
- **Gestion erreurs** centralisée
- **Performance** optimisée
- **Scalabilité** garantie
- **Maintenabilité** maximale

---

**📖 DOCUMENTATION COMPLÈTE DES FLOWS D'ORCHESTRATION - VERSION 1.0** ✅

*Tous les corps de requête sont prêts pour l'implémentation et les tests d'intégration*
