/*
 * Copyright (c) 2016 Lukas Morawietz
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.faendir.rhino_android

import com.android.dex.Dex

import java.io.File
import java.io.IOException

import dalvik.system.PathClassLoader

/**
 * @author F43nd1r
 * @since 24.10.2017
 */
internal class FileAndroidClassLoader(parent: ClassLoader?, cacheDir: File) :
    BaseAndroidClassLoader(parent) {

    private val dexFile: File

    init {
        @Suppress("DEPRECATION")
        val id = instanceCounter++
        dexFile = File(cacheDir, "$id.dex")
        cacheDir.mkdirs()
        reset()
    }

    @Throws(ClassNotFoundException::class)
    override fun loadClass(dex: Dex, name: String): Class<*> {
        try {
            dex.writeTo(dexFile)
        } catch (e: IOException) {
            e.printStackTrace()
        }
        return PathClassLoader(dexFile.path, parent).loadClass(name)
    }

    override fun getLastDex(): Dex? {
        if (dexFile.exists()) {
            try {
                return Dex(dexFile)
            } catch (e: IOException) {
                e.printStackTrace()
            }
        }
        return null
    }

    override fun reset() {
        @Suppress("ResultOfMethodCallIgnored")
        dexFile.delete()
    }

    companion object {
        private var instanceCounter = 0
    }
}
