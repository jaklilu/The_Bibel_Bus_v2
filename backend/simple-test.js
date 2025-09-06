const http = require('http')

// Test if backend is responding
const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/health',
  method: 'GET'
}

const req = http.request(options, (res) => {
  console.log(`✅ Backend responding! Status: ${res.statusCode}`)
  
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  
  res.on('end', () => {
    console.log('📡 Response:', data)
  })
})

req.on('error', (err) => {
  console.error('❌ Backend not responding:', err.message)
})

req.end()
