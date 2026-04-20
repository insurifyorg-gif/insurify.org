const express = require('express');
const router = express.Router();
const db = require('../database');
const authRouter = require('./auth');
const verifyToken = authRouter.verifyToken;

// Helper function to generate policy number
const generatePolicyNumber = () => {
  return 'POL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Test endpoint: Create a policy without auth (for testing)
router.post('/test/create', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      policy_type,
      coverage_amount,
      start_date,
      end_date
    } = req.body;

    const policy_number = generatePolicyNumber();

    await db.run(
      `INSERT INTO policies (policy_number, customer_name, customer_email, policy_type, coverage_amount, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [policy_number, customer_name, customer_email, policy_type || 'Standard', coverage_amount || 50000, start_date || '2025-01-01', end_date || '2026-01-01']
    );

    res.status(201).json({
      message: 'Test policy created successfully',
      policy_number: policy_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new policy (admin only)
router.post('/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      customer_name,
      customer_email,
      policy_type,
      coverage_amount,
      start_date,
      end_date
    } = req.body;

    if (!customer_name || !customer_email || !policy_type || !coverage_amount || !start_date || !end_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const policy_number = generatePolicyNumber();

    await db.run(
      `INSERT INTO policies (policy_number, customer_name, customer_email, policy_type, coverage_amount, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [policy_number, customer_name, customer_email, policy_type, coverage_amount, start_date, end_date]
    );

    res.status(201).json({
      message: 'Policy created successfully',
      policy_number: policy_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all policies (admin only)
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const policies = await db.all('SELECT * FROM policies ORDER BY created_at DESC');
    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get policy by policy number
router.get('/:policy_number', async (req, res) => {
  try {
    const policy = await db.get(
      'SELECT * FROM policies WHERE policy_number = ?',
      [req.params.policy_number]
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update policy status (admin only)
router.put('/:policy_number/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'expired', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.run(
      'UPDATE policies SET status = ? WHERE policy_number = ?',
      [status, req.params.policy_number]
    );

    res.json({ message: 'Policy status updated', policy_number: req.params.policy_number, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete policy (admin only)
router.delete('/:policy_number', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const policy = await db.get('SELECT * FROM policies WHERE policy_number = ?', [req.params.policy_number]);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    await db.run('DELETE FROM policies WHERE policy_number = ?', [req.params.policy_number]);

    res.json({ message: 'Policy deleted successfully', policy_number: req.params.policy_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
