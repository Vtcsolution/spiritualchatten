// middleware/adminProtect.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel");

const adminProtect = async (req, res, next) => {
  const token = req.cookies.admin_token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.warn(`[adminProtect] Rejected ${req.method} ${req.originalUrl}: no token`);
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      console.warn(`[adminProtect] Rejected ${req.method} ${req.originalUrl}: admin ${decoded.id} not found`);
      return res.status(403).json({ message: "Not authorized" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.warn(`[adminProtect] Rejected ${req.method} ${req.originalUrl}: ${err.message}`);
    res.status(401).json({ message: "Invalid token" });
  }
};
module.exports = { adminProtect };
