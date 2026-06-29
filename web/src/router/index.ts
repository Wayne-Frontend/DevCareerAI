import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../layout/MainLayout.vue'
import { getAuthToken } from '../utils/authSession'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login/index.vue'),
    meta: { title: '登录', public: true },
  },
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
        path: 'resumes',
        name: 'resume-manage',
        component: () => import('../views/ResumeManage/index.vue'),
        meta: { title: '简历管理' },
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
        path: 'profile',
        name: 'profile',
        component: () => import('../views/Profile/index.vue'),
        meta: { title: '个人中心' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const isAuthenticated = Boolean(getAuthToken())

  if (!to.meta.public && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
