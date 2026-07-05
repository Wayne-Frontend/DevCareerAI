import type { Component } from 'vue'

// 仪表盘页面内部的视图模型（非接口契约，不进 @devcareer/shared）。

export interface DashboardMetric {
  label: string
  value: string
  unit: string
  change: string
  icon: Component
  tone: string
}

export interface ScoreDimension {
  label: string
  score: number
  color: string
  icon: Component
}

export interface DashboardSuggestion {
  text: string
  tone: string
  icon: Component
}
