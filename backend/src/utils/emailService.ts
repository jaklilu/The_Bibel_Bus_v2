import nodemailer from 'nodemailer'
import { getRow, runQuery } from '../database/database'

// Get the frontend URL - use production URL as default
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'https://thebiblebus.net'
}

// Create a transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'jaklilu@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password-here'
    }
  })
}

// Check if email should be skipped due to too many failures (3+)
export const shouldSkipEmail = async (email: string): Promise<boolean> => {
  try {
    const record = await getRow(`
      SELECT failure_count 
      FROM email_failures 
      WHERE email = ?
    `, [email])
    
    if (!record) {
      return false // No failures recorded, can send
    }
    
    const shouldSkip = record.failure_count >= 3 // Skip if 3 or more failures
    if (shouldSkip) {
      console.log(`⏭️ Skipping email to ${email} - has ${record.failure_count} failures (3+ threshold reached, will not send)`)
    }
    return shouldSkip
  } catch (error) {
    console.error('Error checking email failure count:', error)
    return false // On error, allow sending (fail open - don't block emails if DB check fails)
  }
}

// Check if error indicates permanent failure (should immediately mark as unreachable)
const isPermanentFailure = (error: any): boolean => {
  if (!error) return false
  
  const errorMessage = (error.message || error.toString() || '').toLowerCase()
  const errorCode = error.code || error.responseCode || ''
  
  // Check for permanent failure indicators
  const permanentFailurePatterns = [
    'inbox full',
    'out of storage',
    'overquota',
    'quota exceeded',
    'mailbox full',
    '550', // Permanent failure SMTP code
    '551', // User not local
    '553', // Mailbox name not allowed
    'invalid address',
    'address not found',
    'user unknown',
    'no such user',
    'recipient address rejected',
    'mailbox unavailable',
    'does not exist',
    'not found',
    'bounced',
    'permanent failure'
  ]
  
  // Check error code (like 452 for inbox full, 4.2.2 for over quota)
  const permanentFailureCodes = ['452', '550', '551', '553', '554', '5.2.2', '4.2.2']
  if (errorCode && permanentFailureCodes.some(code => String(errorCode).includes(code))) {
    return true
  }
  
  // Check error message
  for (const pattern of permanentFailurePatterns) {
    if (errorMessage.includes(pattern)) {
      return true
    }
  }
  
  return false
}

// Record email failure
export const recordEmailFailure = async (email: string, error?: any): Promise<void> => {
  try {
    const isPermanent = isPermanentFailure(error)
    const failureIncrement = isPermanent ? 3 : 1 // Immediately mark as unreachable for permanent failures
    
    const existing = await getRow(`
      SELECT id, failure_count 
      FROM email_failures 
      WHERE email = ?
    `, [email])
    
    if (existing) {
      // Update existing record - if permanent failure, set to 3+ immediately
      const newFailureCount = isPermanent 
        ? Math.max(existing.failure_count, 3) // Set to at least 3 for permanent failures
        : existing.failure_count + 1
      
      await runQuery(`
        UPDATE email_failures 
        SET failure_count = ?,
            last_failure_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `, [newFailureCount, email])
      
      if (isPermanent) {
        console.log(`🚫 Marked ${email} as UNREACHABLE (permanent failure detected: ${error?.message || 'unknown error'})`)
      } else {
        console.log(`📧 Recorded email failure for ${email} (total: ${newFailureCount})`)
      }
    } else {
      // Create new record - if permanent failure, start at 3
      const initialFailureCount = isPermanent ? 3 : 1
      
      await runQuery(`
        INSERT INTO email_failures (email, failure_count, last_failure_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [email, initialFailureCount])
      
      if (isPermanent) {
        console.log(`🚫 Marked ${email} as UNREACHABLE immediately (permanent failure: ${error?.message || 'unknown error'})`)
      } else {
        console.log(`📧 Recorded first email failure for ${email}`)
      }
    }
  } catch (error) {
    console.error('Error recording email failure:', error)
  }
}

// Record email success (reset failure count)
export const recordEmailSuccess = async (email: string): Promise<void> => {
  try {
    const existing = await getRow(`
      SELECT id 
      FROM email_failures 
      WHERE email = ?
    `, [email])
    
    if (existing) {
      // Reset failure count on success
      await runQuery(`
        UPDATE email_failures 
        SET failure_count = 0,
            last_success_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `, [email])
    } else {
      // Create record with success
      await runQuery(`
        INSERT INTO email_failures (email, failure_count, last_success_at)
        VALUES (?, 0, CURRENT_TIMESTAMP)
      `, [email])
    }
  } catch (error) {
    console.error('Error recording email success:', error)
  }
}

// Send password reset email
export const sendPasswordResetEmail = async (email: string, resetToken: string, userName: string) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const resetLink = `${getFrontendUrl()}/reset-password?token=${resetToken}`
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Password Reset Request - The Bible Bus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello ${userName}!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              We received a request to reset your password for your Bible Bus account. 
              If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="background: #f3f4f6; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px; color: #374151;">
              ${resetLink}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This email was sent from The Bible Bus application. 
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending password reset email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send account recovery email (forgot name)
export const sendAccountRecoveryEmail = async (
  email: string,
  userName: string,
  recoveryType: 'name' | 'email'
) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const subject = recoveryType === 'name' 
      ? 'Your Account Name - The Bible Bus'
      : 'Your Account Email - The Bible Bus'
    
    const content = recoveryType === 'name'
      ? `
        <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
          You requested to recover your account name. Here is your registered information:
        </p>
        
        <div style="background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #5b21b6; margin: 0; font-weight: bold; font-size: 16px;">
            Your Name: <span style="color: #7c3aed;">${userName}</span>
          </p>
          <p style="color: #5b21b6; margin: 5px 0 0 0; font-size: 14px;">
            Email: ${email}
          </p>
        </div>
        
        <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
          You can now use this information to log in to your account.
        </p>
      `
      : `
        <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
          You requested to recover your account email. Here is your registered information:
        </p>
        
        <div style="background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #5b21b6; margin: 0; font-weight: bold; font-size: 16px;">
            Your Email: <span style="color: #7c3aed;">${email}</span>
          </p>
          <p style="color: #5b21b6; margin: 5px 0 0 0; font-size: 14px;">
            Name: ${userName}
          </p>
        </div>
        
        <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
          You can now use this information to log in to your account.
        </p>
      `
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Account Recovery</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello!</h2>
            
            ${content}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}/login" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Go to Login
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              If you didn't request this information, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Blessings,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Account recovery email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending account recovery email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send donation confirmation email
export const sendDonationConfirmationEmail = async (email: string, donorName: string, amount: number, donationType: string) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  console.log('=== EMAIL SERVICE DEBUG ===')
  console.log('Email:', email)
  console.log('Donor Name:', donorName)
  console.log('Amount:', amount)
  console.log('Type:', donationType)
  console.log('EMAIL_USER:', process.env.EMAIL_USER)
  console.log('EMAIL_APP_PASSWORD exists:', !!process.env.EMAIL_APP_PASSWORD)
  
  try {
    const transporter = createTransporter()
    console.log('Transporter created successfully')
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Thank you for your generous donation! 🙏 - The Bible Bus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Donation Confirmation</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Thank you, ${donorName}! 🙏</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              We are deeply grateful for your generous donation of <strong>$${amount.toFixed(2)}</strong> to support The Bible Bus ministry.
            </p>
            
            <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
              <h3 style="color: #15803d; margin: 0 0 10px 0;">💰 Donation Details</h3>
              <p style="color: #166534; margin: 5px 0; font-size: 18px;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
              <p style="color: #166534; margin: 5px 0; font-size: 16px;"><strong>Type:</strong> ${donationType === 'one-time' ? 'One-time Donation' : 'Monthly Donation'}</p>
              <p style="color: #166534; margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Your contribution helps us continue our mission of bringing people closer to God through daily Bible reading and community support.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #92400e; margin: 0; font-weight: bold;">🌟 How Your Donation Helps:</p>
              <ul style="color: #92400e; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Support Bible reading groups and community</li>
                <li>Maintain our online platform and resources</li>
                <li>Provide encouragement and spiritual guidance</li>
                <li>Help others discover the joy of daily Bible study</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              May God bless you abundantly for your generosity!<br><br>
              With gratitude,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Donation confirmation email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending donation confirmation email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send invitation reminder email
export const sendInvitationReminderEmail = async (
  email: string, 
  userName: string, 
  groupName: string, 
  registrationDeadline: string
) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Don\'t Miss Out on Your Bible Journey! - The Bible Bus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Don't Miss Out!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello ${userName}!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              We noticed you registered for <strong>${groupName}</strong> but haven't accepted your invitation yet.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              To start your 365-day Bible reading journey:
            </p>
            
            <ol style="color: #6b7280; line-height: 1.8; font-size: 16px; padding-left: 20px;">
              <li>Visit your dashboard</li>
              <li>Under "Accept Your Invitation", click on <strong>"Join Reading Group"</strong></li>
            </ol>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏰ <strong>Registration closes on ${new Date(registrationDeadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}/dashboard" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Go to Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              See you on the Bus!<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Invitation reminder email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending invitation reminder email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send welcome email after registration
export const sendWelcomeEmail = async (
  email: string, 
  userName: string, 
  groupName: string,
  groupStartDate: string,
  registrationDeadline: string
) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: `Welcome to ${groupName}! 🚌`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Welcome Aboard!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello ${userName}! 🎉</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Welcome to <strong>${groupName}</strong>! We're thrilled to have you join us on this incredible 365-day journey through the Bible.
            </p>
            
            <div style="background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #5b21b6; margin: 0; font-weight: bold; font-size: 14px;">
                📅 Group Start Date: ${new Date(groupStartDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p style="color: #5b21b6; margin: 5px 0 0 0; font-size: 14px;">
                ⏰ Registration Deadline: ${new Date(registrationDeadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              You're all set! Check your WhatsApp group for daily updates, encouragement, and important announcements. 
              We're here to support you every step of the way on this journey.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}/dashboard" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Visit Your Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              If you have any questions or need help, don't hesitate to reach out. We're here to support you every step of the way!
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Blessings,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Welcome email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending welcome email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send WhatsApp/Invitation reminder email (for first 30 days)
export const sendWhatsAppInvitationReminderEmail = async (
  email: string,
  userName: string,
  groupName: string,
  daysSinceJoin: number
) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Complete Your Registration - The Bible Bus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Action Required</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello ${userName}!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              We noticed you registered for <strong>${groupName}</strong> ${daysSinceJoin} day${daysSinceJoin !== 1 ? 's' : ''} ago, but haven't completed your registration yet.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              To fully join your Bible reading group, please complete these two important steps:
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-weight: bold; font-size: 14px;">
                📱 Step 1: Join Your WhatsApp Group
              </p>
              <p style="color: #92400e; margin: 5px 0 0 0; font-size: 14px;">
                Connect with your fellow travelers for daily updates and encouragement!
              </p>
            </div>
            
            <div style="background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #5b21b6; margin: 0; font-weight: bold; font-size: 14px;">
                ✅ Step 2: Accept Your Invitation
              </p>
              <p style="color: #5b21b6; margin: 5px 0 0 0; font-size: 14px;">
                Click "Join Reading Group" to start your 365-day Bible reading journey!
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}/dashboard" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Complete Registration
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              Don't miss out on this incredible journey! Complete your registration today to stay connected with your group.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Blessings,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('WhatsApp/Invitation reminder email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending WhatsApp/Invitation reminder email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}

// Send progress reminder email
export const sendProgressReminderEmail = async (
  email: string,
  userName: string,
  groupName: string
) => {
  // Check if email should be skipped
  if (await shouldSkipEmail(email)) {
    console.log(`⏭️ Skipping email to ${email} (3+ failures)`)
    return false
  }

  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Update Your Bible Reading Progress 📖 - The Bible Bus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Progress Reminder</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Hello ${userName}!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              We noticed you haven't updated your milestone progress for <strong>${groupName}</strong> yet.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Tracking your progress helps you stay on track with your 365-day Bible reading journey and allows us to celebrate your milestones together!
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-weight: bold; font-size: 14px;">
                📖 How to Update Your Progress:
              </p>
              <ol style="color: #92400e; margin: 10px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Log in to your dashboard</li>
                <li>Scroll to the "Milestone Progress" section</li>
                <li>Enter your cumulative missing days from YouVersion</li>
                <li>Your progress will be automatically calculated!</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${getFrontendUrl()}/dashboard" 
                 style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                        color: #7c2d12; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
                Update My Progress
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
              Remember: You should update your progress at each milestone (about 6 times throughout the year) to track your journey accurately.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Blessings,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Progress reminder email sent:', info.messageId)
    await recordEmailSuccess(email)
    return true
  } catch (error) {
    console.error('Error sending progress reminder email:', error)
    await recordEmailFailure(email, error)
    return false
  }
}
