import nodemailer from 'nodemailer'

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

// Send password reset email
export const sendPasswordResetEmail = async (email: string, resetToken: string, userName: string) => {
  try {
    const transporter = createTransporter()
    
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    
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
    return true
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return false
  }
}

// Send donation confirmation email
export const sendDonationConfirmationEmail = async (email: string, donorName: string, amount: number, donationType: string) => {
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
              This email serves as your receipt for tax purposes. Please keep it for your records.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              May God bless you abundantly for your generosity!<br><br>
              With gratitude,<br>
              <strong>The Bible Bus Team</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              The Bible Bus is a registered ministry dedicated to helping people grow in their faith through daily Bible reading.
            </p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Donation confirmation email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending donation confirmation email:', error)
    return false
  }
}

// Send welcome email (for future use)
export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
      to: email,
      subject: 'Welcome to The Bible Bus! 🚌',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Welcome aboard!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #374151; margin-top: 0;">Welcome ${userName}! 🎉</h2>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Thank you for joining The Bible Bus! We're excited to have you on this journey of getting to know God intimately.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              You're now part of a community dedicated to daily Bible reading and spiritual growth. 
              Get ready for an amazing journey ahead!
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #92400e; margin: 0; font-weight: bold;">💡 Getting Started:</p>
              <ul style="color: #92400e; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Join a Bible reading group</li>
                <li>Set your reading goals</li>
                <li>Connect with fellow believers</li>
                <li>Track your progress</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              If you have any questions or need help getting started, don't hesitate to reach out to our support team.
            </p>
            
            <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
              Blessings,<br>
              <strong>The Bible Bus Team</strong>
            </p>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Welcome email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return false
  }
}
