const { database } = require('../../config');

class EventsRepository {
  /**
   * ========================================
   * CRÉATION D'UN NOUVEL ÉVÉNEMENT
   * ========================================
   * @param {Object} eventData - Données de l'événement à créer
   * @returns {Promise<Object>} Événement créé
   */
  async create(eventData) {
    // Extraction des données nécessaires avec décomposition
    const {
      title,
      description,
      event_date,
      location,
      organizer_id
    } = eventData;

    // Requête SQL d'insertion avec retour des données créées
    const query = `
      INSERT INTO events (
        title, description, event_date, location,
        organizer_id, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      RETURNING *
    `;

    // Valeurs à insérer dans l'ordre des paramètres
    const values = [
      title,
      description || null,
      event_date,
      location,
      organizer_id
    ];
    
    try {
      // Exécution de la requête et récupération du résultat
      const result = await database.query(query, values);
      const createdEvent = result.rows[0];
      
      // Retour direct de l'événement créé (pattern simplifié)
      return createdEvent;
      
    } catch (error) {
      // Gestion des erreurs de contrainte (doublons, etc.)
      if (error.code === '23505') { // unique_violation
        throw new Error('Un événement avec ces informations existe déjà');
      }
      
      // Gestion des erreurs de validation
      if (error.code === '23514') { // check_violation
        throw new Error('Erreur de validation des données: ' + error.message);
      }
      
      // Erreur inattendue
      throw new Error('Erreur lors de la création de l\'événement: ' + error.message);
    }
  }

  async findById(id) {
    const query = 'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findByOrganizer(organizerId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*,
             COUNT(eg.id) as guest_count,
             COUNT(CASE WHEN eg.is_present = true THEN 1 END) as checked_in_count
      FROM events e
      LEFT JOIN event_guests eg ON e.id = eg.event_id AND eg.deleted_at IS NULL
      WHERE e.organizer_id = $1 AND e.deleted_at IS NULL
    `;

    const values = [organizerId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      values.push(status);
    }

    query += `
      GROUP BY e.id
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    const result = await database.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE organizer_id = $1 AND deleted_at IS NULL';
    const countValues = [organizerId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countValues.push(status);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      events: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * ========================================
   * MISE À JOUR D'UN ÉVÉNEMENT
   * ========================================
   * @param {number} id - ID de l'événement à mettre à jour
   * @param {Object} updateData - Données à mettre à jour
   * @param {number} updatedBy - ID de l'utilisateur qui fait la mise à jour
   * @returns {Promise<Object>} Événement mis à jour
   */
  async update(id, updateData, updatedBy) {
    // Liste des champs autorisés pour la mise à jour (sécurité)
    const allowedFields = ['title', 'description', 'event_date', 'location', 'status', 'organizer_id'];
    const updates = [];
    const values = [];
    
    // Construction dynamique des mises à jour avec validation
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        // Échappement des noms de colonnes pour prévenir l'injection SQL
        updates.push(`"${key}" = $${values.length + 1}`);
        values.push(updateData[key]);
      }
    });
    
    // Vérification qu'il y a au moins un champ à mettre à jour
    if (updates.length === 0) {
      throw new Error('Aucun champ valide à mettre à jour');
    }
    
    // Ajout des métadonnées de mise à jour
    values.push(updatedBy, id);
    
    // Construction de la requête SQL
    const query = `
      UPDATE events 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      console.log('🔧 Requête UPDATE:', query);
      console.log('📋 Valeurs:', values);
      
      const result = await database.query(query, values);
      
      // Vérification qu'un événement a bien été mis à jour
      if (result.rows.length === 0) {
        throw new Error('Événement non trouvé ou non mis à jour');
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Erreur base de données:', error);
      throw new Error('Échec de la mise à jour de l\'événement: ' + error.message);
    }
  }

  async delete(id, deletedBy) {
    const query = `
      UPDATE events
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await database.query(query, [id, deletedBy]);
    
    return result.rows[0] || null;
  }

  async publish(id, organizerId) {
    const query = `
      UPDATE events
      SET status = 'published', updated_by = $2, updated_at = NOW()
      WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [id, organizerId]);

    return result.rows[0] || null;
  }

  async archive(id, organizerId) {
    const query = `
      UPDATE events
      SET status = 'archived', updated_by = $2, updated_at = NOW()
      WHERE id = $1 AND organizer_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [id, organizerId]);

    return result.rows[0] || null;
  }

  async getEventStats(organizerId) {
    const query = `
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_events,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_events,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_events,
        COUNT(CASE WHEN event_date >= NOW() THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN event_date < NOW() THEN 1 END) as past_events
      FROM events
      WHERE organizer_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await database.query(query, [organizerId]);
    
    return result.rows[0];
  }
}

module.exports = new EventsRepository();