const nodemailer = require('nodemailer');
const fs = require('fs');

// Create reusable transporter with connection pooling for bulk sends
const createTransporter = ({ pool = false, maxConnections = 5, maxMessages = Infinity, rateDelta = 1000, rateLimit = undefined } = {}) => {
  const opts = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Increase timeouts so large batches don't drop
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 120000,
  };
  if (pool) {
    opts.pool = true;
    opts.maxConnections = maxConnections;
    opts.maxMessages = maxMessages;
    opts.rateDelta = rateDelta;
    if (rateLimit) opts.rateLimit = rateLimit;
  }
  return nodemailer.createTransport(opts);
};

// Event-specific color themes for email templates
const eventThemes = {
  'Pitching':            { color: '#e63946', emoji: '🎤', tagline: 'Pitch your vision!' },
  'Mech Arena':          { color: '#457b9d', emoji: '🤖', tagline: 'Engineering excellence' },
  'Webify':              { color: '#2a9d8f', emoji: '🌐', tagline: 'Building the web' },
  'Game-A-Thon':         { color: '#e76f51', emoji: '🎮', tagline: 'Game on!' },
  'Electrical Odyssey':  { color: '#f4a261', emoji: '⚡', tagline: 'Power of innovation' },
  'Buildscape':          { color: '#264653', emoji: '🏗️', tagline: 'Build the future' },
  'Master Chef Mania':   { color: '#bc6c25', emoji: '👨‍🍳', tagline: 'Cook up something great' },
  'IPL Auction':         { color: '#6a0572', emoji: '🏏', tagline: 'Bid to win' },
  'Stocks&Shares':       { color: '#386641', emoji: '📈', tagline: 'Invest in knowledge' },
  'B-Plan':              { color: '#003049', emoji: '📋', tagline: 'Plan. Execute. Succeed.' },
  'Detex Forum':         { color: '#9b2226', emoji: '🔍', tagline: 'Detect the difference' },
  'Thirai Trivia':       { color: '#bb3e03', emoji: '🎬', tagline: 'Lights, camera, trivia!' },
  'Udyami Bazaar':       { color: '#ca6702', emoji: '🏪', tagline: 'Entrepreneurial spirit' },
  default:               { color: '#4f46e5', emoji: '🏆', tagline: 'Certificate Verification System' },
};

const getTheme = (eventName) => eventThemes[eventName] || eventThemes.default;

// Send OTP login email to coordinator (event-specific template)
const sendLoginOTPEmail = async ({ recipientName, recipientEmail, otp, eventName }) => {
  const theme = getTheme(eventName);
  const transporter = createTransporter();

  const mailOptions = {
    from: `"IEF's E-Horyzon 2K26 (No Reply)" <${process.env.EMAIL_USER}>`,
    replyTo: 'noreply@twincord.in',
    to: recipientEmail,
    subject: `${theme.emoji} Your Login Code for ${eventName} — TwinVerify`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <!-- Do Not Reply Banner -->
              <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 14px 20px; text-align: center; margin-bottom: 12px;">
                    <p style="color: #92400e; font-size: 14px; font-weight: 700; margin: 0;">⚠️ This is an automated message — Please do not reply to this email.</p>
                  </td>
                </tr>
                <tr><td style="padding: 6px 0;"></td></tr>
              </table>
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${theme.color} 0%, ${theme.color}cc 100%); padding: 18px 24px; text-align: center; border-radius: 12px 12px 0 0;">
                    <span style="font-size: 24px; vertical-align: middle;">${theme.emoji}</span>
                    <span style="color: white; font-size: 17px; font-weight: 600; vertical-align: middle; margin-left: 8px;">${eventName}</span>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Hello, ${recipientName}!</h2>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                      You requested a login code for your <strong>${eventName}</strong> coordinator portal on TwinVerify.
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid ${theme.color}; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
                      <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Your One-Time Password</p>
                      <p style="color: ${theme.color}; font-size: 36px; font-weight: 700; font-family: monospace; margin: 0; letter-spacing: 8px;">${otp}</p>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                      This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                      If you didn't request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 25px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="color: #94a3b8; font-size: 13px; font-weight: 600; margin: 0 0 6px 0;">IEF's E-Horyzon 2K26</p>
                    <p style="color: #64748b; font-size: 11px; margin: 0 0 10px 0;">
                      This is an automated email. Please do not reply.
                    </p>
                    <p style="color: #64748b; font-size: 11px; margin: 0;">
                      &copy; ${new Date().getFullYear()} &bull; powered by <a href="https://twincord.in" style="color: #94a3b8; text-decoration: none;">Twincord Technologies</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendLoginOTPEmail,
  sendCustomEmail,
  createTransporter,
  eventThemes,
  getTheme,
};

/**
 * Send a professional email with coordinator-specified subject & body content.
 * If a certificate PDF exists, it is attached directly to the email.
 */
async function sendCustomEmail({ toEmail, subject, bodyContent, eventName, recipientName, attachmentPath, attachmentName, certificateId, transporter: existingTransporter }) {
  const theme = getTheme(eventName);
  const transporter = existingTransporter || createTransporter();

  // Convert plain-text line breaks to <br> for HTML
  const htmlBody = (bodyContent || '').replace(/\n/g, '<br>');

  // Attach the certificate PDF directly to the email
  const attachments = [];
  if (attachmentPath && fs.existsSync(attachmentPath)) {
    attachments.push({
      filename: attachmentName || 'certificate.pdf',
      path: attachmentPath,
      contentType: 'application/pdf',
    });
  }

  // Certificate notice section (tells recipient to check attachment)
  const certificateSection = attachments.length > 0 ? `
                <!-- Certificate Attached Notice -->
                <tr>
                  <td style="padding: 4px 30px 0 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 24px 20px; text-align: center;">
                          <p style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 0 0 8px 0;">🎓 Your Certificate is Attached</p>
                          <p style="color: #15803d; font-size: 13px; margin: 0;">Please download the attached PDF to save your certificate.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : '';

  const mailOptions = {
    from: `"IEF's E-Horyzon 2K26 (No Reply)" <${process.env.EMAIL_USER}>`,
    replyTo: 'noreply@twincord.in',
    to: toEmail,
    subject,
    attachments,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #eef2f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <!-- Do Not Reply Banner -->
              <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 14px 20px; text-align: center; margin-bottom: 12px;">
                    <p style="color: #92400e; font-size: 14px; font-weight: 700; margin: 0;">⚠️ This is an automated message — Please do not reply to this email.</p>
                  </td>
                </tr>
                <tr><td style="padding: 6px 0;"></td></tr>
              </table>
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${theme.color} 0%, ${theme.color}bb 50%, #0f172a 100%); padding: 20px 28px; text-align: center;">
                    <div style="font-size: 26px; margin-bottom: 6px;">${theme.emoji}</div>
                    <h1 style="color: #ffffff; margin: 0 0 3px 0; font-size: 17px; font-weight: 700; letter-spacing: 0.3px;">IEF's E-Horyzon 2K26</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 13px; font-weight: 400;">${eventName}</p>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px 30px 28px 30px;">
                    ${recipientName ? `<h2 style="color: #0f172a; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">Dear ${recipientName},</h2>` : ''}
                    <div style="color: #334155; font-size: 15px; line-height: 1.85;">
                      ${htmlBody}
                    </div>
                  </td>
                </tr>

                ${certificateSection}

                <!-- Spacer -->
                <tr><td style="padding: 12px 0;"></td></tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 30px; text-align: center;">
                    <p style="color: #e2e8f0; font-size: 14px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: 0.3px;">IEF's E-Horyzon 2K26</p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 16px 0;">Innovation &bull; Excellence &bull; Future</p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
                      <p style="color: #64748b; font-size: 11px; margin: 0;">
                        &copy; ${new Date().getFullYear()} &bull; powered by <a href="https://twincord.in" style="color: #94a3b8; text-decoration: none;">Twincord Technologies</a>
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Sub-footer -->
              <table width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 20px 30px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">This is an automated email from IEF's E-Horyzon. Please do not reply. If you believe you received this in error, kindly disregard this message.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Custom email sent to', toEmail, ':', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending custom email to', toEmail, ':', error.message);
    return { success: false, error: error.message };
  }
}
