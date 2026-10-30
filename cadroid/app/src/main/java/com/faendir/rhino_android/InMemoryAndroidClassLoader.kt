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

import android.os.Build
import androidx.annotation.RequiresApi

import com.android.dex.Dex

import java.nio.ByteBuffer

import dalvik.system.InMemoryDexClassLoader

/**
 * @author F43nd1r
 * @since 24.10.2017
 */
@RequiresApi(Build.VERSION_CODES.O)
internal class InMemoryAndroidClassLoader(parent: ClassLoader?) :
    BaseAndroidClassLoader(parent) {

    private var last: Dex? = null

    @Throws(ClassNotFoundException::class)
    override fun loadClass(dex: Dex, name: String): Class<*> {
        last = dex
        return InMemoryDexClassLoader(ByteBuffer.wrap(dex.bytes), parent).loadClass(name)
    }

    override fun getLastDex(): Dex? = last

    override fun reset() {
        last = null
    }
}
