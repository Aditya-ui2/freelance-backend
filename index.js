require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
require('./models'); // Load associations

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all for initial deployment, can be narrowed to Vercel URL later
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/analytics', require('./routes/analytics'));
app.get('/api/test', (req, res) => res.send('API is UP'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/notifications', require('./routes/notifications'));

// Add a root route for Render health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Sync Database and Start Server
// NOTE: { alter: true } is safe for development but should be replaced by migrations in production to prevent unexpected data loss
sequelize.sync()
  .then(() => {
    console.log('✅ SQL Database Synced');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ SQL Sync Error:', err);
  });
