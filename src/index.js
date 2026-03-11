import express from "express"
import { matchRouter } from "./routes/matches.js"
import http from "http"
import { attachWebSocketServer } from "./ws/server.js"

const PORT = Number(process.env.PORT || 8000)
const HOST = process.env.HOST || '0.0.0.0'
const app = express()

const server = http.createServer(app)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.send('hello from Express server!')
})

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server)
app.locals.broadcastMatchCreated = broadcastMatchCreated

server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? 'http://localhost:' + PORT : 'http://' + HOST + ':' + PORT;
    console.log(`Server is running at ${baseUrl}`)
    console.log(`WebSocket is running at ${baseUrl.replace('http', 'ws')}/ws`)
}) 