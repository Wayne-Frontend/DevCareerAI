import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import { getAuthToken, getStoredAuthSession } from '@/utils/authSession'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/Home/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'resumes',
        name: 'resume-manage',
        component: () => import('@/views/ResumeManage/index.vue'),
        meta: { title: '简历管理' },
      },
      {
        path: 'resume-analyze',
        name: 'resume-analyze',
        component: () => import('@/views/ResumeAnalyze/index.vue'),
        meta: { title: '简历诊断' },
      },
      {
        path: 'project-optimize',
        name: 'project-optimize',
        component: () => import('@/views/ProjectOptimize/index.vue'),
        meta: { title: '项目优化' },
      },
      {
        path: 'jobs',
        name: 'job-manage',
        component: () => import('@/views/JobManage/index.vue'),
        meta: { title: 'JD 管理' },
      },
      {
        path: 'job-match',
        name: 'job-match',
        component: () => import('@/views/JobMatch/index.vue'),
        meta: { title: '岗位匹配' },
      },
      {
        path: 'interview',
        name: 'interview',
        component: () => import('@/views/Interview/index.vue'),
        meta: { title: '模拟面试' },
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('@/views/Chat/index.vue'),
        meta: { title: '职业顾问' },
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('@/views/History/index.vue'),
        meta: { title: '历史记录' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/Profile/index.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/AdminUsers/index.vue'),
        meta: { title: '用户管理', role: 'admin' },
      },
      {
        path: 'admin/ai-usage',
        name: 'ai-usage',
        component: () => import('@/views/AiUsage/index.vue'),
        meta: { title: '用量监控', role: 'admin' },
      },
    ],
  },
  {
    path: '/404',
    name: 'not-found',
    component: () => import('@/views/NotFound/index.vue'),
    meta: { title: '页面不存在', public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'not-found' },
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

  // 角色受限路由：无权限则跳 404（仅体验层拦截，真正的安全边界由后端 RolesGuard 保证）。
  if (to.meta.role && getStoredAuthSession()?.user.role !== to.meta.role) {
    return { name: 'not-found' }
  }

  return true
})

export default router
