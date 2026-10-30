package com.xero.ca

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.webkit.MimeTypeMap

import java.io.File
import java.io.FileNotFoundException
import java.io.IOException
import java.util.Collections

/**
 * 把应用私有目录里的文件临时暴露成 content:// URI。
 *
 * 只有通过 getUriForFile 登记过的路径才允许读取（见 getFileForUri 的白名单检查）。
 */
class UnsafeFileProvider : ContentProvider() {
    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<String>?,
        selection: String?,
        selectionArgs: Array<String>?,
        sortOrder: String?,
    ): Cursor {
        val file = getFileForUri(uri)
        val requested = projection ?: arrayOf(
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.SIZE,
        )
        val cols = ArrayList<String>(requested.size)
        val values = ArrayList<Any>(requested.size)
        for (s in requested) {
            when (s) {
                MediaStore.MediaColumns.DISPLAY_NAME -> {
                    cols.add(s)
                    values.add(file.name)
                }
                MediaStore.MediaColumns.SIZE -> {
                    cols.add(s)
                    values.add(file.name)
                }
                MediaStore.MediaColumns.DATA -> {
                    cols.add(s)
                    values.add(file.path)
                }
            }
        }
        val r = MatrixCursor(cols.toTypedArray(), 1)
        r.addRow(values.toTypedArray())
        return r
    }

    override fun getType(uri: Uri): String {
        val file = getFileForUri(uri)
        val lastDot = file.name.lastIndexOf('.')
        if (lastDot >= 0) {
            val extension = file.name.substring(lastDot + 1)
            val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            if (mime != null) {
                return mime
            }
        }
        return "application/octet-stream"
    }

    override fun insert(uri: Uri, contentValues: ContentValues?): Uri {
        throw UnsupportedOperationException()
    }

    override fun delete(uri: Uri, s: String?, strings: Array<String>?): Int =
        if (getFileForUri(uri).delete()) 1 else 0

    override fun update(
        uri: Uri,
        contentValues: ContentValues?,
        s: String?,
        strings: Array<String>?,
    ): Int {
        throw UnsupportedOperationException()
    }

    @Throws(FileNotFoundException::class)
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor {
        val file = getFileForUri(uri)
        return ParcelFileDescriptor.open(file, modeToMode(mode))
    }

    companion object {
        private val mFiles: MutableSet<String> = Collections.synchronizedSet(HashSet())

        // 跟随 applicationId，与 Manifest 里的 ${applicationId} 保持一致
        private val authority: String = BuildConfig.APPLICATION_ID + ".UnsafeFileProvider"

        @JvmStatic
        fun getUriForFile(file: File): Uri {
            val canonical = try {
                file.canonicalFile
            } catch (e: IOException) {
                throw IllegalArgumentException("Failed to resolve canonical path for $file")
            }
            mFiles.add(canonical.path)
            return Uri.Builder().scheme("content")
                .authority(authority).path(canonical.path).build()
        }

        @JvmStatic
        fun getFileForUri(uri: Uri): File {
            val path = uri.path ?: throw IllegalArgumentException("URI has no path: $uri")
            val file = try {
                File(path).canonicalFile
            } catch (e: IOException) {
                throw IllegalArgumentException("Failed to resolve canonical path for $path")
            }
            if (!mFiles.contains(file.path)) throw SecurityException()
            return file
        }

        /**
         * Copied from ContentResolver.java
         */
        private fun modeToMode(mode: String): Int = when (mode) {
            "r" -> ParcelFileDescriptor.MODE_READ_ONLY
            "w", "wt" -> ParcelFileDescriptor.MODE_WRITE_ONLY or
                ParcelFileDescriptor.MODE_CREATE or ParcelFileDescriptor.MODE_TRUNCATE
            "wa" -> ParcelFileDescriptor.MODE_WRITE_ONLY or
                ParcelFileDescriptor.MODE_CREATE or ParcelFileDescriptor.MODE_APPEND
            "rw" -> ParcelFileDescriptor.MODE_READ_WRITE or ParcelFileDescriptor.MODE_CREATE
            "rwt" -> ParcelFileDescriptor.MODE_READ_WRITE or
                ParcelFileDescriptor.MODE_CREATE or ParcelFileDescriptor.MODE_TRUNCATE
            else -> throw IllegalArgumentException("Invalid mode: $mode")
        }
    }
}
