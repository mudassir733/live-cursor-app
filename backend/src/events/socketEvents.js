const User = require('../models/User');
const eventEmitter = require('./EventEmitter');
const cursorStateManager = require('./CursorStateManager');

class SocketEventHandler {
    constructor() {
        this.connections = new Map();
        this.users = new Map();
        this.sessionRooms = new Map(); // sessionId -> roomId
        this.setupEventListeners();
    }


    setupEventListeners() {
        // Listen to internal events
        eventEmitter.on('user:connected', this.handleUserConnectedEvent.bind(this));
        eventEmitter.on('user:disconnected', this.handleUserDisconnectedEvent.bind(this));
        eventEmitter.on('cursor:update', this.handleCursorUpdateEvent.bind(this));
        eventEmitter.on('cursor:move', this.handleCursorMoveEvent.bind(this));
        eventEmitter.on('broadcast:update', this.handleBroadcastEvent.bind(this));
        eventEmitter.on('error', this.handleErrorEvent.bind(this));
    }


    // WebSocket connection handler
    async handleConnection(connection, request) {
        try {
            const { username, roomId } = this.parseQuery(request.url);
            if (!username || !roomId) {
                connection.close(1008, 'Username and roomId required');
                return;
            }
            const sessionId = this.generateSessionId();
            // DB: only for presence
            const user = await User.createOrUpdateUser({ username, sessionId });
            this.connections.set(sessionId, connection);
            this.users.set(sessionId, user);
            this.sessionRooms.set(sessionId, roomId); // Track roomId for this session
            // Add to room
            cursorStateManager.joinRoom(roomId, sessionId);
            this.setupConnectionListeners(connection, sessionId, user);
            eventEmitter.emitUserConnected({ sessionId, username: user.username, userId: user._id });
            // Send initial state (all cursors in room)
            this.sendToConnection(connection, {
                type: 'connection:success',
                data: {
                    sessionId,
                    user: user.toJSON(),
                    cursors: cursorStateManager.getCursors(roomId)
                }
            });
        } catch (error) {
            console.error('Error handling connection:', error);
            eventEmitter.emitError(error, { context: 'handleConnection' });
            connection.close(1011, 'Internal server error');
        }
    }


    // Handle cursor movement (from client messages)
    async handleCursorMove(cursorData, sessionId, user) {
        try {
            const roomId = this.sessionRooms.get(sessionId);
            if (!cursorData || typeof cursorData.x !== 'number' || typeof cursorData.y !== 'number') {
                throw new Error('Invalid cursor data');
            }
            // Store in memory and Redis
            cursorStateManager.setCursor(roomId, sessionId, {
                userId: user._id.toString(),
                username: user.username,
                x: cursorData.x,
                y: cursorData.y
            });
            // Broadcast to room (via Redis pub/sub or direct)
            eventEmitter.emitCursorMove(
                { sessionId, username: user.username, userId: user._id.toString() },
                { x: cursorData.x, y: cursorData.y }
            );
        } catch (error) {
            eventEmitter.emitError(error, {
                context: 'handleCursorMove',
                sessionId,
                username: user.username
            });
        }
    }

    // Set up listeners for a specific connection
    setupConnectionListeners(connection, sessionId, user) {
        connection.on('message', (message) => {
            this.handleMessage(message, sessionId, user);
        });
        connection.on('close', () => {
            this.handleClose(sessionId, user);
        });
        connection.on('error', (error) => {
            console.error(`Connection error for user ${user.username}:`, error);
            eventEmitter.emitError(error, {
                context: 'connectionError',
                sessionId,
                username: user.username
            });
        });
        connection.on('pong', () => {
            this.updateUserLastSeen(sessionId);
        });
    }

    // Handle incoming messages
    async handleMessage(bytes, sessionId, user) {
        try {
            const roomId = this.sessionRooms.get(sessionId);
            let message;
            try {
                message = JSON.parse(bytes.toString());
            } catch (err) {
                console.error("Failed to parse message:", bytes.toString());
                eventEmitter.emitError(new Error('Invalid JSON message'), {
                    context: 'parseMessage',
                    sessionId,
                    rawMessage: bytes.toString()
                });
                return;
            }
            await this.updateUserLastSeen(sessionId);
            switch (message.type) {
                case 'cursor:move':
                    await this.handleCursorMove(message.data, sessionId, user);
                    break;

                case 'cursor:update':
                    await this.handleCursorUpdate(message.data, sessionId, user);
                    break;

                case 'ping':
                    this.handlePing(sessionId);
                    break;

                default:
                    console.warn(`Unknown message type: ${message.type}`);
                    break;
            }

        } catch (error) {
            console.error('Error handling message:', error);
            eventEmitter.emitError(error, {
                context: 'handleMessage',
                sessionId,
                username: user.username
            });
        }
    }

    // Handle cursor movement
    async handleCursorMove(cursorData, sessionId, user) {
        try {
            const roomId = this.sessionRooms.get(sessionId);
            // Store in memory and publish to Redis
            cursorStateManager.setCursor(roomId, sessionId, cursorData);
            // Broadcast to all others in room (handled by pub/sub)
            // Emitting event for local listeners
            eventEmitter.emitCursorMove({ sessionId, username: user.username, userId: user._id }, cursorData);
        } catch (error) {
            eventEmitter.emitError(error, {
                context: 'handleCursorMove',
                sessionId,
                username: user.username
            });
        }
    }


    // Handle cursor:move event (triggered by client messages or Redis)
    handleCursorMoveEvent({ user, cursor }) {
        const roomId = this.sessionRooms.get(user.sessionId);
        if (!roomId) {
            console.warn(`No room found for session ${user.sessionId}`);
            return;
        }
        console.log(`🖱️ Broadcasting cursor:move for ${user.username} in room ${roomId}`);
        this.broadcastToRoom(roomId, {
            type: 'cursor:move',
            data: {
                userId: user.userId,
                username: user.username,
                x: cursor.x,
                y: cursor.y
            }
        });
    }

    // Handle cursor updates
    async handleCursorUpdate(cursorData, sessionId, user) {
        try {
            const roomId = this.sessionRooms.get(sessionId);
            cursorStateManager.setCursor(roomId, sessionId, cursorData);
            eventEmitter.emitCursorUpdate({ sessionId, username: user.username, userId: user._id }, cursorData);
        } catch (error) {
            eventEmitter.emitError(error, {
                context: 'handleCursorUpdate',
                sessionId,
                username: user.username
            });
        }
    }

    // Handle ping messages
    handlePing(sessionId) {
        const connection = this.connections.get(sessionId);
        if (connection) {
            this.sendToConnection(connection, {
                type: 'pong',
                timestamp: Date.now()
            });
        }
    }

    // Handle connection close
    async handleClose(sessionId, user) {
        try {
            const roomId = this.sessionRooms.get(sessionId);
            // Get last cursor state from Redis
            let lastCursor = null;
            if (roomId && user._id) {
                const cursorStr = await require('../config/redis').redisPub.hget(`cursors:${roomId}`, user._id.toString());
                if (cursorStr) {
                    try { lastCursor = JSON.parse(cursorStr); } catch { }
                }
            }
            // Persist last x/y to DB if available
            if (lastCursor && typeof lastCursor.x === 'number' && typeof lastCursor.y === 'number') {
                user.cursorState = { x: lastCursor.x, y: lastCursor.y };
                await user.save();
            }
            await user.setOffline();
            this.connections.delete(sessionId);
            this.users.delete(sessionId);
            this.sessionRooms.delete(sessionId);
            cursorStateManager.leaveRoom(roomId, sessionId);
            eventEmitter.emitUserDisconnected({
                sessionId,
                username: user.username,
                userId: user._id
            });
        } catch (error) {
            console.error('Error handling close:', error);
            eventEmitter.emitError(error, {
                context: 'handleClose',
                sessionId,
                username: user.username
            });
        }
    }

    // Event handlers for internal events
    handleUserConnectedEvent(userData) {
        // Additional logic when user connects
        console.log(`✅ User connected event handled: ${userData.username}`);
    }

    handleUserDisconnectedEvent(userData) {
        // Additional logic when user disconnects
        console.log(`❌ User disconnected event handled: ${userData.username}`);
    }

    handleCursorUpdateEvent({ user, cursor }) {
        const roomId = this.sessionRooms.get(user.sessionId);
        if (!roomId) {
            console.warn(`No room found for session ${user.sessionId}`);
            return;
        }
        console.log(`🖱️ Broadcasting cursor:move for ${user.username} in room ${roomId}`);
        this.broadcastToRoom(roomId, {
            type: 'cursor:move',
            data: {
                userId: user.userId,
                username: user.username,
                x: cursor.x,
                y: cursor.y
            }
        });
    }

    handleBroadcastEvent(data) {
        // Handle broadcast events
        this.broadcastToAll(data);
    }

    handleErrorEvent(errorData) {
        // Handle error events
        console.error(`🚨 Error event handled:`, errorData);
    }

    // Utility methods
    async getOnlineUsers() {
        try {
            const onlineUsers = await User.findOnlineUsers();
            return onlineUsers.map(user => ({
                sessionId: user.sessionId,
                username: user.username,
                cursorState: user.cursorState,
                lastSeen: user.lastSeen
            }));
        } catch (error) {
            eventEmitter.emitError(error, { context: 'getOnlineUsers' });
            return [];
        }
    }

    // In-memory lock to serialize saves per user
    userSaveLocks = new Map();

    async updateUserLastSeen(sessionId) {
        const user = this.users.get(sessionId);
        if (user) {
            // Prevent concurrent saves for the same user
            if (this.userSaveLocks.get(user._id)) {
                // If a save is already in progress, skip this update
                return;
            }
            this.userSaveLocks.set(user._id, true);
            try {
                user.lastSeen = new Date();
                await user.save();
            } finally {
                this.userSaveLocks.delete(user._id);
            }
        }
    }

    broadcastToAll(message) {
        this.connections.forEach((connection, sessionId) => {
            if (connection.readyState === connection.OPEN) {
                this.sendToConnection(connection, message);
            }
        });
    }

    // Broadcast to all clients in a specific room
    broadcastToRoom(roomId, message) {
        this.connections.forEach((connection, sessionId) => {
            const clientRoomId = this.sessionRooms.get(sessionId);
            if (clientRoomId === roomId && connection.readyState === connection.OPEN) {
                this.sendToConnection(connection, message);
            }
        });
    }


    handleCursorUpdateEvent({ user, cursor }) {
        try {
            const roomId = this.sessionRooms.get(user.sessionId);
            if (!roomId) {
                console.warn(`No room found for session ${user.sessionId}`);
                return;
            }
            console.log(`🖱️ Broadcasting cursor update for ${user.username} in room ${roomId}`);
            // Broadcast cursor:move to all clients in the room
            this.broadcastToRoom(roomId, {
                type: 'cursor:move',
                data: {
                    userId: user.userId.toString(),
                    username: user.username,
                    x: cursor.x,
                    y: cursor.y
                }
            });
        } catch (error) {
            console.error('Error handling cursor update event:', error);
            eventEmitter.emitError(error, {
                context: 'handleCursorUpdateEvent',
                sessionId: user.sessionId,
                username: user.username
            });
        }
    }





    broadcastToOthers(excludeSessionId, message) {
        this.connections.forEach((connection, sessionId) => {
            if (sessionId !== excludeSessionId && connection.readyState === connection.OPEN) {
                this.sendToConnection(connection, message);
            }
        });
    }

    sendToConnection(connection, message) {
        try {
            connection.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message to connection:', error);
        }
    }

    parseQuery(url) {
        const urlParts = new URL(url, 'http://localhost');
        const params = {};
        urlParts.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    }

    generateSessionId() {
        return require('uuid').v4();
    }

    // Cleanup method
    async cleanup() {
        // Set all users offline
        for (const [sessionId, user] of this.users) {
            await user.setOffline();
        }

        // Clear local storage
        this.connections.clear();
        this.users.clear();

        console.log('🧹 Socket event handler cleaned up');
    }
}

module.exports = SocketEventHandler;
