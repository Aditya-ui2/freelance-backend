const express = require('express');
const router = express.Router();
const { Conversation, Message, User } = require('../models');
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

// Get all conversations for current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const conversations = await user.getConversations({
      include: [
        {
          model: User,
          as: 'Participants',
          attributes: ['id', 'name', 'avatar', 'title'],
          where: { id: { [Op.ne]: req.user.id } }
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start or find a conversation with another user
router.post('/conversations', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    console.log(`💬 CHAT_START_REQUEST: From ${req.user.id} to ${participantId}`);

    if (participantId === req.user.id) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    // 1. Verify participant exists
    const targetUser = await User.findByPk(participantId);
    if (!targetUser) {
      console.error(`❌ CHAT_ERROR: Target user ${participantId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Check for existing 1-on-1 conversation
    const user = await User.findByPk(req.user.id);
    const conversations = await user.getConversations({
      include: [{
        model: User,
        as: 'Participants',
        where: { id: participantId }
      }]
    });

    if (conversations.length > 0) {
      console.log(`✅ CHAT_FOUND: Reusing conversation ${conversations[0].id}`);
      return res.json(conversations[0]);
    }

    // 3. Create new conversation
    console.log(`🆕 CHAT_CREATING: New conversation for ${req.user.id} and ${participantId}`);
    const conversation = await Conversation.create({
      lastMessage: 'Started a new conversation',
      lastMessageAt: new Date()
    });
    
    // 4. Add participants
    await conversation.addParticipants([req.user.id, participantId]);
    
    // 5. Fetch full conversation with participants
    const fullConvo = await Conversation.findByPk(conversation.id, {
      include: [{
        model: User,
        as: 'Participants',
        attributes: ['id', 'name', 'avatar', 'title']
      }]
    });

    res.status(201).json(fullConvo);
  } catch (err) {
    console.error('SERVER_ERROR_CREATE_CONVO:', err);
    res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { conversationId: req.params.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a message
router.post('/messages', auth, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    
    const message = await Message.create({
      conversationId,
      senderId: req.user.id,
      content
    });

    // Update conversation last message
    await Conversation.update(
      { lastMessage: content, lastMessageAt: new Date() },
      { where: { id: conversationId } }
    );

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
