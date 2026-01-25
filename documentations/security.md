# Sécurité - Event Planner Core

## Overview

Ce document détaille l'implémentation de la sécurité dans Event Planner Core, incluant les mécanismes de protection, les best practices et les procédures de réponse aux incidents.

## Architecture de Sécurité

### Couches de Protection

1. **Network Layer** - Firewall, TLS, Network Policies
2. **Application Layer** - Authentication, Authorization, Input Validation
3. **Data Layer** - Encryption, Access Control, Audit
4. **Infrastructure Layer** - Container Security, Secrets Management

---

## Authentication & Authorization

### JWT Token Validation

```javascript
// middleware/auth.js
const validateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_MISSING',
        message: 'Authentication token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    recordSecurityEvent('invalid_jwt_token', 'high', {
      error: error.message,
      ip: req.ip
    });
    return res.status(401).json(unauthorizedResponse('Invalid token'));
  }
};
```

### RBAC (Role-Based Access Control)

```javascript
const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      recordSecurityEvent('unauthorized_access_attempt', 'medium', {
        userId: req.user.id,
        requiredRoles,
        ip: req.ip
      });
      return res.status(403).json(forbiddenResponse('Access denied'));
    }
    next();
  };
};
```

---

## Input Validation & Protection

### Validation Centralisée

```javascript
// utils/validation.js
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

const schemas = {
  event: Joi.object({
    title: Joi.string().min(3).max(255).required().trim(),
    description: Joi.string().max(2000).optional().allow(''),
    event_date: Joi.date().iso().min('now').required(),
    location: Joi.string().min(3).max(255).required().trim()
  })
};

const validateInput = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      recordSecurityEvent('validation_error', 'low', {
        schemaName,
        details: error.details
      });
      return res.status(400).json(validationErrorResponse(error.details));
    }

    req.body = sanitizeInput(value);
    next();
  };
};
```

### Anti-SQL Injection & XSS

```javascript
// middleware/security.js
const SecurityMiddleware = {
  detectSqlInjection: (req, res, next) => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /\bOR\b.*\b1\s*=\s*1\b/i
    ];

    const scanObject = (obj) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && sqlPatterns.some(p => p.test(value))) {
          return true;
        }
        if (typeof value === 'object' && value !== null && scanObject(value)) {
          return true;
        }
      }
      return false;
    };

    if (scanObject(req.body) || scanObject(req.query)) {
      recordSecurityEvent('sql_injection_attempt', 'critical', {
        ip: req.ip,
        body: req.body,
        query: req.query
      });
      return res.status(403).json(errorResponse('SQL injection attempt detected'));
    }
    next();
  }
};
```

---

## Rate Limiting & DDoS Protection

### Rate Limiting Distribué

```javascript
// middleware/rate-limit.js
const createRateLimit = (options = {}) => {
  return rateLimit({
    store: redisStore,
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    keyGenerator: (req) => {
      const ip = req.ip;
      const userId = req.user?.id || 'anonymous';
      return `${req.path}:${ip}:${userId}`;
    },
    onLimitReached: (req, res) => {
      recordSecurityEvent('rate_limit_exceeded', 'medium', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path
      });
    }
  });
};

const rateLimits = {
  general: createRateLimit({ max: 100 }),
  auth: createRateLimit({ max: 5 }),
  sensitive: createRateLimit({ max: 10 })
};
```

---

## Encryption & Data Protection

### Service de Chiffrement

```javascript
// utils/encryption.js
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return { encrypted, iv: iv.toString('hex'), tag: tag.toString('hex') };
  }

  decrypt(encryptedData) {
    const { encrypted, iv, tag } = encryptedData;
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

---

## Security Headers & CORS

```javascript
// middleware/security-headers.js
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true
});

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      recordSecurityEvent('cors_violation', 'medium', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

---

## Audit & Logging

### Journalisation Sécurité

```javascript
// utils/security-logger.js
const recordSecurityEvent = (eventType, level, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    eventType,
    details: { ...details, service: 'event-planner-core' }
  };

  console.log(JSON.stringify(logEntry));

  if (level === 'critical' || level === 'high') {
    storeSecurityEvent(logEntry);
  }
};

const storeSecurityEvent = async (logEntry) => {
  try {
    await database.query(`
      INSERT INTO system_logs (level, message, context, created_by)
      VALUES ($1, $2, $3, $4)
    `, [
      logEntry.level,
      `Security Event: ${logEntry.eventType}`,
      logEntry.details,
      logEntry.details.userId || null
    ]);
  } catch (error) {
    console.error('Failed to store security event:', error);
  }
};
```

---

## Container Security

### Dockerfile Sécurisé

```dockerfile
FROM node:18-alpine AS builder
RUN addgroup -g 1001 -S nodejs && adduser -S eventplanner -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm audit fix && npm cache clean --force

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && adduser -S eventplanner -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=eventplanner:nodejs . .
RUN mkdir -p logs tmp && chown -R eventplanner:nodejs logs tmp
USER eventplanner
EXPOSE 3001 9090
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "--max-old-space-size=1024", "--security", "src/server.js"]
```

---

## Incident Response

### Procédures d'Urgence

```javascript
// utils/incident-response.js
class IncidentResponse {
  static async handleSecurityIncident(incident) {
    const severity = this.assessSeverity(incident);
    
    if (severity === 'critical') {
      await this.isolateAffectedSystems(incident);
    }
    
    await this.notifySecurityTeam(incident, severity);
    await this.implementCountermeasures(incident, severity);
  }

  static async blockIP(ip) {
    await redis.setex(`blacklist:${ip}`, 24 * 60 * 60, 'true');
    await this.updateFirewallRules('block', ip);
  }
}
```

---

## Security Testing

### Tests Automatisés

```javascript
// tests/security/security.test.js
describe('Security Tests', () => {
  test('should reject SQL injection attempts', async () => {
    const maliciousInputs = ["'; DROP TABLE events; --", "' OR '1'='1"];
    
    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: input, event_date: '2024-12-31T23:59:59Z', location: 'Test' });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('SECURITY_VIOLATION');
    }
  });

  test('should reject XSS attempts', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: xssPayload, event_date: '2024-12-31T23:59:59Z', location: 'Test' });
    
    expect(response.status).toBe(403);
  });
});
```

---

## Checklist de Sécurité

### Configuration
- [ ] JWT secrets forts (32+ caractères)
- [ ] Variables d'environnement sécurisées
- [ ] TLS/HTTPS configuré
- [ ] Security headers activés

### Application
- [ ] Input validation sur toutes les entrées
- [ ] Rate limiting configuré
- [ ] RBAC implémenté
- [ ] Audit logging activé

### Infrastructure
- [ ] Containers non-root
- [ ] Network policies configurées
- [ ] Secrets management
- [ ] Monitoring sécurité

Pour toute question sur la sécurité, contactez l'équipe de sécurité ou consultez le guide de dépannage.
