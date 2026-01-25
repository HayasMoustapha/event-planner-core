# Déploiement - Event Planner Core

## Overview

Ce guide couvre le déploiement d'Event Planner Core dans différents environnements : développement, staging et production.

## Architecture de Déploiement

### Environnements

1. **Development** - Local et tests
2. **Staging** - Pré-production avec données de test
3. **Production** - Environnement de production

### Composants

- **Application** - Service Node.js/Express
- **Base de données** - PostgreSQL
- **Monitoring** - Prometheus + Grafana
- **Logs** - ELK Stack ou équivalent
- **Load Balancer** - Nginx ou AWS ALB

---

## Prérequis

### Infrastructure

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Kubernetes** (optionnel pour production)
- **PostgreSQL** 12+ (si non managé)
- **Redis** (optionnel pour cache)

### Services Externes

- **Event Planner Auth** - Service d'authentification
- **Event Planner Notification** - Service de notifications
- **Ticket Generator** - Service de génération de billets

---

## Configuration

### Variables d'Environnement

#### Essentielles

```bash
# Application
NODE_ENV=production
PORT=3001

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=event_planner_core
DB_USER=eventplanner
DB_PASSWORD=secure_password_here
DB_SSL=true
DB_MAX_CONNECTIONS=20

# Authentification
AUTH_SERVICE_URL=https://auth.eventplanner.com
JWT_SECRET=your_32_character_secret_here
AUTH_SERVICE_TOKEN=service_to_service_token

# Sécurité
CORS_ORIGIN=https://app.eventplanner.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
```

#### Optionnelles

```bash
# Cache Redis
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# File Storage
AWS_S3_BUCKET=event-planner-tickets
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-west-3

# External Services
TICKET_GENERATOR_URL=https://tickets.eventplanner.com
NOTIFICATION_SERVICE_URL=https://notifications.eventplanner.com

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_BETA_FEATURES=false
```

### Configuration Validation

```bash
# Valider la configuration avant déploiement
npm run validate-config

# Sortie attendue
✅ Configuration validation passed
📋 Configuration summary: {...}
```

---

## Déploiement Local

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
      - "9090:9090"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - AUTH_SERVICE_URL=http://auth:3000
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: event_planner_core
      POSTGRES_USER: eventplanner
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus
    ports:
      - "9091:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Démarrage

```bash
# Cloner et configurer
git clone <repository>
cd event-planner-core
cp .env.example .env
# Éditer .env

# Construire et démarrer
docker-compose up -d

# Initialiser la base de données
docker-compose exec app npm run db:migrate

# Vérifier le déploiement
curl http://localhost:3001/health
```

---

## Déploiement Staging

### Dockerfile Multi-stage

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S eventplanner -u 1001

WORKDIR /app

# Copier les dépendances
COPY --from=builder /app/node_modules ./node_modules

# Copier le code source
COPY --chown=eventplanner:nodejs . .

# Créer les répertoires nécessaires
RUN mkdir -p logs && chown eventplanner:nodejs logs

USER eventplanner

EXPOSE 3001 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
```

### Configuration Staging

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  app:
    image: event-planner-core:${VERSION}
    environment:
      - NODE_ENV=staging
      - DB_HOST=${STAGING_DB_HOST}
      - DB_PASSWORD=${STAGING_DB_PASSWORD}
      - AUTH_SERVICE_URL=https://staging-auth.eventplanner.com
      - LOG_LEVEL=debug
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
```

### Script de Déploiement

```bash
#!/bin/bash
# deploy-staging.sh

set -e

VERSION=${1:-latest}
ENVIRONMENT=staging

echo "🚀 Deploying Event Planner Core v$VERSION to $ENVIRONMENT"

# Validation
echo "📋 Validating configuration..."
npm run validate-config

# Tests
echo "🧪 Running tests..."
npm test

# Build
echo "🔨 Building Docker image..."
docker build -t event-planner-core:$VERSION .

# Push to registry
echo "📤 Pushing to registry..."
docker tag event-planner-core:$VERSION registry.eventplanner.com/event-planner-core:$VERSION
docker push registry.eventplanner.com/event-planner-core:$VERSION

# Deploy
echo "🚢 Deploying to $ENVIRONMENT..."
export VERSION=$VERSION
docker-compose -f docker-compose.staging.yml up -d

# Health check
echo "🏥 Waiting for health check..."
sleep 30
curl -f https://staging-api.eventplanner.com/health || exit 1

echo "✅ Deployment successful!"
```

---

## Déploiement Production

### Kubernetes

#### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: event-planner-core
  labels:
    name: event-planner-core
```

#### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-planner-core-config
  namespace: event-planner-core
data:
  NODE_ENV: "production"
  PORT: "3001"
  LOG_LEVEL: "info"
  ENABLE_METRICS: "true"
  METRICS_PORT: "9090"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
```

#### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: event-planner-core-secrets
  namespace: event-planner-core
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  AUTH_SERVICE_TOKEN: <base64-encoded-token>
```

#### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-planner-core
  namespace: event-planner-core
  labels:
    app: event-planner-core
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: event-planner-core
  template:
    metadata:
      labels:
        app: event-planner-core
    spec:
      containers:
      - name: event-planner-core
        image: registry.eventplanner.com/event-planner-core:v1.0.0
        ports:
        - containerPort: 3001
          name: http
        - containerPort: 9090
          name: metrics
        envFrom:
        - configMapRef:
            name: event-planner-core-config
        - secretRef:
            name: event-planner-core-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      imagePullSecrets:
      - name: registry-secret
```

#### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: event-planner-core-service
  namespace: event-planner-core
  labels:
    app: event-planner-core
spec:
  selector:
    app: event-planner-core
  ports:
  - name: http
    port: 80
    targetPort: 3001
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  type: ClusterIP
```

#### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: event-planner-core-ingress
  namespace: event-planner-core
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "15m"
spec:
  tls:
  - hosts:
    - api.eventplanner.com
    secretName: event-planner-core-tls
  rules:
  - host: api.eventplanner.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: event-planner-core-service
            port:
              number: 80
```

#### HorizontalPodAutoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-planner-core-hpa
  namespace: event-planner-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-planner-core
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Script de Déploiement Kubernetes

```bash
#!/bin/bash
# deploy-k8s.sh

set -e

VERSION=${1:-v1.0.0}
ENVIRONMENT=production

echo "🚀 Deploying Event Planner Core $VERSION to Kubernetes $ENVIRONMENT"

# Valider les manifests
echo "📋 Validating Kubernetes manifests..."
kubectl apply --dry-run=client -f k8s/

# Appliquer les configurations
echo "⚙️ Applying configurations..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Déployer l'application
echo "🚢 Deploying application..."
kubectl set image deployment/event-planner-core \
  event-planner-core=registry.eventplanner.com/event-planner-core:$VERSION \
  -n event-planner-core

# Attendre le déploiement
echo "⏳ Waiting for rollout..."
kubectl rollout status deployment/event-planner-core -n event-planner-core --timeout=300s

# Vérifier le déploiement
echo "🏥 Verifying deployment..."
kubectl get pods -n event-planner-core
kubectl get services -n event-planner-core

# Test de santé
echo "🔍 Health check..."
EXTERNAL_IP=$(kubectl get ingress event-planner-core-ingress -n event-planner-core -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -f https://api.eventplanner.com/health || exit 1

echo "✅ Deployment successful!"
```

---

## Monitoring et Logging

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'event-planner-core'
    static_configs:
      - targets: ['app:9090']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'event-planner-core-health'
    static_configs:
      - targets: ['app:3001']
    metrics_path: /health/detailed
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Event Planner Core",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
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
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(errors_total[5m])",
            "legendFormat": "{{error_type}}"
          }
        ]
      }
    ]
  }
}
```

### Configuration ELK Stack

```yaml
# logging/elasticsearch.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
```

---

## Sécurité en Production

### Network Policies

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: event-planner-core-netpol
  namespace: event-planner-core
spec:
  podSelector:
    matchLabels:
      app: event-planner-core
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
```

### Pod Security Policy

```yaml
# k8s/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: event-planner-core-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

---

## Backup et Recovery

### Backup Automatisé

```bash
#!/bin/bash
# backup-production.sh

BACKUP_DIR="/backups/event-planner-core"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Créer le répertoire de backup
mkdir -p $BACKUP_DIR

# Backup de la base de données
echo "📦 Backing up database..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Backup des configurations
echo "📦 Backing up configurations..."
kubectl get configmap event-planner-core-config -n event-planner-core -o yaml > $BACKUP_DIR/configmap_$DATE.yaml
kubectl get secret event-planner-core-secrets -n event-planner-core -o yaml > $BACKUP_DIR/secrets_$DATE.yaml

# Nettoyer les anciens backups
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.yaml" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

### Recovery

```bash
#!/bin/bash
# recovery.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "🔄 Starting recovery from $BACKUP_FILE"

# Arrêter l'application
kubectl scale deployment event-planner-core --replicas=0 -n event-planner-core

# Restaurer la base de données
echo "📦 Restoring database..."
gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Redémarrer l'application
kubectl scale deployment event-planner-core --replicas=3 -n event-planner-core

# Attendre le déploiement
kubectl rollout status deployment/event-planner-core -n event-planner-core

echo "✅ Recovery completed"
```

---

## Performance et Scaling

### Configuration PostgreSQL Production

```sql
-- postgresql.conf optimisations
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

-- Monitoring
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
```

### Connection Pooling

```javascript
// config/database-production.js
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 50, // Augmenté pour la production
  min: 10, // Connexions minimum
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000,
  query_timeout: 10000,
});
```

---

## Déploiement Bleu-Vert

### Script Blue-Green

```bash
#!/bin/bash
# blue-green-deploy.sh

VERSION=${1:-v1.0.0}
ENVIRONMENT=production

# Déterminer l'environnement actif
CURRENT_COLOR=$(kubectl get service event-planner-core-service -n event-planner-core -o jsonpath='{.spec.selector.color}')
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "🔄 Deploying $VERSION to $NEW_COLOR environment"

# Mettre à jour le déploiement avec la nouvelle couleur
kubectl patch deployment event-planner-core -n event-planner-core -p '{"spec":{"template":{"metadata":{"labels":{"color":"'$NEW_COLOR'"}}}}}'

# Mettre à jour l'image
kubectl set image deployment/event-planner-core event-planner-core=registry.eventplanner.com/event-planner-core:$VERSION -n event-planner-core

# Attendre le déploiement
kubectl rollout status deployment/event-planner-core -n event-planner-core

# Tester le nouvel environnement
NEW_POD=$(kubectl get pods -n event-planner-core -l color=$NEW_COLOR -o jsonpath='{.items[0].metadata.name}')
kubectl exec $NEW_POD -n event-planner-core -- curl -f http://localhost:3001/health

# Basculer le trafic
kubectl patch service event-planner-core-service -n event-planner-core -p '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

echo "✅ Traffic switched to $NEW_COLOR environment"

# Nettoyer l'ancien environnement
kubectl delete pods -n event-planner-core -l color=$CURRENT_COLOR
```

---

## Checklist de Déploiement Production

### Pré-déploiement

- [ ] Code revu et approuvé
- [ ] Tests passants (unitaires, intégration, E2E)
- [ ] Scan de sécurité passé
- [ ] Performance test effectué
- [ ] Documentation mise à jour
- [ ] Backup de la version précédente

### Configuration

- [ ] Variables d'environnement configurées
- [ ] Secrets créés et chiffrés
- [ ] Base de données migrée
- [ ] Index créés
- [ ] Monitoring configuré

### Déploiement

- [ ] Image Docker buildée et pushée
- [ ] Kubernetes manifests appliqués
- [ ] Health checks passants
- [ ] Load balancer configuré
- [ ] SSL/TLS configuré

### Post-déploiement

- [ ] Monitoring actif
- [ ] Logs collectés
- [ ] Alertes configurées
- [ ] Documentation de déploiement
- [ ] Équipe notifiée

---

Pour toute question sur le déploiement, contactez l'équipe DevOps ou consultez le guide de dépannage.
