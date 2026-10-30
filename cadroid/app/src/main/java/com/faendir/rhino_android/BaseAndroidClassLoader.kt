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
import com.android.dx.cf.direct.DirectClassFile
import com.android.dx.cf.direct.StdAttributeFactory
import com.android.dx.command.dexer.DxContext
import com.android.dx.dex.DexOptions
import com.android.dx.dex.cf.CfOptions
import com.android.dx.dex.cf.CfTranslator
import com.android.dx.dex.file.DexFile
import com.android.dx.merge.CollisionPolicy
import com.android.dx.merge.DexMerger

import org.mozilla.javascript.GeneratedClassLoader

import java.io.IOException

/**
 * Compiles java bytecode to dex bytecode and loads it
 *
 * @author F43nd1r
 * @since 11.01.2016
 */
internal abstract class BaseAndroidClassLoader(parent: ClassLoader?) :
    ClassLoader(parent), GeneratedClassLoader {

    /**
     * {@inheritDoc}
     */
    override fun defineClass(name: String, data: ByteArray): Class<*> {
        try {
            val dxContext = DxContext()
            val dexOptions = DexOptions()
            val dexFile = DexFile(dexOptions)
            val classFile = DirectClassFile(data, name.replace('.', '/') + ".class", true)
            classFile.setAttributeFactory(StdAttributeFactory.THE_ONE)
            classFile.magic
            dexFile.add(
                CfTranslator.translate(dxContext, classFile, null, CfOptions(), dexOptions, dexFile)
            )
            var dex = Dex(dexFile.toDex(null, false))
            val oldDex = getLastDex()
            if (oldDex != null) {
                dex = DexMerger(arrayOf(dex, oldDex), CollisionPolicy.KEEP_FIRST, dxContext).merge()
            }
            return loadClass(dex, name)
        } catch (e: IOException) {
            throw FatalLoadingException(e)
        } catch (e: ClassNotFoundException) {
            throw FatalLoadingException(e)
        }
    }

    @Throws(ClassNotFoundException::class)
    protected abstract fun loadClass(dex: Dex, name: String): Class<*>

    internal abstract fun getLastDex(): Dex?

    internal abstract fun reset()

    /**
     * Does nothing
     *
     * @param aClass ignored
     */
    override fun linkClass(aClass: Class<*>?) {
        //doesn't make sense on android
    }

    /**
     * Try to load a class. This will search all defined classes, all loaded jars and the parent class loader.
     *
     * @param name    the name of the class to load
     * @param resolve ignored
     * @return the class
     * @throws ClassNotFoundException if the class could not be found in any of the locations
     */
    @Throws(ClassNotFoundException::class)
    override fun loadClass(name: String, resolve: Boolean): Class<*> {
        var loadedClass: Class<*>? = findLoadedClass(name)
        if (loadedClass == null) {
            val dex = getLastDex()
            if (dex != null) {
                loadedClass = loadClass(dex, name)
            }
            if (loadedClass == null) {
                loadedClass = parent!!.loadClass(name)
            }
        }
        return loadedClass
    }

    /**
     * Might be thrown in any Rhino method that loads bytecode if the loading failed
     */
    class FatalLoadingException internal constructor(t: Throwable) :
        RuntimeException("Failed to define class", t)
}
