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
import androidx.annotation.VisibleForTesting

import org.mozilla.javascript.Context
import org.mozilla.javascript.ContextFactory
import org.mozilla.javascript.GeneratedClassLoader

import java.io.File

/**
 * Ensures that the classLoader used is correct
 *
 * @author F43nd1r
 * @since 11.01.2016
 */
@VisibleForTesting
class AndroidContextFactory(private val cacheDirectory: File) : ContextFactory() {

    init {
        // BaseAndroidClassLoader 同时是 ClassLoader 和 GeneratedClassLoader，
        // 这里按 ClassLoader 传给基类
        initApplicationClassLoader(createClassLoader(AndroidContextFactory::class.java.classLoader) as ClassLoader)
    }

    /**
     * Create a ClassLoader which is able to deal with bytecode
     *
     * @param parent the parent of the creation classloader
     * @return a new ClassLoader
     */
    @VisibleForTesting
    // 基类签名返回 GeneratedClassLoader：BaseAndroidClassLoader 是包级私有类，
    // Kotlin 不允许 public 方法把它暴露成返回类型，这里向上转成接口类型
    override fun createClassLoader(parent: ClassLoader?): GeneratedClassLoader {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return InMemoryAndroidClassLoader(parent)
        }
        return FileAndroidClassLoader(parent, cacheDirectory)
    }

    override fun onContextReleased(cx: Context) {
        super.onContextReleased(cx)
        (cx.applicationClassLoader as BaseAndroidClassLoader).reset()
    }
}
