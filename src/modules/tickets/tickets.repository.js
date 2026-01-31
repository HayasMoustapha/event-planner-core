const { database } = require('../../config');

class TicketsRepository {
  async createTicketType(ticketTypeData) {
    const { 
      event_id, 
      name, 
      description, 
      type, 
      quantity, 
      available_from, 
      available_to, 
      organizer_id  // Utiliser organizer_id injecté au lieu de created_by
    } = ticketTypeData;
    
    const query = `
      INSERT INTO ticket_types (
        event_id, name, description, type, quantity, 
        available_from, available_to, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;
    
    const values = [
      event_id, name, description, type, quantity, 
      available_from, available_to, organizer_id  // organizer_id comme created_by
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
      ticket_code, 
      qr_code_data || null, 
      ticket_type_id, 
      ticket_template_id || null, // Convertir undefined en NULL
      event_guest_id, 
      price, 
      currency, 
      created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findTicketTypeById(id) {
    const query = `
      SELECT tt.*, e.title as event_title, e.organizer_id
      FROM ticket_types tt
      INNER JOIN events e ON tt.event_id = e.id AND e.deleted_at IS NULL
      WHERE tt.id = $1 AND tt.deleted_at IS NULL
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findTicketTemplateById(id) {
    const query = `
      SELECT * FROM ticket_templates 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async getJobsByEventId(eventId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['event_id = $1'];
    let queryParams = [eventId];

    if (status) {
      whereConditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        id, status, details, created_at, updated_at, 
        started_at, completed_at, error_message, created_by
      FROM ticket_generation_jobs 
      WHERE ${whereClause} AND deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(limit, offset);
    const result = await database.query(query, queryParams);

    // Compter le total pour pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM ticket_generation_jobs 
      WHERE ${whereClause} AND deleted_at IS NULL
    `;
    const countParams = [eventId];
    if (status) {
      countParams.push(status);
    }
    
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      jobs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findTicketById(id) {
    const query = `
      SELECT t.*, tt.name as ticket_type_name, tt.type as ticket_type,
             eg.event_id, eg.guest_id, g.first_name, g.last_name, g.email,
             e.title as event_title, e.organizer_id
      FROM tickets t
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id AND tt.deleted_at IS NULL
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id AND eg.deleted_at IS NULL
      INNER JOIN guests g ON eg.guest_id = g.id AND g.deleted_at IS NULL
      INNER JOIN events e ON eg.event_id = e.id AND e.deleted_at IS NULL
      WHERE t.id = $1 AND t.deleted_at IS NULL
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
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id AND tt.deleted_at IS NULL
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id AND eg.deleted_at IS NULL
      INNER JOIN guests g ON eg.guest_id = g.id AND g.deleted_at IS NULL
      INNER JOIN events e ON eg.event_id = e.id AND e.deleted_at IS NULL
      WHERE t.ticket_code = $1 AND t.deleted_at IS NULL
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
      LEFT JOIN tickets t ON tt.id = t.ticket_type_id AND t.deleted_at IS NULL
      WHERE tt.event_id = $1 AND tt.deleted_at IS NULL
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
    let countQuery = 'SELECT COUNT(*) as total FROM ticket_types WHERE event_id = $1 AND deleted_at IS NULL';
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
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id AND tt.deleted_at IS NULL
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id AND eg.deleted_at IS NULL
      INNER JOIN guests g ON eg.guest_id = g.id AND g.deleted_at IS NULL
      WHERE eg.event_id = $1 AND t.deleted_at IS NULL
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
    let countQuery = 'SELECT COUNT(*) as total FROM tickets t INNER JOIN event_guests eg ON t.event_guest_id = eg.id WHERE eg.event_id = $1 AND t.deleted_at IS NULL';
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
      UPDATE ticket_types 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      const result = await database.query(query, values);
      return {
        success: true,
        data: result.rows[0],
        message: 'Ticket type updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update ticket type',
        details: {
          message: error.message,
          id
        }
      };
    }
  }

  async deleteTicketType(id, deletedBy) {
    const query = `
      UPDATE ticket_types
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await database.query(query, [id, deletedBy]);
    
    return result.rows[0] || null;
  }

  async createTicket(ticketData) {
    const { 
      ticket_code, 
      qr_code_data, 
      ticket_type_id, 
      event_guest_id, 
      price, 
      currency, 
      created_by 
    } = ticketData;
    
    const query = `
      INSERT INTO tickets (
        ticket_code, qr_code_data, ticket_type_id, event_guest_id, 
        price, currency, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *
    `;
    
    const values = [
      ticket_code, qr_code_data, ticket_type_id, event_guest_id,
      price, currency, created_by
    ];
    
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async updateTicketQRCode(ticketId, qrCodeData) {
    const query = `
      UPDATE tickets 
      SET qr_code_data = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await database.query(query, [qrCodeData, ticketId]);
    
    return result.rows[0] || null;
  }

  async findTicketWithEvent(ticketId) {
    const query = `
      SELECT t.*, eg.event_id
      FROM tickets t
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id AND eg.deleted_at IS NULL
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    
    const result = await database.query(query, [ticketId]);
    
    return result.rows[0] || null;
  }

  async bulkCreate(ticketsData) {
    if (!ticketsData || ticketsData.length === 0) {
      return [];
    }

    const values = ticketsData.map((ticket, index) => {
      const baseIndex = index * 8;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`;
    }).join(', ');

    const flatTickets = ticketsData.flatMap(ticket => [
      ticket.ticket_code || `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticket.qr_code_data || `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticket.ticket_type_id,
      ticket.event_guest_id || null,
      ticket.price || 0,
      ticket.currency || 'EUR',
      ticket.created_by,
      ticket.updated_by || ticket.created_by
    ]);

    const query = `
      INSERT INTO tickets (ticket_code, qr_code_data, ticket_type_id, event_guest_id, price, currency, created_by, updated_by)
      VALUES ${values}
      RETURNING *
    `;

    const result = await database.query(query, flatTickets);
    return result.rows;
  }

  async getEventStats(eventId) {
    const query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN t.is_validated = true THEN 1 END) as validated_tickets,
        COUNT(CASE WHEN t.is_validated = false THEN 1 END) as pending_tickets,
        SUM(t.price) as total_revenue
      FROM tickets t
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id
      INNER JOIN guests g ON eg.guest_id = g.id
      WHERE eg.event_id = $1 AND t.deleted_at IS NULL AND eg.deleted_at IS NULL
    `;
    
    const result = await database.query(query, [eventId]);
    return result.rows[0] || {
      total_tickets: 0,
      validated_tickets: 0,
      pending_tickets: 0,
      total_revenue: 0
    };
  }

  async validateTicket(ticketId) {
    const query = `
      UPDATE tickets 
      SET is_validated = true, validated_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND is_validated = false AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await database.query(query, [ticketId]);
    
    return result.rows[0] || null;
  }

  async validateTicketByCode(ticketCode) {
    const query = `
      UPDATE tickets 
      SET is_validated = true, validated_at = NOW(), updated_at = NOW()
      WHERE ticket_code = $1 AND is_validated = false AND deleted_at IS NULL
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
      INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id AND tt.deleted_at IS NULL
      INNER JOIN event_guests eg ON t.event_guest_id = eg.id AND eg.deleted_at IS NULL
      WHERE eg.event_id = $1 AND t.deleted_at IS NULL
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

  /**
   * Get ticket type by ID (alias for findTicketTypeById)
   */
  async getTicketTypeById(ticketTypeId) {
    return await this.findTicketTypeById(ticketTypeId);
  }

  /**
   * Get tickets with pagination and filters
   */
  async getTickets(options = {}) {
    const { page = 1, limit = 10, status, event_id, userId } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['t.deleted_at IS NULL'];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`t.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (event_id) {
      whereConditions.push(`t.event_id = $${paramIndex++}`);
      queryParams.push(event_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT t.*, tt.name as ticket_type_name, tt.type as ticket_type,
             eg.event_id, eg.guest_id, g.first_name, g.last_name, g.email,
             e.title as event_title, e.organizer_id
      FROM tickets t
      LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.id
      LEFT JOIN event_guests eg ON t.event_guest_id = eg.id
      LEFT JOIN guests g ON eg.guest_id = g.id
      LEFT JOIN events e ON eg.event_id = e.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limit, offset);

    const result = await database.query(query, queryParams);
    return result.rows;
  }

  /**
   * Find ticket by code (alias for findTicketByCode)
   */
  async findByCode(ticketCode) {
    return await this.findTicketByCode(ticketCode);
  }

  /**
   * Find tickets by event ID (alias for getTicketsByEvent)
   */
  async findByEventId(eventId, options = {}) {
    return await this.getTicketsByEvent(eventId, options);
  }

  /**
   * Find ticket types by event ID (alias for getTicketTypesByEvent)
   */
  async findTicketTypesByEventId(eventId, options = {}) {
    return await this.getTicketTypesByEvent(eventId, options);
  }

  /**
   * Find ticket by ID (alias for findTicketById)
   */
  async findById(ticketId) {
    return await this.findTicketById(ticketId);
  }

  /**
   * Update ticket
   */
  async update(ticketId, updateData) {
    const allowedFields = ['status', 'validated_at', 'validated_by', 'qr_code_data'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(ticketId);

    const query = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  async findTicketTypesByEventId(eventId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT tt.*, e.title as event_title
      FROM ticket_types tt
      INNER JOIN events e ON tt.event_id = e.id AND e.deleted_at IS NULL
      WHERE tt.event_id = $1 AND tt.deleted_at IS NULL
      ORDER BY tt.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await database.query(query, [eventId, limit, offset]);
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ticket_types tt
      WHERE tt.event_id = $1 AND tt.deleted_at IS NULL
    `;
    
    const countResult = await database.query(countQuery, [eventId]);
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

  async createJob(jobData) {
    const { 
      event_id, 
      status = 'pending', 
      details = {}, 
      created_by 
    } = jobData;
    
    const query = `
      INSERT INTO ticket_generation_jobs (
        event_id, status, details, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $4)
      RETURNING *
    `;
    
    const values = [event_id, status, details, created_by];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async getJobById(jobId) {
    const query = `
      SELECT * FROM ticket_generation_jobs 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await database.query(query, [jobId]);
    return result.rows[0];
  }

  async updateJobStatus(jobId, status, additionalData = {}) {
    const updateFields = ['status = $2', 'updated_at = NOW()'];
    const values = [jobId, status];
    let paramIndex = 3;

    if (status === 'processing') {
      updateFields.push(`started_at = NOW()`);
    } else if (status === 'completed') {
      updateFields.push(`completed_at = NOW()`);
    } else if (status === 'failed') {
      updateFields.push(`error_message = $${paramIndex}`);
      values.push(additionalData.error_message || 'Unknown error');
      paramIndex++;
    }

    const query = `
      UPDATE ticket_generation_jobs 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }
}

module.exports = new TicketsRepository();
