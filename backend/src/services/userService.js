const User = require('../models/User');
const eventEmitter = require('../events/EventEmitter');
const { generateRandomColor } = require('../utils/generateRandomColor');

class UserService {
    constructor() {
        this.activeUsers = new Map();
    }

    /**

     * @param {Object} userData 
     * @returns {Object} 
     */
    async loginUser(userData) {
        try {
            const { username, email } = userData;

            if (!username || username.trim().length < 3) {
                throw new Error('Username must be at least 3 characters long');
            }

            let user = await User.findOne({ username: username.trim() });
            const randomColor = generateRandomColor();

            if (user) {

                if (email && email !== user.email) {
                    user.email = email;
                }
                user.lastSeen = new Date();
                user.isOnline = true;
                if (!user.cursorState.color || user.cursorState.color === '#000000') {
                    user.cursorState.color = randomColor;
                }
                await user.save();

                console.log(`Existing user logged in: ${username}`);
            } else {
                // Create new user
                user = new User({
                    username: username.trim(),
                    email: email || null,
                    lastSeen: new Date()
                });
                await user.save();

                console.log(`New user registered: ${username}`);
                eventEmitter.emit('user:registered', {
                    userId: user._id,
                    username: user.username
                });
            }

            this.activeUsers.set(user._id.toString(), user);

            return {
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    joinedAt: user.joinedAt,
                    lastSeen: user.lastSeen,
                    cursorState: user.cursorState
                },
                message: user.isNew ? 'User registered successfully' : 'User logged in successfully'
            };

        } catch (error) {
            console.error('Error in loginUser service:', error);
            eventEmitter.emitError(error, { context: 'userService.loginUser' });

            if (error.code === 11000) {

                if (error.keyPattern.username) {
                    throw new Error('Username already exists');
                }
                if (error.keyPattern.email) {
                    throw new Error('Email already exists');
                }
            }

            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Object} User object
     */
    async getUserById(userId) {
        try {
            // Check cache first
            if (this.activeUsers.has(userId)) {
                return this.activeUsers.get(userId);
            }

            const user = await User.findById(userId).select('-__v');
            if (!user) {
                throw new Error('User not found');
            }

            // Cache the user
            this.activeUsers.set(userId, user);
            return user;

        } catch (error) {
            console.error(' Error in getUserById service:', error);
            eventEmitter.emitError(error, { context: 'userService.getUserById' });
            throw error;
        }
    }

    /**
     * Get user by username
     * @param {string} username - Username
     * @returns {Object} User object
     */
    async getUserByUsername(username) {
        try {
            const user = await User.findOne({ username }).select('-__v');
            if (!user) {
                throw new Error('User not found');
            }

            return user;

        } catch (error) {
            console.error(' Error in getUserByUsername service:', error);
            eventEmitter.emitError(error, { context: 'userService.getUserByUsername' });
            throw error;
        }
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated user object
     */
    async updateUserProfile(userId, updateData) {
        try {
            const allowedUpdates = ['email', 'avatar'];
            const updates = {};

            // Filter allowed updates
            Object.keys(updateData).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    updates[key] = updateData[key];
                }
            });

            if (Object.keys(updates).length === 0) {
                throw new Error('No valid fields to update');
            }

            const user = await User.findByIdAndUpdate(
                userId,
                { ...updates, lastSeen: new Date() },
                { new: true, runValidators: true }
            ).select('-__v');

            if (!user) {
                throw new Error('User not found');
            }

            // Update cache
            this.activeUsers.set(userId, user);

            console.log(`User profile updated: ${user.username}`);
            eventEmitter.emit('user:profileUpdated', {
                userId: user._id,
                username: user.username,
                updates
            });

            return user;

        } catch (error) {
            console.error('Error in updateUserProfile service:', error);
            eventEmitter.emitError(error, { context: 'userService.updateUserProfile' });
            throw error;
        }
    }

    /**
     * Get all online users
     * @returns {Array} Array of online users
     */
    async getOnlineUsers() {
        try {
            const onlineUsers = await User.find({ isOnline: true }).select('-__v').lean();

            return onlineUsers.map(user => ({
                id: user._id,
                username: user.username,
                online: user.isOnline,
                email: user.email,
                avatar: user.avatar,
                cursorState: user.cursorState,
                lastSeen: user.lastSeen
            }));

        } catch (error) {
            console.error('Error in getOnlineUsers service:', error);
            eventEmitter.emitError(error, { context: 'userService.getOnlineUsers' });
            throw error;
        }
    }

    /**
     * @param {string} userId 
     * @param {string} sessionId
     * @returns {Object}
     */
    async setUserOnline(userId, sessionId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            await user.setOnline(sessionId);


            this.activeUsers.set(userId, user);

            console.log(` User set online: ${user.username}`);
            return user;

        } catch (error) {
            console.error('Error in setUserOnline service:', error);
            eventEmitter.emitError(error, { context: 'userService.setUserOnline' });
            throw error;
        }
    }


    /**
     * @param {string} userId 
     * @param {Object} cursorState 
     * @returns {Object} 
     */
    async updateUserCursor(userId, cursorState) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            await user.updateCursorState(cursorState);

            // Update cache
            this.activeUsers.set(userId, user);

            return user;

        } catch (error) {
            console.error('❌ Error in updateUserCursor service:', error);
            eventEmitter.emitError(error, { context: 'userService.updateUserCursor' });
            throw error;
        }
    }

    /**
     * Get user statistics
     * @returns {Object} User statistics
     */
    async getUserStats() {
        try {
            const totalUsers = await User.countDocuments();
            const onlineUsers = await User.countDocuments({ isOnline: true });
            const recentUsers = await User.countDocuments({
                lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            });

            return {
                totalUsers,
                onlineUsers,
                recentUsers,
                cacheSize: this.activeUsers.size
            };

        } catch (error) {
            console.error('❌ Error in getUserStats service:', error);
            eventEmitter.emitError(error, { context: 'userService.getUserStats' });
            throw error;
        }
    }

    /**
     * Clear user cache
     */
    clearCache() {
        this.activeUsers.clear();
        console.log('🧹 User cache cleared');
    }
}

// Export singleton instance
module.exports = new UserService();
