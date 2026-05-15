import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/Home/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'resume-analyze',
        name: 'resume-analyze',
        component: () => import('../views/ResumeAnalyze/index.vue'),
        meta: { title: '简历诊断' },
      },
      {
        path: 'project-optimize',
        name: 'project-optimize',
        component: () => import('../views/ProjectOptimize/index.vue'),
        meta: { title: '项目优化' },
      },
      {
        path: 'job-match',
        name: 'job-match',
        component: () => import('../views/JobMatch/index.vue'),
        meta: { title: '岗位匹配' },
      },
      {
        path: 'interview',
        name: 'interview',
        component: () => import('../views/Interview/index.vue'),
        meta: { title: '模拟面试' },
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('../views/History/index.vue'),
        meta: { title: '历史记录' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/Settings/index.vue'),
        meta: { title: '设置' },
      },
    ],
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
