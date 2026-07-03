import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import configPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'server/uploads/**',
      'server/prisma/migrations/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // .vue SFC 的 <script lang="ts"> 交给 TS 解析器
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['web/**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['server/**/*.ts', '*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    rules: {
      // 项目已有的零 any 纪律，固化为硬约束
      '@typescript-eslint/no-explicit-any': 'error',
      // 组件采用 目录/index.vue 约定，组件名由目录承载，单词数规则不适用
      'vue/multi-word-component-names': 'off',
      // 下划线前缀 = 有意忽略（对齐 Nest 与现有代码里 _request 等写法）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // 关闭所有与 Prettier 冲突的格式类规则（含 vue 模板格式规则），格式只归 Prettier 管
  configPrettier,
)
