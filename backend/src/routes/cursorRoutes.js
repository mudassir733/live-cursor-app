const express = require('express');
const router = express.Router();
const { redisPub } = require('../config/redis');

// GET /api/cursors/:roomId - fetch all cursor states for a room
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const cursorMap = await redisPub.hgetall(`cursors:${roomId}`);
    // Convert all values from JSON strings to objects
    const cursors = Object.values(cursorMap).map(str => {
      try { return JSON.parse(str); } catch { return null; }
    }).filter(Boolean);
    res.json({ cursors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cursors', details: err.message });
  }
});

module.exports = router;
