package com.xero.ca.script

/**
 * 标记需要暴露给核心脚本的类、字段、方法或构造器。
 * 保留策略与原 Java 版一致（CLASS → BINARY）。
 */
@Retention(AnnotationRetention.BINARY)
@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.FIELD,
    AnnotationTarget.PROPERTY,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.CONSTRUCTOR,
)
annotation class ScriptObject
