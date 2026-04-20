const express = require('express');
const router = express.Router();
const db = require('../database');
const authRouter = require('./auth');
const verifyToken = authRouter.verifyToken;

// Helper function to generate claim number
const generateClaimNumber = () => {
  return 'CLM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Submit a claim (public)
router.post('/submit', async (req, res) => {
  try {
    const {
      policy_number,
      customer_name,
      customer_email,
      claim_type,
      claim_date,
      description,
      claimed_amount
    } = req.body;

    // Validate required fields
    if (!policy_number || !customer_name || !customer_email || !claim_type || !claim_date || !description || !claimed_amount) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify policy exists
    const policy = await db.get('SELECT * FROM policies WHERE policy_number = ?', [policy_number]);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    const claim_number = generateClaimNumber();

    await db.run(
      `INSERT INTO claims (policy_number, claim_number, customer_name, customer_email, claim_type, claim_date, description, claimed_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [policy_number, claim_number, customer_name, customer_email, claim_type, claim_date, description, claimed_amount]
    );

    res.status(201).json({
      message: 'Claim submitted successfully',
      claim_number: claim_number
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get claims (admin only)
router.get('/admin/all', verifyToken, async (req, res) => {
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

// Get claim by claim number
router.get('/:claim_number', async (req, res) => {
  try {
    const claim = await db.get(
      'SELECT * FROM claims WHERE claim_number = ?',
      [req.params.claim_number]
    );

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json(claim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get deductible/payment status for a claim (for payment portal)
router.get('/:claim_number/deductible-status', async (req, res) => {
  try {
    // Get deductible info from claims and deductible_payments tables
    const claim = await db.get('SELECT * FROM claims WHERE claim_number = ?', [req.params.claim_number]);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    const payment = await db.get('SELECT * FROM deductible_payments WHERE claim_number = ?', [req.params.claim_number]);
    if (!payment) {
      // No deductible set yet
      return res.json({
        claim_number: req.params.claim_number,
        deductible_reason: claim.deductible_reason || '',
        deductible_amount: claim.deductible_amount || null,
        payment_link: '',
        due_date: '',
        payment_account_detail: '',
        payment_status: '',
      });
    }
    res.json({
      claim_number: req.params.claim_number,
      deductible_reason: claim.deductible_reason || '',
      deductible_amount: payment.deductible_amount,
      payment_link: payment.payment_link,
      due_date: payment.due_date,
      payment_account_detail: payment.payment_account_detail,
      payment_status: payment.payment_status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update claim status (admin only)
router.put('/:claim_number/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'paid'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.run(
      'UPDATE claims SET status = ? WHERE claim_number = ?',
      [status, req.params.claim_number]
    );

    res.json({ message: 'Claim status updated', claim_number: req.params.claim_number, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Set deductible reason and amount (admin only)
router.put('/:claim_number/deductible', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.error('[DEDUCTIBLE] Forbidden: Not admin', req.user);
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { deductible_reason, deductible_amount, payment_account_detail, due_date } = req.body;
    if (!deductible_reason || deductible_amount === undefined || !payment_account_detail) {
      console.error('[DEDUCTIBLE] Missing fields', req.body);
      return res.status(400).json({ error: 'Deductible reason, amount, and payment account detail are required' });
    }

    // Check claim exists
    const claim = await db.get('SELECT * FROM claims WHERE claim_number = ?', [req.params.claim_number]);
    if (!claim) {
      console.error('[DEDUCTIBLE] Claim not found:', req.params.claim_number);
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update claim with deductible info
    try {
      await db.run(
        'UPDATE claims SET deductible_reason = ?, deductible_amount = ? WHERE claim_number = ?',
        [deductible_reason, deductible_amount, req.params.claim_number]
      );
    } catch (err) {
      console.error('[DEDUCTIBLE] Error updating claim:', err);
      throw err;
    }

    // Create or update deductible payment record
    const paymentLink = `https://insurify.local/payment/${req.params.claim_number}`;
    let dueDateStr;
    if (due_date) {
      dueDateStr = due_date;
    } else {
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + 7);
      dueDateStr = dueDateObj.toISOString().split('T')[0];
    }

    try {
      await db.run(
        `INSERT OR REPLACE INTO deductible_payments 
         (claim_number, deductible_amount, payment_link, due_date, payment_account_detail) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.claim_number, deductible_amount, paymentLink, dueDateStr, payment_account_detail]
      );
    } catch (err) {
      console.error('[DEDUCTIBLE] Error updating deductible_payments:', err);
      throw err;
    }

    res.json({
      message: 'Deductible information set',
      claim_number: req.params.claim_number,
      deductible_reason,
      deductible_amount,
      payment_link: paymentLink,
      due_date: dueDateStr,
      payment_account_detail
    });
  } catch (err) {
    console.error('[DEDUCTIBLE] Internal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark deductible as paid (user clicks "Mark as Paid" button)
router.put('/:claim_number/deductible-paid', async (req, res) => {
  try {
    const claim = await db.get('SELECT * FROM claims WHERE claim_number = ?', [req.params.claim_number]);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update deductible payment status to 'pending_review'
    await db.run(
      'UPDATE deductible_payments SET payment_status = ? WHERE claim_number = ?',
      ['pending_review', req.params.claim_number]
    );

    res.json({ 
      message: 'Payment marked as paid. Admin will review shortly.',
      claim_number: req.params.claim_number,
      payment_status: 'pending_review'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pending payments for admin (admin only)
router.get('/admin/pending-payments', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const payments = await db.all(
      `SELECT dp.*, c.customer_name, c.customer_email, c.claim_type 
       FROM deductible_payments dp
       JOIN claims c ON dp.claim_number = c.claim_number
       WHERE dp.payment_status = 'pending_review'
       ORDER BY dp.created_at DESC`,
      []
    );

    res.json(payments || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approve or reject payment (admin only)
router.put('/:claim_number/payment-review', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { payment_status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const claim = await db.get('SELECT * FROM claims WHERE claim_number = ?', [req.params.claim_number]);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update payment status and set payment_date if approved
    let updateQuery = 'UPDATE deductible_payments SET payment_status = ?';
    let params = [payment_status];
    
    if (payment_status === 'approved') {
      updateQuery += ', payment_date = CURRENT_TIMESTAMP';
    }
    
    updateQuery += ' WHERE claim_number = ?';
    params.push(req.params.claim_number);

    await db.run(updateQuery, params);

    res.json({ 
      message: `Payment ${payment_status}`,
      claim_number: req.params.claim_number,
      payment_status: payment_status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
