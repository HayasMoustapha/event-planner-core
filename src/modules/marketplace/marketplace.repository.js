const { database } = require('../../config');

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

  async findDesignerById(id) {
    const query = `
      SELECT d.*, u.email, u.first_name, u.last_name
      FROM designers d
      INNER JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findDesignerByUserId(userId) {
    const query = `
      SELECT d.*, u.email, u.first_name, u.last_name
      FROM designers d
      INNER JOIN users u ON d.user_id = u.id
      WHERE d.user_id = $1
    `;
    const result = await database.query(query, [userId]);
    
    return result.rows[0] || null;
  }

  async findTemplateById(id) {
    const query = `
      SELECT t.*, d.brand_name, d.user_id as designer_user_id,
             AVG(r.rating) as average_rating,
             COUNT(r.id) as review_count
      FROM templates t
      INNER JOIN designers d ON t.designer_id = d.id
      LEFT JOIN reviews r ON t.id = r.template_id
      WHERE t.id = $1
      GROUP BY t.id, d.brand_name, d.user_id
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async getDesigners(options = {}) {
    const { page = 1, limit = 20, is_verified, search } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT d.*, u.email, u.first_name, u.last_name,
             COUNT(t.id) as template_count,
             AVG(r.rating) as average_rating
      FROM designers d
      INNER JOIN users u ON d.user_id = u.id
      LEFT JOIN templates t ON d.id = t.designer_id
      LEFT JOIN reviews r ON t.id = r.template_id
      WHERE 1=1
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
      query += ` AND (d.brand_name ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += `
      GROUP BY d.id, u.email, u.first_name, u.last_name
      ORDER BY d.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM designers d
      INNER JOIN users u ON d.user_id = u.id
      WHERE 1=1
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
      countQuery += ` AND (d.brand_name ILIKE $${countParamCount} OR u.first_name ILIKE $${countParamCount} OR u.last_name ILIKE $${countParamCount})`;
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
      WHERE 1=1
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
    let countQuery = 'SELECT COUNT(*) as total FROM templates t WHERE 1=1';
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

  async getTemplateReviews(templateId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT r.*, u.first_name, u.last_name, u.email
      FROM reviews r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.template_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await database.query(query, [templateId, limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE template_id = $1';
    const countResult = await database.query(countQuery, [templateId]);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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
      throw new Error('No valid fields to update');
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
      throw new Error('No valid fields to update');
    }
    
    values.push(updatedBy, updatedBy, id);
    
    const query = `
      UPDATE templates 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    
    return result.rows[0] || null;
  }

  async getMarketplaceStats() {
    const query = `
      SELECT 
        COUNT(DISTINCT d.id) as total_designers,
        COUNT(DISTINCT d.id) FILTER (WHERE d.is_verified = true) as verified_designers,
        COUNT(DISTINCT t.id) as total_templates,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved') as approved_templates,
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
    
    return result.rows[0];
  }
}

module.exports = new MarketplaceRepository();
