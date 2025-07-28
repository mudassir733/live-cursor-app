const EventEmitter = require('eventemitter3');

class CursorEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Log all events for debugging
        this.on('newListener', (event, listener) => {
            console.log(`New listener added for event: ${event}`);
        });

        this.on('removeListener', (event, listener) => {
            console.log(`Listener removed for event: ${event}`);
        });
    }

    // User connection events
    emitUserConnected(userData) {
        console.log(`User connected: ${userData.username}`);
        this.emit('user:connected', userData);
    }

    emitUserDisconnected(userData) {
        console.log(`User disconnected: ${userData.username}`);
        this.emit('user:disconnected', userData);
    }

    // Cursor movement events
    emitCursorMove(userData, cursorData) {
        this.emit('cursor:move', { user: userData, cursor: cursorData });
    }

    emitCursorUpdate(userData, cursorData) {
        this.emit('cursor:update', { user: userData, cursor: cursorData });
    }

    // Broadcast events
    emitBroadcastUpdate(data) {
        this.emit('broadcast:update', data);
    }

    // Room/session events
    emitRoomJoin(userData, roomId) {
        console.log(`User ${userData.username} joined room: ${roomId}`);
        this.emit('room:join', { user: userData, roomId });
    }

    emitRoomLeave(userData, roomId) {
        console.log(`User ${userData.username} left room: ${roomId}`);
        this.emit('room:leave', { user: userData, roomId });
    }

    // Error events
    emitError(error, context = {}) {
        console.error(`Error occurred:`, error.message);
        this.emit('error', { error, context });
    }

    // Database events
    emitDatabaseConnected() {
        console.log(`Database connected`);
        this.emit('database:connected');
    }

    emitDatabaseDisconnected() {
        console.log(`Database disconnected`);
        this.emit('database:disconnected');
    }

    // Server events
    emitServerStarted(port) {
        console.log(`Server started on port ${port}`);
        this.emit('server:started', { port });
    }

    emitServerStopped() {
        console.log(`Server stopped`);
        this.emit('server:stopped');
    }

    // Utility methods
    getEventNames() {
        return this.eventNames();
    }

    getListenerCount(eventName) {
        return this.listenerCount(eventName);
    }

    removeAllListenersForEvent(eventName) {
        this.removeAllListeners(eventName);
        console.log(`Removed all listeners for event: ${eventName}`);
    }

    emitCursorMove(userData, cursorData) {
        console.log(`Emitting cursor:move for ${userData.username}:`, cursorData);
        this.emit('cursor:move', { user: userData, cursor: cursorData });
    }

    emitCursorUpdate(userData, cursorData) {
        console.log(`Emitting cursor:update for ${userData.username}:`, cursorData);
        this.emit('cursor:update', { user: userData, cursor: cursorData });
    }
}

// Create a singleton instance
const cursorEventEmitter = new CursorEventEmitter();

module.exports = cursorEventEmitter;
