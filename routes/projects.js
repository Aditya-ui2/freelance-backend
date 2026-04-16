const express = require('express');
const router = express.Router();
const { Project, User, Application } = require('../models');
const notifService = require('../services/notifService');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

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

// Create a project
router.post('/', auth, async (req, res) => {
  try {
    console.log('--- Project Creation Request ---');
    console.log('User:', req.user);
    console.log('Body:', req.body);

    if (req.user.userType !== 'client') {
      return res.status(403).json({ message: 'Only clients can post projects' });
    }

    const project = await Project.create({
      title: req.body.title,
      description: req.body.description,
      budget: req.body.budget,
      category: req.body.category,
      deadline: req.body.deadline,
      skills: JSON.stringify(req.body.skills || []),
      clientId: req.user.id
    });
    
    console.log('✅ Project Created:', project.id);
    res.status(201).json(project);
  } catch (err) {
    console.error('❌ Project Creation Error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    const { category, search, minBudget, maxBudget, newTalent } = req.query;
    let where = { status: 'open' };
    
    if (category && category !== 'All Categories') {
      where.category = category;
    }
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget[Op.gte] = parseInt(minBudget);
      if (maxBudget) where.budget[Op.lte] = parseInt(maxBudget);
    }

    if (newTalent === 'true') {
      where.isNewTalentFriendly = true;
    }
    
    // Optional Auth: Get current user if token exists
    let currentFreelancerId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        currentFreelancerId = decoded.id;
      } catch (e) { /* ignore invalid token */ }
    }
    
    const projects = await Project.findAll({
      where,
      include: [
        {
          model: User,
          as: 'Client',
          attributes: ['name', 'avatar', 'title']
        },
        {
          model: Application,
          as: 'ProjectApplications',
          attributes: ['freelancerId']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Map projects and check if applied
    const projectsWithAppliedStatus = projects.map(p => {
      const projectJson = p.toJSON();
      const hasApplied = currentFreelancerId 
        ? projectJson.ProjectApplications?.some(app => app.freelancerId === currentFreelancerId)
        : false;
      
      delete projectJson.ProjectApplications; // Don't leak other applicants
      return { ...projectJson, hasApplied };
    });

    res.json(projectsWithAppliedStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get projects by client
router.get('/my-projects', auth, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { clientId: req.user.id }
    });

    // Simplify data structure for frontend (Manual fetch to ensure stability)
    const plainProjects = await Promise.all(projects.map(async (p) => {
      const projectJson = p.get({ plain: true });
      const apps = await Application.findAll({
        where: { projectId: projectJson.id, status: 'hired' },
        include: [{ 
          model: User, 
          as: 'Freelancer', 
          attributes: ['id', 'name', 'avatar', 'title', 'skills', 'bio', 'rating'] 
        }]
      });
      
      projectJson.ProjectApplications = apps.map(app => {
        const appJson = app.get({ plain: true });
        return {
          ...appJson,
          freelancerName: appJson.Freelancer?.name || 'Hired Talent',
          freelancerAvatar: appJson.Freelancer?.avatar,
          freelancerInfo: appJson.Freelancer // Store full data for modal
        };
      });
      
      return projectJson;
    }));

    res.json(plainProjects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Complete a project
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`[Project Complete] Request - Project ID: ${id}, User ID: ${userId}`);

    const project = await Project.findOne({
      where: { id, clientId: userId }
    });

    if (!project) {
      console.log(`[Project Complete] ❌ Project not found or unauthorized for User: ${userId}`);
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }

    console.log(`[Project Complete] ✅ Found Project: ${project.title}. Proceeding with status update and payments.`);

    if (project.status === 'completed') {
      return res.status(400).json({ message: 'Project already completed' });
    }

    project.status = 'completed';
    await project.save();

    // Handle Payment logic for all hired freelancers
    const hiredApps = await Application.findAll({
      where: { projectId: project.id, status: 'hired' }
    });
    for (const app of hiredApps) {
      const freelancer = await User.findByPk(app.freelancerId);
      if (freelancer) {
        const paymentAmount = parseInt(app.bidAmount) || project.budget;
        
        // Update freelancer balance and stats
        await freelancer.update({
          balance: (freelancer.balance || 0) + paymentAmount,
          projectsCompleted: (freelancer.projectsCompleted || 0) + 1
        });

        // Add to freelancer transaction history (Ensure a new array is created for Sequelize change tracking)
        const freelancerTransactions = [...(freelancer.transactions || [])];
        freelancerTransactions.unshift({
          id: `tx_fr_${Date.now()}_${freelancer.id}`,
          title: `Payment for ${project.title}`,
          project: project.title,
          amount: paymentAmount,
          status: "Released",
          date: new Date().toLocaleDateString(),
          type: "income"
        });
        await freelancer.update({ transactions: freelancerTransactions });
        
        // Add to client transaction history
        const client = await User.findByPk(userId);
        if (client) {
          const clientTransactions = [...(client.transactions || [])];
          clientTransactions.unshift({
            id: `tx_cl_${Date.now()}_${client.id}`,
            title: `Payment to ${freelancer.name}`,
            project: project.title,
            amount: paymentAmount,
            status: "Released",
            date: new Date().toLocaleDateString(),
            type: "expense"
          });
          await client.update({ transactions: clientTransactions });
        }

        console.log(`✅ Paid ${freelancer.name}: $${paymentAmount}`);

        // Notify Freelancer
        await notifService.notifyFreelancerOnComplete(project, freelancer.id);
      }
    }

    res.json(project);
  } catch (err) {
    console.error('Error completing project:', err);
    res.status(500).json({ message: err.message });
  }
});

// Rate a freelancer after project completion
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body; // expected: 1-5
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const project = await Project.findOne({ where: { id, clientId: userId } });
    if (!project) {
      return res.status(404).json({ message: 'Project not found or unauthorized' });
    }
    if (project.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate a completed project' });
    }

    // Get all hired freelancers for this project and update their rating
    const hiredApps = await Application.findAll({
      where: { projectId: project.id, status: 'hired' }
    });

    for (const app of hiredApps) {
      const freelancer = await User.findByPk(app.freelancerId);
      if (freelancer) {
        const completed = freelancer.projectsCompleted || 1;
        const currentRating = freelancer.rating || 0;
        // Running average: ((old_rating * (completed-1)) + new_rating) / completed
        const newRating = parseFloat(
          (((currentRating * (completed - 1)) + parseFloat(rating)) / completed).toFixed(1)
        );
        await freelancer.update({ rating: newRating });
        console.log(`⭐ Rated ${freelancer.name}: ${newRating}`);
      }
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Error rating freelancer:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
