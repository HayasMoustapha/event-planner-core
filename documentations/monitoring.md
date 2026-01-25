# Monitoring - Event Planner Core

## Overview

Ce document couvre la configuration du monitoring, des métriques, des alertes et de l'observabilité pour Event Planner Core.

## Architecture de Monitoring

### Composants

1. **Métriques** - Prometheus + Grafana
2. **Logs** - Structured logging + ELK Stack
3. **Health Checks** - Kubernetes probes
4. **Tracing** - Distributed tracing (optionnel)
5. **Alerting** - AlertManager + notifications

### Stack Technique

- **Prometheus**: Collection de métriques
- **Grafana**: Visualisation et dashboards
- **AlertManager**: Gestion des alertes
- **Node Exporter**: Métriques système
- **PostgreSQL Exporter**: Métriques base de données

---

## Métriques Prometheus

### Configuration Prometheus

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'event-planner-core'
    static_configs:
      - targets: ['app:9090']
    metrics_path: /metrics
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'event-planner-core-health'
    static_configs:
      - targets: ['app:3001']
    metrics_path: /health/detailed
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### Métriques Custom

```javascript
// middleware/metrics.js
const client = require('prom-client');

// Créer un registry
const register = new client.Registry();

// Métriques par défaut
client.collectDefaultMetrics({ register });

// Métriques HTTP
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000]
});

// Métriques Business
const eventsCreatedTotal = new client.Counter({
  name: 'events_created_total',
  help: 'Total number of events created',
  labelNames: ['status']
});

const guestsAddedTotal = new client.Counter({
  name: 'guests_added_total',
  help: 'Total number of guests added to events',
  labelNames: ['event_id']
});

const ticketsGeneratedTotal = new client.Counter({
  name: 'tickets_generated_total',
  help: 'Total number of tickets generated',
  labelNames: ['type', 'status']
});

// Métriques Sécurité
const securityEventsTotal = new client.Counter({
  name: 'security_events_total',
  help: 'Total number of security events',
  labelNames: ['event_type', 'severity', 'ip']
});

const authenticationAttemptsTotal = new client.Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result', 'user_type']
});

// Métriques Base de données
const databaseConnectionsActive = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Métriques Système
const memoryUsage = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'] // heap, external, rss
});

const cpuUsage = new client.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage'
});

// Middleware pour collecter les métriques
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
    
    httpRequestSize
      .labels(req.method, route)
      .observe(parseInt(req.headers['content-length'] || '0'));
  });
  
  next();
};

// Exporter les métriques
const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
};

module.exports = {
  register,
  metricsMiddleware,
  getMetrics,
  eventsCreatedTotal,
  guestsAddedTotal,
  ticketsGeneratedTotal,
  securityEventsTotal,
  authenticationAttemptsTotal,
  databaseConnectionsActive,
  databaseQueryDuration,
  memoryUsage,
  cpuUsage
};
```

### Dashboard Grafana

```json
{
  "dashboard": {
    "title": "Event Planner Core - Overview",
    "tags": ["event-planner", "core"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100"
          }
        ],
        "valueMaps": [
          {
            "value": "null",
            "text": "N/A"
          }
        ],
        "thresholds": "1,5,10"
      },
      {
        "title": "Active Events",
        "type": "stat",
        "targets": [
          {
            "expr": "events_created_total"
          }
        ]
      },
      {
        "title": "Security Events",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(security_events_total[5m])",
            "legendFormat": "{{event_type}}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "singlestat",
        "targets": [
          {
            "expr": "database_connections_active"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "memory_usage_bytes / 1024 / 1024",
            "legendFormat": "{{type}}"
          }
        ],
        "yAxes": [
          {
            "label": "MB"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "cpu_usage_percent"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

---

## Health Checks

### Health Checks Détaillés

```javascript
// health/detailed-check.js
class HealthChecker {
  constructor() {
    this.checks = {
      database: this.checkDatabase,
      auth_service: this.checkAuthService,
      filesystem: this.checkFilesystem,
      memory: this.checkMemory,
      disk: this.checkDisk
    };
  }

  async getDetailedHealth() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        const responseTime = Date.now() - startTime;

        results[name] = {
          status: result.status,
          responseTime,
          details: result.details || null,
          error: result.error || null
        };

        if (result.status !== 'healthy') {
          overallStatus = 'unhealthy';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          responseTime: null,
          error: error.message
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      components: results
    };
  }

  async checkDatabase() {
    try {
      const startTime = Date.now();
      await database.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Vérifier les connexions actives
      const connectionResult = await database.query(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        details: {
          responseTime: `${responseTime}ms`,
          activeConnections: connectionResult.rows[0].active_connections
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkAuthService() {
    try {
      const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/health`, {
        timeout: 5000
      });

      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        details: {
          responseTime: response.headers['x-response-time'] || 'N/A',
          status: response.data.status
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkFilesystem() {
    try {
      const fs = require('fs');
      const testFile = '/tmp/health-check';
      
      // Test écriture
      fs.writeFileSync(testFile, 'health-check');
      
      // Test lecture
      const content = fs.readFileSync(testFile, 'utf8');
      
      // Nettoyage
      fs.unlinkSync(testFile);

      return {
        status: content === 'health-check' ? 'healthy' : 'unhealthy',
        details: {
          readWrite: 'OK'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      const status = memoryUsagePercent < 80 ? 'healthy' : 
                    memoryUsagePercent < 90 ? 'degraded' : 'unhealthy';

      return {
        status,
        details: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          systemUsage: `${memoryUsagePercent.toFixed(2)}%`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkDisk() {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      return {
        status: 'healthy',
        details: {
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

### Routes Health Checks

```javascript
// health/routes.js
const express = require('express');
const healthChecker = new HealthChecker();

const router = express.Router();

// Health check simple
router.get('/health', async (req, res) => {
  try {
    const health = await healthChecker.getDetailedHealth();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: {
        status: health.status,
        timestamp: health.timestamp,
        uptime: health.uptime
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Health check détaillé
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await healthChecker.getDetailedHealth();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Detailed health check failed'
    });
  }
});

// Readiness probe (Kubernetes)
router.get('/health/ready', async (req, res) => {
  try {
    const health = await healthChecker.getDetailedHealth();
    const isReady = health.status === 'healthy' && 
                   health.components.database?.status === 'healthy' &&
                   health.components.auth_service?.status === 'healthy';
    
    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: health.timestamp
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Readiness check failed'
    });
  }
});

// Liveness probe (Kubernetes)
router.get('/health/live', async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

module.exports = router;
```

---

## Alerting

### Règles d'Alerte Prometheus

```yaml
# monitoring/alert_rules.yml
groups:
  - name: event-planner-core.rules
    rules:
      # Alertes HTTP
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      # Alertes Business
      - alert: NoEventsCreated
        expr: increase(events_created_total[1h]) == 0
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "No events created in the last hour"
          description: "No new events have been created in the last hour"

      # Alertes Sécurité
      - alert: HighSecurityEvents
        expr: rate(security_events_total[5m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "High security events rate"
          description: "Security events rate is {{ $value }}/sec"

      - alert: BruteForceAttack
        expr: rate(authentication_attempts_total{result="failed"}[1m]) > 5
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Possible brute force attack"
          description: "Failed authentication rate is {{ $value }}/sec"

      # Alertes Base de données
      - alert: DatabaseConnectionHigh
        expr: database_connections_active > 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database connections: {{ $value }}"

      # Alertes Système
      - alert: HighMemoryUsage
        expr: memory_usage_bytes{type="heap"} / 1024 / 1024 / 1024 > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Heap memory usage is {{ $value }}GB"

      - alert: ServiceDown
        expr: up{job="event-planner-core"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Event Planner Core service is down"
          description: "Service has been down for more than 1 minute"
```

### Configuration AlertManager

```yaml
# monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@eventplanner.com'
  smtp_auth_username: 'alerts@eventplanner.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'
    - match:
        severity: info
      receiver: 'info-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@eventplanner.com'
        subject: '[CRITICAL] Event Planner Core Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts-critical'
        title: '🚨 Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'warning-alerts'
    email_configs:
      - to: 'dev-team@eventplanner.com'
        subject: '[WARNING] Event Planner Core Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'info-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts-info'
        title: 'ℹ️ Info Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Logging Structuré

### Configuration Winston

```javascript
// utils/logger.js
const winston = require('winston');
const path = require('path');

// Format personnalisé
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'event-planner-core',
      ...meta
    });
  })
);

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'event-planner-core',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Fichiers de logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || 'logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || 'logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Logger pour les requêtes HTTP
const requestLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || 'logs', 'requests.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

module.exports = { logger, requestLogger };
```

### Middleware de Logging

```javascript
// middleware/logging.js
const { logger, requestLogger } = require('../utils/logger');

const requestLoggingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Logger la requête
  requestLogger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    requestLogger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      responseSize: data ? data.length : 0
    });

    originalSend.call(this, data);
  };

  next();
};

// Logger pour les erreurs
const errorLogger = (err, req, res, next) => {
  logger.error('Application Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id,
    body: req.body,
    query: req.query
  });

  next(err);
};

module.exports = {
  requestLoggingMiddleware,
  errorLogger
};
```

---

## Docker Compose Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  alertmanager:
    image: prom/alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://eventplanner:password@postgres:5432/event_planner_core?sslmode=disable"

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
```

---

## Configuration Kubernetes Monitoring

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: event-planner-core-metrics
  namespace: event-planner-core
  labels:
    app: event-planner-core
spec:
  selector:
    matchLabels:
      app: event-planner-core
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics

---
apiVersion: v1
kind: Service
metadata:
  name: event-planner-core-metrics
  namespace: event-planner-core
  labels:
    app: event-planner-core
spec:
  selector:
    app: event-planner-core
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090

---
apiVersion: v1
kind: Service
metadata:
  name: event-planner-core-health
  namespace: event-planner-core
  labels:
    app: event-planner-core
spec:
  selector:
    app: event-planner-core
  ports:
  - name: health
    port: 3001
    targetPort: 3001
```

---

## Performance Monitoring

### Métriques Performance

```javascript
// utils/performance-monitor.js
class PerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 1000; // 1 seconde
    this.memoryThreshold = 0.8; // 80%
    this.cpuThreshold = 0.8; // 80%
  }

  startMonitoring() {
    this.monitorDatabaseQueries();
    this.monitorMemoryUsage();
    this.monitorCPUUsage();
    this.monitorResponseTimes();
  }

  monitorDatabaseQueries() {
    const originalQuery = database.query;
    
    database.query = async (...args) => {
      const start = Date.now();
      
      try {
        const result = await originalQuery.apply(database, args);
        const duration = Date.now() - start;
        
        if (duration > this.slowQueryThreshold) {
          logger.warn('Slow database query detected', {
            query: args[0],
            duration: `${duration}ms`,
            params: args[1]
          });
        }
        
        databaseQueryDuration
          .labels(this.getQueryType(args[0]), this.getTableName(args[0]))
          .observe(duration / 1000);
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error('Database query failed', {
          query: args[0],
          duration: `${duration}ms`,
          error: error.message
        });
        throw error;
      }
    };
  }

  monitorMemoryUsage() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      memoryUsage.labels('heap').set(memUsage.heapUsed);
      memoryUsage.labels('external').set(memUsage.external);
      memoryUsage.labels('rss').set(memUsage.rss);
      
      const heapUsageMB = memUsage.heapUsed / 1024 / 1024;
      const totalMemoryMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = heapUsageMB / totalMemoryMB;
      
      if (usagePercent > this.memoryThreshold) {
        logger.warn('High memory usage detected', {
          heapUsed: `${heapUsageMB}MB`,
          heapTotal: `${totalMemoryMB}MB`,
          usagePercent: `${(usagePercent * 100).toFixed(2)}%`
        });
      }
    }, 30000); // Toutes les 30 secondes
  }

  monitorCPUUsage() {
    setInterval(() => {
      const usage = process.cpuUsage();
      const userUsage = usage.user / 1000000; // Convertir en secondes
      const systemUsage = usage.system / 1000000;
      const totalUsage = userUsage + systemUsage;
      
      cpuUsage.set(totalUsage);
      
      if (totalUsage > this.cpuThreshold) {
        logger.warn('High CPU usage detected', {
          userUsage: `${userUsage}s`,
          systemUsage: `${systemUsage}s`,
          totalUsage: `${totalUsage}s`
        });
      }
    }, 30000);
  }

  getQueryType(query) {
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  getTableName(query) {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }
}

module.exports = new PerformanceMonitor();
```

---

## Checklist Monitoring

### Configuration
- [ ] Prometheus configuré et fonctionnel
- [ ] Grafana dashboards créés
- [ ] AlertManager configuré
- [ ] Health checks implémentés
- [ ] Logs structurés activés

### Métriques
- [ ] Métriques HTTP (requêtes, temps de réponse)
- [ ] Métriques business (événements, invités, billets)
- [ ] Métriques sécurité (tentatives d'attaque)
- [ ] Métriques système (CPU, mémoire, disque)
- [ ] Métriques base de données

### Alertes
- [ ] Alertes taux d'erreur élevé
- [ ] Alertes temps de réponse élevé
- [ ] Alertes sécurité critiques
- [ ] Alertes utilisation ressources
- [ ] Notifications configurées

### Health Checks
- [ ] Health check simple
- [ ] Health check détaillé
- [ ] Readiness probe Kubernetes
- [ ] Liveness probe Kubernetes

Pour toute question sur le monitoring, contactez l'équipe DevOps ou consultez le guide de dépannage.
