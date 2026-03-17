import WebSocket, { WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubsribers =new Map();

function subscribe(matchId,socket){
    if(!matchSubsribers.has(matchId)){
        matchSubsribers.set(matchId,new Set());
    }
    matchSubsribers.get(matchId).add(socket);
}

function unsubscribe(matchId,socket){
    const subs=matchSubsribers.get(matchId);
    if(!subs)return;
    subs.delete(socket);
    if(subs.size ===0){
        matchSubsribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId,socket);
    }
    socket.subscriptions.clear();
}


function sendJson(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
    }
}

function broadcastToAll(clients, payload) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            sendJson(client, payload)
        }
    }
}

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

const MAX_SUBS_PER_SOCKET = 100;

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
        if (socket.subscriptions.size >= MAX_SUBS_PER_SOCKET && !socket.subscriptions.has(message.matchId)) {
            sendJson(socket, { type: "error", reason: "subscription_limit_reached" });
            return;
        }
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