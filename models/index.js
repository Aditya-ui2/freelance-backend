const User = require('./User');
const Project = require('./Project');
const Application = require('./Application');
const Post = require('./Post');
const Comment = require('./Comment');
const Challenge = require('./Challenge');
const Conversation = require('./Conversation');
const Message = require('./Message');
const ConversationParticipants = require('./ConversationParticipants');
const Notification = require('./Notification');

// User <-> Project (Client)
User.hasMany(Project, { as: 'ClientProjects', foreignKey: 'clientId' });
Project.belongsTo(User, { as: 'Client', foreignKey: 'clientId' });

// User <-> Application (Freelancer)
User.hasMany(Application, { as: 'FreelancerApplications', foreignKey: 'freelancerId' });
Application.belongsTo(User, { as: 'Freelancer', foreignKey: 'freelancerId' });

// Project <-> Application
Project.hasMany(Application, { as: 'ProjectApplications', foreignKey: 'projectId' });
Application.belongsTo(Project, { as: 'Project', foreignKey: 'projectId' });

// User <-> Post
User.hasMany(Post, { as: 'Posts', foreignKey: 'authorId' });
Post.belongsTo(User, { as: 'Author', foreignKey: 'authorId' });

// Post <-> Comment
Post.hasMany(Comment, { as: 'Comments', foreignKey: 'postId' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// User <-> Comment
User.hasMany(Comment, { as: 'UserComments', foreignKey: 'authorId' });
Comment.belongsTo(User, { as: 'Author', foreignKey: 'authorId' });

// User <-> Conversation (Participants)
User.belongsToMany(Conversation, { through: ConversationParticipants, as: 'Conversations' });
Conversation.belongsToMany(User, { through: ConversationParticipants, as: 'Participants' });

// Conversation <-> Message
Conversation.hasMany(Message, { as: 'Messages', foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

// Message <-> User (Sender)
User.hasMany(Message, { as: 'SentMessages', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });

// User <-> Notification
User.hasMany(Notification, { as: 'Notifications', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'User', foreignKey: 'userId' });

module.exports = {
  User,
  Project,
  Application,
  Post,
  Comment,
  Challenge,
  Conversation,
  Message,
  ConversationParticipants,
  Notification
};
