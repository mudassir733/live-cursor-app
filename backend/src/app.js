const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// Import modules
const eventEmitter = require('./events/EventEmitter');
const SocketEventHandler = require('./events/socketEvents');
const userRoutes = require('./routes/userRoutes');
const cursorRoutes = require('./routes/cursorRoutes');

class App {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wsServer = null;
        this.socketHandler = new SocketEventHandler();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupEventListeners();
    }

    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            console.log(`📝 ${req.method} ${req.path} - ${new Date().toISOString()}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // API routes
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/cursors', cursorRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Live Cursor API Server',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    users: '/api/users',
                    websocket: 'ws://localhost:' + (process.env.PORT || 8000)
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method
            });
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('🚨 Express Error:', error);
            eventEmitter.emitError(error, {
                context: 'expressError',
                path: req.path,
                method: req.method
            });

            res.status(error.status || 500).json({
                error: error.message || 'Internal Server Error',
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            });
        });
    }

    setupWebSocket() {
        // Initialize WebSocket server
        this.wsServer = new WebSocketServer({
            server: this.server,
            perMessageDeflate: false
        });

        // Set up WebSocket connection handler
        this.wsServer.on('connection', (connection, request) => {
            this.socketHandler.handleConnection(connection, request);
        });

        // Handle WebSocket server errors
        this.wsServer.on('error', (error) => {
            console.error('WebSocket Server Error:', error);
            eventEmitter.emitError(error, { context: 'wsServer' });
        });

        console.log(' WebSocket server initialized');
    }

    setupEventListeners() {
        eventEmitter.on('server:started', (data) => {
            console.log(' Database integration active');
        });

        eventEmitter.on('user:connected', (userData) => {
            console.log(`Welcome ${userData.username}! (Session: ${userData.sessionId.substring(0, 8)}...)`);
        });

        eventEmitter.on('user:disconnected', (userData) => {
            console.log(`Goodbye ${userData.username}! (Session: ${userData.sessionId.substring(0, 8)}...)`);
        });

        eventEmitter.on('error', (errorData) => {
            console.error(`Application Error [${errorData.context.context || 'unknown'}]:`, errorData.error.message);
        });
    }

    // Method to get the HTTP server instance
    listen(port, callback) {
        return this.server.listen(port, callback);
    }

    // Cleanup method
    async cleanup() {
        try {

            if (this.wsServer) {
                console.log(' Closing WebSocket connections...');
                this.wsServer.close();
            }

            if (this.socketHandler) {
                await this.socketHandler.cleanup();
            }

            console.log(' App cleanup complete');
        } catch (error) {
            console.error(' Error during app cleanup:', error);
        }
    }
}


const app = new App();
module.exports = app;
