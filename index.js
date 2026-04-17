require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const models = require('./models'); // Load associations

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Manual CORS Headers (Insurance against middleware failure)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Standard CORS Middleware
app.use(cors({
  origin: '*',
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
app.use('/api/messages', require('./routes/messages'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/test', (req, res) => res.json({ status: "UP", timestamp: new Date() }));

// Root route for Render health check
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Diagnostic Route
app.get('/api/debug/diag', async (req, res) => {
    try {
        const userCount = await models.User.count();
        res.json({ status: "ok", database: "connected", users: userCount });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

// 3. FAST STARTUP: Sync DB and Start Server Immediately
async function healDatabase() {
    try {
        const qi = sequelize.getQueryInterface();
        console.log('>>> [DATABASE] Running Schema Heal...');
        
        // Check Users for missing 'rating' (The cause of 500/Empty errors)
        const userCols = ['trustScore', 'pocScore', 'rating', 'projectsCompleted', 'profileViews', 'balance', 'badges'];
        for (const col of userCols) {
            try {
                await qi.addColumn('Users', col, { 
                    type: (col === 'rating' || col === 'balance') ? 'FLOAT' : (col === 'badges') ? 'TEXT' : 'INTEGER', 
                    defaultValue: (col === 'badges') ? '[]' : 0 
                });
                console.log(`>>> [DATABASE] Added missing column: ${col}`);
            } catch(e) { /* Already exists */ }
        }

        // Check Projects for clientId
        try {
            await qi.addColumn('Projects', 'clientId', { type: 'UUID', allowNull: true });
        } catch(e) { }

        // Check Applications for consistency
        try {
            await qi.addColumn('Applications', 'projectId', { type: 'UUID', allowNull: true });
            await qi.addColumn('Applications', 'freelancerId', { type: 'UUID', allowNull: true });
        } catch(e) { }

        console.log('>>> [DATABASE] Schema Heal Complete');
    } catch (err) {
        console.error('>>> [DATABASE] Heal failed:', err.message);
    }
}

sequelize.sync()
  .then(async () => {
    console.log('✅ SQL Database Synced');
    
    // Core Fix: Ensure rating column exists on production DB
    await healDatabase();
    
    // Background Seeding (Non-blocking)
    seedChallenges().catch(err => console.error('Seeding failed:', err.message));

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ SQL Sync Error:', err);
    // Still start the server even if sync fails to prevent 502
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (SYNC FAILED)`);
    });
  });

// Seeding function
async function seedChallenges() {
    const { Challenge } = models;
    const count = await Challenge.count();
    if (count === 0) {
        console.log('🌱 Seeding default challenges...');
        await Challenge.bulkCreate([
            {
              title: 'String Reversal',
              description: 'Write a function that takes a string and returns it reversed.',
              reward: 10,
              difficulty: 'Easy',
              duration: '15 mins',
              testCaseInput: JSON.stringify("antigravity"),
              expectedOutput: "ytivargitna"
            },
            {
              title: 'FizzBuzz Logic',
              description: 'Write a function that returns "Fizz" for multiples of 3, "Buzz" for multiples of 5.',
              reward: 15,
              difficulty: 'Medium',
              duration: '20 mins',
              testCaseInput: JSON.stringify(15),
              expectedOutput: "FizzBuzz"
            }
        ]);
        console.log('✅ Challenges seeded.');
    }
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(">>> [GLOBAL ERROR HANDLER]", err.message);
  res.status(500).json({ 
    message: "Critical Backend Error", 
    error: err.message,
    path: req.path
  });
});

module.exports = app;
