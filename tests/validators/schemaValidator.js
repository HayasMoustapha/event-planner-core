/**
 * ========================================
 * VALIDATEUR DE SCHÉMA SQL
 * ========================================
 * Validation stricte des données selon schéma PostgreSQL
 * @version 1.0.0
 */

class SchemaValidator {
  constructor(schemaExtractor) {
    this.schemaExtractor = schemaExtractor;
    this.validationCache = new Map();
  }

  /**
   * Valide des données contre le schéma d'une table
   */
  async validate(tableName, data) {
    try {
      // Récupérer le schéma (avec cache)
      let schema = this.validationCache.get(tableName);
      if (!schema) {
        schema = await this.schemaExtractor.extractFromDatabase(tableName);
        this.validationCache.set(tableName, schema);
      }

      const errors = [];
      const warnings = [];

      // Valider chaque colonne
      for (const [columnName, column] of Object.entries(schema.columns)) {
        const value = data[columnName];
        const columnErrors = await this.validateColumn(columnName, column, value, data);
        
        if (columnErrors.length > 0) {
          errors.push(...columnErrors);
        }
      }

      // Valider les contraintes de table
      const constraintErrors = await this.validateConstraints(schema, data);
      errors.push(...constraintErrors);

      // Valider les relations
      const relationErrors = await this.validateRelations(schema, data);
      errors.push(...relationErrors);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        schema: {
          tableName: schema.tableName,
          totalColumns: Object.keys(schema.columns).length,
          validatedColumns: Object.keys(data).length
        }
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        schema: null
      };
    }
  }

  /**
   * Valide une colonne spécifique
   */
  async validateColumn(columnName, column, value, fullData) {
    const errors = [];

    // 1. Valider nullabilité
    if (!column.nullable && (value === null || value === undefined)) {
      errors.push(`${columnName} cannot be null (NOT NULL constraint)`);
      return errors; // Pas besoin de continuer si null requis
    }

    // Si la valeur est null et autorisée, c'est OK
    if (value === null || value === undefined) {
      return errors;
    }

    // 2. Valider le type
    const typeError = this.validateType(columnName, column, value);
    if (typeError) {
      errors.push(typeError);
    }

    // 3. Valider la longueur (pour les chaînes)
    if (column.maxLength && typeof value === 'string' && value.length > column.maxLength) {
      errors.push(`${columnName} exceeds maximum length ${column.maxLength} (actual: ${value.length})`);
    }

    // 4. Valider la précision numérique
    if (column.precision && column.scale && typeof value === 'number') {
      const precisionError = this.validateNumericPrecision(columnName, column, value);
      if (precisionError) {
        errors.push(precisionError);
      }
    }

    // 5. Valider les valeurs par défaut
    if (column.default && value === column.default) {
      // C'est OK d'utiliser la valeur par défaut
    }

    // 6. Valider les formats spécifiques
    const formatError = this.validateSpecialFormats(columnName, column, value);
    if (formatError) {
      errors.push(formatError);
    }

    // 7. Valider les dépendances entre colonnes
    const dependencyError = this.validateColumnDependencies(columnName, column, value, fullData);
    if (dependencyError) {
      errors.push(dependencyError);
    }

    return errors;
  }

  /**
   * Valide le type d'une colonne
   */
  validateType(columnName, column, value) {
    const type = column.type.toLowerCase();
    const udtName = column.udtName?.toLowerCase();

    // Types numériques
    if (['integer', 'bigint', 'smallint'].includes(type)) {
      if (!Number.isInteger(value)) {
        return `${columnName} must be an integer (got ${typeof value}: ${value})`;
      }
      
      if (type === 'smallint' && (value < -32768 || value > 32767)) {
        return `${columnName} must be between -32768 and 32767 for smallint (got ${value})`;
      }
      
      if (type === 'bigint' && (value < -9223372036854775808 || value > 9223372036854775807)) {
        return `${columnName} exceeds bigint range (got ${value})`;
      }
    }

    // Types décimaux
    if (['numeric', 'decimal'].includes(type)) {
      if (typeof value !== 'number' || isNaN(value)) {
        return `${columnName} must be a valid number (got ${typeof value}: ${value})`;
      }
    }

    // Types chaînes
    if (['varchar', 'character varying', 'text', 'character'].includes(type)) {
      if (typeof value !== 'string') {
        return `${columnName} must be a string (got ${typeof value}: ${value})`;
      }
    }

    // Types date/heure
    if (['timestamp', 'timestamptz', 'date', 'time'].includes(type)) {
      if (!(value instanceof Date) && typeof value !== 'string') {
        return `${columnName} must be a Date or string (got ${typeof value}: ${value})`;
      }
      
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return `${columnName} must be a valid date/time string (got "${value}")`;
        }
      }
    }

    // Types booléens
    if (type === 'boolean') {
      if (typeof value !== 'boolean') {
        return `${columnName} must be a boolean (got ${typeof value}: ${value})`;
      }
    }

    // UUID
    if (type === 'uuid' || udtName === 'uuid') {
      if (typeof value !== 'string') {
        return `${columnName} must be a string UUID (got ${typeof value}: ${value})`;
      }
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        return `${columnName} must be a valid UUID format (got "${value}")`;
      }
    }

    // JSON
    if (['json', 'jsonb'].includes(type)) {
      if (typeof value !== 'object' || value === null) {
        return `${columnName} must be a JSON object (got ${typeof value}: ${value})`;
      }
    }

    // Types tableaux (PostgreSQL)
    if (type.includes('[]') || udtName?.includes('_')) {
      if (!Array.isArray(value)) {
        return `${columnName} must be an array (got ${typeof value}: ${value})`;
      }
    }

    return null;
  }

  /**
   * Valide la précision numérique
   */
  validateNumericPrecision(columnName, column, value) {
    const stringValue = value.toString();
    const parts = stringValue.split('.');
    
    // Nombre total de chiffres
    const totalDigits = parts.join('').replace('-', '').length;
    if (totalDigits > column.precision) {
      return `${columnName} exceeds total precision ${column.precision} (got ${totalDigits} digits)`;
    }
    
    // Nombre de décimales
    if (parts.length > 1 && parts[1].length > column.scale) {
      return `${columnName} exceeds scale ${column.scale} (got ${parts[1].length} decimal places)`;
    }
    
    return null;
  }

  /**
   * Valide les formats spéciaux
   */
  validateSpecialFormats(columnName, column, value) {
    const name = columnName.toLowerCase();
    
    // Validation email
    if (name.includes('email') && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${columnName} must be a valid email address (got "${value}")`;
      }
    }
    
    // Validation URL
    if (name.includes('url') && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        return `${columnName} must be a valid URL (got "${value}")`;
      }
    }
    
    // Validation téléphone (format français)
    if (name.includes('phone') && typeof value === 'string') {
      const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        return `${columnName} must be a valid French phone number (got "${value}")`;
      }
    }
    
    // Validation code postal
    if (name.includes('postal_code') && typeof value === 'string') {
      const postalRegex = /^\d{5}$/;
      if (!postalRegex.test(value)) {
        return `${columnName} must be a valid French postal code (got "${value}")`;
      }
    }
    
    // Validation statuts connus
    if (name.includes('status') && typeof value === 'string') {
      const validStatuses = ['draft', 'published', 'archived', 'cancelled', 'active', 'inactive', 'pending', 'completed'];
      if (!validStatuses.includes(value.toLowerCase())) {
        return `${columnName} must be one of: ${validStatuses.join(', ')} (got "${value}")`;
      }
    }
    
    return null;
  }

  /**
   * Valide les dépendances entre colonnes
   */
  validateColumnDependencies(columnName, column, value, fullData) {
    const name = columnName.toLowerCase();
    
    // Si end_date est fourni, start_date doit exister et être antérieur
    if (name.includes('end_date') && value) {
      const startDate = fullData.start_date || fullData.event_date;
      if (startDate) {
        const start = new Date(startDate);
        const end = new Date(value);
        if (end <= start) {
          return `${columnName} must be after start_date`;
        }
      }
    }
    
    // Si max_attendees est fourni, il doit être positif
    if (name.includes('max_attendees') && value <= 0) {
      return `${columnName} must be greater than 0`;
    }
    
    // Si price est fourni, il doit être non négatif
    if (name.includes('price') && value < 0) {
      return `${columnName} cannot be negative`;
    }
    
    return null;
  }

  /**
   * Valide les contraintes de table
   */
  async validateConstraints(schema, data) {
    const errors = [];

    // Contraintes PRIMARY KEY
    if (schema.constraints.primary.length > 0) {
      for (const pkColumn of schema.constraints.primary) {
        if (!data[pkColumn]) {
          errors.push(`Primary key ${pkColumn} cannot be null`);
        }
      }
    }

    // Contraintes UNIQUE
    for (const uniqueColumn of schema.constraints.unique) {
      if (!data[uniqueColumn]) {
        errors.push(`Unique column ${uniqueColumn} cannot be null`);
      }
    }

    // Contraintes FOREIGN KEY
    for (const fk of schema.constraints.foreign) {
      if (!data[fk.column]) {
        errors.push(`Foreign key ${fk.column} cannot be null`);
      }
    }

    return errors;
  }

  /**
   * Valide les relations
   */
  async validateRelations(schema, data) {
    const errors = [];

    // Pour chaque relation, vérifier que les données sont cohérentes
    for (const relationship of schema.relationships) {
      if (relationship.type === 'belongsTo') {
        const localValue = data[relationship.localKey];
        
        if (localValue !== null && localValue !== undefined) {
          // Vérifier que la valeur est un ID valide (positif)
          if (typeof localValue === 'number' && localValue <= 0) {
            errors.push(`Foreign key ${relationship.localKey} must be a positive ID (got ${localValue})`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Valide un objet complet contre plusieurs schémas
   */
  async validateMultiple(schemasData) {
    const results = {};
    let overallValid = true;

    for (const [tableName, data] of Object.entries(schemasData)) {
      const result = await this.validate(tableName, data);
      results[tableName] = result;
      
      if (!result.valid) {
        overallValid = false;
      }
    }

    return {
      overallValid,
      results
    };
  }

  /**
   * Valide uniquement les types (sans contraintes)
   */
  async validateTypesOnly(tableName, data) {
    const schema = await this.schemaExtractor.extractFromDatabase(tableName);
    const errors = [];

    for (const [columnName, column] of Object.entries(schema.columns)) {
      if (data[columnName] !== null && data[columnName] !== undefined) {
        const typeError = this.validateType(columnName, column, data[columnName]);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Vide le cache de validation
   */
  clearCache() {
    this.validationCache.clear();
  }

  /**
   * Retourne les statistiques de validation
   */
  getValidationStats() {
    return {
      cachedSchemas: this.validationCache.size,
      cachedTables: Array.from(this.validationCache.keys())
    };
  }
}

module.exports = SchemaValidator;
