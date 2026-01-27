const express = require('express');
const app = express();

app.use(express.json());

// Test loading routes
console.log('🧪 Testing UPDATE route with corrected controller...');

try {
  const eventsRoutes = require('./src/modules/events/events.routes');
  app.use('/api/events', eventsRoutes);
  console.log('✅ Events routes loaded');
} catch(e) {
  console.log('❌ Events routes error:', e.message);
}

const server = app.listen(3001, () => {
  console.log('🚀 Server started on port 3001');
  
  // Test UPDATE with correct path
  setTimeout(async () => {
    try {
      console.log('\\n🧪 Testing PUT /api/events/2...');
      const response = await fetch('http://localhost:3001/api/events/2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'Annual Tech Conference 2026 - Updated',
          description: 'Updated description with more details about speakers and agenda.',
          event_date: '2026-07-20T10:00:00.000Z',
          location: 'Lyon Convention Center, France'
        })
      });
      const data = await response.json();
      console.log('✅ PUT /api/events/2:', response.status, data.success, data.error || 'No error');
      if (data.details) {
        console.log('📋 Details:', JSON.stringify(data.details, null, 2));
      }
    } catch(e) {
      console.log('❌ PUT /api/events/2 error:', e.message);
    }
    
    console.log('\\n🎯 Test completed!');
    server.close();
  }, 1000);
});
