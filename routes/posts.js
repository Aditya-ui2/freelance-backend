const express = require('express');
const router = express.Router();
const { Post, User, Comment, Project } = require('../models');
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

// Get lounge stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.count();
    // Simulate active users as a percentage of total
    const activeNow = Math.floor(totalUsers * 0.4) + Math.floor(Math.random() * 50);
    
    // Success stories = completed projects + earned certs this week
    const lastWeek = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedProjects = await Project.count({ where: { status: 'completed', updatedAt: { [Op.gt]: lastWeek } } });
    
    // Simple mock logic for success stories if DB is fresh
    const successStories = Math.max(12, completedProjects + 5);

    res.json({
      activeNow,
      successStories,
      trendingTopics: [
        { name: "#RepStake", count: "1.2k posts" },
        { name: "#POCSuccess", count: "850 posts" },
        { name: "#NewbieHacks", count: "2.5k posts" }
      ]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['name', 'avatar', 'userType']
        },
        {
          model: Comment,
          as: 'Comments',
          include: [{
            model: User,
            as: 'Author',
            attributes: ['name', 'avatar']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a post
router.post('/', auth, async (req, res) => {
  try {
    const { content, tags } = req.body;
    const post = await Post.create({
      content,
      tags,
      authorId: req.user.id
    });
    
    const postWithAuthor = await Post.findByPk(post.id, {
      include: [{
        model: User,
        as: 'Author',
        attributes: ['name', 'avatar', 'userType']
      }]
    });
    
    res.status(201).json(postWithAuthor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    post.likes += 1;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.create({
      content,
      authorId: req.user.id,
      postId: req.params.id
    });

    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'Author',
        attributes: ['name', 'avatar']
      }]
    });

    // Update comment count on post
    await Post.increment('commentsCount', { by: 1, where: { id: req.params.id } });

    res.status(201).json(commentWithAuthor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
