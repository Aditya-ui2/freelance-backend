const express = require('express');
const router = express.Router();
const { User } = require('../models');
const jwt = require('jsonwebtoken');

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

// Get all freelancers
router.get('/freelancers', async (req, res) => {
  try {
    const freelancers = await User.findAll({
      where: { userType: 'freelancer' },
      attributes: { exclude: ['password'] }
    });
    res.json(freelancers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all freelancers
router.get('/freelancers', auth, async (req, res) => {
  try {
    const { search, category } = req.query;
    let where = { userType: 'freelancer' };

    const { Op } = require('sequelize');
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { bio: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category && category !== 'All Categories') {
      // For freelancers, category matching is based on their title or skills
      where[Op.or] = [
        ...(where[Op.or] || []),
        { title: { [Op.like]: `%${category}%` } }
      ];
    }

    const freelancers = await User.findAll({
      where,
      attributes: ['id', 'name', 'avatar', 'title', 'skills', 'badges', 'trustScore', 'pocScore', 'rating', 'projectsCompleted', 'bio', 'createdAt'],
      order: [['trustScore', 'DESC']]
    });
    res.json(freelancers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const profileData = { ...req.body.profile };
    
    // Sanitize rate
    if (profileData.rate !== undefined) {
      const parsedRate = parseFloat(profileData.rate);
      profileData.rate = isNaN(parsedRate) ? 0 : parsedRate;
    }

    console.log(`Updating profile for user ${req.user.id}:`, profileData);

    await User.update(profileData, {
      where: { id: req.user.id }
    });
    
    const updatedUser = await User.findByPk(req.user.id, { 
      attributes: { exclude: ['password'] } 
    });
    
    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ 
      message: 'Failed to update profile', 
      error: err.message 
    });
  }
});

// Profile route included in the main profile fetch or specialized endpoint
router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Auto-seed demo data if empty (for presentation)
    if (user.transactions.length === 0 && user.balance === 0) {
      await user.update({
        balance: 4250,
        escrowBalance: 2800,
        pendingBalance: 500,
        transactions: [
          { id: "tx1", title: "Milestone 1: UI Design", project: "E-commerce Redesign", amount: 450, status: "Released", date: "Today", type: "income" },
          { id: "tx2", title: "Milestone 2: Frontend Dev", project: "SaaS Dashboard", amount: 1200, status: "Locked in Escrow", date: "Exp. Apr 20", type: "escrow" },
          { id: "tx3", title: "Project Deposit", project: "Portfolio Website", amount: 200, status: "Pending", date: "Apr 12", type: "pending" },
        ]
      });
    }

    // Auto-seed default certifications if empty
    if (!user.certifications || user.certifications.length === 0) {
      await user.update({
        certifications: [
          { title: "React Architecture Pro", level: "Advanced", status: "In Progress", progress: 0 },
          { title: "UI/UX Design Masterclass", level: "Expert", status: "In Progress", progress: 0 },
          { title: "Freelance Client Management", level: "Essential", status: "In Progress", progress: 0 },
        ]
      });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add POC
router.post('/profile/pocs', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const currentPocs = user.pocs || [];
    const newPoc = {
      id: Date.now().toString(),
      ...req.body,
      date: 'Just now',
      views: 0
    };
    
    const updatedPocs = [...currentPocs, newPoc];
    await user.update({ pocs: updatedPocs });
    res.json(newPoc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete POC
router.delete('/profile/pocs/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const updatedPocs = (user.pocs || []).filter(p => p.id !== req.params.id);
    await user.update({ pocs: updatedPocs });
    res.json({ message: 'POC deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update POC
router.put('/profile/pocs/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let currentPocs = user.pocs || [];
    const index = currentPocs.findIndex(p => p.id === req.params.id);
    
    if (index === -1) return res.status(404).json({ message: 'POC not found' });
    
    // Update the POC at the found index
    currentPocs[index] = {
      ...currentPocs[index],
      ...req.body,
      date: 'Updated just now' // Refresh date on update
    };
    
    await user.update({ pocs: currentPocs });
    res.json(currentPocs[index]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment profile views
router.patch('/view/:id', async (req, res) => {
  try {
    await User.increment('profileViews', { by: 1, where: { id: req.params.id } });
    res.json({ message: 'View incremented' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Academy certification progress
router.post('/profile/academy/update', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { title, progress, status } = req.body;
    let certifications = [...(user.certifications || [])];
    
    const index = certifications.findIndex(c => c.title === title);
    const now = new Date();

    // Global Lockdown Check: 30 hours for ANY attempt across ANY course
    const latestAttempt = certifications.reduce((latest, c) => {
      if (!c.lastAttemptAt) return latest;
      const attemptDate = new Date(c.lastAttemptAt);
      return !latest || attemptDate > latest ? attemptDate : latest;
    }, null);

    if (latestAttempt) {
      const hoursSince = (now - latestAttempt) / (1000 * 60 * 60);
      if (hoursSince < 30) {
        return res.status(403).json({ 
          message: 'Academy global cooldown active', 
          remainingHours: Math.ceil(30 - hoursSince) 
        });
      }
    }

    if (index !== -1) {
      certifications[index] = { 
        ...certifications[index], 
        progress: Math.min(100, progress), 
        status: progress >= 100 ? 'Earned' : status,
        lastAttemptAt: now.toISOString()
      };
    } else {
      certifications.push({ 
        title, 
        level: "Professional", 
        status, 
        progress, 
        lastAttemptAt: now.toISOString() 
      });
    }

    await user.update({ certifications });
    res.json(certifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Claim Rising Star Boost
router.post('/profile/academy/claim-boost', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify milestones
    const pocCount = (user.pocs || []).length;
    const certCount = (user.certifications || []).filter(c => c.status === 'Earned').length;
    const hasProfile = !!(user.bio && user.title);

    if (pocCount < 3 || certCount < 1 || !hasProfile) {
      return res.status(400).json({ 
        message: 'Milestones not met', 
        details: { pocCount, certCount, hasProfile } 
      });
    }

    // Apply boost
    const newTrustScore = Math.min(100, (user.trustScore || 0) + 15);
    let badges = [...(user.badges || [])];
    if (!badges.some(b => b.name === 'Rising Star')) {
      badges.push({ id: 'badge_rising_star', name: 'Rising Star', status: 'Verified' });
    }

    await user.update({ 
      trustScore: newTrustScore,
      badges,
      repStakeStatus: 'complete' // Assuming this triggers the glow or search boost
    });

    res.json({ success: true, trustScore: newTrustScore, badges });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
