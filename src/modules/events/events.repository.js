const { database } = require('../../config');

class EventsRepository {
  async create(eventData) {
    const { title, description, event_date, location, organizer_id } = eventData;
    
    const query = `
      INSERT INTO events (title, description, event_date, location, organizer_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      RETURNING *
    `;
    
    const values = [title, description, event_date, location, organizer_id];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM events WHERE id = $1';
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
      LEFT JOIN event_guests eg ON e.id = eg.event_id
      WHERE e.organizer_id = $1
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
    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE organizer_id = $1';
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
      throw new Error('No valid fields to update');
    }
    
    values.push(updatedBy, updatedBy, id);
    
    const query = `
      UPDATE events 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING *';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async publish(id, organizerId) {
    const query = `
      UPDATE events 
      SET status = 'published', updated_by = $2, updated_at = NOW()
      WHERE id = $1 AND organizer_id = $2
      RETURNING *
    `;
    
    const result = await database.query(query, [id, organizerId]);
    
    return result.rows[0] || null;
  }

  async archive(id, organizerId) {
    const query = `
      UPDATE events 
      SET status = 'archived', updated_by = $2, updated_at = NOW()
      WHERE id = $1 AND organizer_id = $2
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
      WHERE organizer_id = $1
    `;
    
    const result = await database.query(query, [organizerId]);
    
    return result.rows[0];
  }
}

module.exports = new EventsRepository();