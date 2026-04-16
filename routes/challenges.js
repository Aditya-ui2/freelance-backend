const express = require('express');
const router = express.Router();
const { Challenge, User } = require('../models');
const jwt = require('jsonwebtoken');

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all challenges
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const now = new Date();
    
    // Check cooldown
    if (user.lastChallengeAt) {
      const diff = now - new Date(user.lastChallengeAt);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (diff < sevenDays) {
        return res.json({ 
          cooldown: true, 
          nextAvailableAt: new Date(new Date(user.lastChallengeAt).getTime() + sevenDays),
          message: 'Cooldown active' 
        });
      }
    }

    const challenges = await Challenge.findAll();
    res.json({ cooldown: false, challenges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify a challenge solution
router.post('/:id/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Double check cooldown
    const now = new Date();
    if (user.lastChallengeAt) {
      const diff = now - new Date(user.lastChallengeAt);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (diff < sevenDays) {
        return res.status(403).json({ message: 'You must wait 7 days between attempts.' });
      }
    }

    // Set cooldown immediately (regardless of result)
    await user.update({ lastChallengeAt: now });

    // Securely (as much as possible for demo) evaluate user code
    let passed = false;
    let error = null;
    try {
      // In a real app, use a sandboxed runner like 'vm2' or a separate container
      const testFn = new Function('input', `
        ${code}
      `);
      const result = testFn(JSON.parse(challenge.testCaseInput || '{}'));
      passed = String(result) === String(challenge.expectedOutput);
    } catch (err) {
      error = err.message;
    }

    const currentTasks = user.microTasks || [];
    const newTaskEntry = {
      id: challenge.id,
      title: challenge.title,
      status: passed ? 'success' : 'fail',
      completedAt: now,
      error: error
    };

    const updatedTasks = [...currentTasks, newTaskEntry];

    await user.update({
      trustScore: passed ? (user.trustScore || 0) + challenge.reward : user.trustScore,
      microTasks: updatedTasks
    });

    res.json({ 
      success: passed, 
      message: passed ? '✅ Correct! Trust score increased.' : `❌ Incorrect: ${error || 'Solution did not match expected output.'}`,
      trustScore: user.trustScore,
      nextAvailableAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ message: 'Internal server error during verification' });
  }
});

module.exports = router;
