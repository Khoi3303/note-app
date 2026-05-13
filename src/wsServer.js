const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;

const initWebSocketServer = (server) => {
    wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (socket, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            socket.close(4001, 'Unauthorized');
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
        } catch (error) {
            socket.close(4001, 'Unauthorized');
            return;
        }

        socket.on('message', (message) => {
            try {
                const payload = JSON.parse(message.toString());
                if (payload.type === 'ping') {
                    socket.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (err) {
                // Ignore invalid messages
            }
        });
    });
};

const broadcastNoteEvent = (event) => {
    if (!wss) return;
    const payload = JSON.stringify(event);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
};

module.exports = { initWebSocketServer, broadcastNoteEvent };
