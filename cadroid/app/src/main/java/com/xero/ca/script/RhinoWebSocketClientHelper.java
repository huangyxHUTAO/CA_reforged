package com.huangyx.ca.script;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.net.URISyntaxException;

@ScriptObject
public class RhinoWebSocketClientHelper extends WebSocketClient {
    private DelegateInterface delegate;

    public RhinoWebSocketClientHelper(String uri, DelegateInterface delegate) throws URISyntaxException {
        super(new URI(uri));
        if (delegate == null) throw new IllegalArgumentException("Delegate can't be null");
        this.delegate = delegate;
    }

    @Override
    public void onOpen(ServerHandshake handshakedata) {
        delegate.onOpen(this, handshakedata);
    }

    @Override
    public void onMessage(String message) {
        delegate.onMessage(this, message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        delegate.onClose(this, code, reason, remote);
    }

    @Override
    public void onError(Exception ex) {
        delegate.onError(this, ex);
    }

    @ScriptObject
    public interface DelegateInterface {
        void onOpen(RhinoWebSocketClientHelper thisObj, ServerHandshake handshakeData);
        void onMessage(RhinoWebSocketClientHelper thisObj, String message);
        void onClose(RhinoWebSocketClientHelper thisObj, int code, String reason, boolean remote);
        void onError(RhinoWebSocketClientHelper thisObj, Exception ex);
    }
}
