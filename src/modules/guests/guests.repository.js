const { database } = require('../../config');

class GuestsRepository {
  async create(guestData) {
    const { first_name, last_name, email, phone, created_by } = guestData;
    
    const query = `
      INSERT INTO guests (first_name, last_name, email, phone, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
    `;
    
    const values = [first_name, last_name, email, phone, created_by];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM guests WHERE email = $1 AND deleted_at IS NULL';
    const result = await database.query(query, [email]);
    
    return result.rows[0] || null;
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, status, search } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM guests WHERE deleted_at IS NULL';
    const values = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM guests WHERE deleted_at IS NULL';
    const countValues = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countValues.push(`%${search}%`);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      guests: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async update(id, updateData, updatedBy) {
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'status'];
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
      UPDATE guests 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      const result = await database.query(query, values);
      return {
        success: true,
        data: result.rows[0],
        message: 'Guest updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update guest',
        details: {
          message: error.message,
          id
        }
      };
    }
  }

  async delete(id, deletedBy) {
    const query = `
      UPDATE guests
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await database.query(query, [id, deletedBy]);
    
    return result.rows[0] || null;
  }

  async getEventGuests(eventId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT g.*, eg.is_present, eg.check_in_time, eg.invitation_code, eg.status as event_guest_status
      FROM guests g
      INNER JOIN event_guests eg ON g.id = eg.guest_id AND eg.deleted_at IS NULL
      WHERE eg.event_id = $1 AND g.deleted_at IS NULL
    `;
    
    const values = [eventId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      query += ` AND eg.status = $${paramCount}`;
      values.push(status);
    }
    
    query += ` ORDER BY eg.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM event_guests eg WHERE eg.event_id = $1 AND eg.deleted_at IS NULL';
    const countValues = [eventId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countValues.push(status);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      guests: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async addGuestToEvent(eventId, guestId, invitationCode, createdBy) {
    const query = `
      INSERT INTO event_guests (event_id, guest_id, invitation_code, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $4)
      RETURNING *
    `;
    
    const values = [eventId, guestId, invitationCode, createdBy];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async checkInGuest(invitationCode) {
    const query = `
      UPDATE event_guests 
      SET is_present = true, check_in_time = NOW(), updated_at = NOW()
      WHERE invitation_code = $1 AND is_present = false AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await database.query(query, [invitationCode]);
    
    return result.rows[0] || null;
  }

  async getGuestStats(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total_guests,
        COUNT(CASE WHEN eg.status = 'confirmed' THEN 1 END) as confirmed_guests,
        COUNT(CASE WHEN eg.is_present = true THEN 1 END) as checked_in_guests,
        COUNT(CASE WHEN eg.status = 'pending' THEN 1 END) as pending_guests,
        COUNT(CASE WHEN eg.status = 'cancelled' THEN 1 END) as cancelled_guests
      FROM event_guests eg
      WHERE eg.event_id = $1 AND eg.deleted_at IS NULL
    `;
    
    const result = await database.query(query, [eventId]);
    
    return result.rows[0];
  }
}

module.exports = new GuestsRepository();
