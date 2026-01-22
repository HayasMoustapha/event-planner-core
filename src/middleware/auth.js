const jwt = require('jsonwebtoken');
const { authClient } = require('../config');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // First, validate JWT structure
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_for_validation');
    
    // Then, validate with Auth Service
    const authResult = await authClient.validateToken(token);
    
    if (!authResult.success) {
      return res.status(401).json({
        error: 'Invalid token',
        message: authResult.error
      });
    }

    // Attach user info to request
    req.user = authResult.data.user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or expired'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your token'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_for_validation');
    const authResult = await authClient.validateToken(token);
    
    if (authResult.success) {
      req.user = authResult.data.user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
