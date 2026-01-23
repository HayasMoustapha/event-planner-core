const { database } = require('../../config');

class TicketGenerationJobsRepository {
  async create(jobData) {
    const { 
      event_id, 
      status, 
      details, 
      created_by 
    } = jobData;
    
    const query = `
      INSERT INTO ticket_generation_jobs (
        event_id, status, details, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $4)
      RETURNING *
    `;
    
    const values = [
      event_id, 
      status || 'pending', 
      JSON.stringify(details || {}), 
      created_by
    ];
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async findById(id) {
    const query = `
      SELECT tgj.*, e.title as event_title, e.organizer_id
      FROM ticket_generation_jobs tgj
      INNER JOIN events e ON tgj.event_id = e.id
      WHERE tgj.id = $1
    `;
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async findByEventId(eventId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT tgj.*, e.title as event_title
      FROM ticket_generation_jobs tgj
      INNER JOIN events e ON tgj.event_id = e.id
      WHERE tgj.event_id = $1
    `;
    
    const values = [eventId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      query += ` AND tgj.status = $${paramCount}`;
      values.push(status);
    }
    
    query += ` ORDER BY tgj.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ticket_generation_jobs WHERE event_id = $1';
    const countValues = [eventId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countValues.push(status);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      jobs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findAll(options = {}) {
    const { page = 1, limit = 20, status, event_id } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT tgj.*, e.title as event_title, e.organizer_id
      FROM ticket_generation_jobs tgj
      INNER JOIN events e ON tgj.event_id = e.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND tgj.status = $${paramCount}`;
      values.push(status);
    }
    
    if (event_id) {
      paramCount++;
      query += ` AND tgj.event_id = $${paramCount}`;
      values.push(event_id);
    }
    
    query += ` ORDER BY tgj.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);
    
    const result = await database.query(query, values);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ticket_generation_jobs WHERE 1=1';
    const countValues = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countValues.push(status);
    }
    
    if (event_id) {
      countParamCount++;
      countQuery += ` AND event_id = $${countParamCount}`;
      countValues.push(event_id);
    }
    
    const countResult = await database.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      jobs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async update(id, updateData, updatedBy) {
    const allowedFields = ['status', 'details', 'started_at', 'completed_at', 'error_message'];
    const updates = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        if (key === 'details') {
          updates.push(`${key} = $${values.length + 1}`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          updates.push(`${key} = $${values.length + 1}`);
          values.push(updateData[key]);
        }
      }
    });
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(updatedBy, updatedBy, id);
    
    const query = `
      UPDATE ticket_generation_jobs 
      SET ${updates.join(', ')}, updated_by = $${values.length - 1}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await database.query(query, values);
    
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM ticket_generation_jobs WHERE id = $1 RETURNING *';
    const result = await database.query(query, [id]);
    
    return result.rows[0] || null;
  }

  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      ...additionalData
    };

    // Add timestamps based on status
    if (status === 'processing' && !additionalData.started_at) {
      updateData.started_at = new Date();
    } else if (['completed', 'failed'].includes(status) && !additionalData.completed_at) {
      updateData.completed_at = new Date();
    }

    return this.update(id, updateData);
  }

  async getPendingJobs(limit = 50) {
    const query = `
      SELECT tgj.*, e.title as event_title
      FROM ticket_generation_jobs tgj
      INNER JOIN events e ON tgj.event_id = e.id
      WHERE tgj.status = 'pending'
      ORDER BY tgj.created_at ASC
      LIMIT $1
    `;
    
    const result = await database.query(query, [limit]);
    
    return result.rows;
  }

  async getJobStats(eventId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        AVG(CASE WHEN status = 'completed' THEN 
          EXTRACT(EPOCH FROM (completed_at - started_at)) 
        END) as avg_processing_time_seconds
      FROM ticket_generation_jobs
    `;
    
    const values = [];
    
    if (eventId) {
      query += ' WHERE event_id = $1';
      values.push(eventId);
    }
    
    const result = await database.query(query, values);
    
    return result.rows[0];
  }

  async getFailedJobs(limit = 20) {
    const query = `
      SELECT tgj.*, e.title as event_title
      FROM ticket_generation_jobs tgj
      INNER JOIN events e ON tgj.event_id = e.id
      WHERE tgj.status = 'failed'
      ORDER BY tgj.completed_at DESC
      LIMIT $1
    `;
    
    const result = await database.query(query, [limit]);
    
    return result.rows;
  }
}

module.exports = new TicketGenerationJobsRepository();
