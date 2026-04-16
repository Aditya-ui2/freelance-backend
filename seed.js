const { User, Challenge } = require('./models');
const sequelize = require('./config/database');

async function seed() {
  await sequelize.sync({ alter: true });
  console.log('🔄 Synced Database');
  
  // Use findOrCreate for Challenges to avoid duplicates and preserve data
  const challenges = [
    {
      title: 'Array Transformation Logic',
      description: 'Write a function that doubles each number in an array.',
      reward: 15,
      difficulty: 'Easy',
      duration: '15',
      starterCode: 'function solve(arr) {\n  // your code here\n}',
      testCaseInput: '[1, 2, 3]',
      expectedOutput: '[2, 4, 6]'
    },
    {
      title: 'Data Filtering Engine',
      description: 'Filter an array of objects to find users older than 25.',
      reward: 25,
      difficulty: 'Medium',
      duration: '30',
      starterCode: 'function solve(users) {\n  // your code here\n}',
      testCaseInput: '[{age: 20}, {age: 30}, {age: 25}]',
      expectedOutput: '[{age: 30}]'
    }
  ];

  for (const c of challenges) {
    await Challenge.findOrCreate({
      where: { title: c.title },
      defaults: c
    });
  }


  console.log('✅ Seeding complete!');
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
