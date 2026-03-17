import WebSocket, { WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubsribers =new Map();

/**
 * Ensure a subscriber set exists for the given match and add the socket to it.
 * @param {number} matchId - Match identifier (integer) to subscribe the socket to.
 * @param {WebSocket} socket - WebSocket connection to register as a subscriber.
 */
function subscribe(matchId,socket){
    if(!matchSubsribers.has(matchId)){
        matchSubsribers.set(matchId,new Set());
    }
    matchSubsribers.get(matchId).add(socket);
}

/**
 * Remove a socket's subscription for a given match and clean up the match entry if empty.
 * @param {number} matchId - The numeric identifier of the match.
 * @param {import("ws").WebSocket} socket - The WebSocket connection to remove from subscribers.
 */
function unsubscribe(matchId,socket){
    const subs=matchSubsribers.get(matchId);
    if(!subs)return;
    subs.delete(socket);
    if(subs.size ===0){
        matchSubsribers.delete(matchId);
    }
}

/**
 * Remove the socket from every match subscriber list and clear its local subscriptions set.
 * @param {WebSocket & { subscriptions: Set<number> }} socket - Socket whose subscriptions will be unsubscribed and cleared.
 */
function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId,socket);
    }
    socket.subscriptions.clear();
}


/**
 * Sends the given payload as JSON to the socket if the socket is open.
 * @param {WebSocket} socket - Destination WebSocket; message is sent only when its readyState is OPEN.
 * @param {*} payload - Value to serialize with JSON.stringify and transmit to the socket.
 */
function sendJson(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

/**
 * Broadcast a payload to all open WebSocket clients.
 * @param {Iterable<WebSocket>} clients - Collection of WebSocket clients to iterate over.
 * @param {*} payload - Value that will be JSON-serialized and sent to each open client.
 */
function broadcastToAll(clients, payload) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            sendJson(client, payload)
        }
    }
}

/**
 * Send a JSON-serialized payload to all currently subscribed sockets for a match.
 * @param {number} matchId - The match identifier whose subscribers will receive the payload.
 * @param {*} payload - The value to serialize and send to each subscriber.
 */
function broadcastToMatch(matchId,payload){
    const subs=matchSubsribers.get(matchId);
    if(!subs || subs.size ===0)return;
    const message=JSON.stringify(payload);
    for(const sub of subs){
        if(sub.readyState === WebSocket.OPEN){
            sub.send(message);
        }
    }
}

/**
 * Parse an incoming WebSocket message and process subscription commands.
 *
 * Parses the provided message as JSON; if parsing fails, sends an error to the socket.
 * Handles messages with `type: "subscribe"` or `type: "unsubscribe"` when `matchId` is an integer:
 * - For "subscribe": registers the socket for the match and sends a `subscribed` confirmation.
 * - For "unsubscribe": removes the socket from the match and sends an `unsubscribed` confirmation.
 *
 * @param {WebSocket} socket - The client socket to read from and send responses to; must have a `subscriptions` Set.
 * @param {Buffer|string} data - Raw message payload received from the client.
 */
function handleMessage(socket,data){
    let message;
    try {
        message = JSON.parse(data.toString())
    } catch (error) {
        sendJson(socket,{type:"error",message:"Invalid message"});
        console.error('wss message error:', error);
        return;
    }
    if(message?.type === "subscribe" && Number.isInteger(message.matchId)){
        subscribe(message.matchId,socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket,{type:"subscribed",matchId:message.matchId});
    }
    if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)){
        unsubscribe(message.matchId,socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket,{type:"unsubscribed",matchId:message.matchId});
    }
}

/**
 * Attach a WebSocket server at path "/ws" to the provided HTTP server and return helpers for broadcasting updates.
 *
 * @param {import('http').Server} server - The HTTP server instance to bind the WebSocketServer to.
 * @returns {{broadcastMatchCreated: function(match: any): void, broadcastCommentary: function(matchId: number, commentary: any): void}} An object with two broadcasting helpers:
 *   - broadcastMatchCreated(match): Broadcasts a `{ type: 'match_created', data: match }` message to all connected clients.
 *   - broadcastCommentary(matchId, commentary): Broadcasts a `{ type: 'commentary', data: commentary }` message to clients subscribed to the specified `matchId`.
 */
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
        socket.subscriptions=new Set();
        socket.on("message",(data)=>handleMessage(socket,data));
        socket.on("close",()=>cleanupSubscriptions(socket));
        socket.on("error",console.error);
        sendJson(socket, { type: 'welcome' });
    })

    function broadcastMatchCreated(match) {
        broadcastToAll(wss.clients, { type: 'match_created', data: match })
    }
    function broadcastCommentary(matchId,commentary){
        broadcastToMatch(matchId,{type:"commentary",data:commentary});
    }
    return { broadcastMatchCreated,broadcastCommentary }
}