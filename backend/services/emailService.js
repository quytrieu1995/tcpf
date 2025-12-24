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
}

module.exports = new EmailService();

