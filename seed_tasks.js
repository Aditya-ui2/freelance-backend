const { Challenge } = require('./models');
const sequelize = require('./config/database');

const seedChallenges = async () => {
  try {
    await sequelize.sync({ alter: true });
    
    // Use findOrCreate for each challenge to avoid duplicates and preserve data
    const challenges = [
      { 
        title: 'API Endpoint Formatter', 
        description: 'Create a function that takes an object {baseUrl, endpoint} and returns the full URL with a "/" between them. If the endpoint starts with a "/", remove it.', 
        reward: 5, 
        difficulty: 'Medium', 
        duration: '3', // minutes
        starterCode: '// input: { baseUrl: string, endpoint: string }\n// return: string\n\nfunction formatUrl(input) {\n  // Write your code here\n  \n}',
        testCaseInput: JSON.stringify({ baseUrl: "https://api.v1.com", endpoint: "/users" }),
        expectedOutput: "https://api.v1.com/users"
      },
      { 
        title: 'Array Summer', 
        description: 'Write a function that returns the sum of all positive numbers in an array. Input: { numbers: number[] }.', 
        reward: 3, 
        difficulty: 'Easy', 
        duration: '2',
        starterCode: '// input: { numbers: number[] }\n// return: number\n\nfunction sumPositives(input) {\n  // Write your code here\n  \n}',
        testCaseInput: JSON.stringify({ numbers: [1, -2, 3, 4, -5] }),
        expectedOutput: "8"
      },
      { 
        title: 'JSON Data Extractor', 
        description: 'Extract the "value" property from a nested object. Input: { data: { metadata: { value: string } } }.', 
        reward: 8, 
        difficulty: 'Hard', 
        duration: '5',
        starterCode: '// input: { data: { metadata: { value: string } } }\n// return: string\n\nconst extractValue = (input) => {\n  // Write your code here\n  \n}',
        testCaseInput: JSON.stringify({ data: { metadata: { value: "FOUND_ME" } } }),
        expectedOutput: "FOUND_ME"
      },
    ];

    for (const c of challenges) {
      await Challenge.findOrCreate({
        where: { title: c.title },
        defaults: c
      });
    }

    console.log('✅ Real challenges seeded!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedChallenges();
