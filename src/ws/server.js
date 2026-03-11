import WebSocket, { WebSocketServer } from "ws";

function sendJson(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

function broadcast(clients, payload) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            sendJson(client, payload)
        }
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 })

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome' });
        socket.on('error', console.error);
    })

    function broadcastMatchCreated(match) {
        broadcast(wss.clients, { type: 'match_created', data: match })
    }
    return { broadcastMatchCreated }
}