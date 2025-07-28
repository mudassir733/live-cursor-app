
const { redisPub, redisSub } = require('../config/redis');
const EventEmitter = require('events');

class CursorStateManager extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map();
    this.setupRedis();
  }

  setupRedis() {
    redisSub.on('message', (channel, message) => {
      try {
        console.log("Channel", channel);
        console.log("Message", message);
        const { roomId, sessionId, cursorState } = JSON.parse(message);
        this.setCursor(roomId, sessionId, cursorState, false);
        this.emit('cursorUpdate', {
          user: {
            sessionId,
            userId: cursorState.userId,
            username: cursorState.username
          },
          cursor: {
            x: cursorState.x,
            y: cursorState.y
          }
        });
      } catch (err) {
        console.error('Redis pub/sub parse error:', err);
      }
    });
  }

  joinRoom(roomId, sessionId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
      redisSub.subscribe(`cursor:room:${roomId}`);
    }
    // Initialize with default cursor state
    this.rooms.get(roomId).set(sessionId, {
      userId: null,
      username: null,
      x: 0,
      y: 0
    });
  }
  leaveRoom(roomId, sessionId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(sessionId);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
        redisSub.unsubscribe(`cursor:room:${roomId}`);
      }
    }
  }

  setCursor(roomId, sessionId, cursorState, publish = true) {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Map());
    // Ensure cursorState has all required fields
    const cursor = {
      userId: cursorState.userId || null,
      username: cursorState.username || '',
      x: Number(cursorState.x) || 0,
      y: Number(cursorState.y) || 0
    };
    this.rooms.get(roomId).set(sessionId, cursor);
    if (publish) {
      redisPub.publish(`cursor:room:${roomId}`, JSON.stringify({ roomId, sessionId, cursorState: cursor }));
      console.log(`Published cursor update to Redis for room ${roomId}:`, cursor);
    }
    // Store in Redis hash
    if (cursor.userId) {
      // redisPub.hset(`cursors:${roomId}`, cursor.userId, JSON.stringify(cursor));
      // store in redis as json
      redisPub.set(`cursor:${roomId}:${cursor.userId}`, JSON.stringify(cursor));
    }
  }
  getCursors(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values())
      .filter(cursor => cursor && cursor.userId && typeof cursor.x === 'number' && typeof cursor.y === 'number')
      .map(cursor => ({
        userId: cursor.userId,
        username: cursor.username,
        x: cursor.x,
        y: cursor.y
      }));
  }
}


module.exports = new CursorStateManager();
