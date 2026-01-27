const { database } = require('../../config');

class EventsRepository {
  async create(eventData) {
    console.log('🧪 [TEST LOG] EventsRepository.create - ENTRY');
    console.log('🧪 [TEST LOG] EventsRepository.create - eventData:', eventData);
    
    const {
      title,
      description,
      event_date,
      location,
      organizer_id
    } = eventData;

    const query = `
      INSERT INTO events (
        title, description, event_date, location,
        organizer_id, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      RETURNING *
    `;

    const values = [
      title,
      description || null,
      event_date,
      location,
      organizer_id
    ];
    
    console.log('🧪 [TEST LOG] EventsRepository.create - SQL Query:', query);
    console.log('🧪 [TEST LOG] EventsRepository.create - SQL Values:', values);
    
    try {
      console.log('🧪 [TEST LOG] EventsRepository.create - Executing database query...');
      const result = await database.query(query, values);
      const createdEvent = result.rows[0];
      console.log('🧪 [TEST LOG] EventsRepository.create - Database result:', result);
      console.log('🧪 [TEST LOG] EventsRepository.create - Created event:', createdEvent);
      
      return {
        success: true,
        message: 'Événement créé avec succès',
        data: createdEvent
      };
    } catch (error) {
      console.log('🧪 [TEST LOG] EventsRepository.create - DATABASE ERROR:', error.message);
      console.log('🧪 [TEST LOG] EventsRepository.create - DATABASE ERROR CODE:', error.code);
      console.log('🧪 [TEST LOG] EventsRepository.create - DATABASE ERROR STACK:', error.stack);
      
      // Gérer les erreurs de contrainte (doublons, etc.)
      if (error.code === '23505') { // unique_violation
        return {
          success: false,
          error: 'Un événement avec ces informations existe déjà',
          details: {
            field: 'title',
            message: 'Ce titre est déjà utilisé pour un événement à cette date'
          }
        };
      }
      
      // Gérer les erreurs de validation
      if (error.code === '23514') { // check_violation
        return {
          success: false,
          error: 'Erreur de validation des données',
          details: error.message
        };
      }
      
      // Erreur inattendue
      return {
        success: false,
        error: 'Erreur lors de la création de l\'événement',
        details: error.message
      };
    }
  }

  async findById(id) {
    console.log('🧪 [TEST LOG] EventsRepository.findById - ENTRY');
    console.log('🧪 [TEST LOG] EventsRepository.findById - id:', id);
    
    const query = 'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL';
    console.log('🧪 [TEST LOG] EventsRepository.findById - SQL Query:', query);
    
    try {
      console.log('🧪 [TEST LOG] EventsRepository.findById - Executing database query...');
      const result = await database.query(query, [id]);
      console.log('🧪 [TEST LOG] EventsRepository.findById - Database result:', result);
      console.log('🧪 [TEST LOG] EventsRepository.findById - Found event:', result.rows[0]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.log('🧪 [TEST LOG] EventsRepository.findById - DATABASE ERROR:', error.message);
      console.log('🧪 [TEST LOG] EventsRepository.findById - DATABASE ERROR STACK:', error.stack);
      throw error;
    }
  }

  async findByOrganizer(organizerId, options = {}) {
    console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - ENTRY');
    console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - organizerId:', organizerId);
    console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - options:', options);
    
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

    console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Main query:', query);
    console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Main values:', values);
    
    try {
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Executing main query...');
      const result = await database.query(query, values);
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Main query result rows:', result.rows.length);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM events WHERE organizer_id = $1 AND deleted_at IS NULL';
      const countValues = [organizerId];
      
      if (status) {
        countQuery += ' AND status = $2';
        countValues.push(status);
      }
      
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Count query:', countQuery);
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Executing count query...');
      const countResult = await database.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - Total count:', total);
      
      return {
        events: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - DATABASE ERROR:', error.message);
      console.log('🧪 [TEST LOG] EventsRepository.findByOrganizer - DATABASE ERROR STACK:', error.stack);
      throw error;
    }
  }

  async update(id, updateData, updatedBy) {
    const allowedFields = ['title', 'description', 'event_date', 'location', 'status'];
    const updates = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = $${values.length + 1}`);
        values.push(updateData[key]);
      }
    });
    
    if (updates.length === 0) {
      return {
        success: false,
        error: 'No valid fields to update',
        details: {
          message: 'At least one valid field must be provided for update',
          allowedFields,
          providedFields: Object.keys(updateData)
        }
      };
    }
    
    values.push(updatedBy, updatedBy, id);
    
    const query = `
      UPDATE events 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      const result = await database.query(query, values);
      return {
        success: true,
        data: result.rows[0],
        message: 'Event updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update event',
        details: {
          message: error.message,
          id
        }
      };
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
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [id, organizerId]);

    return result.rows[0] || null;
  }

  async archive(id, organizerId) {
    const query = `
      UPDATE events
      SET status = 'archived', updated_by = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
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