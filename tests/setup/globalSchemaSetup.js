/**
 * ========================================
 * SETUP GLOBAL POUR TESTS DE SCHÉMA
 * ========================================
 * Configuration globale avant tous les tests
 * @version 1.0.0
 */

const { Pool } = require('pg');

// Configuration de la base de données de test
const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/event_planner_test',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = async () => {
  console.log('🌐 Setup global des tests de schéma...');
  
  try {
    // Tester la connexion à la base de données
    await testDb.query('SELECT NOW()');
    console.log('✅ Base de données de test connectée');
    
    // Créer les tables de test si nécessaire
    await createTestTablesIfNeeded(testDb);
    
    // Exporter la connexion pour utilisation dans les tests
    global.testDb = testDb;
    
    console.log('🎉 Setup global terminé');
    
  } catch (error) {
    console.error('❌ Erreur setup global:', error.message);
    throw error;
  }
};

/**
 * Crée les tables de test nécessaires si elles n'existent pas
 */
async function createTestTablesIfNeeded(db) {
  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(50) DEFAULT 'user',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'events',
      sql: `
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_date TIMESTAMP WITH TIME ZONE NOT NULL,
          location VARCHAR(500) NOT NULL,
          max_attendees INTEGER NOT NULL CHECK (max_attendees > 0),
          organizer_id INTEGER NOT NULL REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'draft',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'guests',
      sql: `
        CREATE TABLE IF NOT EXISTS guests (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          event_id INTEGER NOT NULL REFERENCES events(id),
          checked_in BOOLEAN DEFAULT FALSE,
          check_in_time TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'ticket_types',
      sql: `
        CREATE TABLE IF NOT EXISTS ticket_types (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES events(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'standard',
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          price NUMERIC(10,2) DEFAULT 0.00 CHECK (price >= 0),
          currency VARCHAR(3) DEFAULT 'EUR',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'tickets',
      sql: `
        CREATE TABLE IF NOT EXISTS tickets (
          id SERIAL PRIMARY KEY,
          ticket_code VARCHAR(50) UNIQUE NOT NULL,
          qr_code_data TEXT,
          ticket_type_id INTEGER NOT NULL REFERENCES ticket_types(id),
          event_guest_id INTEGER REFERENCES guests(id),
          price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
          currency VARCHAR(3) DEFAULT 'EUR',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'marketplace_designers',
      sql: `
        CREATE TABLE IF NOT EXISTS marketplace_designers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          brand_name VARCHAR(255) NOT NULL,
          bio TEXT,
          specialties JSONB,
          email VARCHAR(255) NOT NULL,
          portfolio_url VARCHAR(500),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'marketplace_templates',
      sql: `
        CREATE TABLE IF NOT EXISTS marketplace_templates (
          id SERIAL PRIMARY KEY,
          designer_id INTEGER NOT NULL REFERENCES marketplace_designers(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
          currency VARCHAR(3) DEFAULT 'EUR',
          preview_url VARCHAR(500),
          download_url VARCHAR(500),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'marketplace_purchases',
      sql: `
        CREATE TABLE IF NOT EXISTS marketplace_purchases (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          template_id INTEGER NOT NULL REFERENCES marketplace_templates(id),
          payment_method VARCHAR(50) NOT NULL,
          payment_details JSONB,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'system_backups',
      sql: `
        CREATE TABLE IF NOT EXISTS system_backups (
          id VARCHAR(255) PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'started',
          include_data BOOLEAN DEFAULT true,
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          estimated_size VARCHAR(50),
          details JSONB
        );
      `
    },
    {
      name: 'system_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS system_logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          context JSONB,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      await db.query(table.sql);
      console.log(`✅ Table ${table.name} prête`);
    } catch (error) {
      console.warn(`⚠️ Erreur création table ${table.name}: ${error.message}`);
    }
  }

  // Créer les index pour optimiser les performances
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);',
    'CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);',
    'CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);',
    'CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);',
    'CREATE INDEX IF NOT EXISTS idx_marketplace_templates_designer_id ON marketplace_templates(designer_id);',
    'CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON marketplace_templates(category);',
    'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);',
    'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);'
  ];

  for (const indexSql of indexes) {
    try {
      await db.query(indexSql);
    } catch (error) {
      console.warn(`⚠️ Erreur création index: ${error.message}`);
    }
  }
}
