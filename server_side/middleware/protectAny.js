// middleware/protectAny.js
// Accepts EITHER a user token or a psychic token. Used on endpoints that both
// sides of a paid chat legitimately call (e.g. the timer/session sync).
// Sets req.user to the authenticated entity and req.authRole to 'user' | 'psychic'.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Psychic = require('../models/HumanChat/Psychic');

const protectAny = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.psychicToken) {
    token = req.cookies.psychicToken;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
    const decoded = jwt.verify(token, secret);

    // Psychic tokens carry role: 'psychic'
    if (decoded.role === 'psychic') {
      const psychic = await Psychic.findById(decoded.id).select('-password');
      if (!psychic) {
        return res.status(401).json({ success: false, message: 'Psychic account not found' });
      }
      req.user = psychic;
      req.psychic = psychic;
      req.authRole = 'psychic';
      return next();
    }

    // Otherwise treat it as a user token
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
      req.authRole = 'user';
      return next();
    }

    // Fallback: token had no role but the id might be a psychic
    const psychic = await Psychic.findById(decoded.id).select('-password');
    if (psychic) {
      req.user = psychic;
      req.psychic = psychic;
      req.authRole = 'psychic';
      return next();
    }

    return res.status(401).json({ success: false, message: 'Account not found' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { protectAny };
