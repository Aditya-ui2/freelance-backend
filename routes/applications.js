const express = require('express');
const router = express.Router();
const { Application, Project, User, Notification } = require('../models');
const notifService = require('../services/notifService');
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

// Apply for a project
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'freelancer') return res.status(403).json({ message: 'Only freelancers can apply' });
    
    const { projectId, proposal, bidAmount, pocContent, pocType, pocImageUrl, pocTitle, stakedBadgeId } = req.body;
    
    // Check for existing application
    const existing = await Application.findOne({ 
      where: { projectId, freelancerId: req.user.id } 
    });
    if (existing) return res.status(400).json({ message: 'Already applied' });

    const application = await Application.create({
      projectId,
      freelancerId: req.user.id,
      proposal,
      bidAmount,
      pocContent,
      pocType,
      pocImageUrl,
      pocTitle,
      stakedBadgeId,
      status: 'pending'
    });

    // Notify Client
    await notifService.notifyClientOnBid(project, req.user.name);
    
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get applications received by client
router.get('/received', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'client') return res.status(403).json({ message: 'Only clients can view received applications' });

    const applications = await Application.findAll({
      include: [
        {
          model: Project,
          as: 'Project',
          where: { clientId: req.user.id },
          attributes: ['title', 'skills']
        },
        {
          model: User,
          as: 'Freelancer',
          attributes: ['id', 'name', 'avatar', 'title', 'skills', 'badges', 'trustScore', 'pocScore', 'rating']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my applications
router.get('/my-applications', auth, async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { freelancerId: req.user.id },
      include: [{
        model: Project,
        as: 'Project',
        include: [{
          model: User,
          as: 'Client',
          attributes: ['id', 'name', 'avatar', 'trustScore', 'pocScore']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Withdraw application
router.delete('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    if (application.freelancerId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized removal' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Can only withdraw pending applications' });
    }

    await application.destroy();
    res.json({ message: 'Application withdrawn successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update application status (Hire/Reject)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (req.user.userType !== 'client') return res.status(403).json({ message: 'Only clients can update status' });

    const application = await Application.findByPk(req.params.id, {
      include: [{
        model: Project,
        as: 'Project'
      }]
    });

    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    // Verify client owns the project
    if (application.Project.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized profile update' });
    }

    application.status = status;
    await application.save();

    // Notify Freelancer
    if (['hired', 'viewed', 'shortlisted'].includes(status)) {
        await notifService.notifyFreelancerOnStatus(application, status);
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get hired applications for client
router.get('/hired', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'client') return res.status(403).json({ message: 'Only clients can view hired talent' });

    const applications = await Application.findAll({
      where: { status: 'hired' },
      include: [
        {
          model: Project,
          as: 'Project',
          where: { clientId: req.user.id }
        },
        {
          model: User,
          as: 'Freelancer',
          attributes: ['id', 'name', 'avatar', 'title', 'skills', 'trustScore', 'pocScore']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
