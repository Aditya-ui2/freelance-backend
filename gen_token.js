const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 'b455fa07-950d-45a7-87d0-b78bab6b8433', userType: 'client' }, 
  process.env.JWT_SECRET || 'secret_key', 
  { expiresIn: '7d' }
);
console.log(token);
