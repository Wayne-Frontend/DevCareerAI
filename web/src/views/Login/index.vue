<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-vue-next'
import { login, register } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import { notify } from '../../utils/notify'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const showPassword = ref(false)

const form = reactive({
  account: '',
  username: '',
  email: '',
  password: '',
  remember: true,
})

const isRegister = computed(() => mode.value === 'register')
const title = computed(() => (isRegister.value ? '创建账号' : '欢迎回来'))
const subtitle = computed(() =>
  isRegister.value ? '注册 DevCareer AI，开启你的智能求职工作台。' : '登录 DevCareer AI，开启你的智能求职工作台。',
)
const submitLabel = computed(() => (isRegister.value ? '注册' : '登录'))

async function submit() {
  if (loading.value) return

  if (isRegister.value && (!form.username.trim() || !form.email.trim() || !form.password.trim())) {
    notify('请填写用户名、邮箱和密码', 'warning')
    return
  }

  if (!isRegister.value && (!form.account.trim() || !form.password.trim())) {
    notify('请输入邮箱或用户名和密码', 'warning')
    return
  }

  loading.value = true

  try {
    const session = isRegister.value
      ? await register({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        })
      : await login({
          account: form.account.trim(),
          password: form.password,
          remember: form.remember,
        })

    authStore.setSession(session, isRegister.value ? true : form.remember)
    notify(isRegister.value ? '注册成功，已进入工作台' : '登录成功', 'success')
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } finally {
    loading.value = false
  }
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  showPassword.value = false
}
</script>

<template>
  <main class="login-page min-h-screen overflow-hidden px-8 py-10">
    <section class="login-shell mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[1320px] grid-cols-[1.06fr_0.94fr] items-center gap-16 rounded-[24px] border border-white/80 px-[82px] py-[66px]">
      <div class="relative flex h-full min-h-[720px] flex-col">
        <span class="login-pill">
          <Sparkles :size="21" />
          AI 助力 · 智能求职 · 精准匹配
        </span>

        <h1 class="mt-9 max-w-[520px] text-[50px] font-black leading-[1.12] tracking-normal text-[#101828]">
          让 <span class="text-[#7657ff]">AI</span> 帮你优化简历，<br />
          匹配理想岗位
        </h1>
        <p class="mt-6 max-w-[580px] text-[18px] font-extrabold leading-9 text-[#506078]">
          从简历诊断到岗位匹配，从模拟面试到求职建议，DevCareer AI 全程陪伴你的求职之路。
        </p>

        <div class="hero-visual">
          <div class="orbit-line" />
          <div class="code-float">
            <span>&lt;/&gt;</span>
          </div>
          <div class="search-float">
            <Search :size="48" stroke-width="2.1" />
          </div>
          <div class="resume-card">
            <span class="resume-line line-a" />
            <span class="resume-line line-b" />
            <span class="resume-line line-c" />
            <span class="resume-line line-d" />
            <span class="resume-line line-e" />
          </div>
        </div>

        <div class="mt-auto grid max-w-[540px] grid-cols-3 gap-6">
          <div class="metric-item">
            <span class="metric-icon"><UserRound :size="21" /></span>
            <strong>10万+</strong>
            <p>求职者的信赖选择</p>
          </div>
          <div class="metric-item">
            <span class="metric-icon"><FileText :size="21" /></span>
            <strong>500万+</strong>
            <p>简历智能分析</p>
          </div>
          <div class="metric-item">
            <span class="metric-icon"><CheckCircle2 :size="21" /></span>
            <strong>98%</strong>
            <p>用户满意度</p>
          </div>
        </div>
      </div>

      <section class="auth-card ml-auto w-full max-w-[558px] rounded-[28px] bg-white px-12 py-[64px] shadow-[0_30px_70px_rgba(30,41,59,0.08)]">
        <div class="mb-10 flex items-center justify-center gap-4">
          <span class="brand-mark"><Sparkles :size="26" /></span>
          <strong class="text-[25px] font-black text-[#101828]">DevCareer AI</strong>
        </div>

        <div class="text-center">
          <h2 class="m-0 text-[42px] font-black tracking-normal text-[#101828]">{{ title }}</h2>
          <p class="mt-6 text-[17px] font-bold leading-7 text-[#526177]">{{ subtitle }}</p>
        </div>

        <form class="mt-10 grid gap-[22px]" @submit.prevent="submit">
          <label v-if="isRegister" class="auth-field">
            <span>用户名</span>
            <div class="input-wrap">
              <UserRound :size="21" />
              <input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
            </div>
          </label>

          <label class="auth-field">
            <span>{{ isRegister ? '邮箱' : '邮箱 / 用户名' }}</span>
            <div class="input-wrap">
              <Mail :size="21" />
              <input
                v-if="isRegister"
                v-model="form.email"
                autocomplete="email"
                placeholder="请输入邮箱"
                type="email"
              />
              <input v-else v-model="form.account" autocomplete="username" placeholder="请输入邮箱或用户名" />
            </div>
          </label>

          <label class="auth-field">
            <span>密码</span>
            <div class="input-wrap">
              <LockKeyhole :size="21" />
              <input
                v-model="form.password"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                :placeholder="isRegister ? '请设置至少 6 位密码' : '请输入密码'"
                :type="showPassword ? 'text' : 'password'"
              />
              <button type="button" class="eye-btn" aria-label="切换密码可见性" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" :size="21" />
                <Eye v-else :size="21" />
              </button>
            </div>
          </label>

          <div v-if="!isRegister" class="flex items-center justify-between text-[16px] font-extrabold text-[#344054]">
            <label class="flex cursor-pointer items-center gap-3">
              <input v-model="form.remember" class="remember-checkbox" type="checkbox" />
              记住我
            </label>
            <button type="button" class="text-[#5f43ff] transition hover:text-[#3478ff]">忘记密码?</button>
          </div>

          <button class="login-submit" :disabled="loading" type="submit">
            {{ loading ? '处理中...' : submitLabel }}
          </button>
        </form>

        <div class="my-9 flex items-center gap-4 text-sm font-bold text-[#98a2b3]">
          <span class="h-px flex-1 bg-[#e5e7eb]" />
          或
          <span class="h-px flex-1 bg-[#e5e7eb]" />
        </div>

        <p class="m-0 text-center text-[17px] font-extrabold text-[#344054]">
          {{ isRegister ? '已有账号?' : '没有账号?' }}
          <button class="ml-3 text-[#5f43ff] transition hover:text-[#3478ff]" @click="switchMode(isRegister ? 'login' : 'register')">
            {{ isRegister ? '立即登录' : '立即注册' }}
          </button>
        </p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  background:
    radial-gradient(circle at 10% 5%, rgba(124, 58, 237, 0.2), transparent 30%),
    radial-gradient(circle at 86% 6%, rgba(56, 189, 248, 0.22), transparent 34%),
    linear-gradient(135deg, #f1e9ff 0%, #f8fbff 49%, #ddf6ff 100%);
}

.login-shell {
  background: rgba(255, 255, 255, 0.43);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 36px 100px rgba(99, 102, 241, 0.08);
  backdrop-filter: blur(26px);
}

.login-pill {
  display: inline-flex;
  width: fit-content;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  padding: 0 20px;
  color: #5a43ff;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 0 14px 36px rgba(99, 102, 241, 0.08);
}

.hero-visual {
  position: relative;
  height: 370px;
  margin-top: 18px;
}

.orbit-line {
  position: absolute;
  left: 36px;
  top: 112px;
  width: 548px;
  height: 180px;
  border: 2px solid rgba(110, 231, 183, 0.48);
  border-radius: 50%;
  transform: rotate(-14deg);
  box-shadow: 0 0 60px rgba(110, 231, 183, 0.08);
}

.orbit-line::after {
  content: "";
  position: absolute;
  inset: 38px 26px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 50%;
}

.resume-card {
  position: absolute;
  left: 212px;
  top: 30px;
  width: 230px;
  height: 330px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 42px 78px rgba(99, 102, 241, 0.13);
  transform: rotate(11deg);
}

.resume-line {
  position: absolute;
  left: 48px;
  height: 10px;
  border-radius: 999px;
  background: rgba(112, 128, 255, 0.32);
}

.line-a {
  top: 96px;
  width: 116px;
}

.line-b {
  top: 123px;
  width: 94px;
}

.line-c {
  top: 151px;
  width: 158px;
}

.line-d {
  top: 179px;
  width: 132px;
}

.line-e {
  top: 207px;
  width: 106px;
}

.code-float,
.search-float {
  position: absolute;
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  color: #635bff;
  box-shadow: 0 28px 60px rgba(99, 102, 241, 0.14);
  backdrop-filter: blur(14px);
}

.code-float {
  left: 70px;
  top: 200px;
  font-size: 38px;
  font-weight: 900;
}

.search-float {
  left: 420px;
  top: 186px;
}

.metric-item {
  display: grid;
  grid-template-columns: 38px 1fr;
  column-gap: 12px;
  align-items: center;
}

.metric-icon {
  display: grid;
  grid-row: span 2;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  color: #635bff;
}

.metric-item strong {
  color: #5a43ff;
  font-size: 26px;
  font-weight: 950;
  line-height: 1;
}

.metric-item p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 800;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #8344ef 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 18px 36px rgba(99, 102, 241, 0.3);
}

.auth-field {
  display: grid;
  gap: 10px;
}

.auth-field > span {
  color: #101828;
  font-size: 16px;
  font-weight: 900;
}

.input-wrap {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  padding: 0 18px;
  color: #64748b;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.input-wrap:focus-within {
  border-color: rgba(99, 102, 241, 0.52);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
}

.input-wrap input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #101828;
  font-size: 16px;
  font-weight: 800;
}

.input-wrap input::placeholder {
  color: #94a3b8;
}

.eye-btn {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.remember-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #635bff;
}

.login-submit {
  min-height: 64px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 48%, #2386ff 100%);
  color: white;
  font-size: 20px;
  font-weight: 950;
  box-shadow: 0 24px 42px rgba(99, 102, 241, 0.24);
  transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 28px 50px rgba(99, 102, 241, 0.28);
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

button {
  font: inherit;
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
    padding: 44px;
  }

  .login-shell > div {
    min-height: 620px;
  }

  .auth-card {
    margin: 0 auto;
  }
}
</style>
