package com.huangyx.ca.script;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;

@ScriptObject
public class RhinoWebSocketServerHelper extends WebSocketServer {
    private DelegateInterface delegate;

    public RhinoWebSocketServerHelper(int port, DelegateInterface delegate) {
        super(new InetSocketAddress(port));
        if (delegate == null) throw new IllegalArgumentException("Delegate can't be null");
        this.delegate = delegate;
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        delegate.onOpen(conn, handshake);
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        delegate.onClose(conn, code, reason, remote);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        delegate.onMessage(conn, message);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        delegate.onError(conn, ex);
    }

    @Override
    public void onStart() {
        delegate.onStart();
    }

    @ScriptObject
    public interface DelegateInterface {
        void onOpen(WebSocket conn, ClientHandshake handshake);
        void onClose(WebSocket conn, int code, String reason, boolean remote);
        void onMessage(WebSocket conn, String message);
        void onError(WebSocket conn, Exception ex);
        void onStart();
    }
}
