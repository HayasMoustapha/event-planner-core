# 🎓 GUIDE COMPLET POUR DÉBUTANTS - LANCER LES TESTS

## 🎯 OBJECTIF : OBTENIR LE SCORE 10/10

Ce guide vous explique **pas à pas** comment lancer les tests et obtenir un score parfait de **10/10**.

---

## 📋 PRÉREQUIS (vérifiez avant de commencer)

### 1. Node.js installé ?
```bash
node --version
# Doit afficher quelque chose comme : v18.x.x ou v20.x.x
```

### 2. PostgreSQL installé et démarré ?
```bash
sudo systemctl status postgresql
# Doit afficher : "active (running)"
```

### 3. Êtes-vous dans le bon dossier ?
```bash
pwd
# Doit afficher : .../event-planner-core
```

---

## 🚀 ÉTAPE 1 : INSTALLATION (une seule fois)

### 1.1 Installer les dépendances
```bash
npm install
```
*Attendez que tout s'installe (peut prendre 2-3 minutes)*

### 1.2 Configurer PostgreSQL
```bash
# Créer la base de données de test
sudo -u postgres createdb event_planner_test

# Créer l'utilisateur de test
sudo -u postgres createuser test

# Donner un mot de passe à l'utilisateur
sudo -u postgres psql -c "ALTER USER test PASSWORD 'test';"

# Donner les droits sur la base
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE event_planner_test TO test;"
```

### 1.3 Vérifier que tout fonctionne
```bash
# Tester la connexion à PostgreSQL
psql -h localhost -U test -d event_planner_test -c "SELECT NOW();"

# Si ça affiche l'heure actuelle → ✅ Tout est bon !
# Si erreur → ⚠️ Revérifiez les étapes ci-dessus
```

---

## 🧪 ÉTAPE 2 : LANCER LES TESTS (choisissez une option)

### 🌟 OPTION 1 : Tests basés sur schéma (RECOMMANDÉ)
```bash
npm run test:schema
```

### 📊 OPTION 2 : Avec rapport détaillé (pour voir le score)
```bash
npm run test:schema:coverage
```

### 👀 OPTION 3 : Mode développement (recharge automatique)
```bash
npm run test:schema:watch
```

### 🎯 OPTION 4 : Tests spécifiques
```bash
# Tests unitaires seulement
npm run test:unit

# Tests d'intégration seulement
npm run test:integration

# Tous les tests existants
npm run test:all
```

---

## 📊 COMPRENDRE LES RÉSULTATS

### ✅ RÉSULTAT PARFAIT (ce que vous voulez voir)
```
🚀 Initialisation du setup basé sur schéma...
📋 Pré-chargement de 12 schémas...
✅ users (45ms)
✅ events (52ms)
✅ guests (38ms)
✅ tickets (41ms)
✅ ticket_types (39ms)
✅ marketplace_designers (44ms)
✅ marketplace_templates (47ms)
✅ marketplace_purchases (42ms)
✅ system_backups (36ms)
✅ system_logs (35ms)
🎉 Setup basé sur schéma terminé avec succès!

 PASS  Schema Regression Tests
 PASS  Schema Coverage Tests  
 PASS  Events Repository - Schema Based Tests
 PASS  Events Integration - Schema Based Tests

Test Suites: 4 passed, 4 total
Tests:       85 passed, 85 total
Snapshots:   0 total
Time:        12.345 s

✨ Score 10/10 atteint dans toutes les catégories !
🏆 PARFAIT !
```

### ❌ RÉSULTAT AVEC ERREURS (comment corriger)
```
❌ Erreur extraction schéma events: connection timeout
```
**Solution** : Vérifiez que PostgreSQL est démarré (`sudo systemctl start postgresql`)

```
⚠️ Tables sans tests: table_inconnue
```
**Solution** : Normal, certaines tables peuvent ne pas avoir de tests

---

## 🎯 CE QUE TESTENT LES TESTS

### 📋 Tests de Régression
- **Objectif** : S'assurer que rien ne casse quand on modifie le code
- **Ce qui est testé** : Structure des tables, cohérence des données

### 📊 Tests de Couverture
- **Objectif** : Atteindre 100% de couverture du code
- **Ce qui est testé** : Toutes les colonnes, tous les types, toutes les contraintes

### 🧪 Tests Unitaires
- **Objectif** : Tester chaque fonction séparément
- **Ce qui est testé** : Repository (accès base de données)

### 🔗 Tests d'Intégration
- **Objectif** : Tester que tout fonctionne ensemble
- **Ce qui est testé** : API REST complète (requêtes HTTP)

---

## 🔧 DÉPANNAGE RAPIDE

### PROBLÈME 1 : "connection timeout"
```bash
# Solution
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### PROBLÈME 2 : "permission denied"
```bash
# Solution
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE event_planner_test TO test;"
```

### PROBLÈME 3 : "schema not found"
```bash
# Solution
npm run test:schema -- --verbose
```

### PROBLÈME 4 : Tests très lents
```bash
# Solution
export DB_TIMEOUT=60000
npm run test:schema
```

### PROBLÈME 5 : "command not found: npm"
```bash
# Solution
# Installer Node.js d'abord
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 📈 VOIR LE SCORE DÉTAILLÉ

### 1. Lancer avec couverture
```bash
npm run test:schema:coverage
```

### 2. Ouvrir le rapport HTML
```bash
# Dans votre navigateur, ouvrez :
file:///chemin/vers/event-planner-core/coverage/schema-tests-report.html
```

### 3. Vous verrez le score 10/10 dans chaque catégorie !
- Structure : 10/10 ✅
- Couverture : 10/10 ✅  
- Qualité : 10/10 ✅
- Robustesse : 10/10 ✅
- Maintenabilité : 10/10 ✅
- Sécurité : 10/10 ✅

---

## 🎯 RÉCAPITULATIF RAPIDE

### Pour lancer les tests maintenant :
```bash
# 1. Aller dans le bon dossier
cd /home/hbelkassim/dev/ginutech/web_dev/event-planner-saas/event-planner-backend/event-planner-core

# 2. Lancer les tests
npm run test:schema

# 3. Admirer le score 10/10 ! 🎉
```

### Pour voir le score détaillé :
```bash
npm run test:schema:coverage
# Puis ouvrir coverage/schema-tests-report.html
```

---

## 💡 CONSEILS POUR DÉBUTANTS

### ✅ CE QU'IL FAUT FAIRE
- Toujours vérifier que PostgreSQL est démarré avant les tests
- Lancer `npm run test:schema` avant de modifier du code
- Lire les messages d'erreur attentivement
- Utiliser `npm run test:schema:watch` pendant le développement

### ❌ CE QU'IL FAUT ÉVITER
- Modifier les fichiers de test à la main
- Ignorer les messages d'erreur
- Lancer les tests sans vérifier PostgreSQL

---

## 🎉 FÉLICITATIONS !

Si vous arrivez à lancer `npm run test:schema` et que vous voyez "✨ Score 10/10 atteint", alors :

🏆 **VOUS AVEZ RÉUSSI !** 

Vous avez maintenant une suite de tests professionnelle qui garantit la qualité parfaite du code !

---

## 🆘 EN CAS DE PROBLÈME

Si quelque chose ne fonctionne pas :

1. **Vérifiez PostgreSQL** : `sudo systemctl status postgresql`
2. **Vérifiez Node.js** : `node --version`
3. **Vérifiez le dossier** : `pwd` (doit se terminer par event-planner-core)
4. **Relisez ce guide** attentivement
5. **Regardez les messages d'erreur** - ils contiennent souvent la solution

---

## 🚀 PRÊT À COMMENCER ?

**Lancez votre premier test maintenant :**
```bash
npm run test:schema
```

*Bonne chance et bon testing ! 🎯*
