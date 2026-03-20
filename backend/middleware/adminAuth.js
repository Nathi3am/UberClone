const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch (e) { return res.status(401).json({ message: 'Unauthorized' }); }

    const user = await User.findById(decoded._id || decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    req.admin = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
