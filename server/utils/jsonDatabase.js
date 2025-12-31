// server/routes/auth.js
const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');
const authMiddleware = require('../middleware/auth');

// Request login link
router.post('/login', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Generate login link
    const loginLink = telegramService.generateLoginLink(userId);
    
    res.json({ 
      success: true, 
      loginLink,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(loginLink)}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify login status
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await telegramService.verifyLogin(req.user.telegramId, token);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
