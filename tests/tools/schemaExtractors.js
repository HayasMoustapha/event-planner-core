/**
 * ========================================
 * EXTRACTEURS DE SCHÉMA AUTOMATIQUES
 * ========================================
 * Extraction des schémas SQL depuis DB et repositories
 * @version 1.0.0
 */

const { Pool } = require('pg');

class SchemaExtractor {
  constructor() {
    this.schemas = new Map();
    this.testDb = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    });
  }

  /**
   * Extrait le schéma complet depuis la base de données PostgreSQL
   */
  async extractFromDatabase(tableName) {
    try {
      // Informations sur les colonnes
      const columnsQuery = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.ordinal_position,
          c.udt_name
        FROM information_schema.columns c
        WHERE c.table_name = $1
        AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `;

      const columnsResult = await this.testDb.query(columnsQuery, [tableName]);

      // Contraintes de la table
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1
        AND tc.table_schema = 'public'
      `;

      const constraintsResult = await this.testDb.query(constraintsQuery, [tableName]);

      // Index de la table
      const indexesQuery = `
        SELECT 
          i.relname as index_name,
          array_agg(a.attname ORDER BY c.ordinality) as column_names,
          ix.indisunique as is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN unnest(ix.indkey) WITH ORDINALITY c(colnum, ordinality) ON true
        JOIN pg_attribute a ON t.oid = a.attrelid AND a.attnum = colnum
        WHERE t.relname = $1
        AND t.relkind = 'r'
        GROUP BY i.relname, ix.indisunique
      `;

      const indexesResult = await this.testDb.query(indexesQuery, [tableName]);

      return this.parseSchema(tableName, columnsResult.rows, constraintsResult.rows, indexesResult.rows);
    } catch (error) {
      console.error(`❌ Erreur extraction schéma ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Extrait le schéma depuis le repository (méthodes et validation)
   */
  async extractFromRepository(repositoryPath) {
    try {
      const repository = require(repositoryPath);
      
      // Essayer de récupérer le schéma défini dans le repository
      if (repository.getSchema) {
        return repository.getSchema();
      }

      // Inférer le schéma depuis les méthodes du repository
      return this.inferSchemaFromMethods(repository);
    } catch (error) {
      console.error(`❌ Erreur extraction repository ${repositoryPath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse les résultats SQL en objet schéma structuré
   */
  parseSchema(tableName, columns, constraints, indexes) {
    const schema = {
      tableName,
      columns: {},
      constraints: {
        primary: [],
        foreign: [],
        unique: [],
        check: []
      },
      indexes: [],
      relationships: []
    };

    // Parser les colonnes
    columns.forEach(col => {
      schema.columns[col.column_name] = {
        name: col.column_name,
        type: col.data_type,
        udtName: col.udt_name,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        position: col.ordinal_position,
        constraints: []
      };
    });

    // Parser les contraintes
    constraints.forEach(constraint => {
      const constraintInfo = {
        name: constraint.constraint_name,
        type: constraint.constraint_type,
        column: constraint.column_name,
        foreignTable: constraint.foreign_table_name,
        foreignColumn: constraint.foreign_column_name
      };

      switch (constraint.constraint_type) {
        case 'PRIMARY KEY':
          schema.constraints.primary.push(constraint.column);
          break;
        case 'FOREIGN KEY':
          schema.constraints.foreign.push(constraintInfo);
          schema.relationships.push({
            type: 'belongsTo',
            localKey: constraint.column,
            foreignTable: constraint.foreign_table_name,
            foreignKey: constraint.foreign_column_name
          });
          break;
        case 'UNIQUE':
          schema.constraints.unique.push(constraint.column);
          break;
        case 'CHECK':
          schema.constraints.check.push(constraintInfo);
          break;
      }

      // Ajouter la contrainte à la colonne
      if (schema.columns[constraint.column]) {
        schema.columns[constraint.column].constraints.push(constraintInfo);
      }
    });

    // Parser les index
    indexes.forEach(index => {
      schema.indexes.push({
        name: index.index_name,
        columns: index.column_names,
        unique: index.is_unique
      });
    });

    return schema;
  }

  /**
   * Infère le schéma depuis les méthodes du repository
   */
  inferSchemaFromMethods(repository) {
    const schema = {
      tableName: this.extractTableNameFromRepository(repository),
      columns: {},
      constraints: { primary: [], foreign: [], unique: [], check: [] },
      indexes: [],
      relationships: []
    };

    // Analyser les méthodes pour inférer les colonnes
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repository));
    
    methods.forEach(methodName => {
      if (methodName === 'create') {
        // La méthode create révèle les colonnes requises
        const createMethod = repository[methodName];
        if (createMethod.length > 0) {
          // Inférer depuis les paramètres attendus
          this.inferFromCreateMethod(schema, repository);
        }
      }
    });

    return schema;
  }

  /**
   * Extrait le nom de la table depuis le repository
   */
  extractTableNameFromRepository(repository) {
    const constructorName = repository.constructor.name;
    if (constructorName.endsWith('Repository')) {
      return constructorName.replace('Repository', '').toLowerCase() + 's';
    }
    return 'unknown_table';
  }

  /**
   * Infère les colonnes depuis la méthode create
   */
  inferFromCreateMethod(schema, repository) {
    // Cette méthode pourrait être améliorée en analysant le code source
    // Pour l'instant, on utilise des heuristiques basiques
    const commonColumns = {
      id: { type: 'integer', nullable: false, primary: true },
      created_at: { type: 'timestamp', nullable: false, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: false, default: 'NOW()' },
      created_by: { type: 'integer', nullable: true }
    };

    Object.assign(schema.columns, commonColumns);
  }

  /**
   * Fusionne le schéma DB et le schéma Repository
   */
  mergeSchemas(dbSchema, repoSchema) {
    if (!repoSchema) return dbSchema;
    if (!dbSchema) return repoSchema;

    const merged = {
      ...dbSchema,
      ...repoSchema,
      columns: { ...dbSchema.columns, ...repoSchema.columns },
      constraints: {
        primary: [...new Set([...dbSchema.constraints.primary, ...repoSchema.constraints.primary])],
        foreign: [...dbSchema.constraints.foreign, ...repoSchema.constraints.foreign],
        unique: [...new Set([...dbSchema.constraints.unique, ...repoSchema.constraints.unique])],
        check: [...dbSchema.constraints.check, ...repoSchema.constraints.check]
      },
      indexes: [...dbSchema.indexes, ...repoSchema.indexes],
      relationships: [...dbSchema.relationships, ...repoSchema.relationships]
    };

    // Valider la cohérence
    this.validateSchemaConsistency(merged);

    return merged;
  }

  /**
   * Valide la cohérence du schéma fusionné
   */
  validateSchemaConsistency(schema) {
    // Vérifier que toutes les colonnes de contraintes existent
    const allColumns = Object.keys(schema.columns);
    
    [...schema.constraints.primary, ...schema.constraints.unique].forEach(column => {
      if (!allColumns.includes(column)) {
        console.warn(`⚠️ Contrainte sur colonne inexistante: ${column}`);
      }
    });

    schema.constraints.foreign.forEach(fk => {
      if (!allColumns.includes(fk.column)) {
        console.warn(`⚠️ Clé étrangère sur colonne inexistante: ${fk.column}`);
      }
    });
  }

  /**
   * Récupère toutes les tables de la base de données
   */
  async getAllTables() {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await this.testDb.query(query);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Ferme les connexions
   */
  async close() {
    await this.testDb.end();
  }
}

module.exports = SchemaExtractor;
