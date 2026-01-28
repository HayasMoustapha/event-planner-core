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
      const usersData = authResponse.data?.data || authResponse.data || [];
      
      // S'assurer que usersData est un tableau
      const users = Array.isArray(usersData) ? usersData : [];
      
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

  async getEventsList(options = {}, token) {
    const { page = 1, limit = 50, status, search } = options;
    const offset = (page - 1) * limit;

    // ARCHITECTURE: No direct users table access - use Auth Service API
    let query = `
      SELECT e.*,
             COUNT(eg.id) as guest_count,
             COUNT(CASE WHEN eg.is_present = true THEN 1 END) as checked_in_count
      FROM events e
      LEFT JOIN event_guests eg ON e.id = eg.event_id
      WHERE e.deleted_at IS NULL
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
      GROUP BY e.id
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    const result = await database.query(query, values);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM events WHERE deleted_at IS NULL';
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

    // Enrich with organizer info from Auth Service
    const organizerIds = [...new Set(result.rows.map(e => e.organizer_id).filter(id => id))];
    let organizersMap = {};

    if (organizerIds.length > 0 && token) {
      try {
        const usersResponse = await authApiService.getUsersBatch(organizerIds, token);
        const users = usersResponse.data?.users || usersResponse.data || [];
        organizersMap = users.reduce((map, user) => {
          map[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
          return map;
        }, {});
      } catch (apiError) {
        console.warn('Failed to fetch organizer names from Auth Service:', apiError.message);
      }
    }

    const enrichedEvents = result.rows.map(event => ({
      ...event,
      organizer_name: organizersMap[event.organizer_id] || 'Unknown User',
      organizer_email: null // Would need separate API call to get email
    }));

    return {
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTemplatesPendingApproval(options = {}, token) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // ARCHITECTURE: No direct users table access - use Auth Service API
    const query = `
      SELECT t.*, d.brand_name, d.user_id as designer_user_id
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      WHERE t.status = 'pending_review' AND t.deleted_at IS NULL
      ORDER BY t.created_at ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await database.query(query, [limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM templates WHERE status = $1 AND deleted_at IS NULL';
    const countResult = await database.query(countQuery, ['pending_review']);
    const total = parseInt(countResult.rows[0].total);

    // Enrich with designer user info from Auth Service
    const userIds = [...new Set(result.rows.map(t => t.designer_user_id).filter(id => id))];
    let usersMap = {};

    if (userIds.length > 0 && token) {
      try {
        const usersResponse = await authApiService.getUsersBatch(userIds, token);
        const users = usersResponse.data?.users || usersResponse.data || [];
        usersMap = users.reduce((map, user) => {
          map[user.id] = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email
          };
          return map;
        }, {});
      } catch (apiError) {
        console.warn('Failed to fetch designer info from Auth Service:', apiError.message);
      }
    }

    const enrichedTemplates = result.rows.map(template => ({
      ...template,
      first_name: usersMap[template.designer_user_id]?.first_name || 'Unknown',
      last_name: usersMap[template.designer_user_id]?.last_name || 'User',
      designer_email: usersMap[template.designer_user_id]?.email || null
    }));

    return {
      templates: enrichedTemplates,
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
   * Note: User count is retrieved from Auth Service API, not local database
   */
  async getDashboardData(userId, token) {
    try {
      // Get local metrics (events, guests, ticket_types) - no users table access
      const localQuery = `
        SELECT
          (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL) as total_events,
          (SELECT COUNT(*) FROM events WHERE status = 'published' AND deleted_at IS NULL) as published_events,
          (SELECT COUNT(*) FROM guests WHERE deleted_at IS NULL) as total_guests,
          (SELECT COALESCE(SUM(price), 0) FROM ticket_types WHERE deleted_at IS NULL) as potential_revenue
      `;

      const localResult = await database.query(localQuery);
      const localMetrics = localResult.rows[0] || {};

      // Get user count from Auth Service API
      let totalUsers = 0;
      try {
        const usersResponse = await authApiService.getAllUsers({ page: 1, limit: 1 }, token);
        totalUsers = usersResponse.data?.pagination?.total || usersResponse.data?.meta?.total || 0;
      } catch (apiError) {
        console.warn('Failed to fetch user count from Auth Service:', apiError.message);
      }

      return {
        total_users: totalUsers,
        ...localMetrics
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get users with pagination and filters
   * ARCHITECTURE: Uses Auth Service API - no direct users table access
   */
  async getUsers(options = {}, token) {
    // Delegate to getUsersList which already uses Auth Service API
    return this.getUsersList(options, token);
  }

  /**
   * Get user by ID
   * ARCHITECTURE: Uses Auth Service API - no direct users table access
   */
  async getUserById(options = {}, token) {
    const { id } = options;

    try {
      // Get user from Auth Service API
      const userResponse = await authApiService.getUserById(id, token);
      const userData = userResponse.data?.data || userResponse.data || null;

      if (!userData) {
        return null;
      }

      // Enrich with local data (events_count, guests_count)
      const eventsQuery = `
        SELECT COUNT(*) as events_count
        FROM events
        WHERE organizer_id = $1 AND deleted_at IS NULL
      `;
      const eventsResult = await database.query(eventsQuery, [id]);

      const guestsQuery = `
        SELECT COUNT(*) as guests_count
        FROM guests
        WHERE created_by = $1 AND deleted_at IS NULL
      `;
      const guestsResult = await database.query(guestsQuery, [id]);

      return {
        ...userData,
        events_count: parseInt(eventsResult.rows[0]?.events_count || 0),
        guests_count: parseInt(guestsResult.rows[0]?.guests_count || 0)
      };
    } catch (error) {
      console.error('Error fetching user from Auth Service:', error.message);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get events with pagination and filters
   * ARCHITECTURE: Uses Auth Service API for organizer info - no direct users table access
   */
  async getEvents(options = {}, token) {
    const { page = 1, limit = 50, status, search } = options;
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

    // Query events without users table JOIN
    const query = `
      SELECT e.*,
             COUNT(DISTINCT g.id) as guests_count,
             COUNT(DISTINCT tt.id) as ticket_types_count
      FROM events e
      LEFT JOIN guests g ON g.event_id = e.id AND g.deleted_at IS NULL
      LEFT JOIN ticket_types tt ON tt.event_id = e.id AND tt.deleted_at IS NULL
      ${whereClause}
      GROUP BY e.id
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

    // Enrich with organizer info from Auth Service
    const organizerIds = [...new Set(result.rows.map(e => e.organizer_id).filter(id => id))];
    let organizersMap = {};

    if (organizerIds.length > 0 && token) {
      try {
        const usersResponse = await authApiService.getUsersBatch(organizerIds, token);
        const users = usersResponse.data?.users || usersResponse.data || [];
        organizersMap = users.reduce((map, user) => {
          map[user.id] = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email
          };
          return map;
        }, {});
      } catch (apiError) {
        console.warn('Failed to fetch organizer info from Auth Service:', apiError.message);
      }
    }

    const enrichedEvents = result.rows.map(event => ({
      ...event,
      organizer_first_name: organizersMap[event.organizer_id]?.first_name || 'Unknown',
      organizer_last_name: organizersMap[event.organizer_id]?.last_name || 'User',
      organizer_email: organizersMap[event.organizer_id]?.email || null
    }));

    return {
      events: enrichedEvents,
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
   * ARCHITECTURE: For users export, uses Auth Service API - no direct users table access
   */
  async exportData(options = {}, token) {
    const { type, format } = options;

    let data, fileName;

    switch (type) {
      case 'users':
        // Export users from Auth Service API
        try {
          const usersResponse = await authApiService.getAllUsers({ page: 1, limit: 10000 }, token);
          const users = usersResponse.data?.data || usersResponse.data || [];
          data = Array.isArray(users) ? users.map(u => ({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role,
            status: u.status,
            created_at: u.created_at,
            updated_at: u.updated_at
          })) : [];
        } catch (apiError) {
          console.error('Failed to export users from Auth Service:', apiError.message);
          data = [];
        }
        fileName = `users_export_${Date.now()}.${format}`;
        break;

      case 'events':
        const eventsQuery = `
          SELECT id, title, description, event_date, location, status, organizer_id, created_at, updated_at
          FROM events
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10000
        `;
        const eventsResult = await database.query(eventsQuery);
        data = eventsResult.rows;
        fileName = `events_export_${Date.now()}.${format}`;
        break;

      case 'logs':
        const logsQuery = `
          SELECT id, level, message, context, created_by, created_at
          FROM system_logs
          ORDER BY created_at DESC
          LIMIT 10000
        `;
        const logsResult = await database.query(logsQuery);
        data = logsResult.rows;
        fileName = `logs_export_${Date.now()}.${format}`;
        break;

      default:
        throw new Error('Invalid export type');
    }

    return {
      data,
      fileName,
      exportedAt: new Date().toISOString(),
      recordCount: data.length
    };
  }

  /**
   * Get system health
   * ARCHITECTURE: Uses Auth Service API for user count - no direct users table access
   */
  async getSystemHealth(options = {}, token) {
    // Local database queries (no users table)
    const localQueries = [
      'SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM guests WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM ticket_types WHERE deleted_at IS NULL',
      'SELECT COUNT(*) as count FROM system_logs WHERE created_at > NOW() - INTERVAL \'1 hour\'',
      'SELECT pg_size_pretty(pg_database_size(current_database())) as db_size'
    ];

    const [
      eventsResult,
      guestsResult,
      ticketTypesResult,
      logsResult,
      dbSizeResult
    ] = await Promise.all(localQueries.map(q => database.query(q)));

    // Get user count from Auth Service
    let totalUsers = 0;
    let authServiceStatus = 'healthy';
    try {
      const usersResponse = await authApiService.getAllUsers({ page: 1, limit: 1 }, token);
      totalUsers = usersResponse.data?.pagination?.total || usersResponse.data?.meta?.total || 0;
    } catch (apiError) {
      console.warn('Failed to fetch user count from Auth Service:', apiError.message);
      authServiceStatus = 'degraded';
    }

    return {
      status: authServiceStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: {
        totalUsers: totalUsers,
        totalEvents: parseInt(eventsResult.rows[0].count),
        totalGuests: parseInt(guestsResult.rows[0].count),
        totalTicketTypes: parseInt(ticketTypesResult.rows[0].count),
        recentLogs: parseInt(logsResult.rows[0].count),
        databaseSize: dbSizeResult.rows[0].db_size
      },
      services: {
        database: 'healthy',
        api: 'healthy',
        authentication: authServiceStatus
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
