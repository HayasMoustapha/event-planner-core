const express = require('express');
const app = express();
const cors = require('cors');

// Test simple route
app.post('/test-import/events/:eventId/guests/import', (req, res) => {
  console.log('Route hit!');
  res.json({ success: true, message: 'Route works', eventId: req.params.eventId });
});

app.listen(3002, () => {
  console.log('Test server running on port 3002');
});
