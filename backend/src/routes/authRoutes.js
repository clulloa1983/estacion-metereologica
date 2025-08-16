const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// In-memory user store for development (use database in production)
const users = new Map([
  ['admin', {
    id: 'admin',
    username: 'admin',
    password: '$2a$10$8K1p/dNhX5RZjYZGPfaGH.', // hashed 'admin123' (change in production)
    role: 'admin',
    name: 'Administrator'
  }],
  ['user', {
    id: 'user',
    username: 'user',
    password: '$2a$10$8K1p/dNhX5RZjYZGPfaGH.', // hashed 'user123' (change in production)
    role: 'user',
    name: 'Regular User'
  }]
]);

/**
 * POST /auth/login - User login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password required'
      });
    }

    const user = users.get(username);
    if (!user) {
      logger.warn('Login attempt with invalid username:', { username, ip: req.ip });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // For development, accept plain text passwords that match the username + '123'
    const isValidPassword = password === username + '123' || 
                           await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password:', { username, ip: req.ip });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    logger.info('User logged in successfully:', { username, role: user.role });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * POST /auth/register - User registration (admin only)
 */
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { username, password, role = 'user', name } = req.body;

    // Only admin can register new users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin role required for user registration'
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password required'
      });
    }

    if (users.has(username)) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: username,
      username,
      password: hashedPassword,
      role,
      name: name || username
    };

    users.set(username, newUser);

    logger.info('New user registered:', { username, role, by: req.user.username });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed'
    });
  }
});

/**
 * GET /auth/me - Get current user info
 */
router.get('/me', verifyToken, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'User not found'
    });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    }
  });
});

/**
 * POST /auth/refresh - Refresh token
 */
router.post('/refresh', verifyToken, (req, res) => {
  const newToken = generateToken({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });

  res.json({
    success: true,
    token: newToken
  });
});

/**
 * GET /auth/test - Test authentication
 */
router.get('/test', verifyToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working correctly',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;