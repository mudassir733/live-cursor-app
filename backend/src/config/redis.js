const Redis = require('ioredis');

// Create Redis clients for pub and sub (separate connections recommended)
const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

module.exports = { redisPub, redisSub };
