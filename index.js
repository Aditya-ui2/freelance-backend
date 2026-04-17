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
sequelize.sync({ alter: true })
  .then(async () => {
    console.log('✅ SQL Database Synced with Schema Alter');
    
    // Auto-seed challenges if empty
    try {
        const { Challenge } = require('./models');
        const count = await Challenge.count();
        if (count === 0) {
            console.log('🌱 No challenges found. Seeding default vault tasks...');
            const seedData = [
                {
                  title: 'String Reversal',
                  description: 'Write a function that takes a string and returns it reversed. Example: "hello" -> "olleh"',
                  reward: 10,
                  difficulty: 'Easy',
                  duration: '15 mins',
                  testCaseInput: JSON.stringify("antigravity"),
                  expectedOutput: "ytivargitna"
                },
                {
                  title: 'FizzBuzz Logic',
                  description: 'Write a function that returns "Fizz" if input is divisible by 3, "Buzz" if by 5, and "FizzBuzz" if by both. Otherwise return the number.',
                  reward: 15,
                  difficulty: 'Medium',
                  duration: '20 mins',
                  testCaseInput: JSON.stringify(15),
                  expectedOutput: "FizzBuzz"
                },
                {
                  title: 'Array Sum',
                  description: 'Write a function that takes an array of numbers and returns their sum. Example: [1,2,3] -> 6',
                  reward: 20,
                  difficulty: 'Hard',
                  duration: '25 mins',
                  testCaseInput: JSON.stringify([10, 20, 30, 40]),
                  expectedOutput: "100"
                }
            ];
            await Challenge.bulkCreate(seedData);
            console.log('✅ Successfully seeded 3 challenges.');
        }
    } catch (e) {
        console.error('⚠️ Auto-seeding failed (continuing anyway):', e.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ SQL Sync Error:', err);
  });

// Global Error Handler for final fallback and logging
app.use((err, req, res, next) => {
  console.error(">>> [GLOBAL ERROR HANDLER]", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: err.message,
    path: req.path
  });
});
