const { User, Project, Application } = require('./models');
const sequelize = require('./config/database');

async function seed() {
  await sequelize.sync({ force: true });
  
  const client = await User.create({
    name: "Client One",
    email: "client@test.com",
    password: "password",
    userType: "client"
  });

  const freelancer = await User.create({
    name: "Freelancer One",
    email: "free@test.com",
    password: "password",
    userType: "freelancer",
    title: "Expert Developer",
    skills: ["React", "Node"]
  });

  const project = await Project.create({
    title: "Test Project",
    description: "Description",
    budget: 1000,
    category: "Web",
    clientId: client.id
  });

  const app = await Application.create({
    projectId: project.id,
    freelancerId: freelancer.id,
    proposal: "Test Proposal",
    bidAmount: "500",
    status: "pending"
  });

  console.log("Seed Done.");
  
  const fetchedApp = await Application.findOne({
    include: [
        { model: Project, as: 'Project' },
        { model: User, as: 'Freelancer' }
    ]
  });

  console.log("App Freelancer Name:", fetchedApp.Freelancer ? fetchedApp.Freelancer.name : "NULL");
  process.exit();
}

seed();
