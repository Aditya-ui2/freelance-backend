const { Notification } = require('../models');

class NotificationService {
  async create({ userId, type, title, description, link }) {
    try {
      const notification = await Notification.create({
        userId,
        type: type || 'system',
        title,
        description,
        link,
        read: false
      });
      return notification;
    } catch (err) {
      console.error('Notification Service Error:', err);
      return null;
    }
  }

  async notifyClientOnBid(project, freelancerName) {
    return this.create({
      userId: project.clientId,
      type: 'bid',
      title: 'New Bid Received',
      description: `${freelancerName} has submitted a bid for "${project.title}"`,
      link: 'received-applications'
    });
  }

  async notifyFreelancerOnStatus(application, status) {
    const titles = {
      hired: "You're Hired! 🚀",
      shortlisted: "Application Shortlisted!",
      viewed: "Bid Viewed"
    };
    
    return this.create({
      userId: application.freelancerId,
      type: status === 'hired' ? 'milestone' : 'bid',
      title: titles[status] || 'Update on your Bid',
      description: `Your bid for "${application.Project.title}" has been ${status}.`,
      link: 'dashboard'
    });
  }

  async notifyFreelancerOnComplete(project, freelancerId) {
    return this.create({
      userId: freelancerId,
      type: 'milestone',
      title: 'Project Completed! 🎉',
      description: `The project "${project.title}" has been marked as complete. Funds released!`,
      link: 'payments'
    });
  }
}

module.exports = new NotificationService();
