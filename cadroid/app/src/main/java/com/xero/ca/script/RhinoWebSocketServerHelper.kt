package com.xero.ca.script

import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer

import java.net.InetSocketAddress

@ScriptObject
class RhinoWebSocketServerHelper(port: Int, delegate: DelegateInterface?) :
    WebSocketServer(InetSocketAddress(port)) {

    private val delegate: DelegateInterface =
        requireNotNull(delegate) { "Delegate can't be null" }

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake) {
        delegate.onOpen(conn, handshake)
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        delegate.onClose(conn, code, reason, remote)
    }

    override fun onMessage(conn: WebSocket, message: String) {
        delegate.onMessage(conn, message)
    }

    override fun onError(conn: WebSocket?, ex: Exception) {
        delegate.onError(conn, ex)
    }

    override fun onStart() {
        delegate.onStart()
    }

    @ScriptObject
    interface DelegateInterface {
        fun onOpen(conn: WebSocket, handshake: ClientHandshake)
        fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean)
        fun onMessage(conn: WebSocket, message: String)
        fun onError(conn: WebSocket?, ex: Exception)
        fun onStart()
    }
}
