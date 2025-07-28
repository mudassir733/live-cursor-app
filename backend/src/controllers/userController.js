const userService = require('../services/userService');
const eventEmitter = require('../events/EventEmitter');

class UserController {


    async login(req, res) {
        try {
            const { username, email } = req.body;

            // Validation
            if (!username) {
                return res.status(400).json({
                    success: false,
                    error: 'Username is required'
                });
            }

            if (username.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    error: 'Username must be at least 3 characters long'
                });
            }

            if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Please provide a valid email address'
                });
            }

            const result = await userService.loginUser({ username, email });

            res.status(200).json(result);

        } catch (error) {
            console.error('Error in login controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message.includes('Username already exists') ||
                error.message.includes('Email already exists')) {
                statusCode = 409;
                errorMessage = error.message;
            } else if (error.message.includes('Username must be')) {
                statusCode = 400;
                errorMessage = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }


    async getUserById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const user = await userService.getUserById(id);

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    isOnline: user.isOnline,
                    cursorState: user.cursorState,
                    joinedAt: user.joinedAt,
                    lastSeen: user.lastSeen
                }
            });

        } catch (error) {
            console.error('Error in getUserById controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message === 'User not found') {
                statusCode = 404;
                errorMessage = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }

    /**
     * Get user profile by username
     * GET /api/users/username/:username
     */
    async getUserByUsername(req, res) {
        try {
            const { username } = req.params;

            if (!username) {
                return res.status(400).json({
                    success: false,
                    error: 'Username is required'
                });
            }

            const user = await userService.getUserByUsername(username);

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    isOnline: user.isOnline,
                    cursorState: user.cursorState,
                    joinedAt: user.joinedAt,
                    lastSeen: user.lastSeen
                }
            });

        } catch (error) {
            console.error('Error in getUserByUsername controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message === 'User not found') {
                statusCode = 404;
                errorMessage = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }


    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const user = await userService.updateUserProfile(id, updateData);

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    isOnline: user.isOnline,
                    cursorState: user.cursorState,
                    joinedAt: user.joinedAt,
                    lastSeen: user.lastSeen
                },
                message: 'Profile updated successfully'
            });

        } catch (error) {
            console.error('❌ Error in updateProfile controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message === 'User not found') {
                statusCode = 404;
                errorMessage = error.message;
            } else if (error.message === 'No valid fields to update') {
                statusCode = 400;
                errorMessage = error.message;
            } else if (error.message.includes('validation failed')) {
                statusCode = 400;
                errorMessage = 'Invalid data provided';
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }

    /**
     * Get all online users
     * GET /api/users/online
     */
    async getOnlineUsers(req, res) {
        try {
            const onlineUsers = await userService.getOnlineUsers();

            res.status(200).json({
                success: true,
                users: onlineUsers,
                count: onlineUsers.length
            });

        } catch (error) {
            console.error('Error in getOnlineUsers controller:', error);

            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Set user online status
     * POST /api/users/:id/online
     */
    async setUserOnline(req, res) {
        try {
            const { id } = req.params;
            const { sessionId } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Session ID is required'
                });
            }

            const user = await userService.setUserOnline(id, sessionId);

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    isOnline: user.isOnline,
                    sessionId: user.sessionId
                },
                message: 'User set online successfully'
            });

        } catch (error) {
            console.error('❌ Error in setUserOnline controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message === 'User not found') {
                statusCode = 404;
                errorMessage = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }

    /**
     * Update user cursor state
     * PUT /api/users/:id/cursor
     */
    async updateCursor(req, res) {
        try {
            const { id } = req.params;
            const cursorState = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const user = await userService.updateUserCursor(id, cursorState);

            res.status(200).json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    cursorState: user.cursorState
                },
                message: 'Cursor state updated successfully'
            });

        } catch (error) {
            console.error('❌ Error in updateCursor controller:', error);

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            if (error.message === 'User not found') {
                statusCode = 404;
                errorMessage = error.message;
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
        }
    }

    /**
     * Get user statistics
     * GET /api/users/stats
     */
    async getUserStats(req, res) {
        try {
            const stats = await userService.getUserStats();

            res.status(200).json({
                success: true,
                stats
            });

        } catch (error) {
            console.error('❌ Error in getUserStats controller:', error);

            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Health check for user service
     * GET /api/users/health
     */
    async healthCheck(req, res) {
        try {
            const stats = await userService.getUserStats();

            res.status(200).json({
                success: true,
                service: 'User Service',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                stats
            });

        } catch (error) {
            console.error('❌ Error in user service health check:', error);

            res.status(503).json({
                success: false,
                service: 'User Service',
                status: 'unhealthy',
                error: 'Service unavailable'
            });
        }
    }
}

module.exports = new UserController();
