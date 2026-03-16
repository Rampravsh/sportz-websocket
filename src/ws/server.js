import WebSocket, { WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

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

    wss.on('connection', async (socket,req) => {
        if(wsArcjet){
            try {
                const decision=await wsArcjet.protect(req);
                if(decision.isDenied()){
                    const code = decision.reason.isRateLimit()?1013:1008;
                    const reason = decision.reason.isRateLimit()?"Too Many Requests":"Forbidden";
                    socket.close(code,reason);
                    return;
                }
            } catch (error) {
                console.error('wss connection error:', error);
                socket.close(1013,"Server security error");
                return;
            }
        }
        sendJson(socket, { type: 'welcome' });
        socket.on('error', console.error);
    })

    function broadcastMatchCreated(match) {
        broadcast(wss.clients, { type: 'match_created', data: match })
    }
    return { broadcastMatchCreated }
}