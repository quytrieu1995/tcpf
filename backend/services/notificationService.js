const db = require('../config/database');
const emailService = require('./emailService');

/**
 * Notification Service
 * Centralized service for creating notifications with email support
 */
class NotificationService {
  /**
   * Create a notification and optionally send email
   * @param {Object} options - Notification options
   * @param {number} options.userId - User ID to send notification to
   * @param {string} options.type - Notification type (order, inventory, customer, system)
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification message
   * @param {string} [options.link] - Optional link to navigate to
   * @param {Object} [options.metadata] - Optional metadata
   * @param {boolean} [options.sendEmail=true] - Whether to send email notification
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(options) {
    const {
      userId,
      type,
      title,
      message,
      link = null,
      metadata = null,
      sendEmail = true
    } = options;

    if (!userId || !type || !title || !message) {
      throw new Error('userId, type, title, and message are required');
    }

    try {
      // Create notification in database
      const result = await db.pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          type,
          title,
          message,
          link,
          metadata ? JSON.stringify(metadata) : null
        ]
      );

      const notification = result.rows[0];

      // Send email notification if requested and SMTP is configured
      if (sendEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          // Get user email
          const userResult = await db.pool.query(
            'SELECT email FROM users WHERE id = $1',
            [userId]
          );

          if (userResult.rows.length > 0 && userResult.rows[0].email) {
            await emailService.sendNotificationEmail(userResult.rows[0].email, {
              type,
              title,
              message,
              link
            });
            console.log(`Notification email sent to user ${userId}`);
          }
        } catch (emailError) {
          // Log error but don't fail the notification creation
          console.error('Error sending notification email:', emailError);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   * @param {Array<Object>} notifications - Array of notification options
   * @returns {Promise<Array>} Created notifications
   */
  async createBulkNotifications(notifications) {
    const results = await Promise.all(
      notifications.map(notif => this.createNotification(notif))
    );
    return results;
  }

  /**
   * Create notification for all users with a specific role
   * @param {Object} options - Notification options (same as createNotification)
   * @param {string} role - User role to send to
   * @returns {Promise<Array>} Created notifications
   */
  async createNotificationForRole(options, role) {
    try {
      const usersResult = await db.pool.query(
        'SELECT id FROM users WHERE role = $1',
        [role]
      );

      const notifications = usersResult.rows.map(user => ({
        ...options,
        userId: user.id
      }));

      return await this.createBulkNotifications(notifications);
    } catch (error) {
      console.error('Error creating notifications for role:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();

