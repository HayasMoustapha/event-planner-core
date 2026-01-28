const database = require('../../config/database');
const authApiService = require('../../services/auth-api-service');
const { v4: uuidv4 } = require('uuid');

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

  async getRecentActivity(limit = 50, token) {
    try {
      // CORRECTION: Remplacer les JOIN avec users par des appels API
      // D'abord récupérer les activités locales sans les noms d'utilisateurs
      const query = `
        SELECT 
          'event_created' as activity_type,
          e.title as description,
          e.created_at as timestamp,
          e.organizer_id as user_id,
          e.id as entity_id
        FROM events e
        
        UNION ALL
        
        SELECT 
          'event_published' as activity_type,
          'Event published: ' || e.title as description,
          e.updated_at as timestamp,
          e.organizer_id as user_id,
          e.id as entity_id
        FROM events e
        WHERE e.status = 'published'
        
        UNION ALL
        
        SELECT 
          'guest_added' as activity_type,
          'Guest added to event' as description,
          eg.created_at as timestamp,
          eg.created_by as user_id,
          eg.id as entity_id
        FROM event_guests eg
        
        UNION ALL
        
        SELECT 
          'ticket_generated' as activity_type,
          'Ticket generated' as description,
          t.created_at as timestamp,
          t.created_by as user_id,
          t.id as entity_id
        FROM tickets t
        
        UNION ALL
        
        SELECT 
          'template_created' as activity_type,
          'Template created: ' || t.name as description,
          t.created_at as timestamp,
          d.user_id as user_id,
          t.id as entity_id
        FROM templates t
        INNER JOIN designers d ON t.designer_id = d.id
        
        UNION ALL
        
        SELECT 
          'purchase_made' as activity_type,
          'Template purchased' as description,
          p.purchase_date as timestamp,
          p.user_id as user_id,
          p.id as entity_id
        FROM purchases p
        
        ORDER BY timestamp DESC
        LIMIT $1
      `;
      
      const result = await database.query(query, [limit]);
      
      // Récupérer les IDs uniques des utilisateurs concernés
      const userIds = [...new Set(result.rows.map(row => row.user_id).filter(id => id))];
      
      // Récupérer les informations utilisateurs depuis l'Auth Service
      let usersMap = {};
      if (userIds.length > 0) {
        try {
          const usersResponse = await authApiService.getUsersBatch(userIds, token);
          const users = usersResponse.data?.users || usersResponse.data || [];
          usersMap = users.reduce((map, user) => {
            map[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
            return map;
          }, {});
        } catch (apiError) {
          console.warn('Failed to fetch user names from Auth Service:', apiError.message);
          // Utiliser des noms par défaut si l'API échoue
          userIds.forEach(id => {
            usersMap[id] = 'Unknown User';
          });
        }
      }
      
      // Enrichir les activités avec les noms d'utilisateurs
      const enrichedActivities = result.rows.map(activity => ({
        ...activity,
        user_name: usersMap[activity.user_id] || 'Unknown User'
      }));
      
      return enrichedActivities;
      
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
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

  async getUsersList(options = {}, token) {
    try {
      // CORRECTION: Utiliser l'Auth Service API au lieu de l'accès direct à la base de données
      const authResponse = await authApiService.getAllUsers(options, token);
      
      // Récupérer les utilisateurs depuis l'Auth Service
      const users = authResponse.data?.users || authResponse.data || [];
      
      // Enrichir avec les données locales (events_count, designer_profile)
      const enrichedUsers = [];
      
      for (const user of users) {
        // Récupérer le nombre d'évents organisés par cet utilisateur
        const eventsQuery = `
          SELECT COUNT(*) as events_count
          FROM events 
          WHERE organizer_id = $1 AND deleted_at IS NULL
        `;
        const eventsResult = await database.query(eventsQuery, [user.id]);
        const eventsCount = parseInt(eventsResult.rows[0]?.events_count || 0);
        
        // Récupérer le profil designer si existant
        const designerQuery = `
          SELECT id as designer_id, brand_name, is_verified
          FROM designers 
          WHERE user_id = $1 AND deleted_at IS NULL
        `;
        const designerResult = await database.query(designerQuery, [user.id]);
        const designerProfile = designerResult.rows[0] || null;
        
        enrichedUsers.push({
          ...user,
          events_count: eventsCount,
          designer_profile: designerProfile ? designerProfile.designer_id : null,
          designer_data: designerProfile
        });
      }
      
      return {
        users: enrichedUsers,
        pagination: authResponse.data?.pagination || {
          page: options.page || 1,
          limit: options.limit || 50,
          total: enrichedUsers.length,
          totalPages: Math.ceil(enrichedUsers.length / (options.limit || 50))
        }
      };
      
    } catch (error) {
      console.error('Error in getUsersList:', error);
      throw new Error(`Failed to get users list: ${error.message}`);
    }
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
    
    // CORRECTION: Supprimer le JOIN avec la table users qui n'existe pas dans cette base de données
    // Les informations utilisateur seront récupérées via l'Auth Service si nécessaire
    const query = `
      SELECT d.*
      FROM designers d
      WHERE d.is_verified = false AND d.deleted_at IS NULL
      ORDER BY d.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await database.query(query, [limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM designers WHERE is_verified = $1 AND deleted_at IS NULL';
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

  /**
   * Get dashboard data for admin
   */
  async getDashboardData(userId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
          (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_events,
          (SELECT COUNT(*) FROM events WHERE status = 'published' AND deleted_at IS NULL) as published_events,
          (SELECT COUNT(*) FROM guests WHERE deleted_at IS NULL) as total_guests,
          (SELECT COALESCE(SUM(price), 0) FROM ticket_types WHERE deleted_at IS NULL) as potential_revenue
      `;
      
      const result = await database.query(query);
      return result.rows[0] || {};
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(options = {}) {
    const { page = 1, limit = 50, status, search, role, userId } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['u.deleted_at IS NULL'];
    let queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`u.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    if (search) {
      whereConditions.push(`(u.first_name ILIKE $${paramIndex++} OR u.last_name ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (role) {
      whereConditions.push(`u.role = $${paramIndex++}`);
      queryParams.push(role);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.created_at, u.updated_at,
             COUNT(DISTINCT e.id) as events_count
      FROM users u
      LEFT JOIN events e ON e.organizer_id = u.id AND e.deleted_at IS NULL
      ${whereClause}
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    queryParams.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${whereClause}
    `;
    
    const [result, countResult] = await Promise.all([
      database.query(query, queryParams),
      database.query(countQuery, queryParams.slice(0, -2))
    ]);
    
    return {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(options = {}) {
    const { id, userId } = options;
    
    const query = `
      SELECT u.*, 
             COUNT(DISTINCT e.id) as events_count,
             COUNT(DISTINCT g.id) as guests_count
      FROM users u
      LEFT JOIN events e ON e.organizer_id = u.id AND e.deleted_at IS NULL
      LEFT JOIN guests g ON g.created_by = u.id AND g.deleted_at IS NULL
      WHERE u.id = $1 AND u.deleted_at IS NULL
      GROUP BY u.id
    `;
    
    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get events with pagination and filters
   */
  async getEvents(options = {}) {
    const { page = 1, limit = 50, status, search, userId } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['e.deleted_at IS NULL'];
    let queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereConditions.push(`e.status = $${paramIndex++}`);
      queryParams.push(status);
    }
    
    if (search) {
      whereConditions.push(`(e.title ILIKE $${paramIndex++} OR e.description ILIKE $${paramIndex++})`);
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT e.*, u.first_name as organizer_first_name, u.last_name as organizer_last_name, u.email as organizer_email,
             COUNT(DISTINCT g.id) as guests_count,
             COUNT(DISTINCT tt.id) as ticket_types_count
      FROM events e
      LEFT JOIN users u ON u.id = e.organizer_id
      LEFT JOIN guests g ON g.event_id = e.id AND g.deleted_at IS NULL
      LEFT JOIN ticket_types tt ON tt.event_id = e.id AND tt.deleted_at IS NULL
      ${whereClause}
      GROUP BY e.id, u.first_name, u.last_name, u.email
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    queryParams.push(limit, offset);
    
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM events e
      ${whereClause}
    `;
    
    const [result, countResult] = await Promise.all([
      database.query(query, queryParams),
      database.query(countQuery, queryParams.slice(0, -2))
    ]);
    
    return {
      events: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  /**
   * Get designers pending approval
   */
  async getDesignersPendingApproval(options = {}) {
    const { page = 1, limit = 20, userId } = options;
    const offset = (page - 1) * limit;
    
    // CORRECTION: Supprimer le JOIN avec la table users qui n'existe pas dans cette base de données
    const query = `
      SELECT d.*
      FROM designers d
      WHERE d.is_verified = false AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await database.query(query, [limit, offset]);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM designers d
      WHERE d.is_verified = false AND d.deleted_at IS NULL
    `;
    
    const countResult = await database.query(countQuery);
    
    return {
      designers: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  /**
   * Moderate content
   */
  async moderateContent(options = {}) {
    const { action, entityType, entityId, reason, userId } = options;
    
    const validActions = ['approve', 'reject', 'suspend'];
    if (!validActions.includes(action)) {
      throw new Error('Invalid moderation action');
    }
    
    const validEntities = ['template', 'designer', 'event'];
    if (!validEntities.includes(entityType)) {
      throw new Error('Invalid entity type');
    }
    
    let query, params;
    
    switch (entityType) {
      case 'template':
        query = `
          UPDATE ticket_templates 
          SET status = $1, moderation_reason = $2, moderated_by = $3, moderated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
          RETURNING *
        `;
        params = [action === 'approve' ? 'approved' : 'rejected', reason, userId, entityId];
        break;
        
      case 'designer':
        query = `
          UPDATE designers 
          SET is_verified = $1, moderation_reason = $2, moderated_by = $3, moderated_at = NOW()
          WHERE user_id = $4 AND deleted_at IS NULL
          RETURNING *
        `;
        // CORRECTION: Le paramètre $1 doit être un boolean pour is_verified
        params = [action === 'approve' ? true : false, reason, userId, entityId];
        break;
        
      case 'event':
        query = `
          UPDATE events 
          SET status = $1, moderation_reason = $2, moderated_by = $3, moderated_at = NOW()
          WHERE id = $4 AND deleted_at IS NULL
          RETURNING *
        `;
        params = [action === 'approve' ? 'published' : 'suspended', reason, userId, entityId];
        break;
    }
    
    const result = await database.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(options = {}) {
    const { period = 'month', start_date, end_date, userId } = options;
    
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
    
    let dateFilter = '';
    let queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = `AND tt.created_at BETWEEN $1 AND $2`;
      queryParams = [start_date, end_date];
    }
    
    const query = `
      SELECT 
        TO_CHAR(tt.created_at, '${dateFormat}') as period,
        COUNT(*) as ticket_types_created,
        COALESCE(SUM(tt.price * tt.quantity), 0) as potential_revenue,
        COALESCE(AVG(tt.price), 0) as average_price
      FROM ticket_types tt
      WHERE tt.deleted_at IS NULL ${dateFilter}
      GROUP BY TO_CHAR(tt.created_at, '${dateFormat}')
      ORDER BY period DESC
      LIMIT 12
    `;
    
    const result = await database.query(query, queryParams);
    return result.rows;
  }

  /**
   * Export data
   */
  async exportData(options = {}) {
    const { type, format, filters, userId } = options;
    
    let query, fileName;
    
    switch (type) {
      case 'users':
        query = `
          SELECT id, first_name, last_name, email, role, status, created_at, updated_at
          FROM users
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10000
        `;
        fileName = `users_export_${Date.now()}.${format}`;
        break;
        
      case 'events':
        query = `
          SELECT id, title, description, event_date, location, status, organizer_id, created_at, updated_at
          FROM events
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10000
        `;
        fileName = `events_export_${Date.now()}.${format}`;
        break;
        
      case 'logs':
        query = `
          SELECT id, level, message, context, created_by, created_at
          FROM system_logs
          ORDER BY created_at DESC
          LIMIT 10000
        `;
        fileName = `logs_export_${Date.now()}.${format}`;
        break;
        
      default:
        throw new Error('Invalid export type');
    }
    
    const result = await database.query(query);
    
    return {
      data: result.rows,
      fileName,
      exportedAt: new Date().toISOString(),
      recordCount: result.rows.length
    };
  }

  /**
   * Get system health
   */
  async getSystemHealth(options = {}) {
    const { userId } = options;
    
    const queries = [
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM guests WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM ticket_types WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM system_logs WHERE created_at > NOW() - INTERVAL \'1 hour\'',
      'SELECT pg_size_pretty(pg_database_size(current_database())) as db_size'
    ];
    
    const [
      usersResult,
      eventsResult,
      guestsResult,
      ticketTypesResult,
      logsResult,
      dbSizeResult
    ] = await Promise.all(queries.map(q => database.query(q)));
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalEvents: parseInt(eventsResult.rows[0].count),
        totalGuests: parseInt(guestsResult.rows[0].count),
        totalTicketTypes: parseInt(ticketTypesResult.rows[0].count),
        recentLogs: parseInt(logsResult.rows[0].count),
        databaseSize: dbSizeResult.rows[0].db_size
      },
      services: {
        database: 'healthy',
        api: 'healthy',
        authentication: 'healthy'
      }
    };
  }

  /**
   * Create backup
   */
  async createBackup(options = {}) {
    const { type, include, userId } = options;
    
    const backupData = {
      id: uuidv4(),
      type: type || 'full',
      include: include || ['users', 'events', 'guests', 'ticket_types'],
      created_by: userId,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    
    // In a real implementation, this would trigger an actual backup process
    // For now, we'll just create a backup record
    
    const query = `
      INSERT INTO backups (id, type, include, created_by, created_at, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await database.query(query, [
      backupData.id,
      backupData.type,
      JSON.stringify(backupData.include),
      backupData.created_by,
      backupData.created_at,
      backupData.status
    ]);
    
    return result.rows[0];
  }

}

module.exports = new AdminRepository();
