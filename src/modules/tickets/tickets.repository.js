const { database } = require('../../config');

class TicketsRepository {
  async createTicketType(ticketTypeData) {
    const { 
      event_id, 
      name, 
      description, 
      type, 
      quantity, 
      price, 
      currency, 
      available_from, 
      available_to, 
      created_by 
    } = ticketTypeData;
    
    const query = `
      INSERT INTO ticket_types (
        event_id, name, description, type, quantity, price, currency, 
        available_from, available_to, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *
    `;
    
    const values = [
      event_id, name, description, type, quantity, price, currency,
      available_from, available_to, created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async create(ticketData) {
    const { 
      ticket_code, 
      qr_code_data, 
      ticket_type_id, 
      ticket_template_id,
      event_guest_id, 
      price, 
      currency, 
      created_by 
    } = ticketData;
    
    const query = `
      INSERT INTO tickets (
        ticket_code, qr_code_data, ticket_type_id, ticket_template_id,
        event_guest_id, price, currency, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;
    
    const values = [
      ticket_code, qr_code_data, ticket_type_id, ticket_template_id,
      event_guest_id, price, currency, created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findTicketTypeById(id) {
    const query = `
      SELECT tt.*, e.title as event_title, e.organizer_id
      FROM ticket_types tt
      INNER JOIN events e ON tt.event_id = e.id
      WHERE tt.id = $1
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findTicketById(id) {
    const query = `
      SELECT t.*, tt.name as ticket_type_name, tt.type as ticket_type,
             eg.event_id, eg.guest_id, g.first_name, g.last_name, g.email,
             e.title as event_title, e.organizer_id
      FROM tickets t
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      INNER JOIN events e ON eg.event_id = e.id
      WHERE t.id = $1
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findTicketByCode(ticketCode) {
    const query = `
      SELECT t.*, tt.name as ticket_type_name, tt.type as ticket_type,
             eg.event_id, eg.guest_id, g.first_name, g.last_name, g.email,
             e.title as event_title, e.organizer_id, e.event_date
      FROM tickets t
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      INNER JOIN events e ON eg.event_id = e.id
      WHERE t.ticket_code = $1
    `;
    const result = await database.query(query, [ticketCode]);
    
    return result.rows[0] || null;
  }

  async getTicketTypesByEvent(eventId, options = {}) {
    const { page = 1, limit = 20, type } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT tt.*, 
             COUNT(t.id) as sold_tickets,
             COUNT(CASE WHEN t.is_validated = true THEN 1 END) as validated_tickets
      FROM ticket_types tt
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id
      WHERE tt.event_id = $1
    `;
    
    const values = [eventId];
    let paramCount = 1;
    
    if (type) {
      paramCount++;
      query += ` AND tt.type = $${paramCount}`;
      values.push(type);
    }
    
    query += `
      GROUP BY tt.id
      ORDER BY tt.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ticket_types WHERE event_id = $1';
    const countValues = [eventId];
    
    if (type) {
      countQuery += ' AND type = $2';
      countValues.push(type);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      ticket_types: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTicketsByEvent(eventId, options = {}) {
    const { page = 1, limit = 20, status, ticket_type_id } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT t.*, tt.name as ticket_type_name, tt.type as ticket_type,
             g.first_name, g.last_name, g.email
      FROM tickets t
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      WHERE eg.event_id = $1
    `;
    
    const values = [eventId];
    let paramCount = 1;
    
    if (status === 'validated') {
      paramCount++;
      query += ` AND t.is_validated = true`;
    } else if (status === 'not_validated') {
      paramCount++;
      query += ` AND t.is_validated = false`;
    }
    
    if (ticket_type_id) {
      paramCount++;
      query += ` AND t.ticket_type_id = $${paramCount}`;
      values.push(ticket_type_id);
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM tickets t WHERE t.event_id = $1';
    const countValues = [eventId];
    let countParamCount = 1;
    
    if (status === 'validated') {
      countParamCount++;
      countQuery += ' AND t.is_validated = true';
    } else if (status === 'not_validated') {
      countParamCount++;
      countQuery += ' AND t.is_validated = false';
    }
    
    if (ticket_type_id) {
      countParamCount++;
      countQuery += ' AND t.ticket_type_id = $2';
      countValues.push(ticket_type_id);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateTicketType(id, updateData, updatedBy) {
    const allowedFields = ['name', 'description', 'type', 'quantity', 'price', 'currency', 'available_from', 'available_to'];
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
      UPDATE ticket_types 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    
    return result.rows[0] || null;
  }

  async deleteTicketType(id) {
    const query = 'DELETE FROM ticket_types WHERE id = $1 RETURNING *';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async validateTicket(ticketId) {
    const query = `
      UPDATE tickets 
      SET is_validated = true, validated_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND is_validated = false
      RETURNING *
    `;
    
    const result = await database.query(query, [ticketId]);
    
    return result.rows[0] || null;
  }

  async validateTicketByCode(ticketCode) {
    const query = `
      UPDATE tickets 
      SET is_validated = true, validated_at = NOW(), updated_at = NOW()
      WHERE ticket_code = $1 AND is_validated = false
      RETURNING *
    `;
    
    const result = await database.query(query, [ticketCode]);
    
    return result.rows[0] || null;
  }

  async getTicketStats(eventId) {
    const query = `
      SELECT 
        COUNT(t.id) as total_tickets,
        COUNT(CASE WHEN t.is_validated = true THEN 1 END) as validated_tickets,
        COUNT(CASE WHEN t.is_validated = false THEN 1 END) as not_validated_tickets,
        SUM(CASE WHEN tt.type = 'paid' THEN t.price ELSE 0 END) as total_revenue,
        COUNT(CASE WHEN tt.type = 'free' THEN 1 END) as free_tickets,
        COUNT(CASE WHEN tt.type = 'paid' THEN 1 END) as paid_tickets,
        COUNT(CASE WHEN tt.type = 'donation' THEN 1 END) as donation_tickets
      FROM tickets t
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id
      WHERE eg.event_id = $1
    `;
    
    const result = await database.query(query, [eventId]);
    
    return result.rows[0];
  }

  async generateTicketCode() {
    const prefix = 'TKT';
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${random}-${timestamp}`;
  }
}

module.exports = new TicketsRepository();
