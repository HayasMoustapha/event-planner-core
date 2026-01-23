const ticketGenerationJobsRepository = require('./ticket-generation-jobs.repository');
const ticketsService = require('./tickets.service');

class TicketGenerationJobsService {
  async createJob(jobData, userId) {
    try {
      // Validate event_id
      if (!jobData.event_id) {
        return {
          success: false,
          error: 'Event ID is required'
        };
      }

      const jobDataWithCreator = {
        ...jobData,
        created_by: userId
      };

      const job = await ticketGenerationJobsRepository.create(jobDataWithCreator);
      
      // TODO: Queue the job for processing
      // This would typically involve a message queue like RabbitMQ or Redis
      
      return {
        success: true,
        data: job,
        message: 'Ticket generation job created successfully'
      };
    } catch (error) {
      console.error('Error creating ticket generation job:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ticket generation job'
      };
    }
  }

  async getJobById(jobId) {
    try {
      const job = await ticketGenerationJobsRepository.findById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Ticket generation job not found'
        };
      }

      return {
        success: true,
        data: job
      };
    } catch (error) {
      console.error('Error getting ticket generation job:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ticket generation job'
      };
    }
  }

  async getJobsByEventId(eventId, options = {}) {
    try {
      const result = await ticketGenerationJobsRepository.findByEventId(eventId, options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting jobs by event:', error);
      return {
        success: false,
        error: error.message || 'Failed to get jobs by event'
      };
    }
  }

  async getJobs(options = {}) {
    try {
      const result = await ticketGenerationJobsRepository.findAll(options);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error getting jobs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get jobs'
      };
    }
  }

  async updateJob(jobId, updateData, userId) {
    try {
      const updatedJob = await ticketGenerationJobsRepository.update(jobId, updateData, userId);
      
      if (!updatedJob) {
        return {
          success: false,
          error: 'Ticket generation job not found'
        };
      }

      return {
        success: true,
        data: updatedJob,
        message: 'Ticket generation job updated successfully'
      };
    } catch (error) {
      console.error('Error updating ticket generation job:', error);
      return {
        success: false,
        error: error.message || 'Failed to update ticket generation job'
      };
    }
  }

  async deleteJob(jobId) {
    try {
      const deletedJob = await ticketGenerationJobsRepository.delete(jobId);
      
      if (!deletedJob) {
        return {
          success: false,
          error: 'Ticket generation job not found'
        };
      }

      return {
        success: true,
        data: deletedJob,
        message: 'Ticket generation job deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting ticket generation job:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete ticket generation job'
      };
    }
  }

  async processJob(jobId) {
    try {
      const job = await ticketGenerationJobsRepository.findById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      if (job.status !== 'pending') {
        return {
          success: false,
          error: 'Job is not in pending status'
        };
      }

      // Update job status to processing
      await ticketGenerationJobsRepository.updateStatus(jobId, 'processing');

      try {
        // Extract job details
        const details = typeof job.details === 'string' ? JSON.parse(job.details) : job.details;
        
        // Process ticket generation based on job details
        const result = await this.generateTicketsForEvent(job.event_id, details);
        
        if (result.success) {
          // Update job status to completed
          await ticketGenerationJobsRepository.updateStatus(jobId, 'completed', {
            details: {
              ...details,
              result: result.data,
              processed_at: new Date().toISOString()
            }
          });
          
          return {
            success: true,
            data: {
              job: await ticketGenerationJobsRepository.findById(jobId),
              result: result.data
            },
            message: 'Ticket generation job completed successfully'
          };
        } else {
          // Update job status to failed
          await ticketGenerationJobsRepository.updateStatus(jobId, 'failed', {
            error_message: result.error
          });
          
          return {
            success: false,
            error: result.error
          };
        }
      } catch (processingError) {
        // Update job status to failed
        await ticketGenerationJobsRepository.updateStatus(jobId, 'failed', {
          error_message: processingError.message
        });
        
        throw processingError;
      }
    } catch (error) {
      console.error('Error processing ticket generation job:', error);
      return {
        success: false,
        error: error.message || 'Failed to process ticket generation job'
      };
    }
  }

  async generateTicketsForEvent(eventId, details) {
    try {
      // This is where the actual ticket generation logic would go
      // For now, we'll simulate the process
      
      const { ticket_type_id, event_guest_ids, ticket_template_id } = details;
      
      if (!ticket_type_id || !event_guest_ids || !Array.isArray(event_guest_ids)) {
        return {
          success: false,
          error: 'Invalid job details: missing ticket_type_id or event_guest_ids'
        };
      }

      // Generate tickets for each guest
      const results = [];
      
      for (const eventGuestId of event_guest_ids) {
        const ticketData = {
          event_guest_id: eventGuestId,
          ticket_type_id: ticket_type_id,
          ticket_template_id: ticket_template_id
        };
        
        // This would call the tickets service to create actual tickets
        // For now, we'll simulate the creation
        results.push({
          event_guest_id: eventGuestId,
          success: true,
          ticket_code: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        });
      }

      return {
        success: true,
        data: {
          generated_tickets: results,
          total_generated: results.length,
          event_id: eventId
        }
      };
    } catch (error) {
      console.error('Error generating tickets for event:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate tickets for event'
      };
    }
  }

  async getJobStats(eventId = null) {
    try {
      const stats = await ticketGenerationJobsRepository.getJobStats(eventId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get job statistics'
      };
    }
  }

  async getFailedJobs(limit = 20) {
    try {
      const jobs = await ticketGenerationJobsRepository.getFailedJobs(limit);
      
      return {
        success: true,
        data: jobs
      };
    } catch (error) {
      console.error('Error getting failed jobs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get failed jobs'
      };
    }
  }

  async retryFailedJob(jobId, userId) {
    try {
      const job = await ticketGenerationJobsRepository.findById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      if (job.status !== 'failed') {
        return {
          success: false,
          error: 'Job is not in failed status'
        };
      }

      // Reset job to pending status
      const resetJob = await ticketGenerationJobsRepository.update(jobId, {
        status: 'pending',
        started_at: null,
        completed_at: null,
        error_message: null,
        updated_by: userId
      });
      
      // TODO: Re-queue the job for processing
      
      return {
        success: true,
        data: resetJob,
        message: 'Failed job reset to pending status'
      };
    } catch (error) {
      console.error('Error retrying failed job:', error);
      return {
        success: false,
        error: error.message || 'Failed to retry failed job'
      };
    }
  }

  async cancelJob(jobId, userId) {
    try {
      const job = await ticketGenerationJobsRepository.findById(jobId);
      
      if (!job) {
        return {
          success: false,
          error: 'Job not found'
        };
      }

      if (['completed', 'failed'].includes(job.status)) {
        return {
          success: false,
          error: 'Cannot cancel completed or failed job'
        };
      }

      const cancelledJob = await ticketGenerationJobsRepository.update(jobId, {
        status: 'failed',
        error_message: 'Job cancelled by user',
        completed_at: new Date(),
        updated_by: userId
      });
      
      return {
        success: true,
        data: cancelledJob,
        message: 'Job cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling job:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel job'
      };
    }
  }
}

module.exports = new TicketGenerationJobsService();
