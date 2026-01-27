const express = require('express');
const app = express();

app.use(express.json());

// Test loading routes
console.log('🧪 Testing DELETE route fix...');

try {
  const eventsRoutes = require('./src/modules/events/events.routes');
  app.use('/api/v1/events', eventsRoutes);
  console.log('✅ Events routes loaded');
} catch(e) {
  console.log('❌ Events routes error:', e.message);
}

const server = app.listen(3001, () => {
  console.log('🚀 Server started on port 3001');
  
  // Test DELETE
  setTimeout(async () => {
    try {
      console.log('\\n🧪 Testing DELETE /api/v1/events/1...');
      const response = await fetch('http://localhost:3001/api/v1/events/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      console.log('✅ DELETE:', response.status, data.success, data.error || 'No error');
    } catch(e) {
      console.log('❌ DELETE error:', e.message);
    }
    
    console.log('\\n🎯 Test completed!');
    server.close();
  }, 1000);
});
