const database = require('../../config/database');

class InvitationsRepository {
  async findByEventAndEmail(eventId, email) {
    const query = `
      SELECT i.*, 
             eg.id as event_guest_id,
             eg.status as event_guest_status,
             eg.guest_id
      FROM event_guests eg
      INNER JOIN guests g ON eg.guest_id = g.id
      LEFT JOIN invitations i ON i.event_guest_id = eg.id AND i.deleted_at IS NULL
      WHERE eg.event_id = $1 
        AND g.email = $2
        AND eg.deleted_at IS NULL 
        AND g.deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await database.query(query, [eventId, email]);
    return result.rows[0] || null;
  }

  async findByEventGuestId(eventGuestId) {
    const query = `
      SELECT * FROM invitations 
      WHERE event_guest_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await database.query(query, [eventGuestId]);
    return result.rows[0] || null;
  }

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
      SET status = $1, updated_at = NOW(), updated_by = COALESCE($3, updated_by)
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

  async getEventTicketTypeSummary(eventId) {
    const query = `
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN type = 'free' THEN 1 END) AS free_count,
        COUNT(CASE WHEN type = 'paid' THEN 1 END) AS paid_count,
        COUNT(CASE WHEN type = 'donation' THEN 1 END) AS donation_count
      FROM ticket_types
      WHERE event_id = $1 AND deleted_at IS NULL
    `;

    const result = await database.query(query, [eventId]);
    return result.rows[0] || { total: 0, free_count: 0, paid_count: 0, donation_count: 0 };
  }

  async findTicketByEventGuestId(eventGuestId) {
    const query = `
      SELECT t.id, t.ticket_code, t.qr_code_data, t.price, t.currency
      FROM tickets t
      WHERE t.event_guest_id = $1 AND t.deleted_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 1
    `;

    const result = await database.query(query, [eventGuestId]);
    return result.rows[0] || null;
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

  async recordResponse(eventId, userId, response, message = null, userEmail = null) {
    // NOTE: message is not persisted (no column in schema)
    const statusMap = {
      accepted: 'confirmed',
      declined: 'cancelled',
      maybe: 'pending'
    };
    const targetStatus = statusMap[response] || 'pending';

    // Find matching invitation/event_guest using email (preferred)
    const invitation = userEmail
      ? await this.findByEventAndEmail(eventId, userEmail)
      : null;

    if (!invitation || !invitation.event_guest_id) {
      return { success: false, error: 'Invitation not found for user' };
    }

    // Update event_guests status
    const updateGuestQuery = `
      UPDATE event_guests
      SET status = $1, updated_at = NOW(), updated_by = $2
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const guestResult = await database.query(updateGuestQuery, [targetStatus, userId, invitation.event_guest_id]);

    // Mark invitation as opened (avoid invalid statuses)
    if (invitation.id) {
      const updateInvitationQuery = `
        UPDATE invitations
        SET opened_at = COALESCE(opened_at, NOW()), updated_at = NOW(), updated_by = $2,
            status = CASE WHEN status = 'opened' THEN status ELSE 'opened' END
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
      `;
      await database.query(updateInvitationQuery, [invitation.id, userId]);
    }

    return {
      success: true,
      data: {
        eventId,
        userId,
        response,
        message,
        eventGuest: guestResult.rows[0] || null
      }
    };
  }
}

module.exports = new InvitationsRepository();
