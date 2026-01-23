const { database } = require('../../config');

class AdminRepository {
  async getGlobalStats() {
    const query = `
      SELECT 
        -- Events Stats
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM events WHERE status = 'published') as published_events,
        (SELECT COUNT(*) FROM events WHERE status = 'draft') as draft_events,
        (SELECT COUNT(*) FROM events WHERE event_date >= NOW()) as upcoming_events,
        (SELECT COUNT(*) FROM events WHERE event_date < NOW()) as past_events,
        
        -- Guests Stats
        (SELECT COUNT(*) FROM guests) as total_guests,
        (SELECT COUNT(*) FROM guests WHERE status = 'confirmed') as confirmed_guests,
        (SELECT COUNT(*) FROM event_guests WHERE is_present = true) as checked_in_guests,
        
        -- Tickets Stats
        (SELECT COUNT(*) FROM tickets) as total_tickets,
        (SELECT COUNT(*) FROM tickets WHERE is_validated = true) as validated_tickets,
        COALESCE((SELECT SUM(t.price) FROM tickets t INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id WHERE tt.type = 'paid'), 0) as total_revenue,
        
        -- Marketplace Stats
        (SELECT COUNT(*) FROM designers) as total_designers,
        (SELECT COUNT(*) FROM designers WHERE is_verified = true) as verified_designers,
        (SELECT COUNT(*) FROM templates WHERE status = 'approved') as approved_templates,
        (SELECT COUNT(*) FROM templates WHERE status = 'pending_review') as pending_templates,
        (SELECT COUNT(*) FROM purchases) as total_purchases,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        COALESCE((SELECT AVG(rating) FROM reviews), 0) as average_rating
    `;
    
    const result = await database.query(query);
    return result.rows[0];
  }

  async getRecentActivity(limit = 50) {
    const query = `
      SELECT 
        'event_created' as activity_type,
        e.title as description,
        e.created_at as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        e.id as entity_id
      FROM events e
      INNER JOIN users u ON e.organizer_id = u.id
      
      UNION ALL
      
      SELECT 
        'event_published' as activity_type,
        'Event published: ' || e.title as description,
        e.updated_at as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        e.id as entity_id
      FROM events e
      INNER JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'published'
      
      UNION ALL
      
      SELECT 
        'guest_added' as activity_type,
        'Guest added to event' as description,
        eg.created_at as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        eg.id as entity_id
      FROM event_guests eg
      INNER JOIN users u ON eg.created_by = u.id
      
      UNION ALL
      
      SELECT 
        'ticket_generated' as activity_type,
        'Ticket generated' as description,
        t.created_at as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        t.id as entity_id
      FROM tickets t
      INNER JOIN users u ON t.created_by = u.id
      
      UNION ALL
      
      SELECT 
        'template_created' as activity_type,
        'Template created: ' || t.name as description,
        t.created_at as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        t.id as entity_id
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      INNER JOIN users u ON d.user_id = u.id
      
      UNION ALL
      
      SELECT 
        'purchase_made' as activity_type,
        'Template purchased' as description,
        p.purchase_date as timestamp,
        u.first_name || ' ' || u.last_name as user_name,
        p.id as entity_id
      FROM purchases p
      INNER JOIN users u ON p.user_id = u.id
      
      ORDER BY timestamp DESC
      LIMIT $1
    `;
    
    const result = await database.query(query, [limit]);
    return result.rows;
  }

  async getSystemLogs(options = {}) {
    const { page = 1, limit = 50, level, start_date, end_date } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const values = [];
    let paramCount = 0;
    
    if (level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      values.push(level);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(end_date);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM system_logs WHERE 1=1';
    const countValues = [];
    let countParamCount = 0;
    
    if (level) {
      countParamCount++;
      countQuery += ` AND level = $${countParamCount}`;
      countValues.push(level);
    }
    
    if (start_date) {
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countValues.push(start_date);
    }
    
    if (end_date) {
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countValues.push(end_date);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUsersList(options = {}) {
    const { page = 1, limit = 50, search, status } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.created_at,
             COUNT(DISTINCT e.id) as events_count,
             COUNT(DISTINCT d.id) as designer_profile
      FROM users u
      LEFT JOIN events e ON u.id = e.organizer_id
      LEFT JOIN designers d ON u.id = d.user_id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    if (status) {
      paramCount++;
      query += ` AND u.status = $${paramCount}`;
      values.push(status);
    }
    
    query += `
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.status, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countValues = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
      countValues.push(`%${search}%`);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getEventsList(options = {}) {
    const { page = 1, limit = 50, status, search } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT e.*, 
             u.first_name || ' ' || u.last_name as organizer_name,
             u.email as organizer_email,
             COUNT(eg.id) as guest_count,
             COUNT(CASE WHEN eg.is_present = true THEN 1 END) as checked_in_count
      FROM events e
      INNER JOIN users u ON e.organizer_id = u.id
      LEFT JOIN event_guests eg ON e.id = eg.event_id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      values.push(status);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (e.title ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += `
      GROUP BY e.id, u.first_name, u.last_name, u.email
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE 1=1';
    const countValues = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (title ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
      countValues.push(`%${search}%`);
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

  async getTemplatesPendingApproval(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT t.*, d.brand_name, d.user_id as designer_user_id,
             u.first_name, u.last_name, u.email as designer_email
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      INNER JOIN users u ON d.user_id = u.id
      WHERE t.status = 'pending_review'
      ORDER BY t.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await database.query(query, [limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM templates WHERE status = $1';
    const countResult = await database.query(countQuery, ['pending_review']);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      templates: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getDesignersPendingVerification(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT d.*, u.first_name, u.last_name, u.email
      FROM designers d
      INNER JOIN users u ON d.user_id = u.id
      WHERE d.is_verified = false
      ORDER BY d.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await database.query(query, [limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM designers WHERE is_verified = $1';
    const countResult = await database.query(countQuery, [false]);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      designers: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createSystemLog(logData) {
    const { level, message, context, created_by } = logData;
    
    const query = `
      INSERT INTO system_logs (level, message, context, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [level, message, JSON.stringify(context), created_by];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async updateUserStatus(userId, status, updatedBy) {
    const query = `
      UPDATE users 
      SET status = $2, updated_by = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await database.query(query, [userId, status, updatedBy]);
    return result.rows[0] || null;
  }

  async getRevenueStats(period = 'month') {
    let query;
    let dateFormat;
    
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }
    
    query = `
      SELECT 
        TO_CHAR(purchase_date, '${dateFormat}') as period,
        COUNT(*) as purchase_count,
        SUM(amount) as revenue
      FROM purchases
      WHERE purchase_date >= NOW() - INTERVAL '1 year'
      GROUP BY TO_CHAR(purchase_date, '${dateFormat}')
      ORDER BY period DESC
      LIMIT 12
    `;
    
    const result = await database.query(query);
    return result.rows;
  }

  async getEventGrowthStats(period = 'month') {
    let dateFormat;
    
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM';
    }
    
    const query = `
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*) as events_created,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as events_published
      FROM events
      WHERE created_at >= NOW() - INTERVAL '1 year'
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period DESC
      LIMIT 12
    `;
    
    const result = await database.query(query);
    return result.rows;
  }
}

module.exports = new AdminRepository();
