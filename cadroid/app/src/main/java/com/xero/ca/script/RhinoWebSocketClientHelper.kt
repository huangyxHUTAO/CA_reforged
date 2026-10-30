package com.xero.ca.script

import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake

import java.net.URI
import java.net.URISyntaxException

@ScriptObject
class RhinoWebSocketClientHelper @Throws(URISyntaxException::class) constructor(
    uri: String,
    delegate: DelegateInterface?,
) : WebSocketClient(URI(uri)) {
    private val delegate: DelegateInterface =
        requireNotNull(delegate) { "Delegate can't be null" }

    override fun onOpen(handshake: ServerHandshake) {
        delegate.onOpen(this, handshake)
    }

    override fun onMessage(message: String) {
        delegate.onMessage(this, message)
    }

    override fun onClose(code: Int, reason: String?, remote: Boolean) {
        delegate.onClose(this, code, reason, remote)
    }

    override fun onError(ex: Exception?) {
        delegate.onError(this, ex)
    }

    @ScriptObject
    interface DelegateInterface {
        fun onOpen(thisObj: RhinoWebSocketClientHelper, handshakeData: ServerHandshake)
        fun onMessage(thisObj: RhinoWebSocketClientHelper, message: String)
        fun onClose(thisObj: RhinoWebSocketClientHelper, code: Int, reason: String?, remote: Boolean)
        fun onError(thisObj: RhinoWebSocketClientHelper, ex: Exception?)
    }
}
