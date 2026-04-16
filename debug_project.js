const { Project } = require('./models');
const sequelize = require('./config/database');

async function test() {
  try {
    await sequelize.authenticate();
    const project = await Project.create({
      title: "Test Project",
      description: "Test Description",
      category: "Design",
      budget: 1000,
      skills: ["React"],
      clientId: "some-uuid" // This might fail if the user doesn't exist, but let's see the error
    });
    console.log("Success:", project.toJSON());
  } catch (err) {
    console.error("Error Type:", err.name);
    console.error("Error Message:", err.message);
    if (err.errors) {
      err.errors.forEach(e => console.error("Validation Error:", e.message));
    }
  } finally {
    process.exit();
  }
}

test();
