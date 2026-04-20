const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ working: true });
});

const server = app.listen(8080, '0.0.0.0', () => {
  console.log('Server listening on port 8080');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
