// multer 2.x 不自带类型，类型来自 @types/multer，它以模块方式 `declare global` 增补
// 全局 Express.Multer 命名空间。这里显式引用，确保该增补被纳入编译程序，
// 让 `Express.Multer.File` 在命令行 tsc 与编辑器 TS Server 下都能解析。
/// <reference types="multer" />
