package com.xero.ca.script

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.util.AttributeSet
import android.webkit.ConsoleMessage
import android.webkit.DownloadListener
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * 脚本可用的 WebView：把 WebChromeClient / WebViewClient / DownloadListener
 * 全部转发给脚本提供的 Delegee，脚本只需要实现自己关心的方法。
 */
@ScriptObject
class RhinoWebView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : WebView(context, attrs, defStyleAttr) {

    fun setDelegee(delegee: Delegee?): RhinoWebView {
        requireNotNull(delegee) { "Delegee can't be null" }
        webChromeClient = ChromeClientDelegator(this, delegee)
        webViewClient = WebViewClientDelegator(this, delegee)
        setDownloadListener(IDelegator(this, delegee))
        return this
    }

    class ChromeClientDelegator(
        private val parent: WebView,
        private val delegee: Delegee,
    ) : WebChromeClient() {
        override fun onCloseWindow(window: WebView) {
            delegee.onCloseWindow(window)
        }

        override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean =
            delegee.onConsoleMessage(parent, consoleMessage)

        override fun onCreateWindow(
            view: WebView,
            isDialog: Boolean,
            isUserGesture: Boolean,
            resultMsg: Message,
        ): Boolean = delegee.onCreateWindow(view, isDialog, isUserGesture, resultMsg)

        override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean =
            delegee.onJsAlert(view, url, message, result)

        override fun onJsBeforeUnload(view: WebView, url: String, message: String, result: JsResult): Boolean =
            delegee.onJsBeforeUnload(view, url, message, result)

        override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean =
            delegee.onJsConfirm(view, url, message, result)

        override fun onJsPrompt(
            view: WebView,
            url: String,
            message: String,
            defaultValue: String,
            result: JsPromptResult,
        ): Boolean = delegee.onJsPrompt(view, url, message, defaultValue, result)

        override fun onProgressChanged(view: WebView, newProgress: Int) {
            delegee.onProgressChanged(view, newProgress)
        }

        override fun onReceivedIcon(view: WebView, icon: Bitmap?) {
            delegee.onReceivedIcon(view, icon)
        }

        override fun onReceivedTitle(view: WebView, title: String?) {
            delegee.onReceivedTitle(view, title)
        }

        override fun onReceivedTouchIconUrl(view: WebView, url: String, precomposed: Boolean) {
            delegee.onReceivedTouchIconUrl(view, url, precomposed)
        }

        override fun onRequestFocus(view: WebView) {
            delegee.onRequestFocus(view)
        }

        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean = delegee.onShowFileChooser(webView, filePathCallback, fileChooserParams)
    }

    class WebViewClientDelegator(
        private val parent: WebView,
        private val delegee: Delegee,
    ) : WebViewClient() {
        override fun onLoadResource(view: WebView, url: String) {
            delegee.onLoadResource(view, url)
        }

        override fun onPageFinished(view: WebView, url: String) {
            delegee.onPageFinished(view, url)
        }

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            delegee.onPageStarted(view, url, favicon)
        }
    }

    class IDelegator(
        private val parent: WebView,
        private val delegee: Delegee,
    ) : DownloadListener {
        override fun onDownloadStart(
            url: String,
            userAgent: String?,
            contentDisposition: String?,
            mimetype: String?,
            contentLength: Long,
        ) {
            delegee.onDownloadStart(parent, url, userAgent, contentDisposition, mimetype, contentLength)
        }
    }

    @ScriptObject
    interface Delegee {
        fun onCloseWindow(window: WebView)
        fun onConsoleMessage(view: WebView, consoleMessage: ConsoleMessage): Boolean
        fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean
        fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean
        fun onJsBeforeUnload(view: WebView, url: String, message: String, result: JsResult): Boolean
        fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean
        fun onJsPrompt(
            view: WebView,
            url: String,
            message: String,
            defaultValue: String,
            result: JsPromptResult,
        ): Boolean
        fun onProgressChanged(view: WebView, newProgress: Int)
        fun onReceivedIcon(view: WebView, icon: Bitmap?)
        fun onReceivedTitle(view: WebView, title: String?)
        fun onReceivedTouchIconUrl(view: WebView, url: String, precomposed: Boolean)
        fun onRequestFocus(view: WebView)
        fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: WebChromeClient.FileChooserParams,
        ): Boolean
        fun onLoadResource(view: WebView, url: String)
        fun onPageFinished(view: WebView, url: String)
        fun onPageStarted(view: WebView, url: String, favicon: Bitmap?)
        fun onDownloadStart(
            view: WebView,
            url: String,
            userAgent: String?,
            contentDisposition: String?,
            mimetype: String?,
            contentLength: Long,
        )
    }
}
