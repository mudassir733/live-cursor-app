require('dotenv').config();
const app = require('./app');
const database = require('./config/database');
const eventEmitter = require('./events/EventEmitter');

class Server {
    constructor() {
        this.port = process.env.PORT || 8000;
        this.isShuttingDown = false;
        this.setupGracefulShutdown();
    }

    async start() {
        try {
            console.log('🚀 Starting Live Cursor Server...');
            
            // Connect to database first
            console.log('📡 Connecting to database...');
            await database.connect();
            eventEmitter.emitDatabaseConnected();
            
            // Start the application
            const server = app.listen(this.port, () => {
                console.log(`🎉 Live Cursor Server is running on port ${this.port}`);
                console.log(`🌐 HTTP endpoint: http://localhost:${this.port}`);
                console.log(`🔌 WebSocket endpoint: ws://localhost:${this.port}`);
                eventEmitter.emitServerStarted(this.port);
            });
            
            // Handle server errors
            server.on('error', (error) => {
                console.error('❌ Server Error:', error);
                eventEmitter.emitError(error, { context: 'server' });
            });
            
            this.server = server;
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    async stop() {
        if (this.isShuttingDown) {
            console.log('⏳ Shutdown already in progress...');
            return;
        }
        
        this.isShuttingDown = true;
        console.log('🛑 Shutting down server...');
        
        try {
            // Close HTTP server
            if (this.server) {
                console.log('🌐 Closing HTTP server...');
                this.server.close();
            }
            
            // Disconnect from database
            console.log('📡 Disconnecting from database...');
            await database.disconnect();
            
            eventEmitter.emitServerStopped();
            console.log('✅ Server shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        }
    }

    setupGracefulShutdown() {
        const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        
        shutdownSignals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📨 Received ${signal}, initiating graceful shutdown...`);
                await this.stop();
                process.exit(0);
            });
        });
        
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught Exception:', error);
            await this.stop();
            process.exit(1);
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('💥 Unhandled Rejection:', reason);
            await this.stop();
            process.exit(1);
        });
    }
}

// Create and start the server
const server = new Server();
server.start();

module.exports = server;