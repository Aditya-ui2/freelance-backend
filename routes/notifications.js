const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
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

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.update({ read: true }, {
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.update({ read: true }, {
      where: { userId: req.user.id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
    try {
      await Notification.destroy({
        where: { id: req.params.id, userId: req.user.id }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

module.exports = router;
