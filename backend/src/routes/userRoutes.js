const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// User authentication routes
router.post('/login', userController.login);

// User profile routes
router.get('/stats', userController.getUserStats); // Must be before /:id to avoid conflict
router.get('/health', userController.healthCheck); // Health check endpoint
router.get('/online', userController.getOnlineUsers); // Get online users
router.get('/username/:username', userController.getUserByUsername); // Get user by username
router.get('/:id', userController.getUserById); // Get user by ID
router.put('/:id', userController.updateProfile); // Update user profile

// User status routes
router.post('/:id/online', userController.setUserOnline); // Set user online
router.post('/:id/offline', userController.setUserOffline); // Set user offline

// Cursor state routes
router.put('/:id/cursor', userController.updateCursor); // Update cursor state

// Route documentation endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'User API Routes',
        version: '1.0.0',
        routes: {
            authentication: {
                'POST /login': 'Login or register a user'
            },
            profile: {
                'GET /:id': 'Get user profile by ID',
                'GET /username/:username': 'Get user profile by username',
                'PUT /:id': 'Update user profile'
            },
            status: {
                'GET /online': 'Get all online users',
                'POST /:id/online': 'Set user online status',
                'POST /:id/offline': 'Set user offline status'
            },
            cursor: {
                'PUT /:id/cursor': 'Update user cursor state'
            },
            system: {
                'GET /stats': 'Get user statistics',
                'GET /health': 'Health check for user service'
            }
        },
        examples: {
            login: {
                method: 'POST',
                url: '/api/users/login',
                body: {
                    username: 'john_doe',
                    email: 'john@example.com'
                }
            },
            getUserById: {
                method: 'GET',
                url: '/api/users/60f7b3b3b3b3b3b3b3b3b3b3'
            },
            updateProfile: {
                method: 'PUT',
                url: '/api/users/60f7b3b3b3b3b3b3b3b3b3b3',
                body: {
                    email: 'newemail@example.com',
                    avatar: 'https://example.com/avatar.jpg'
                }
            },
            setOnline: {
                method: 'POST',
                url: '/api/users/60f7b3b3b3b3b3b3b3b3b3b3/online',
                body: {
                    sessionId: 'session-uuid-here'
                }
            },
            updateCursor: {
                method: 'PUT',
                url: '/api/users/60f7b3b3b3b3b3b3b3b3b3b3/cursor',
                body: {
                    x: 100,
                    y: 200,
                    color: '#ff0000',
                    isVisible: true
                }
            }
        }
    });
});

module.exports = router;
