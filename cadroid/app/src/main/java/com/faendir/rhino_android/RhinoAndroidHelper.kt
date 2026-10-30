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

import androidx.annotation.VisibleForTesting

import org.mozilla.javascript.Context
import org.mozilla.javascript.ContextFactory
import org.mozilla.javascript.SecurityController

import java.io.File

/**
 * Helps to prepare a Rhino Context for usage on android.
 *
 * @author F43nd1r
 * @since 11.01.2016
 */
class RhinoAndroidHelper private constructor(private val cacheDirectory: File) {

    /**
     * Constructs a new helper using the default temporary directory.
     * Note: It is recommended to use a custom directory, so no permission problems occur.
     */
    constructor() : this(File(System.getProperty("java.io.tmpdir", "."), "classes"))

    /**
     * Constructs a new helper using a directory in the applications cache.
     *
     * @param context any context
     */
    constructor(context: android.content.Context) : this(File(context.cacheDir, "classes"))

    /**
     * Constructs a helper using the specified directory as cache.
     *
     * @param cacheDirectory the cache directory to use
     */

    /**
     * call this instead of [Context.enter]
     *
     * @return a context prepared for android
     */
    fun enterContext(): Context {
        if (!SecurityController.hasGlobal()) {
            SecurityController.initGlobal(NoSecurityController())
        }
        return getContextFactory().enterContext()
    }

    /**
     * @return The Context factory which has to be used on android.
     */
    @VisibleForTesting
    fun getContextFactory(): AndroidContextFactory {
        val factory: AndroidContextFactory
        if (!ContextFactory.hasExplicitGlobal()) {
            factory = AndroidContextFactory(cacheDirectory)
            ContextFactory.getGlobalSetter().contextFactoryGlobal = factory
        } else if (ContextFactory.getGlobal() !is AndroidContextFactory) {
            throw IllegalStateException(
                "Cannot initialize factory for Android Rhino: There is already another factory"
            )
        } else {
            factory = ContextFactory.getGlobal() as AndroidContextFactory
        }
        return factory
    }

    companion object {
        /**
         * @return a context prepared for android
         * @deprecated use [.enterContext] instead
         */
        @JvmStatic
        @Deprecated("use enterContext() instead",
            ReplaceWith("RhinoAndroidHelper().enterContext()")
        )
        fun prepareContext(): Context = RhinoAndroidHelper().enterContext()
    }
}
