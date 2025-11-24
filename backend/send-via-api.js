// Send WhatsApp invites via the admin API endpoint
// This uses the same database the app is actually using
const https = require('https')
const http = require('http')

const groupId = 14 // January 2026
const API_URL = process.env.API_URL || 'http://localhost:5002'
const adminEmail = process.env.ADMIN_EMAIL || 'JayTheBibleBus@gmail.com'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const client = isHttps ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }
    
    const req = client.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ status: res.statusCode, data: json, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers })
        }
      })
    })
    
    req.on('error', reject)
    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

async function login() {
  try {
    const response = await makeRequest(`${API_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    })
    
    if (response.status === 200 && response.data.success) {
      return response.data.data.token
    }
    console.error('Login failed:', response.data)
    return null
  } catch (error) {
    console.error('Login error:', error.message)
    return null
  }
}

async function sendInvites() {
  console.log('🔐 Logging in as admin...')
  const token = await login()
  
  if (!token) {
    console.error('❌ Could not get admin token. Make sure:')
    console.error('   1. Backend server is running on', API_URL)
    console.error('   2. Admin credentials are correct')
    process.exit(1)
  }
  
  console.log('✅ Logged in successfully')
  console.log(`\n📧 Sending WhatsApp invites to group ${groupId}...`)
  
  try {
    const response = await makeRequest(`${API_URL}/api/admin/send-whatsapp-invites/${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.status === 200 && response.data.success) {
      console.log('\n✅ Success!')
      console.log(`   Message: ${response.data.message}`)
      console.log(`   Sent: ${response.data.data.sent}`)
      console.log(`   Failed: ${response.data.data.failed}`)
      console.log(`   Total: ${response.data.data.total}`)
      console.log(`   Group: ${response.data.data.group.name}`)
    } else {
      console.error('❌ Error:', response.data)
    }
  } catch (error) {
    console.error('❌ Request error:', error.message)
    console.log('\n💡 Tip: Make sure the backend server is running on', API_URL)
  }
}

sendInvites()

