const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows multiple null values
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    avatar: {
        type: String,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    cursorState: {
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        },
        color: {
            type: String,
            default: '#000000'
        },
        isVisible: {
            type: Boolean,
            default: true
        }
    },
    sessionId: {
        type: String,
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});


// Instance methods
// In-memory save queue for updateCursorState
const updateCursorQueues = new Map();
userSchema.methods.updateCursorState = async function(newState) {
    try {
      await this.constructor.updateOne(
        { _id: this._id },
        {
          $set: {
            ...Object.entries(newState).reduce((acc, [key, val]) => {
              acc[`cursorState.${key}`] = val;
              return acc;
            }, {}),
            lastSeen: new Date()
          }
        }
      );
      // Update local instance to stay in sync (optional)
      Object.assign(this.cursorState, newState);
      this.lastSeen = new Date();
    } catch (err) {
      console.error('updateCursorState error:', err);
    }
  };

userSchema.methods.setOnline = function(sessionId) {
    this.isOnline = true;
    this.sessionId = sessionId;
    this.lastSeen = new Date();
    return this.save();
};

userSchema.methods.setOffline = function() {
    this.isOnline = false;
    this.sessionId = null;
    this.lastSeen = new Date();
    return this.save();
};

// Static methods
userSchema.statics.findOnlineUsers = function() {
    return this.find({ isOnline: true }).select('-__v');
};

userSchema.statics.findBySessionId = function(sessionId) {
    return this.findOne({ sessionId }).select('-__v');
};

userSchema.statics.createOrUpdateUser = async function(userData) {
    const { username, sessionId } = userData;
    
    try {
        let user = await this.findOne({ username });
        
        if (user) {
            user.isOnline = true;
            user.sessionId = sessionId;
            user.lastSeen = new Date();
            await user.save();
        } else {

            user = new this({
                username,
                sessionId,
                isOnline: true,
                lastSeen: new Date()
            });
            await user.save();
        }
        
        return user;
    } catch (error) {
        throw new Error(`Error creating/updating user: ${error.message}`);
    }
};

module.exports = mongoose.model('User', userSchema);
