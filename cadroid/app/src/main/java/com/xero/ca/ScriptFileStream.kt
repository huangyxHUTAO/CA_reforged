package com.xero.ca

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.content.pm.SigningInfo
import android.os.Build

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.FilterInputStream
import java.io.IOException
import java.io.InputStream
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.io.OutputStream
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.security.PublicKey
import java.security.SignatureException
import java.security.spec.KeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.zip.Deflater
import java.util.zip.DeflaterOutputStream
import java.util.zip.GZIPInputStream
import java.util.zip.Inflater
import java.util.zip.InflaterInputStream

/**
 * 明文脚本流：数据先按签名证书 DER 逐字节异或，再 GZIP。
 *
 * 为了兼容 v3 密钥轮换，打开时会挨个试候选密钥，第一个能通过 GZIP 头校验的即为正确密钥。
 */
class ScriptFileStream private constructor(key: ByteArray?, stream: InputStream?) :
    GZIPInputStream(EncryptedInputStream(key, stream)) {

    /** 重新打开待解密数据流的工厂：挑选密钥时需要对同一个脚本多试几次，每次都要新的流 */
    fun interface StreamFactory {
        @Throws(IOException::class)
        fun open(): InputStream
    }

    @Throws(IOException::class)
    constructor(cx: Context, stream: InputStream?) : this(getKeyCandidates(cx)[0], stream)

    companion object {
        /**
         * 逐个候选密钥尝试解密，第一个能通过 GZIP 头校验的即为正确密钥。
         *
         * 为什么不能只用一张证书：APK 一旦用上 v3 签名密钥轮换
         * （proof-of-rotation，或 Android 13+ 的 v3.1 rotation targeting），
         * 不同 Android 版本从 PackageManager 读到的证书就不再相同：
         *   - v3.1 只对 T+ 轮换时：T+ 上是新证书，旧系统上仍是原证书，两者都要能解开同一份脚本；
         *   - 轮换后 v1(JAR)/v2 仍由最初那把密钥签（API 28 以下只认它），v3 用的是新密钥；
         *   - 多签名 APK 的历史格式是「所有证书首尾相接」当密钥。
         * 而 assets/script.js 只能按其中一张证书异或加密，所以这里挨个试。
         */
        @JvmStatic
        @Throws(IOException::class)
        fun fromAsset(cx: Context, fileName: String): InputStream =
            openWithKeyRotation(cx) { cx.assets.open(fileName) }

        @JvmStatic
        @Throws(IOException::class)
        fun fromFile(
            cx: Context,
            sourceFile: String,
            signFile: String,
            verify: ByteArray,
            versionCode: Int,
        ): InputStream {
            verifyFile(sourceFile, signFile, verify, versionCode)
            return openWithKeyRotation(cx) { FileInputStream(sourceFile) }
        }

        @Throws(IOException::class)
        private fun openWithKeyRotation(cx: Context, factory: StreamFactory): InputStream {
            var last: IOException? = null
            for (key in getKeyCandidates(cx)) {
                val stream = factory.open() // 打不开（如文件不存在）与密钥无关，直接抛出
                try {
                    return ScriptFileStream(key, stream)
                } catch (e: IOException) {
                    last = e
                    try {
                        stream.close()
                    } catch (ignored: IOException) {
                    }
                }
            }
            throw last ?: IOException("No available signature key")
        }

        /**
         * 按优先级列出候选密钥：
         * 1. 当前签名证书全部拼接（历史行为，兼容已有脚本）
         * 2. 当前签名证书逐个
         * 3. v3 轮换历史里的证书（旧证书）
         * 4. v1(JAR) 签名证书（API 28 以下唯一来源；轮换后仍是最初那把密钥）
         * 5. 空密钥（脚本未异或，或完全取不到签名信息）
         */
        // GET_SIGNING_CERTIFICATES / SigningInfo 是 API 28 起，下面已用 SDK_INT 判断保护
        @SuppressLint("NewApi")
        private fun getKeyCandidates(cx: Context): List<ByteArray> {
            val current = ArrayList<ByteArray>()
            val history = ArrayList<ByteArray>()
            val legacy = ArrayList<ByteArray>()
            try {
                val pm = cx.packageManager
                val pkg = cx.packageName
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val info: PackageInfo? = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES)
                    val signingInfo: SigningInfo? = info?.signingInfo
                    if (signingInfo != null) {
                        addSignatures(current, signingInfo.apkContentsSigners)
                        addSignatures(history, signingInfo.signingCertificateHistory)
                    }
                }
                @Suppress("DEPRECATION")
                val legacyInfo = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES)
                if (legacyInfo != null) addSignatures(legacy, legacyInfo.signatures)
            } catch (e: Exception) {
                // 取不到签名信息时退化为不异或
            }
            val keys = ArrayList<ByteArray>()
            val concatenated = concat(current)
            if (concatenated != null) keys.add(concatenated)
            addKeys(keys, current)
            addKeys(keys, history)
            addKeys(keys, legacy)
            keys.add(byteArrayOf(0))
            return keys
        }

        private fun addSignatures(out: MutableList<ByteArray>, signatures: Array<Signature>?) {
            if (signatures == null) return
            for (signature in signatures) {
                if (signature != null) out.add(signature.toByteArray())
            }
        }

        private fun addKeys(out: MutableList<ByteArray>, candidates: List<ByteArray>) {
            for (key in candidates) {
                if (key.isEmpty()) continue
                if (out.none { it.contentEquals(key) }) out.add(key)
            }
        }

        private fun concat(list: List<ByteArray>): ByteArray? {
            var size = 0
            for (bytes in list) size += bytes.size
            if (size == 0) return null
            val result = ByteArray(size)
            var offset = 0
            for (bytes in list) {
                System.arraycopy(bytes, 0, result, offset, bytes.size)
                offset += bytes.size
            }
            return result
        }

        @JvmStatic
        fun getStringHash(string: String): ByteArray {
            val bytes = string.toByteArray()
            return try {
                MessageDigest.getInstance("SHA-1").digest(bytes)
            } catch (e: NoSuchAlgorithmException) {
                bytes
            }
        }

        @JvmStatic
        @Throws(IOException::class, ClassNotFoundException::class)
        fun readScript(scriptFile: String, hash: ByteArray?): Any? =
            FileInputStream(scriptFile).use { fis ->
                ICodeInputStream(fis).readScript(hash)
            }

        @JvmStatic
        @Throws(IOException::class)
        fun writeScript(scriptFile: String, hash: ByteArray, script: Any?) {
            FileOutputStream(scriptFile).use { fos ->
                ICodeOutputStream(fos).writeScript(hash, script)
            }
        }

        @JvmStatic
        @Throws(IOException::class, ClassNotFoundException::class)
        fun readICode(iCode: ByteArray, hash: ByteArray?): Any? {
            val inflater = Inflater(true)
            val bis = ByteArrayInputStream(iCode)
            val iis = InflaterInputStream(bis, inflater)
            return ICodeInputStream(iis).readScript(hash)
        }

        @JvmStatic
        @Throws(IOException::class)
        fun writeICode(script: Any?, hash: ByteArray): ByteArray {
            val deflater = Deflater(Deflater.BEST_COMPRESSION, true)
            val bos = ByteArrayOutputStream()
            val dos = DeflaterOutputStream(bos, deflater)
            val icons = ICodeOutputStream(dos)
            icons.writeScript(hash, script)
            icons.close()
            return bos.toByteArray()
        }

        @Throws(IOException::class)
        private fun verifyFile(
            sourceFile: String,
            signFile: String,
            verify: ByteArray,
            versionCode: Int,
        ) {
            try {
                FileInputStream(sourceFile).use { stream ->
                    val signature = java.security.Signature.getInstance("SHA256withRSA")
                    val kf = KeyFactory.getInstance("RSA")
                    val spec: KeySpec = X509EncodedKeySpec(verify)
                    val pk: PublicKey = kf.generatePublic(spec)
                    signature.initVerify(pk)
                    val buf = ByteArray(4096)
                    var readBytes = stream.read(buf)
                    while (readBytes >= 0) {
                        signature.update(buf, 0, readBytes)
                        readBytes = stream.read(buf)
                    }
                    val sign = getFileBytes(signFile)
                    if (sign.size < 4) throw SignatureException("Signature is not available")
                    val signVer = readIntLE(sign, 0)
                    // 允许同版本号的热更新（重打同一版本时不用先抬 versionCode），只拒绝比当前版本更旧的
                    if (signVer < versionCode) {
                        throw SignatureException("Version $signVer is too low")
                    }
                    if (!signature.verify(sign, 4, sign.size - 4)) {
                        throw SignatureException("Signature not correct")
                    }
                }
            } catch (e: Exception) {
                throw IOException("Verification failed", e)
            }
        }

        @Throws(IOException::class)
        private fun getFileBytes(fileName: String): ByteArray {
            val buf = ByteArray(4096)
            val os = ByteArrayOutputStream()
            FileInputStream(fileName).use { stream ->
                var readBytes = stream.read(buf)
                while (readBytes >= 0) {
                    os.write(buf, 0, readBytes)
                    readBytes = stream.read(buf)
                }
            }
            return os.toByteArray()
        }

        private fun readIntLE(bytes: ByteArray, offset: Int): Int =
            (bytes[offset].toInt() and 0xff) or
                ((bytes[offset + 1].toInt() and 0xff) shl 8) or
                ((bytes[offset + 2].toInt() and 0xff) shl 16) or
                ((bytes[offset + 3].toInt() and 0xff) shl 24)
    }

    private class EncryptedInputStream(keys: ByteArray?, stream: InputStream?) :
        FilterInputStream(stream) {

        private var mReadBytes = 0
        private var mMark = -1
        private val mKeys: ByteArray = if (keys == null || keys.isEmpty()) byteArrayOf(0) else keys

        /* Bug 修复
         * Android 7.x 无法解码代码
         * 原因：Android 7.x的GZIPInputStream在<init>时
           会调用readHeader，内部调用了int read()。（之前只
           是int read(byte, int, int)读取一个byte[10]）
         * 解决方案：Override int read()
         */
        @Throws(IOException::class)
        override fun read(): Int {
            val r = `in`.read()
            if (r < 0) return r
            var b = r.toByte()
            b = (b.toInt() xor mKeys[mReadBytes % mKeys.size].toInt()).toByte()
            mReadBytes++
            return if (b < 0) b + 256 else b.toInt()
        }

        @Throws(IOException::class)
        override fun read(b: ByteArray): Int = read(b, 0, b.size)

        @Throws(IOException::class)
        override fun read(b: ByteArray, off: Int, len: Int): Int {
            val r = `in`.read(b, off, len)
            val end = off + r
            var i = off
            while (i < end) {
                b[i] = (b[i].toInt() xor mKeys[mReadBytes % mKeys.size].toInt()).toByte()
                i++
                mReadBytes++
            }
            return r
        }

        @Throws(IOException::class)
        override fun skip(n: Long): Long {
            val r = `in`.skip(n)
            mReadBytes += r.toInt()
            return r
        }

        override fun mark(readlimit: Int) {
            `in`.mark(readlimit)
            mMark = mReadBytes
        }

        @Throws(IOException::class)
        override fun reset() {
            `in`.reset()
            if (mMark >= 0) mReadBytes = mMark
        }
    }

    private class ICodeInputStream(inStream: InputStream?) : ObjectInputStream(inStream) {
        @Throws(IOException::class, ClassNotFoundException::class)
        fun readScript(hash: ByteArray?): Any? {
            if (readInt() != VERSION) {
                throw IOException("Incompatible ICode")
            }
            val arrayLen = readInt()
            if (arrayLen < 0) {
                throw IOException("Hash Chunk Length < 0")
            }
            val bytes = ByteArray(arrayLen)
            readFully(bytes)
            if (!bytes.contentEquals(hash)) {
                throw IOException("Wrong hash")
            }
            return readObject()
        }

        companion object {
            private const val VERSION = 0x5
        }
    }

    private class ICodeOutputStream(out: OutputStream?) : ObjectOutputStream(out) {
        @Throws(IOException::class)
        fun writeScript(hash: ByteArray, script: Any?) {
            writeInt(VERSION)
            writeInt(hash.size)
            write(hash)
            writeObject(script)
        }

        companion object {
            private const val VERSION = 0x5
        }
    }
}
