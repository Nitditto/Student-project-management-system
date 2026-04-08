export function generateForgotPasswordEmailTemplate (resetPasswordUrl){
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #1f2937;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #3b82f6; margin: 0;">Password Reset Request</h2>
    </div>

    <!-- Body -->
    <p style="font-size: 16px; color: #374151;">Dear User,</p>
    <p style="font-size: 16px; color: #374151;">
      We received a request to reset your password. Please click the button below to set up a new one:
    </p>

    <!-- Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetPasswordUrl}" style="display: inline-block; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; background-color: #3b82f6;">
        Reset Password
      </a>
    </div>

    <p style="font-size: 15px; color: #374151;">
      If you did not request this, you can safely ignore this email. This link will expire in <b>15 minutes</b>.
    </p>

    <p style="font-size: 15px; color: #374151;">
      If the button above doesn’t work, copy and paste the following link into your browser:
    </p>

    <!-- Link -->
    <p style="font-size: 14px; color: #3b82f6; word-wrap: break-word;">
      ${resetPasswordUrl}
    </p>

    <!-- Footer -->
    <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #6b7280;">
      <p>Thank you,<br><strong>📚 BookWorm Team</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
    </footer>
  </div>
`;

}

export function generateRequestAcceptedTemplate(supervisorName) {
    return `
    <div style="font-family: Arial; padding:20px; background:#fff; border:1px solid #ddd; border-radius:8px;">
        <h2 style="color:#10b981;">✔ Supervisor Request Accepted</h2>
        <p>Your supervisor request has been accepted by <strong>${supervisorName}</strong>.</p>
        <p>You can now start working on your project and upload files.</p>
    </div>
    `;
}

export function generateRequestRejectedTemplate(supervisorName) {
    return `
    <div style="font-family: Arial; padding:20px; background:#fff; border:1px solid #ddd; border-radius:8px;">
        <h2 style="color:#ef4444;">✖ Supervisor Request Rejected</h2>
        <p>Your supervisor request has been rejected by <strong>${supervisorName}</strong>.</p>
        <p>You can try requesting another supervisor.</p>
    </div>
    `;
}
