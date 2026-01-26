const { database } = require('../../config');

class TicketTemplatesRepository {
  async create(templateData) {
    const { 
      name, 
      description, 
      preview_url, 
      source_files_path, 
      is_customizable, 
      created_by 
    } = templateData;
    
    const query = `
      INSERT INTO ticket_templates (
        name, description, preview_url, source_files_path, 
        is_customizable, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    `;
    
    const values = [
      name, description, preview_url, source_files_path,
      is_customizable || false, created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM ticket_templates WHERE id = $1';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, is_customizable, search } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM ticket_templates WHERE 1=1';
    const values = [];
    let paramCount = 0;
    
    if (is_customizable !== undefined) {
      paramCount++;
      query += ` AND is_customizable = $${paramCount}`;
      values.push(is_customizable);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ticket_templates WHERE 1=1';
    const countValues = [];
    let countParamCount = 0;
    
    if (is_customizable !== undefined) {
      countParamCount++;
      countQuery += ` AND is_customizable = $${countParamCount}`;
      countValues.push(is_customizable);
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

  async update(id, updateData, updatedBy) {
    const allowedFields = ['name', 'description', 'preview_url', 'source_files_path', 'is_customizable'];
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
      UPDATE ticket_templates 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    try {
      const result = await database.query(query, values);
      return {
        success: true,
        data: result.rows[0],
        message: 'Ticket template updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update ticket template',
        details: {
          message: error.message,
          id
        }
      };
    }
  }

  async delete(id) {
    const query = 'DELETE FROM ticket_templates WHERE id = $1 RETURNING *';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async getUsageStats(templateId) {
    const query = `
      SELECT 
        COUNT(t.id) as usage_count,
        COUNT(CASE WHEN t.is_validated = true THEN 1 END) as validated_count,
        MIN(t.created_at) as first_used,
        MAX(t.created_at) as last_used
      FROM tickets t
      WHERE t.ticket_template_id = $1
    `;
    
    const result = await database.query(query, [templateId]);
    
    return result.rows[0];
  }

  async getPopularTemplates(limit = 10) {
    const query = `
      SELECT 
        tt.*,
        COUNT(t.id) as usage_count
      FROM ticket_templates tt
      LEFT JOIN tickets t ON tt.id = t.ticket_template_id
      GROUP BY tt.id
      HAVING COUNT(t.id) > 0
      ORDER BY usage_count DESC
      LIMIT $1
    `;
    
    const result = await database.query(query, [limit]);
    
    return result.rows;
  }
}

module.exports = new TicketTemplatesRepository();
