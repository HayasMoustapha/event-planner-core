# Dépannage - Event Planner Core

## Overview

Ce guide couvre les problèmes communs, les solutions de dépannage et les procédures de diagnostic pour Event Planner Core.

## Diagnostic Rapide

### Health Check d'Urgence

```bash
# Vérifier si le service est en ligne
curl -f http://localhost:3001/health || echo "Service DOWN"

# Vérifier les logs récents
docker-compose logs --tail=50 event-planner-core

# Vérifier les métriques
curl http://localhost:9090/metrics | grep -E "(error|fail|timeout)"

# Vérifier la base de données
psql -h localhost -U postgres -d event_planner_core -c "SELECT COUNT(*) FROM events;"
```

---

## Problèmes Communs

### 1. Service ne démarre pas

#### Symptômes
- Le service ne répond pas sur le port 3001
- Erreur "EADDRINUSE" (port déjà utilisé)
- Erreur "ENOTFOUND" (service non trouvé)

#### Diagnostic

```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :3001
lsof -i :3001

# Vérifier les processus Node.js
ps aux | grep node
ps aux | grep event-planner

# Vérifier les logs de démarrage
docker-compose logs event-planner-core
journalctl -u event-planner-core -f
```

#### Solutions

```bash
# Solution 1: Tuer le processus sur le port
sudo fuser -k 3001/tcp

# Solution 2: Changer de port
export PORT=3002
npm start

# Solution 3: Vérifier la configuration
cat .env | grep PORT

# Solution 4: Redémarrer le service
docker-compose restart event-planner-core
```

### 2. Erreur de connexion à la base de données

#### Symptômes
- Erreur "ECONNREFUSED" (connexion refusée)
- Erreur "password authentication failed"
- Erreur "timeout expired"

#### Diagnostic

```bash
# Vérifier si PostgreSQL fonctionne
docker-compose ps postgres
docker-compose logs postgres

# Tester la connexion manuellement
psql -h localhost -U postgres -d event_planner_core

# Vérifier la configuration DB
cat .env | grep DB_

# Vérifier le réseau Docker
docker network ls
docker network inspect event-planner-core_default
```

#### Solutions

```bash
# Solution 1: Redémarrer PostgreSQL
docker-compose restart postgres

# Solution 2: Recréer la base de données
docker-compose down postgres
docker volume rm event-planner-core_postgres_data
docker-compose up -d postgres

# Solution 3: Vérifier les identifiants
docker-compose exec postgres psql -U postgres -c "\l"

# Solution 4: Mettre à jour la configuration
echo "DB_HOST=postgres" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=event_planner_core" >> .env
echo "DB_USER=postgres" >> .env
echo "DB_PASSWORD=postgres" >> .env
```

### 3. Erreur d'authentification

#### Symptômes
- Erreur "TOKEN_MISSING"
- Erreur "Invalid token"
- Erreur "TOKEN_EXPIRED"

#### Diagnostic

```bash
# Vérifier le service d'auth
curl http://localhost:3000/health

# Vérifier la configuration JWT
cat .env | grep JWT

# Tester avec un token valide
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/events

# Vérifier les logs d'auth
docker-compose logs event-planner-core | grep -i auth
```

#### Solutions

```bash
# Solution 1: Obtenir un nouveau token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Solution 2: Vérifier la clé JWT
echo $JWT_SECRET | wc -c  # Doit être 32+ caractères

# Solution 3: Mettre à jour la configuration
export JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env
```

### 4. Erreur de validation

#### Symptômes
- Erreur "VALIDATION_ERROR"
- Erreur "Bad Request"
- Champs manquants ou invalides

#### Diagnostic

```bash
# Tester avec curl et voir la réponse détaillée
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"","event_date":"","location":""}' \
  -v

# Vérifier les schémas de validation
grep -r "Joi.object\|validateInput" src/modules/

# Activer les logs de debug
export LOG_LEVEL=debug
npm run dev
```

#### Solutions

```bash
# Solution 1: Valider le format de la requête
cat <<EOF | curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d @-
{
  "title": "Test Event",
  "description": "Test Description",
  "event_date": "2024-12-31T23:59:59Z",
  "location": "Test Location"
}
EOF

# Solution 2: Vérifier les champs requis
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Test","event_date":"2024-12-31T23:59:59Z","location":"Test"}'
```

### 5. Erreur de mémoire

#### Symptômes
- Erreur "JavaScript heap out of memory"
- Processus lent ou bloqué
- Erreur "Cannot allocate memory"

#### Diagnostic

```bash
# Vérifier l'utilisation mémoire
docker stats event-planner-core
free -h
top -p $(pgrep node)

# Vérifier les logs de mémoire
docker-compose logs event-planner-core | grep -i memory

# Analyser le heap dump
node --inspect src/server.js
```

#### Solutions

```bash
# Solution 1: Augmenter la limite mémoire
export NODE_OPTIONS="--max-old-space-size=4096"
npm start

# Solution 2: Optimiser les requêtes DB
# Ajouter des LIMIT aux requêtes
# Utiliser des index appropriés

# Solution 3: Redémarrer le service
docker-compose restart event-planner-core

# Solution 4: Configurer le garbage collection
export NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"
```

---

## Problèmes de Performance

### 1. Temps de réponse élevés

#### Diagnostic

```bash
# Mesurer le temps de réponse
time curl http://localhost:3001/api/events

# Vérifier les métriques de performance
curl http://localhost:9090/metrics | grep http_request_duration

# Analyser les requêtes lentes
psql -h localhost -U postgres -d event_planner_core -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

#### Solutions

```sql
-- Ajouter des index manquants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_organizer_status 
ON events(organizer_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_guests_event_status 
ON event_guests(event_id, status);

-- Analyser les requêtes lentes
EXPLAIN ANALYZE SELECT * FROM events WHERE organizer_id = 1 AND status = 'published';
```

### 2. High CPU Usage

#### Diagnostic

```bash
# Vérifier l'utilisation CPU
top -p $(pgrep node)
htop
docker stats event-planner-core

# Profiler l'application
node --prof src/server.js
```

#### Solutions

```javascript
// Optimiser les boucles et traitements
// Utiliser des streams pour les gros volumes
// Mettre en cache les données fréquentes
// Optimiser les expressions régulières
```

---

## Problèmes de Déploiement

### 1. Docker Build échoue

#### Symptômes
- Erreur "npm install failed"
- Erreur "permission denied"
- Erreur "no space left on device"

#### Diagnostic

```bash
# Vérifier l'espace disque
df -h
du -sh .

# Vérifier les permissions Docker
docker system df
docker system prune -f

# Vérifier le build Docker
docker build --no-cache .
```

#### Solutions

```bash
# Solution 1: Nettoyer Docker
docker system prune -a -f
docker volume prune -f

# Solution 2: Augmenter l'espace disque
sudo apt-get clean
sudo docker system prune -a

# Solution 3: Rebuild sans cache
docker-compose build --no-cache
```

### 2. Kubernetes Deployment échoue

#### Symptômes
- Pods en "CrashLoopBackOff"
- Pods en "Pending"
- ImagePullBackOff

#### Diagnostic

```bash
# Vérifier le statut des pods
kubectl get pods -n event-planner-core
kubectl describe pod <pod-name> -n event-planner-core

# Vérifier les logs
kubectl logs <pod-name> -n event-planner-core

# Vérifier les événements
kubectl get events -n event-planner-core --sort-by='.lastTimestamp'
```

#### Solutions

```bash
# Solution 1: Vérifier l'image
kubectl get pods -n event-planner-core -o wide
docker pull registry.eventplanner.com/event-planner-core:v1.0.0

# Solution 2: Vérifier les ressources
kubectl describe deployment event-planner-core -n event-planner-core

# Solution 3: Redémarrer le déploiement
kubectl rollout restart deployment/event-planner-core -n event-planner-core
```

---

## Monitoring et Logs

### Logs Importants

```bash
# Logs d'application
docker-compose logs -f event-planner-core

# Logs d'erreurs
docker-compose logs event-planner-core | grep -i error

# Logs de sécurité
docker-compose logs event-planner-core | grep -i security

# Logs de performance
docker-compose logs event-planner-core | grep -i "slow\|timeout\|memory"
```

### Métriques Clés

```bash
# Taux d'erreur
curl -s http://localhost:9090/metrics | grep "http_requests_total.*5.."

# Temps de réponse
curl -s http://localhost:9090/metrics | grep "http_request_duration_seconds"

# Connexions DB actives
curl -s http://localhost:9090/metrics | grep "database_connections_active"

# Événements de sécurité
curl -s http://localhost:9090/metrics | grep "security_events_total"
```

---

## Scripts de Diagnostic

### Script de Santé Complète

```bash
#!/bin/bash
# health-check.sh

echo "=== Event Planner Core Health Check ==="
echo

# Service Health
echo "1. Service Health:"
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Service is healthy"
else
    echo "❌ Service is down"
fi

# Database Health
echo "2. Database Health:"
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
fi

# Memory Usage
echo "3. Memory Usage:"
MEMORY_USAGE=$(docker stats --no-stream event-planner-core --format "{{.MemUsage}}" | sed 's/%//')
if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
    echo "✅ Memory usage: ${MEMORY_USAGE}%"
else
    echo "⚠️  High memory usage: ${MEMORY_USAGE}%"
fi

# CPU Usage
echo "4. CPU Usage:"
CPU_USAGE=$(docker stats --no-stream event-planner-core --format "{{.CPUPerc}}" | sed 's/%//')
if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
    echo "✅ CPU usage: ${CPU_USAGE}%"
else
    echo "⚠️  High CPU usage: ${CPU_USAGE}%"
fi

# Disk Space
echo "5. Disk Space:"
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if (( $(echo "$DISK_USAGE < 80" | bc -l) )); then
    echo "✅ Disk usage: ${DISK_USAGE}%"
else
    echo "⚠️  High disk usage: ${DISK_USAGE}%"
fi

# Recent Errors
echo "6. Recent Errors (last 10 minutes):"
ERROR_COUNT=$(docker-compose logs --since=10m event-planner-core 2>&1 | grep -i error | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ No recent errors"
else
    echo "❌ $ERROR_COUNT errors in last 10 minutes"
fi

echo
echo "=== Health Check Complete ==="
```

### Script de Debug

```bash
#!/bin/bash
# debug.sh

echo "=== Debug Information ==="

# Environment Variables
echo "Environment Variables:"
env | grep -E "(NODE_ENV|PORT|DB_|JWT_)" | sort

# Network Information
echo "Network Information:"
netstat -tulpn | grep -E ":(3001|5432|9090)"

# Process Information
echo "Process Information:"
ps aux | grep -E "(node|postgres)" | grep -v grep

# Docker Information
echo "Docker Information:"
docker-compose ps
docker stats --no-stream

# Recent Logs
echo "Recent Logs:"
docker-compose logs --tail=20 event-planner-core

echo "=== Debug Complete ==="
```

---

## Contact Support

### Information à Collecter

Quand vous contactez le support, veuillez fournir:

1. **Version du service**
   ```bash
   git rev-parse HEAD
   cat package.json | grep version
   ```

2. **Logs d'erreur complets**
   ```bash
   docker-compose logs --tail=100 event-planner-core > debug-logs.txt
   ```

3. **Configuration**
   ```bash
   cat .env | sed 's/=.*/=***HIDDEN***/' > config.txt
   ```

4. **Métriques au moment du problème**
   ```bash
   curl http://localhost:9090/metrics > metrics.txt
   ```

5. **Health check**
   ```bash
   curl http://localhost:3001/health/detailed > health.txt
   ```

### Canaux de Support

- **Urgent**: Slack #event-planner-support
- **Normal**: Créer une issue GitHub
- **Email**: support@eventplanner.com

### Niveaux de Sévérité

- **Critical** - Service complètement down
- **High** - Fonctionnalité majeure affectée
- **Medium** - Fonctionnalité mineure affectée
- **Low** - Question ou amélioration

---

## Checklist de Dépannage

### Service Down
- [ ] Vérifier si le service écoute sur le bon port
- [ ] Vérifier les logs de démarrage
- [ ] Vérifier la configuration
- [ ] Redémarrer le service

### Database Issues
- [ ] Vérifier la connexion DB
- [ ] Vérifier les identifiants DB
- [ ] Vérifier l'espace disque DB
- [ ] Vérifier les requêtes lentes

### Performance Issues
- [ ] Vérifier l'utilisation CPU/mémoire
- [ ] Analyser les métriques de performance
- [ ] Vérifier les requêtes DB
- [ ] Vérifier les logs de timeout

### Security Issues
- [ ] Vérifier les logs de sécurité
- [ ] Analyser les tentatives d'attaque
- [ ] Vérifier les configurations de sécurité
- [ ] Mettre à jour les dépendances

Pour toute question non couverte dans ce guide, contactez l'équipe de support technique.
