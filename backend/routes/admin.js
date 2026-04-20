const express = require('express');
const router = express.Router();
const db = require('../database');
const authRouter = require('./auth');
const verifyToken = authRouter.verifyToken;

// Dashboard stats (admin only)
router.get('/dashboard/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalPolicies = await db.get('SELECT COUNT(*) as count FROM policies');
    const activePolicies = await db.get('SELECT COUNT(*) as count FROM policies WHERE status = "active"');
    const totalClaims = await db.get('SELECT COUNT(*) as count FROM claims');
    const pendingClaims = await db.get('SELECT COUNT(*) as count FROM claims WHERE status = "pending"');
    const approvedClaims = await db.get('SELECT COUNT(*) as count FROM claims WHERE status = "approved"');

    res.json({
      total_policies: totalPolicies.count,
      active_policies: activePolicies.count,
      total_claims: totalClaims.count,
      pending_claims: pendingClaims.count,
      approved_claims: approvedClaims.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all policies (admin only)
router.get('/policies/all', verifyToken, async (req, res) => {
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

// Get all claims (admin only)
router.get('/claims/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const claims = await db.all('SELECT * FROM claims ORDER BY created_at DESC');
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get claims by status (admin only)
router.get('/claims/status/:status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(req.params.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const claims = await db.all(
      'SELECT * FROM claims WHERE status = ? ORDER BY created_at DESC',
      [req.params.status]
    );
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
 