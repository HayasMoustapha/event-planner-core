const database = require('../../config/database');

class InvitationsRepository {
  async createInvitation(eventGuestId, userId) {
    const invitationCode = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const query = `
      INSERT INTO invitations (invitation_code, event_guest_id, sent_at, status, created_by, updated_by)
      VALUES ($1, $2, NOW(), 'pending', $3, $4)
      RETURNING *
    `;
    
    const result = await database.query(query, [invitationCode, eventGuestId, userId, userId]);
    return result.rows[0];
  }

  async updateStatus(invitationId, status, userId = null) {
    const query = `
      UPDATE invitations 
      SET status = $1, updated_at = NOW(), updated_by = COALESCE($2, updated_by)
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await database.query(query, [status, invitationId, userId]);
    return result.rows[0];
  }

  async findByCode(invitationCode) {
    const query = `
      SELECT i.*, 
             eg.event_id, eg.guest_id, eg.is_present, eg.check_in_time,
             g.first_name, g.last_name, g.email, g.phone, g.status as guest_status,
             e.title as event_title, e.description as event_description, e.event_date, e.location
      FROM invitations i
      INNER JOIN event_guests eg ON i.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      INNER JOIN events e ON eg.event_id = e.id
      WHERE i.invitation_code = $1 AND i.deleted_at IS NULL 
        AND eg.deleted_at IS NULL AND g.deleted_at IS NULL AND e.deleted_at IS NULL
    `;
    
    const result = await database.query(query, [invitationCode]);
    return result.rows[0];
  }

  async findByEventId(eventId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE eg.event_id = $1 AND i.deleted_at IS NULL AND eg.deleted_at IS NULL';
    const params = [eventId];
    
    if (status) {
      whereClause += ' AND i.status = $2';
      params.push(status);
    }
    
    const query = `
      SELECT i.*, 
             g.first_name, g.last_name, g.email, g.phone,
             g.status as guest_status
      FROM invitations i
      INNER JOIN event_guests eg ON i.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);
    
    const result = await database.query(query, params);
    return result.rows;
  }

  async countByEvent(eventId, status = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM invitations i
      INNER JOIN event_guests eg ON i.event_guest_id = eg.id
      WHERE eg.event_id = $1 AND i.deleted_at IS NULL AND eg.deleted_at IS NULL
    `;
    
    const params = [eventId];
    
    if (status) {
      query += ' AND i.status = $2';
      params.push(status);
    }
    
    const result = await database.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getInvitationStats(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN i.status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN i.status = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN i.status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN i.status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN i.status = 'cancelled' THEN 1 END) as cancelled
      FROM invitations i
      INNER JOIN event_guests eg ON i.event_guest_id = eg.id
      WHERE eg.event_id = $1 AND i.deleted_at IS NULL AND eg.deleted_at IS NULL
    `;
    
    const result = await database.query(query, [eventId]);
    return result.rows[0];
  }

  async softDelete(invitationId, userId) {
    const query = `
      UPDATE invitations 
      SET deleted_at = NOW(), deleted_by = $1
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await database.query(query, [userId, invitationId]);
    return result.rows[0];
  }
}

module.exports = new InvitationsRepository();
