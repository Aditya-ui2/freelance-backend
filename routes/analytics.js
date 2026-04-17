const express = require('express');
const router = express.Router();
const { Project, Application, User } = require('../models');
const { Sequelize } = require('sequelize');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/client-dashboard', auth, async (req, res) => {
  console.log('>>> [ANALYTICS] Fetching Client Dashboard for:', req.user.id);
  const clientId = req.user.id;

  // Initialize all stats with safety defaults
  let stats = [];
  let weeklyChart = [];
  let hiredApps = [];
  let totalProjects = 0;
  let totalProposals = 0;
  let totalSpent = 0;
  let activeEscrow = 0;
  let avgVelocity = "N/A";
  let fulfillmentRate = 0;
  let distribution = [];
  let freelancers = [];
  let recentProjects = [];
  let latestProject = null;

  try {
    // 1. Base Data
    try {
      hiredApps = await Application.findAll({
        where: { status: 'hired' },
        include: [{ model: Project, as: 'Project', where: { clientId } }]
      }) || [];
    } catch (e) { console.error('Error fetching hiredApps:', e.message); }

    try {
      totalProjects = await Project.count({ where: { clientId } }) || 0;
    } catch (e) { console.error('Error counting projects:', e.message); }

    try {
      totalProposals = await Application.count({
        include: [{ model: Project, as: 'Project', where: { clientId } }]
      }) || 0;
    } catch (e) { console.error('Error counting proposals:', e.message); }

    // 2. Financial Calculations
    try {
      activeEscrow = hiredApps
        .filter(app => app.Project && app.Project.status === 'in-progress')
        .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

      totalSpent = hiredApps
        .filter(app => app.Project && app.Project.status === 'completed')
        .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
    } catch (e) { console.error('Error calculating finances:', e.message); }

    // 3. Velocity & Fulfillment
    try {
      const completedCount = hiredApps.filter(app => app.Project && app.Project.status === 'completed').length;
      fulfillmentRate = totalProjects > 0 ? Math.round((completedCount / totalProjects) * 100) : 0;
      
      if (hiredApps.length > 0) {
        const velocities = hiredApps.map(app => {
          const created = new Date(app.Project?.createdAt || Date.now());
          const hired = new Date(app.updatedAt);
          const diff = (hired - created) / (1000 * 60 * 60 * 24);
          return isNaN(diff) ? 0 : diff;
        });
        avgVelocity = (velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(1);
      }
    } catch (e) { console.error('Error calculating velocity:', e.message); }

    // 4. Distribution & Recent
    try {
      distribution = await Project.findAll({
        where: { clientId, status: ['in-progress', 'completed'] },
        attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('category')), 'count']],
        group: ['category']
      }) || [];
    } catch (e) { console.error('Error fetching distribution:', e.message); }

    try {
      const rawRecent = await Project.findAll({
        where: { clientId },
        limit: 5,
        order: [['updatedAt', 'DESC']]
      }) || [];
      
      recentProjects = await Promise.all(rawRecent.map(async (p) => {
        try {
          const pJson = p.get({ plain: true });
          const apps = await Application.findAll({
            where: { projectId: pJson.id, status: 'hired' },
            include: [{ model: User, as: 'Freelancer', attributes: ['name', 'avatar'] }]
          }) || [];
          pJson.ProjectApplications = apps;
          return pJson;
        } catch (innerE) { return p.get({ plain: true }); }
      }));
    } catch (e) { console.error('Error fetching recent projects:', e.message); }

    // 5. Weekly Chart (Robust flow)
    try {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const now = new Date();
      let cumulativeSpent = 0;
      
      weeklyChart = days.map((day, idx) => {
        const dayOfWeek = (idx + 1) % 7;
        const daySpent = hiredApps
          .filter(app => new Date(app.updatedAt).getDay() === dayOfWeek)
          .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
        cumulativeSpent += daySpent;
        return { day, earnings: cumulativeSpent };
      });
    } catch (e) { console.error('Error building Chart:', e.message); }

    // 6. Talent Data
    try {
      freelancers = await User.findAll({
        where: { userType: 'freelancer' },
        attributes: ['id', 'name', 'avatar', 'title', 'skills', 'trustScore', 'pocScore', 'rating', 'projectsCompleted'],
        limit: 10
      }) || [];
      
      latestProject = await Project.findOne({
        where: { clientId },
        order: [['createdAt', 'DESC']]
      });
    } catch (e) { console.error('Error fetching talent:', e.message); }

    // Final Assembly
    res.json({
      activeScans: freelancers.length || 0,
      stats: [
        { label: "Posted Projects", value: totalProjects.toString(), icon: "Briefcase", change: "+1", positive: true, color: "bg-blue-50 text-[#1A56DB]" },
        { label: "Total Proposals", value: totalProposals.toString(), icon: "MessageSquare", change: `+${totalProposals}`, positive: true, color: "bg-amber-50 text-[#F59E0B]" },
        { label: "Hired Freelancers", value: hiredApps.length.toString(), icon: "User", change: `+${hiredApps.length}`, positive: true, color: "bg-emerald-50 text-[#10B981]" },
        { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: "DollarSign", change: "+15%", positive: true, color: "bg-indigo-50 text-[#6366F1]" },
      ],
      weeklyChart,
      chartData: weeklyChart,
      finance: {
        activeEscrow: activeEscrow,
        totalSpent: totalSpent,
        pendingInvoices: hiredApps.filter(a => a.Project?.status === 'in-progress').length,
        recentTransactions: recentProjects.map(p => {
            const hiredBidsSum = (p.ProjectApplications || []).reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
            return {
              id: p.id,
              title: p.title,
              amount: hiredBidsSum > 0 ? hiredBidsSum : Number(p.budget || 0),
              status: p.status === 'completed' ? 'RELEASED' : 'LOCKED IN ESCROW',
              freelancer: p.ProjectApplications?.[0]?.Freelancer?.name || 'Assigned',
              date: new Date(p.updatedAt).toLocaleDateString()
            };
        })
      },
      insights: {
        hiringVelocity: avgVelocity,
        fulfillmentRate,
        talentDistribution: distribution.map(d => ({ name: d.category, count: d.get('count') || 0 }))
      },
      freelancers: freelancers.map(f => f.get({ plain: true })),
      latestProjectSkills: latestProject?.skills || []
    });

  } catch (globalErr) {
    console.error('CRITICAL ANALYTICS FAILURE:', globalErr);
    res.status(200).json({ // Return status 200 with empty state to prevent frontend crash
        error: true,
        message: "Analytics currently updating",
        stats: [],
        weeklyChart: [],
        freelancers: []
    });
  }
});

router.get('/freelancer-dashboard', auth, async (req, res) => {
  const freelancerId = req.user.id;
  try {
    const myApps = await Application.findAll({
      where: { freelancerId },
      include: [{ model: Project, as: 'Project' }]
    }) || [];

    const user = await User.findByPk(freelancerId);
    
    const activeBidsCount = myApps.filter(a => ['pending', 'viewed', 'shortlisted'].includes(a.status)).length;
    const projectsWonCount = user?.projectsCompleted || 0; 
    const totalEarnings = myApps
      .filter(a => a.status === 'hired')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
    const profileViews = user?.profileViews || 0; 

    // Chart
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let cumulativeSum = 0;
    const weeklyChart = days.map((day, index) => {
      const dayOfWeek = (index + 1) % 7; 
      const dayEarnings = myApps
        .filter(a => ['hired', 'accepted'].includes(a.status) && new Date(a.updatedAt).getDay() === dayOfWeek)
        .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
      cumulativeSum += dayEarnings;
      return { day, earnings: cumulativeSum };
    });

    res.json({
      stats: [
        { label: "Active Bids", value: activeBidsCount.toString(), change: "+1", positive: true, color: "bg-blue-50 text-[#1A56DB]" },
        { label: "Projects Won", value: projectsWonCount.toString(), change: "+2", positive: true, color: "bg-amber-50 text-[#F59E0B]" },
        { label: "Total Earnings", value: `$${totalEarnings.toLocaleString()}`, change: "+10%", positive: true, color: "bg-emerald-50 text-[#10B981]" },
        { label: "Profile Views", value: profileViews.toString(), change: "-5", positive: false, color: "bg-indigo-50 text-[#6366F1]" },
      ],
      weeklyChart,
      chartData: weeklyChart,
      totalEarnings
    });
  } catch (err) {
    res.status(200).json({ stats: [], weeklyChart: [], totalEarnings: 0 });
  }
});

module.exports = router;
