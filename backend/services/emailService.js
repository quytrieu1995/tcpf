const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Create transporter - using environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendPasswordResetEmail(email, resetToken, resetUrl) {
    try {
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Sales Dashboard'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Đặt lại mật khẩu',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .code { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Đặt lại mật khẩu</h1>
              </div>
              <div class="content">
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
                </div>
                <p>Hoặc copy và paste link sau vào trình duyệt:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <p><strong>Lưu ý:</strong> Link này chỉ có hiệu lực trong 1 giờ. Sau thời gian đó, bạn cần yêu cầu lại.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Sales Dashboard. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Đặt lại mật khẩu

          Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.

          Vui lòng truy cập link sau để đặt lại mật khẩu:
          ${resetUrl}

          Lưu ý: Link này chỉ có hiệu lực trong 1 giờ.

          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendNotificationEmail(email, notification) {
    try {
      const { type, title, message, link } = notification;
      
      // Get icon and color based on type
      const getTypeInfo = (type) => {
        switch (type) {
          case 'order':
            return { icon: '📦', color: '#3b82f6', bgColor: '#dbeafe' };
          case 'inventory':
            return { icon: '📊', color: '#f59e0b', bgColor: '#fef3c7' };
          case 'customer':
            return { icon: '👤', color: '#10b981', bgColor: '#d1fae5' };
          case 'system':
            return { icon: '⚙️', color: '#8b5cf6', bgColor: '#ede9fe' };
          default:
            return { icon: '🔔', color: '#6b7280', bgColor: '#f3f4f6' };
        }
      };

      const typeInfo = getTypeInfo(type);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const notificationUrl = link ? `${frontendUrl}${link}` : `${frontendUrl}/dashboard`;

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Sales Dashboard'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `🔔 ${title}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
              .header-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 30px; }
              .notification-type { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 15px; background: ${typeInfo.bgColor}; color: ${typeInfo.color}; }
              .notification-title { font-size: 20px; font-weight: 600; color: #1f2937; margin: 10px 0; }
              .notification-message { font-size: 15px; color: #4b5563; line-height: 1.7; margin: 15px 0; }
              .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
              .button:hover { opacity: 0.9; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
              .timestamp { color: #9ca3af; font-size: 13px; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="header-icon">${typeInfo.icon}</div>
                <h1 style="margin: 0; font-size: 24px;">Thông báo mới</h1>
              </div>
              <div class="content">
                <span class="notification-type">${type.toUpperCase()}</span>
                <h2 class="notification-title">${title}</h2>
                <div class="notification-message">${message.replace(/\n/g, '<br>')}</div>
                ${link ? `
                  <div style="text-align: center;">
                    <a href="${notificationUrl}" class="button">Xem chi tiết</a>
                  </div>
                ` : ''}
                <div class="timestamp">
                  ${new Date().toLocaleString('vi-VN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Sales Dashboard. All rights reserved.</p>
                <p style="margin-top: 5px;">Bạn nhận được email này vì bạn đã đăng ký nhận thông báo.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          ${title}

          ${message}

          ${link ? `Xem chi tiết: ${notificationUrl}` : ''}

          Thời gian: ${new Date().toLocaleString('vi-VN')}

          © ${new Date().getFullYear()} Sales Dashboard. All rights reserved.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Notification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending notification email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();

