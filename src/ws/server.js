import WebSocket, { WebSocketServer } from "ws";

/**
 * Send a JSON-stringified payload over a WebSocket if the socket is open.
 * @param {WebSocket} socket - The WebSocket to send the payload through.
 * @param {*} payload - The value to be JSON-stringified and sent.
 */
function sendJson(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

/**
 * Send a payload to every client in the provided iterable that has an open WebSocket connection.
 * @param {Iterable<WebSocket>} clients - Iterable of WebSocket clients to notify.
 * @param {*} payload - The value to send to each open client (will be serialized for transmission).
 */
function broadcast(clients, payload) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            sendJson(client, payload)
        }
    }
}

/**
 * Mounts a WebSocket server at /ws on the provided HTTP server and handles new connections.
 * @param {import('http').Server} server - HTTP server to attach the WebSocket server to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object exposing `broadcastMatchCreated` which broadcasts a `match_created` event with the provided match data to all connected clients.
 */
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