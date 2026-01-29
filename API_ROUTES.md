# Event Planner Core API Routes Documentation

## Overview

This document provides a comprehensive overview of all available API routes in the Event Planner Core service. The service runs on port **3001** and provides complete functionality for event management, guest management, marketplace operations, and ticket handling.

**⚠️ IMPORTANT**: Core service is the orchestrator and business logic hub. All specialized operations (payment processing, ticket generation, scan validation) are delegated to dedicated services.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All routes (except health endpoints) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Service Architecture

### Core Service Responsibilities ✅
- **Event Management**: CRUD, lifecycle, statistics
- **Guest Management**: CRUD, check-in, event assignments  
- **Invitation Management**: Creation, sending, tracking
- **Marketplace**: Templates, designers, reviews, moderation
- **Admin Operations**: Dashboard, analytics, system management
- **Ticket Management**: CRUD, validation, statistics (generation delegated)

### Delegated to Specialized Services 🔄
- **Payment Processing**: `payment-service` (port 3003)
- **Ticket Generation**: `ticket-generator-service` (port 3004)  
- **Scan Validation**: `scan-validation-service` (port 3005)
- **Notifications**: `notification-service` (port 3002)

## Modules

### 1. Admin Module

#### Dashboard & Analytics
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/stats` - Get global statistics
- `GET /api/admin/activity` - Get recent system activity
- `GET /api/admin/analytics/revenue` - Get revenue analytics
- `GET /api/admin/analytics/events` - Get event growth statistics

#### User Management
- `GET /api/admin/users` - Get users list with pagination
- `GET /api/admin/users/:id` - Get user details by ID

#### Event Management
- `GET /api/admin/events` - Get events list with admin filters

#### Content Moderation
- `GET /api/admin/templates/pending` - Get templates pending approval
- `GET /api/admin/designers/pending` - Get designers pending approval
- `POST /api/admin/moderate` - Moderate content (approve/reject)

#### System Management
- `GET /api/admin/logs` - Get system logs
- `POST /api/admin/logs` - Create system log entry
- `GET /api/admin/export` - Export system data
- `GET /api/admin/health` - Get system health status
- `POST /api/admin/backup` - Create system backup

---

### 2. Events Module

#### Event CRUD
- `POST /api/events` - Create a new event
- `GET /api/events` - Get events list with filters
- `GET /api/events/:id` - Get event details by ID
- `PUT /api/events/:id` - Update event details
- `DELETE /api/events/:id` - Delete an event

#### Event Lifecycle
- `GET /api/events/stats` - Get event statistics
- `POST /api/events/:id/publish` - Publish an event
- `POST /api/events/:id/archive` - Archive an event

---

### 3. Guests Module

#### Guest CRUD
- `POST /api/guests` - Create a new guest
- `GET /api/guests` - Get guests list with pagination
- `GET /api/guests/:id` - Get guest details by ID
- `PUT /api/guests/:id` - Update guest details
- `DELETE /api/guests/:id` - Delete a guest

#### Event Guest Management
- `GET /api/guests/events/:eventId/guests` - Get guests for a specific event
- `POST /api/guests/events/:eventId/guests` - Add guests to an event
- `POST /api/guests/events/:eventId/guests/bulk` - Bulk add guests to an event

#### Check-in Operations
- `POST /api/guests/check-in` - Check-in a guest
- `POST /api/guests/events/:eventId/guests/:guestId/checkin` - Check-in specific guest for event

#### Statistics
- `GET /api/guests/events/:eventId/stats` - Get guest statistics for an event

---

### 4. Marketplace Module

#### Designer Management
- `GET /api/marketplace/designers` - Get marketplace designers list
- `GET /api/marketplace/designers/:id` - Get designer details by ID
- `PUT /api/marketplace/designers/:id` - Update designer profile
- `POST /api/marketplace/designers/:id/verify` - Verify a marketplace designer

#### Template Management
- `POST /api/marketplace/templates` - Create a new marketplace template
- `GET /api/marketplace/templates` - Get marketplace templates list
- `GET /api/marketplace/templates/:id` - Get template details by ID
- `PUT /api/marketplace/templates/:id` - Update template details
- `DELETE /api/marketplace/templates/:id` - Delete a marketplace template

#### Template Operations
- `POST /api/marketplace/templates/:templateId/purchase` - Purchase a marketplace template
- `GET /api/marketplace/templates/:templateId/reviews` - Get template reviews
- `POST /api/marketplace/templates/:templateId/reviews` - Create a template review

#### User Operations
- `GET /api/marketplace/purchases` - Get user's marketplace purchases

#### Admin Operations
- `GET /api/marketplace/stats` - Get marketplace statistics
- `POST /api/marketplace/templates/:id/approve` - Approve a marketplace template
- `POST /api/marketplace/templates/:id/reject` - Reject a marketplace template

---

### 5. Tickets Module

#### Ticket Types
- `POST /api/tickets/types` - Create a new ticket type
- `GET /api/tickets/types/:id` - Get ticket type details by ID
- `GET /api/tickets/events/:eventId/types` - Get ticket types for an event
- `PUT /api/tickets/types/:id` - Update ticket type
- `DELETE /api/tickets/types/:id` - Delete a ticket type

#### Ticket Templates
- `GET /api/tickets/templates` - Get ticket templates list
- `GET /api/tickets/templates/popular` - Get popular ticket templates
- `GET /api/tickets/templates/:id` - Get ticket template details by ID
- `PUT /api/tickets/templates/:id` - Update ticket template
- `DELETE /api/tickets/templates/:id` - Delete ticket template
- `POST /api/tickets/templates/:id/validate` - Validate template for an event
- `POST /api/tickets/templates/:id/clone` - Clone a ticket template

#### Ticket Management
- `POST /api/tickets` - Create a ticket
- `GET /api/tickets` - Get tickets list with filters
- `GET /api/tickets/code/:ticketCode` - Get ticket by code
- `GET /api/tickets/events/:eventId/tickets` - Get tickets for an event
- `POST /api/tickets/:id/validate` - Validate a ticket by ID
- `POST /api/tickets/validate` - Validate a ticket by code

#### Statistics
- `GET /api/tickets/events/:eventId/stats` - Get ticket statistics for an event

**🔄 DELEGATED OPERATIONS**
- **Ticket Generation**: See `ticket-generator-service` (port 3004)
  - `POST /api/events/:event_id/tickets/generate` - Generate tickets
  - `GET /api/tickets/generation/:job_id` - Job status
  - `GET /api/events/:event_id/tickets/generation` - List jobs

---

### 7. Specialized Service Integration (Read-Only)

#### Scan Validation Operations 🔄
- `GET /api/v1/events/:event_id/scan/history` - Get scan history for an event (READ-ONLY)
  - **Data Source**: `scan-validation-service` (port 3005)
  - **Note**: Actual scan validation is delegated to scan-validation-service

#### Ticket Generation Operations 🔄  
- `GET /api/v1/tickets/generation/:job_id` - Get generation job status (READ-ONLY)
- `GET /api/v1/events/:event_id/tickets/generation` - List generation jobs (READ-ONLY)
  - **Data Source**: `ticket-generator-service` (port 3004)  
  - **Note**: Actual ticket generation is delegated to ticket-generator-service

#### Payment Operations 🔄
- **All payment operations are delegated to `payment-service` (port 3003)**
  - Payment initiation, status, cancellation, webhooks
  - Core service only initiates and consults payment status

---

### 8. Health & Monitoring

#### Health Checks
- `GET /health` - Basic health check (no authentication required)
- `GET /api` - API documentation (no authentication required)

---

## Query Parameters

### Pagination
Most list endpoints support pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max varies by endpoint)

### Filters
Common filter parameters:
- `status` - Filter by status (values vary by endpoint)
- `search` - Search term (where applicable)
- `start_date` - Start date filter (YYYY-MM-DD format)
- `end_date` - End date filter (YYYY-MM-DD format)

### Sorting
Most endpoints support sorting via query parameters where applicable.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Success Responses

Most endpoints return consistent success responses:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

## Rate Limiting

API endpoints may be rate limited. Check response headers for rate limit information.

## Permissions

All endpoints require specific permissions. Permission format: `module.action` (e.g., `events.create`, `admin.users.read`).

## Postman Collection

A complete Postman collection with all 47 routes is available in:
- `postman/collections/event-planner-core.postman_collection.json`

## Environment Variables

Required environment variables are defined in:
- `postman/environments/Event Planner Core.postman_environment.json`

---

**Last Updated:** January 29, 2026  
**Version:** 3.1.0  
**Total Routes:** 47 (reduced from 73 after refactoring)

## 🎯 Refactoring Summary

### Removed Routes (26 routes deleted)
- **Payment Processing** (5 routes): Delegated to `payment-service`
- **Ticket Generation** (3 routes): Delegated to `ticket-generator-service`  
- **Scan Validation** (1 route): Delegated to `scan-validation-service`
- **Bulk Operations** (3 routes): Moved to specialized services

### Architecture Benefits
- ✅ **Single Responsibility**: Each service has one clear purpose
- ✅ **Clean Boundaries**: No overlap between services
- ✅ **Better Scalability**: Specialized services can scale independently
- ✅ **Easier Testing**: Smaller, focused service units
- ✅ **Clear Documentation**: Explicit service ownership

### Service Communication
- **Core Service**: Orchestrates business logic and delegates specialized tasks
- **Specialized Services**: Handle specific domains with expertise
- **Read-Only Access**: Core service can consult specialized service data
- **Write Operations**: Core service initiates, specialized services execute
