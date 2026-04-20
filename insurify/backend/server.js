// Global error handlers to catch all errors
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL ERROR] Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[CRITICAL ERROR] Unhandled Rejection:', err);
});
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 8080;

console.log(`[DEBUG] PORT from env: ${process.env.PORT}`);
console.log(`[DEBUG] Final PORT: ${PORT}`);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from project root (one level up)
app.use(express.static(path.join(__dirname, '..')));

// Initialize database
const db = require('./database');
db.initializeDatabase();

// Load all route modules with error checking
let authRouter, claimsRouter, policiesRouter, adminRouter;
try {
  authRouter = require('./routes/auth');
  claimsRouter = require('./routes/claims');
  policiesRouter = require('./routes/policies');
  adminRouter = require('./routes/admin');
  console.log('[DEBUG] Routes loaded successfully');
} catch (err) {
  console.error('[ERROR] Failed to load routes:', err.message);
  process.exit(1);
}

// Register all API routes FIRST (before catch-all handlers)
app.use('/api/auth', authRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('--- ERROR HANDLER ---');
  console.error('Request:', req.method, req.originalUrl);
  console.error('Body:', req.body);
  console.error('Error stack:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// 404 for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Fallback: serve index.html for any other GET request (for SPA or direct navigation)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Database initialized`);
  console.log('[DEBUG] Server listening on 0.0.0.0:' + PORT);
});

// Handle server errors
server.on('error', (err) => {
  console.error('[ERROR] Server error:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL ERROR] Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[CRITICAL ERROR] Unhandled Rejection:', err);
  process.exit(1);
});
