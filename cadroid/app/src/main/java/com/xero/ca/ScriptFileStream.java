package com.huangyx.ca;

import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.support.annotation.NonNull;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.OutputStream;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.SignatureException;
import java.security.spec.KeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.zip.Deflater;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.GZIPInputStream;
import java.util.zip.Inflater;
import java.util.zip.InflaterInputStream;

public class ScriptFileStream extends GZIPInputStream {
    public ScriptFileStream(Context cx, InputStream stream) throws IOException {
        // 只解压，不做签名异或，直接传入原始流
        super(stream);
    }

    public static InputStream fromAsset(Context cx, String fileName) throws IOException {
        // 只解压，不做签名异或
        return new ScriptFileStream(cx, cx.getAssets().open(fileName));
    }

    public static InputStream fromFile(Context cx, String sourceFile, String signFile, byte[] verify, int versionCode) throws IOException {
        // 只解压，不做签名异或
        return new ScriptFileStream(cx, new FileInputStream(sourceFile));
    }

    public static byte[] getStringHash(String string) {
        MessageDigest digest;
        byte[] bytes = string.getBytes();
        try {
            digest = MessageDigest.getInstance("SHA-1");
            return digest.digest(bytes);
        } catch (NoSuchAlgorithmException e) {
            return bytes;
        }
    }

    public static Object readScript(String scriptFile, byte[] hash) throws IOException, ClassNotFoundException {
        try (FileInputStream fis = new FileInputStream(scriptFile)) {
            ICodeInputStream iis = new ICodeInputStream(fis);
            return iis.readScript(hash);
        }
    }

    public static void writeScript(String scriptFile, byte[] hash, Object script) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(scriptFile)) {
            ICodeOutputStream ios = new ICodeOutputStream(fos);
            ios.writeScript(hash, script);
        }
    }

    public static Object readICode(byte[] iCode, byte[] hash) throws IOException, ClassNotFoundException {
        Inflater inflater = new Inflater(true);
        ByteArrayInputStream bis = new ByteArrayInputStream(iCode);
        InflaterInputStream iis = new InflaterInputStream(bis, inflater);
        ICodeInputStream icis = new ICodeInputStream(iis);
        return icis.readScript(hash);
    }

    public static byte[] writeICode(Object script, byte[] hash) throws IOException {
        Deflater deflater = new Deflater(Deflater.BEST_COMPRESSION, true);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        DeflaterOutputStream dos = new DeflaterOutputStream(bos, deflater);
        ICodeOutputStream icos = new ICodeOutputStream(dos);
        icos.writeScript(hash, script);
        icos.close();
        return bos.toByteArray();
    }

    private static void verifyFile(String sourceFile, String signFile, byte[] verify, int versionCode) throws IOException {
        try (InputStream is = new FileInputStream(sourceFile)) {
            java.security.Signature signature = java.security.Signature.getInstance("SHA256withRSA");
            KeyFactory kf = KeyFactory.getInstance("RSA");
            KeySpec spec = new X509EncodedKeySpec(verify);
            PublicKey pk = kf.generatePublic(spec);
            signature.initVerify(pk);
            byte[] buf = new byte[4096];
            int readBytes;
            while ((readBytes = is.read(buf)) >= 0) {
                signature.update(buf, 0, readBytes);
            }
            byte[] sign = getFileBytes(signFile);
            if (sign.length < 4) throw new SignatureException("Signature is not available");
            int signVer = readIntLE(sign, 0);
            if (signVer <= versionCode)
                throw new SignatureException("Version " + signVer + " is too low");
            if (!signature.verify(sign, 4, sign.length - 4)) {
                throw new SignatureException("Signature not correct");
            }
        } catch (Exception e) {
            throw new IOException("Verification failed", e);
        }
    }

    private static byte[] getFileBytes(String fileName) throws IOException {
        byte[] buf = new byte[4096];
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        try (InputStream is = new FileInputStream(fileName)) {
            int readBytes;
            while ((readBytes = is.read(buf)) >= 0) {
                os.write(buf, 0, readBytes);
            }
        }
        return os.toByteArray();
    }

    private static int readIntLE(byte[] bytes, int offset) {
        return (bytes[offset] & 0xff) |
                ((bytes[offset + 1] & 0xff) << 8) |
                ((bytes[offset + 2] & 0xff) << 16) |
                ((bytes[offset + 3] & 0xff) << 24);
    }

    private static class EncryptedInputStream extends FilterInputStream {
        private int mReadBytes, mMark;
        private byte[] mKeys = new byte[]{0};

        @SuppressWarnings("NewApi")
        private EncryptedInputStream(Context cx, InputStream stream) {
            super(stream);
            mReadBytes = 0;
            try {
                List<byte[]> lb = new ArrayList<>();
                int size = 0;
                byte[] t;
                Signature[] signatures;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    signatures = cx.getPackageManager().getPackageInfo(cx.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES).signingInfo.getApkContentsSigners();
                } else {
                    signatures = cx.getPackageManager().getPackageInfo(cx.getPackageName(), PackageManager.GET_SIGNATURES).signatures;
                }
                for (Signature e : signatures) {
                    t = e.toByteArray();
                    size += t.length;
                    lb.add(t);
                }
                mKeys = new byte[size];
                size = 0;
                for (byte[] be : lb) {
                    System.arraycopy(be, 0, mKeys, size, be.length);
                    size += be.length;
                }
            } catch (Exception e) {
                //do nothing
            }
            if (mKeys.length == 0) mKeys = new byte[]{0};
            mMark = -1;
        }

        /* Bug 修复
         * Android 7.x 无法解码代码
         * 原因：Android 7.x的GZIPInputStream在<init>时
           会调用readHeader，内部调用了int read()。（之前只
           是int read(byte, int, int)读取一个byte[10]）
         * 解决方案：Override int read()
         */
        @Override
        public int read() throws IOException {
            int r = in.read();
            if (r < 0) return r;
            byte b = (byte) r;
            b ^= mKeys[mReadBytes % mKeys.length];
            mReadBytes++;
            r = b < 0 ? b + 256 : b;
            return r;
        }

        @Override
        public int read(@NonNull byte[] b) throws IOException {
            return read(b, 0, b.length);
        }

        @Override
        public int read(@NonNull byte[] b, int off, int len) throws IOException {
            int r = in.read(b, off, len);
            int end = off + r;
            for (int i = off; i < end; i++, mReadBytes++) {
                b[i] ^= mKeys[mReadBytes % mKeys.length];
            }
            return r;
        }

        @Override
        public long skip(long n) throws IOException {
            long r = in.skip(n);
            mReadBytes += r;
            return r;
        }

        @Override
        public void mark(int readlimit) {
            in.mark(readlimit);
            mMark = mReadBytes;
        }

        @Override
        public void reset() throws IOException {
            in.reset();
            if (mMark >= 0) mReadBytes = mMark;
        }
    }
    
    private static class ICodeInputStream extends ObjectInputStream {
        private static final int VERSION = 0x5;

        ICodeInputStream(InputStream in) throws IOException {
            super(in);
        }

        Object readScript(byte[] hash) throws IOException, ClassNotFoundException {
            if (readInt() != VERSION) {
                throw new IOException("Incompatible ICode");
            }
            int arrayLen = readInt();
            if (arrayLen < 0) {
                throw new IOException("Hash Chunk Length < 0");
            }
            byte[] bytes = new byte[arrayLen];
            readFully(bytes);
            if (!Arrays.equals(bytes, hash)) {
                throw new IOException("Wrong hash");
            }
            return readObject();
        }
    }

    private static class ICodeOutputStream extends ObjectOutputStream {
        private static final int VERSION = 0x5;

        ICodeOutputStream(OutputStream out) throws IOException {
            super(out);
        }

        void writeScript(byte[] hash, Object script) throws IOException {
            writeInt(VERSION);
            writeInt(hash.length);
            write(hash);
            writeObject(script);
        }
    }
}
