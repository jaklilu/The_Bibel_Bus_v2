# How to Send WhatsApp Invites to January 2026 Group

## Option 1: Use Browser Console (Easiest)

1. Open your admin panel in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Paste and run this code:

```javascript
// Get your admin token from localStorage
const token = localStorage.getItem('adminToken')

// Send invites to group 14 (January 2026)
fetch('/api/admin/send-whatsapp-invites/14', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Result:', data)
  if (data.success) {
    console.log(`📧 Sent ${data.data.sent} emails`)
    console.log(`❌ Failed: ${data.data.failed}`)
    console.log(`📊 Total: ${data.data.total}`)
  }
})
.catch(err => console.error('Error:', err))
```

## Option 2: Use the Script (After Backend is Running)

1. Make sure backend server is running: `cd backend && npm run dev`
2. Run: `node backend/send-via-api.js`

## Option 3: Use Admin Panel UI

If you want, I can add a button in the admin panel to send invites with one click!

