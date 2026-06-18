const jwt = require("jsonwebtoken");
const blacklist = new Set(); // in-memory token blacklist

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  if (blacklist.has(token))
    return res.status(401).json({ message: "Token has been invalidated. Please login again." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const addToBlacklist = (token) => blacklist.add(token);

module.exports = { authenticate, addToBlacklist };
