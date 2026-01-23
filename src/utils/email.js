const nodemailer = require('nodemailer');
const config = require('../config');
const { logger } = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  initialize() {
    try {
      // Check if email configuration is available
      if (!config.email || !config.email.smtp) {
        logger.warn('Email service not configured - emails will be logged only');
        return;
      }

      const { smtp } = config.email;
      
      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: smtp.host,
        port: smtp.port || 587,
        secure: smtp.secure || false, // true for 465, false for other ports
        auth: {
          user: smtp.user,
          pass: smtp.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service configuration failed:', error);
          this.isConfigured = false;
        } else {
          logger.info('Email service configured successfully');
          this.isConfigured = true;
        }
      });

    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options) {
    try {
      const { to, subject, text, html, from } = options;

      // Log email attempt
      logger.info('Attempting to send email:', {
        to: Array.isArray(to) ? to : [to],
        subject,
        hasHtml: !!html
      });

      // If email service is not configured, log and return success
      if (!this.isConfigured) {
        logger.warn('Email service not configured - logging email only:', {
          to: Array.isArray(to) ? to : [to],
          subject,
          text: text?.substring(0, 100) + '...',
          html: html ? 'HTML content present' : 'No HTML'
        });
        return { success: true, logged: true };
      }

      // Prepare email options
      const mailOptions = {
        from: from || config.email.from || config.email.smtp.user,
        to: Array.isArray(to) ? to : [to],
        subject,
        text,
        html: html || text
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully:', {
        messageId: result.messageId,
        to: mailOptions.to,
        subject
      });

      return { success: true, messageId: result.messageId };

    } catch (error) {
      logger.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to Event Planner Core!';
    const text = `
      Hello ${userName},

      Welcome to Event Planner Core! We're excited to have you on board.

      You can now:
      - Create and manage events
      - Invite guests
      - Generate tickets
      - Access our marketplace

      If you have any questions, feel free to reach out to our support team.

      Best regards,
      The Event Planner Core Team
    `;

    const html = `
      <h2>Welcome to Event Planner Core!</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Welcome to Event Planner Core! We're excited to have you on board.</p>
      
      <h3>You can now:</h3>
      <ul>
        <li>Create and manage events</li>
        <li>Invite guests</li>
        <li>Generate tickets</li>
        <li>Access our marketplace</li>
      </ul>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Best regards,<br>
      <strong>The Event Planner Core Team</strong></p>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
  }

  async sendEventInvitation(guestEmail, eventName, eventDate, invitationCode) {
    const subject = `Invitation to ${eventName}`;
    const text = `
      You're invited to ${eventName}!

      Event Details:
      - Date: ${new Date(eventDate).toLocaleDateString()}
      - Invitation Code: ${invitationCode}

      We'd love for you to join us for this special event.

      Please use your invitation code when registering.

      Best regards,
      The Event Organizer
    `;

    const html = `
      <h2>You're invited to ${eventName}!</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Event Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</li>
          <li><strong>Invitation Code:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${invitationCode}</code></li>
        </ul>
      </div>
      
      <p>We'd love for you to join us for this special event.</p>
      <p>Please use your invitation code when registering.</p>
      
      <p>Best regards,<br>
      <strong>The Event Organizer</strong></p>
    `;

    return this.sendEmail({
      to: guestEmail,
      subject,
      text,
      html
    });
  }

  async sendTicketConfirmation(userEmail, ticketCode, eventName, eventDate) {
    const subject = `Your Ticket for ${eventName}`;
    const text = `
      Your ticket has been confirmed!

      Ticket Details:
      - Event: ${eventName}
      - Date: ${new Date(eventDate).toLocaleDateString()}
      - Ticket Code: ${ticketCode}

      Please keep this ticket code safe and present it at the event entrance.

      We look forward to seeing you there!

      Best regards,
      The Event Planner Core Team
    `;

    const html = `
      <h2>Your ticket has been confirmed!</h2>
      
      <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3>🎫 Ticket Details:</h3>
        <ul>
          <li><strong>Event:</strong> ${eventName}</li>
          <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString()}</li>
          <li><strong>Ticket Code:</strong> <code style="background-color: #f8f9fa; padding: 8px 12px; border-radius: 4px; font-size: 16px; font-weight: bold;">${ticketCode}</code></li>
        </ul>
      </div>
      
      <p>Please keep this ticket code safe and present it at the event entrance.</p>
      <p>We look forward to seeing you there!</p>
      
      <p>Best regards,<br>
      <strong>The Event Planner Core Team</strong></p>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
  }

  async sendPasswordResetEmail(userEmail, resetToken) {
    const resetUrl = `${config.server?.corsOrigin || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const text = `
      You requested a password reset.

      Click the link below to reset your password:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this, please ignore this email.

      Best regards,
      The Event Planner Core Team
    `;

    const html = `
      <h2>Password Reset Request</h2>
      
      <p>You requested a password reset.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Reset Password
      </a>
      
      <p style="color: #6c757d; font-size: 14px;">This link will expire in 1 hour.</p>
      
      <p>If you didn't request this, please ignore this email.</p>
      
      <p>Best regards,<br>
      <strong>The Event Planner Core Team</strong></p>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      text,
      html
    });
  }

  async sendSystemAlert(adminEmail, alertType, message, details = {}) {
    const subject = `System Alert: ${alertType}`;
    const text = `
      System Alert: ${alertType}

      ${message}

      Details:
      ${JSON.stringify(details, null, 2)}

      Please check the system logs for more information.

      System Administrator
      Event Planner Core
    `;

    const html = `
      <h2 style="color: #dc3545;">System Alert: ${alertType}</h2>
      
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
        <p>${message}</p>
      </div>
      
      <h3>Details:</h3>
      <pre style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(details, null, 2)}
      </pre>
      
      <p>Please check the system logs for more information.</p>
      
      <p>System Administrator<br>
      <strong>Event Planner Core</strong></p>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }

  async sendBulkEmails(recipients, subject, text, html) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient,
        subject,
        text,
        html
      });
      
      results.push({
        recipient,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    logger.info(`Bulk email completed: ${successful} successful, ${failed} failed`);

    return {
      success: failed === 0,
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
