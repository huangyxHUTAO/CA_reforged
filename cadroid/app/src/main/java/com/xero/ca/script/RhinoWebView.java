package com.huangyx.ca.script;

import android.content.Context;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Message;
import android.util.AttributeSet;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

@ScriptObject
public class RhinoWebView extends WebView {
    public RhinoWebView(Context context) {
        super(context);
    }

    public RhinoWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public RhinoWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public RhinoWebView setDelegee(Delegee delegee) {
        if (delegee == null) throw new IllegalArgumentException();
        setWebChromeClient(new ChromeClientDelegetor(this, delegee));
        setWebViewClient(new WebViewClientDelegator(this, delegee));
        IDelegator iDelegator = new IDelegator(this, delegee);
        setDownloadListener(iDelegator);
        return this;
    }

    public static class ChromeClientDelegetor extends WebChromeClient {
        Delegee delegee;
        WebView parent;

        public ChromeClientDelegetor(WebView parent, Delegee delegee) {
            this.parent = parent;
            this.delegee = delegee;
        }

        @Override
        public void onCloseWindow(WebView window) {
            delegee.onCloseWindow(window);
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            return delegee.onConsoleMessage(parent, consoleMessage);
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            return delegee.onCreateWindow(view, isDialog, isUserGesture, resultMsg);
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
            return delegee.onJsAlert(view, url, message, result);
        }

        @Override
        public boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result) {
            return delegee.onJsBeforeUnload(view, url, message, result);
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
            return delegee.onJsConfirm(view, url, message, result);
        }

        @Override
        public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
            return delegee.onJsPrompt(view, url, message, defaultValue, result);
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            delegee.onProgressChanged(view, newProgress);
        }

        @Override
        public void onReceivedIcon(WebView view, Bitmap icon) {
            delegee.onReceivedIcon(view, icon);
        }

        @Override
        public void onReceivedTitle(WebView view, String title) {
            delegee.onReceivedTitle(view, title);
        }

        @Override
        public void onReceivedTouchIconUrl(WebView view, String url, boolean precomposed) {
            delegee.onReceivedTouchIconUrl(view, url, precomposed);
        }

        @Override
        public void onRequestFocus(WebView view) {
            delegee.onRequestFocus(view);
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            return delegee.onShowFileChooser(webView, filePathCallback, fileChooserParams);
        }
    }

    public static class WebViewClientDelegator extends WebViewClient {
        Delegee delegee;
        WebView parent;

        public WebViewClientDelegator(WebView parent, Delegee delegee) {
            this.parent = parent;
            this.delegee = delegee;
        }

        @Override
        public void onLoadResource(WebView view, String url) {
            delegee.onLoadResource(view, url);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            delegee.onPageFinished(view, url);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            delegee.onPageStarted(view, url, favicon);
        }
    }

    public static class IDelegator implements DownloadListener {
        Delegee delegee;
        WebView parent;

        public IDelegator(WebView parent, Delegee delegee) {
            this.parent = parent;
            this.delegee = delegee;
        }

        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
            delegee.onDownloadStart(parent, url, userAgent, contentDisposition, mimetype, contentLength);
        }
    }

    @ScriptObject
    public interface Delegee {
        void onCloseWindow(WebView window);
        boolean onConsoleMessage(WebView view, ConsoleMessage consoleMessage);
        boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg);
        boolean onJsAlert(WebView view, String url, String message, JsResult result);
        boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result);
        boolean onJsConfirm(WebView view, String url, String message, JsResult result);
        boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result);
        void onProgressChanged(WebView view, int newProgress);
        void onReceivedIcon(WebView view, Bitmap icon);
        void onReceivedTitle(WebView view, String title);
        void onReceivedTouchIconUrl(WebView view, String url, boolean precomposed);
        void onRequestFocus(WebView view);
        boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, WebChromeClient.FileChooserParams fileChooserParams);
        void onLoadResource(WebView view, String url);
        void onPageFinished(WebView view, String url);
        void onPageStarted(WebView view, String url, Bitmap favicon);
        void onDownloadStart(WebView view, String url, String userAgent, String contentDisposition, String mimetype, long contentLength);
    }
}
