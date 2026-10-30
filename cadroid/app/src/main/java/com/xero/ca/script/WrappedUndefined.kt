package com.xero.ca.script

import org.mozilla.javascript.Context
import org.mozilla.javascript.Scriptable

/**
 * 把 Rhino 的 undefined 值包装成 Java 对象，供核心脚本包装 undefined 使用。
 */
object WrappedUndefined {
    @JvmStatic
    fun get(cx: Context, scope: Scriptable): Scriptable {
        val undefined = Context.getUndefinedValue()
        // Rhino 1.9.1 新增了 wrapAsJavaObject(..., TypeInfo) 重载，
        // 传裸 null 会二义，显式指定 Class<?> 版本
        return cx.wrapFactory.wrapAsJavaObject(cx, scope, undefined, null as Class<*>?) as Scriptable
    }
}
