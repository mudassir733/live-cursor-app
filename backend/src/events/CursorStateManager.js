// CursorStateManager.js: In-memory and Redis pub/sub for cursor state
const { redisPub, redisSub } = require('../config/redis');
const EventEmitter = require('events');

class CursorStateManager extends EventEmitter {
  constructor() {
    super();
    // Map: roomId -> Map<sessionId, cursorState>
    this.rooms = new Map();
    this.setupRedis();
  }

  setupRedis() {
    redisSub.on('message', (channel, message) => {
      try {
        const { roomId, sessionId, cursorState } = JSON.parse(message);
        // Update local memory
        this.setCursor(roomId, sessionId, cursorState, false);
        // Emit event for socket handler to broadcast
        this.emit('cursorUpdate', { roomId, sessionId, cursorState, fromRedis: true });
      } catch (err) {
        console.error('Redis pub/sub parse error:', err);
      }
    });
  }

  joinRoom(roomId, sessionId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
      // Subscribe to Redis channel for this room only once
      redisSub.subscribe(`cursor:room:${roomId}`);
    }
    this.rooms.get(roomId).set(sessionId, null);
  }

  leaveRoom(roomId, sessionId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(sessionId);
      if (this.rooms.get(roomId).size === 0) this.rooms.delete(roomId);
    }
  }

  setCursor(roomId, sessionId, cursorState, publish = true) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Map());
    this.rooms.get(roomId).set(sessionId, cursorState);
    if (publish) {
      redisPub.publish(`cursor:room:${roomId}`, JSON.stringify({ roomId, sessionId, cursorState }));
      console.log(`Published cursor update to Redis for room ${roomId}:`, cursorState);
    }
    // Store latest cursor in Redis hash for this room keyed by userId
    if (cursorState && cursorState.userId) {
      // Always store userId, username, x, y as JSON
      const redisCursor = {
        userId: cursorState.userId,
        username: cursorState.username || '',
        x: cursorState.x,
        y: cursorState.y
      };
      redisPub.hset(`cursors:${roomId}`, redisCursor.userId, JSON.stringify(redisCursor));
    }
  }

  getCursors(roomId) {
    return this.rooms.has(roomId) ? Array.from(this.rooms.get(roomId).entries()) : [];
  }
}

module.exports = new CursorStateManager();
