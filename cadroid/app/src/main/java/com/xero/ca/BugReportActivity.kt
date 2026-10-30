package com.xero.ca

import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import kotlin.system.exitProcess

class BugReportActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        actionBar?.title = "BugReport"
        val ex = intent?.extras ?: return
        val em = ex.getString("exception", "") ?: ""
        AlertDialog.Builder(this)
            .setTitle("错误")
            .setCancelable(false)
            .setMessage(
                "您好，命令助手出现了一个错误。您可以将这个错误反馈给我们，来推动命令助手的更新。您也可以选择忽略。" +
                    "作者联系方式：QQ-2687587184;Email-projectxero@163.com\n\n" +
                    "错误信息：\n" + em
            )
            .setPositiveButton("复制并关闭") { _, _ ->
                setClipText(em)
                finish()
            }
            .setNegativeButton("忽略") { _, _ -> finish() }
            .apply {
                val epid = ex.getInt("pid", 0)
                if (epid != 0) {
                    setNeutralButton("立即停止") { _, _ ->
                        finish()
                        android.os.Process.killProcess(epid)
                        exitProcess(0)
                    }
                }
            }
            .show()
    }

    private fun setClipText(str: String) {
        val cm = getSystemService(CLIPBOARD_SERVICE) as? ClipboardManager
        // 不能用 cm?.primaryClip = ...：Kotlin 里 ClipboardManager.primaryClip
        // 被识别成只读属性（val），赋值编译不过（'val' cannot be reassigned）
        cm?.setPrimaryClip(ClipData.newPlainText("", str))
    }

    companion object {
        @JvmStatic
        fun createIntent(context: Context, message: String, sourcePid: Int): Intent =
            Intent(context, BugReportActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("exception", message)
                putExtra("pid", sourcePid)
            }
    }
}
