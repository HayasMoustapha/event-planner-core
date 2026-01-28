const database = require('../../config/database');
const authApiService = require('../../services/auth-api-service');

class MarketplaceRepository {
  async createDesigner(designerData) {
    const { user_id, brand_name, portfolio_url, created_by } = designerData;
    
    const query = `
      INSERT INTO designers (user_id, brand_name, portfolio_url, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $4)
      RETURNING *
    `;
    
    const values = [user_id, brand_name, portfolio_url, created_by];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async createTemplate(templateData) {
    const { 
      designer_id, 
      name, 
      description, 
      preview_url, 
      source_files_path, 
      price, 
      currency, 
      created_by 
    } = templateData;
    
    const query = `
      INSERT INTO templates (
        designer_id, name, description, preview_url, source_files_path, 
        price, currency, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;
    
    const values = [
      designer_id, name, description, preview_url, source_files_path,
      price, currency, created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async createPurchase(purchaseData) {
    const { 
      user_id, 
      template_id, 
      amount, 
      currency, 
      transaction_id, 
      created_by 
    } = purchaseData;
    
    const query = `
      INSERT INTO purchases (
        user_id, template_id, amount, currency, transaction_id, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    `;
    
    const values = [
      user_id, template_id, amount, currency, transaction_id, created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async createReview(reviewData) {
    const { 
      user_id, 
      template_id, 
      rating, 
      comment, 
      created_by 
    } = reviewData;
    
    const query = `
      INSERT INTO reviews (
        user_id, template_id, rating, comment, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
    `;
    
    const values = [user_id, template_id, rating, comment, created_by];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findDesignerById(id, token) {
    try {
      // CORRECTION: D'abord récupérer le designer depuis la base locale
      const query = `
        SELECT d.*
        FROM designers d
        WHERE d.id = $1 AND d.deleted_at IS NULL
      `;
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const designer = result.rows[0];
      
      // Enrichir avec les informations utilisateur depuis l'Auth Service
      if (designer.user_id) {
        try {
          const userResponse = await authApiService.getUserById(designer.user_id, token);
          const userData = userResponse.data || userResponse;
          
          return {
            ...designer,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name
          };
        } catch (apiError) {
          console.warn('Failed to fetch user data from Auth Service:', apiError.message);
          // Retourner le designer sans les infos utilisateur
          return designer;
        }
      }
      
      return designer;
      
    } catch (error) {
      console.error('Error in findDesignerById:', error);
      throw new Error(`Failed to find designer: ${error.message}`);
    }
  }

  async findDesignerByUserId(userId, token) {
    try {
      // CORRECTION: D'abord récupérer le designer depuis la base locale
      const query = `
        SELECT d.*
        FROM designers d
        WHERE d.user_id = $1 AND d.deleted_at IS NULL
      `;
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const designer = result.rows[0];
      
      // Enrichir avec les informations utilisateur depuis l'Auth Service
      try {
        const userResponse = await authApiService.getUserById(userId, token);
        const userData = userResponse.data || userResponse;
        
        return {
          ...designer,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name
        };
      } catch (apiError) {
        console.warn('Failed to fetch user data from Auth Service:', apiError.message);
        // Retourner le designer sans les infos utilisateur
        return designer;
      }
      
    } catch (error) {
      console.error('Error in findDesignerByUserId:', error);
      throw new Error(`Failed to find designer by user ID: ${error.message}`);
    }
  }

  async findTemplateById(id) {
    const query = `
      SELECT t.*, d.brand_name, d.user_id as designer_user_id,
             AVG(r.rating) as average_rating,
             COUNT(r.id) as review_count
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      LEFT JOIN reviews r ON t.id = r.template_id
      WHERE t.id = $1 AND t.deleted_at IS NULL
      GROUP BY t.id, d.brand_name, d.user_id
    `;
    const result = await database.query(query, [id]);

    return result.rows[0] || null;
  }

  async getDesigners(options = {}) {
    const { page = 1, limit = 20, is_verified, search } = options;
    const offset = (page - 1) * limit;
    
    // CORRECTION: Supprimer le JOIN avec la table users qui n'existe pas dans cette base de données
    let query = `
      SELECT d.*, COUNT(t.id) as template_count,
             AVG(r.rating) as average_rating
      FROM designers d
      LEFT JOIN templates t ON d.id = t.designer_id
      LEFT JOIN reviews r ON t.id = r.template_id
      WHERE d.deleted_at IS NULL
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (is_verified !== undefined) {
      paramCount++;
      query += ` AND d.is_verified = $${paramCount}`;
      values.push(is_verified);
    }
    
    if (search) {
      paramCount++;
      query += ` AND d.brand_name ILIKE $${paramCount}`;
      values.push(`%${search}%`);
    }
    
    query += `
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM designers d
      WHERE d.deleted_at IS NULL
    `;
    const countValues = [];
    let countParamCount = 0;
    
    if (is_verified !== undefined) {
      countParamCount++;
      countQuery += ` AND d.is_verified = $${countParamCount}`;
      countValues.push(is_verified);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND d.brand_name ILIKE $${countParamCount}`;
      countValues.push(`%${search}%`);
    }
    
    const countResult = await database.query(countQuery, countValues);
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

  async getTemplates(options = {}) {
    const { page = 1, limit = 20, designer_id, status, min_price, max_price, search } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, d.brand_name,
             AVG(r.rating) as average_rating,
             COUNT(r.id) as review_count,
             COUNT(p.id) as purchase_count
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      LEFT JOIN reviews r ON t.id = r.template_id
      LEFT JOIN purchases p ON t.id = p.template_id
      WHERE t.deleted_at IS NULL
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (designer_id) {
      paramCount++;
      query += ` AND t.designer_id = $${paramCount}`;
      values.push(designer_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      values.push(status);
    }
    
    if (min_price) {
      paramCount++;
      query += ` AND t.price >= $${paramCount}`;
      values.push(min_price);
    }
    
    if (max_price) {
      paramCount++;
      query += ` AND t.price <= $${paramCount}`;
      values.push(max_price);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += `
      GROUP BY t.id, d.brand_name
      ORDER BY t.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM templates t WHERE deleted_at IS NULL';
    const countValues = [];
    let countParamCount = 0;

    if (designer_id) {
      countParamCount++;
      countQuery += ` AND designer_id = $${countParamCount}`;
      countValues.push(designer_id);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }

    if (min_price) {
      countParamCount++;
      countQuery += ` AND price >= $${countParamCount}`;
      countValues.push(min_price);
    }

    if (max_price) {
      countParamCount++;
      countQuery += ` AND price <= $${countParamCount}`;
      countValues.push(max_price);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
      countValues.push(`%${search}%`);
    }

    const countResult = await database.query(countQuery, countValues);
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

  async getTemplateReviews(templateId, options = {}, token) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;
      
      // CORRECTION: D'abord récupérer les reviews sans les infos utilisateur
      const query = `
        SELECT r.*
        FROM reviews r
        WHERE r.template_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await database.query(query, [templateId, limit, offset]);
      
      // Récupérer les IDs uniques des utilisateurs concernés
      const userIds = [...new Set(result.rows.map(row => row.user_id).filter(id => id))];
      
      // Récupérer les informations utilisateurs depuis l'Auth Service
      let usersMap = {};
      if (userIds.length > 0) {
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
          console.warn('Failed to fetch user names from Auth Service:', apiError.message);
          // Utiliser des données par défaut si l'API échoue
          userIds.forEach(id => {
            usersMap[id] = {
              first_name: 'Unknown',
              last_name: 'User',
              email: 'unknown@example.com'
            };
          });
        }
      }
      
      // Enrichir les reviews avec les informations utilisateurs
      const enrichedReviews = result.rows.map(review => ({
        ...review,
        first_name: usersMap[review.user_id]?.first_name || 'Unknown',
        last_name: usersMap[review.user_id]?.last_name || 'User',
        email: usersMap[review.user_id]?.email || 'unknown@example.com'
      }));
      
      // Get total count
      const countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE template_id = $1';
      const countResult = await database.query(countQuery, [templateId]);
      const total = parseInt(countResult.rows[0].total);
      
      return {
        reviews: enrichedReviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error in getTemplateReviews:', error);
      throw new Error(`Failed to get template reviews: ${error.message}`);
    }
  }

  async getUserPurchases(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT p.*, t.name as template_name, t.preview_url, d.brand_name
      FROM purchases p
      INNER JOIN templates t ON p.template_id = t.id
      INNER JOIN designers d ON t.designer_id = d.id
      WHERE p.user_id = $1
      ORDER BY p.purchase_date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await database.query(query, [userId, limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM purchases WHERE user_id = $1';
    const countResult = await database.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      purchases: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateDesigner(id, updateData, updatedBy) {
    const allowedFields = ['brand_name', 'portfolio_url', 'is_verified'];
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
      UPDATE designers 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    
    return result.rows[0] || null;
  }

  async updateTemplate(id, updateData, updatedBy) {
    const allowedFields = ['name', 'description', 'preview_url', 'source_files_path', 'price', 'currency', 'status'];
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
      UPDATE templates 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      const result = await database.query(query, values);
      return {
        success: true,
        data: result.rows[0],
        message: 'Template updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update template',
        details: {
          message: error.message,
          id
        }
      };
    }
  }

  /**
   * Get marketplace statistics
   * Includes soft delete filters for accurate counts
   */
  async getMarketplaceStats() {
    const query = `
      SELECT
        COUNT(DISTINCT d.id) FILTER (WHERE d.deleted_at IS NULL) as total_designers,
        COUNT(DISTINCT d.id) FILTER (WHERE d.is_verified = true AND d.deleted_at IS NULL) as verified_designers,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) as total_templates,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved' AND t.deleted_at IS NULL) as approved_templates,
        COUNT(DISTINCT p.id) as total_purchases,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COUNT(DISTINCT r.id) as total_reviews,
        COALESCE(AVG(r.rating), 0) as average_rating
      FROM designers d
      LEFT JOIN templates t ON d.id = t.designer_id
      LEFT JOIN purchases p ON t.id = p.template_id
      LEFT JOIN reviews r ON t.id = r.template_id
    `;

    const result = await database.query(query);

    return result.rows[0] || {};
  }

  /**
   * Get designer by ID (alias for findDesignerById)
   */
  async getDesignerById(designerId) {
    return await this.findDesignerById(designerId);
  }

  /**
   * Get template by ID (alias for findTemplateById)
   */
  async getTemplateById(templateId) {
    return await this.findTemplateById(templateId);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, deletedBy) {
    const query = `
      UPDATE ticket_templates
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW(), updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await database.query(query, [templateId, deletedBy]);
    return result.rows[0] || null;
  }
}

module.exports = new MarketplaceRepository();
