# Déploiement — Core Service

**Service**: `event-planner-core`  
**Port**: `3001`

---

## 1. Prérequis

1. PostgreSQL (DB: `event_planner_core`)
2. Redis (queues / cache)
3. Node.js LTS + npm

---

## 2. Variables d’Environnement

1. Copier `.env.example` → `.env`
2. Renseigner:
   - DB + Redis
   - URLs des services: Auth, Notification, Payment, Ticket Generator, Scan
   - `JWT_SECRET`

---

## 3. Installation

```
npm install
```

---

## 4. Démarrage

```
npm run start
```

---

## 5. Healthcheck

```
GET http://localhost:3001/api/health
```

