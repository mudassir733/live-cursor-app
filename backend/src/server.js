const http = require('http');
const { WebSocketServer } = require("ws");
const url = require('url');
const uuidv4 = require('uuid').v4;

const server = http.createServer();

const wsServer = new WebSocketServer({ server });
const PORT = 8000;

const connections = {};
const users = {};

const broadCast = () => {
    Object.keys(connections).forEach(uuid => {
        const connection = connections[uuid];
        const message = JSON.stringify(users);
        connection.send(message);
    });
};

const handleClose = uuid => {
    console.log(`${users[uuid].username} disconnected`);
    delete connections[uuid];
    delete users[uuid];
    broadCast();
}

const handleMessage = (bytes, uuid) => {

    const message = JSON.parse(bytes.toString());
    const user = users[uuid];
    user.state = message;
    console.log(`${user.username} updated their state to ${JSON.stringify(user.state)}`);
    broadCast();
    console.log(message);
}

wsServer.on('connection', (connection, request) => {
    const { username } = url.parse(request.url, true).query;
    const uuid = uuidv4();
    console.log(`${username} connected with uuid ${uuid}`);

    connections[uuid] = connection;
    users[uuid] = {
        username: username,
        state: {}
    }
    connection.on('message', (message) => handleMessage(message, uuid));
    connection.on('close', () => handleClose(uuid));


});

server.listen(PORT, () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});