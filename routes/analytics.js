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
  try {
    const clientId = req.user.id;

    // 1. Finance Metrics (Bid-based calculation - Robust version)
    const allHiredApps = await Application.findAll({
      where: { status: 'hired' },
      include: [{
        model: Project,
        as: 'Project'
      }]
    });

    // Safe filtering with String comparison
    const hiredApps = allHiredApps.filter(app => app.Project && String(app.Project.clientId) === String(clientId));

    const activeEscrow = hiredApps
      .filter(app => app.Project.status === 'in-progress')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    const totalSpent = hiredApps
      .filter(app => app.Project.status === 'completed')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
    
    // Recent Transactions
    const rawRecentProjects = await Project.findAll({
      where: { clientId },
      limit: 5,
      order: [['updatedAt', 'DESC']]
    });

    const recentProjects = await Promise.all(rawRecentProjects.map(async (p) => {
      const project = p.get({ plain: true });
      const apps = await Application.findAll({
        where: { projectId: project.id, status: 'hired' },
        include: [{ model: User, as: 'Freelancer', attributes: ['name', 'avatar'] }]
      });
      project.ProjectApplications = apps;
      return project;
    }));

    // 2. Insights Metrics
    const totalProjects = await Project.count({ where: { clientId } });
    const completedProjectsCount = await Project.count({ where: { clientId, status: 'completed' } });
    const fulfillmentRate = totalProjects > 0 ? Math.round((completedProjectsCount / totalProjects) * 100) : 0;

    const totalProposals = await Application.count({
      include: [{
        model: Project,
        as: 'Project',
        where: { clientId }
      }]
    });

    const hiredFreelancersCount = new Set(hiredApps.map(a => a.freelancerId)).size;

    let avgVelocity = 0;
    if (hiredApps.length > 0) {
      const velocities = hiredApps.map(app => {
        const created = new Date(app.Project.createdAt);
        const hired = new Date(app.updatedAt);
        return (hired - created) / (1000 * 60 * 60 * 24); // days
      });
      avgVelocity = (velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(1);
    } else {
      avgVelocity = "4.2";
    }

    const distribution = await Project.findAll({
      where: { clientId, status: ['in-progress', 'completed'] },
      attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('category')), 'count']],
      group: ['category']
    });

    // 3. Chart Data - Cumulative Spend Flow
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Baseline: Spent before the last 7 days
    let cumulativeSpent = hiredApps
      .filter(app => {
        const date = new Date(app.updatedAt);
        return (app.Project.status === 'completed' || app.Project.status === 'in-progress') &&
               (now - date) >= (7 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    const weeklyChart = [];
    days.forEach((day, index) => {
      const dayOfWeek = (index + 1) % 7; 
      const daySpent = hiredApps
        .filter(app => {
          const updatedDate = new Date(app.updatedAt);
          return updatedDate.getDay() === dayOfWeek && 
                 (now - updatedDate) < (7 * 24 * 60 * 60 * 1000);
        })
        .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);
      
      cumulativeSpent += daySpent;
      weeklyChart.push({ day, earnings: cumulativeSpent });
    });

    // 4. Radar & Talent Data
    const latestProject = await Project.findOne({
      where: { clientId },
      order: [['createdAt', 'DESC']]
    });

    const totalFreelancers = await User.count({ where: { userType: 'freelancer' } });

    const freelancers = await User.findAll({
      where: { userType: 'freelancer' },
      attributes: ['id', 'name', 'avatar', 'title', 'skills', 'trustScore', 'pocScore', 'rating', 'projectsCompleted'],
      limit: 10
    });

    res.json({
      activeScans: totalFreelancers,
      stats: [
        { label: "Posted Projects", value: totalProjects.toString(), icon: "Briefcase", change: "+1", positive: true, color: "bg-blue-50 text-[#1A56DB]" },
        { label: "Total Proposals", value: totalProposals.toString(), icon: "MessageSquare", change: `+${totalProposals}`, positive: true, color: "bg-amber-50 text-[#F59E0B]" },
        { label: "Hired Freelancers", value: hiredFreelancersCount.toString(), icon: "User", change: `+${hiredFreelancersCount}`, positive: true, color: "bg-emerald-50 text-[#10B981]" },
        { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: "DollarSign", change: "+15%", positive: true, color: "bg-indigo-50 text-[#6366F1]" },
      ],
      weeklyChart,
      chartData: weeklyChart,
      finance: {
        activeEscrow: Number(activeEscrow) || 0,
        totalSpent: Number(totalSpent) || 0,
        pendingInvoices: hiredApps.filter(app => app.Project.status === 'in-progress').length,
        recentTransactions: recentProjects.map(p => {
          const hiredBidsSum = p.ProjectApplications
            ? p.ProjectApplications.reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0)
            : 0;
          
          return {
            id: p.id,
            title: p.title,
            amount: hiredBidsSum > 0 ? hiredBidsSum : Number(p.budget),
            status: p.status === 'completed' ? 'RELEASED' : 'LOCKED IN ESCROW',
            freelancer: p.ProjectApplications?.[0]?.Freelancer?.name || 'Assigned',
            date: new Date(p.updatedAt).toLocaleDateString()
          };
        })
      },
      insights: {
        hiringVelocity: avgVelocity,
        fulfillmentRate,
        talentDistribution: distribution.map(d => ({
          name: d.category,
          count: d.get('count')
        }))
      },
      freelancers: freelancers,
      latestProjectSkills: latestProject?.skills || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/freelancer-dashboard', auth, async (req, res) => {
  try {
    const freelancerId = req.user.id;

    // 1. App-based Stats
    const myApps = await Application.findAll({
      where: { freelancerId },
      include: [{ model: Project, as: 'Project' }]
    });

    const user = await User.findByPk(freelancerId);

    const activeBidsCount = myApps.filter(a => ['pending', 'viewed', 'shortlisted'].includes(a.status)).length;
    const projectsWonCount = user?.projectsCompleted || 0; 
    
    // Total Earnings (Bid-based)
    const totalEarnings = myApps
      .filter(a => a.status === 'hired')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    const profileViews = user?.profileViews || 0; 

    // 2. Chart Data - Cumulative Earnings Flow (Robust)
    const now = new Date();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // 1. Calculate Start of Current Week (Monday)
    const startOfThisWeek = new Date(now);
    const currentDay = now.getDay(); // 0=Sun, 1=Mon...
    const diff = now.getDate() - (currentDay === 0 ? 6 : currentDay - 1); // Adjust for Monday start
    startOfThisWeek.setDate(diff);
    startOfThisWeek.setHours(0,0,0,0);

    // 2. Baseline: Everything earned BEFORE this Monday
    let cumulativeSum = myApps
      .filter(a => {
        const updatedDate = new Date(a.updatedAt);
        const isPaid = ['hired', 'accepted'].includes(a.status) || (a.Project && a.Project.status === 'completed');
        return isPaid && updatedDate < startOfThisWeek;
      })
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    // 3. Weekly buckets
    const weeklyChart = [];
    res.json({
      stats: [
        { label: "Active Bids", value: activeBidsCount.toString(), change: "+1", positive: true, color: "bg-blue-50 text-[#1A56DB]" },
        { label: "Projects Won", value: projectsWonCount.toString(), change: "+2", positive: true, color: "bg-amber-50 text-[#F59E0B]" },
        { label: "Total Earnings", value: `$${allTimeEarnings.toLocaleString()}`, change: `+$${allTimeEarnings > 0 ? (allTimeEarnings*0.1).toFixed(0) : 0}`, positive: true, color: "bg-emerald-50 text-[#10B981]" },
        { label: "Profile Views", value: profileViews.toString(), change: "-5", positive: false, color: "bg-indigo-50 text-[#6366F1]" },
      ],
      weeklyChart,
      chartData: weeklyChart,
      totalEarnings: allTimeEarnings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
