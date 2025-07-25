const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected) {
                console.log('Database already connected');
                return;
            }

            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/live-cursor-app';
            
            await mongoose.connect(mongoUri);

            this.isConnected = true;
            console.log('✅ Connected to MongoDB successfully');

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('⚠️ MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected');
                this.isConnected = true;
            });

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            if (!this.isConnected) {
                console.log('Database already disconnected');
                return;
            }

            await mongoose.disconnect();
            this.isConnected = false;
            console.log('✅ Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error.message);
            throw error;
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }
}

module.exports = new DatabaseConnection();
