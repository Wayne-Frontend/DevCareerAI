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
  confirmPassword: '',
  remember: true,
})

const isRegister = computed(() => mode.value === 'register')
const title = computed(() => (isRegister.value ? '创建账号' : '欢迎回来'))
const subtitle = computed(() =>
  isRegister.value ? '注册 DevCareer AI，开启你的智能求职工作台。' : '登录 DevCareer AI，开启你的智能求职工作台。',
)
const submitLabel = computed(() => (isRegister.value ? '注册' : '登录'))
const passwordValid = computed(() => form.password.length >= 6)
const registerPasswordMatched = computed(() => !isRegister.value || form.password === form.confirmPassword)

async function submit() {
  if (loading.value) return

  if (isRegister.value && (!form.username.trim() || !form.email.trim() || !form.password.trim())) {
    notify('请填写用户名、邮箱和密码', 'warning')
    return
  }

  if (isRegister.value && !registerPasswordMatched.value) {
    notify('两次输入的密码不一致', 'warning')
    return
  }

  if (!passwordValid.value) {
    notify('密码至少需要 6 位', 'warning')
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
  form.password = ''
  form.confirmPassword = ''
}

</script>

<template>
  <main class="login-page grid min-h-screen overflow-hidden px-6 py-6">
    <section class="login-shell mx-auto grid h-[calc(100vh-48px)] min-h-[680px] w-full max-w-[1180px] grid-cols-[0.98fr_0.9fr] items-center gap-10 rounded-[24px] border border-white/80 px-12 py-10">
      <div class="relative flex h-full min-h-0 flex-col">
        <span class="login-pill">
          <Sparkles :size="18" />
          AI 助力 · 智能求职 · 精准匹配
        </span>

        <h1 class="mt-7 max-w-[500px] text-[42px] font-black leading-[1.12] tracking-normal text-[#101828]">
          让 <span class="text-[#7657ff]">AI</span> 帮你优化简历，<br />
          匹配理想岗位
        </h1>
        <p class="mt-4 max-w-[540px] text-[16px] font-extrabold leading-8 text-[#506078]">
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

        <div class="mt-auto grid max-w-[500px] grid-cols-3 gap-4">
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

      <section class="auth-card ml-auto w-full max-w-[480px] rounded-[24px] bg-white px-9 py-9 shadow-[0_30px_70px_rgba(30,41,59,0.08)]">
        <div class="mb-7 flex items-center justify-center gap-3">
          <span class="brand-mark"><Sparkles :size="22" /></span>
          <strong class="text-[22px] font-black text-[#101828]">DevCareer AI</strong>
        </div>

        <div class="text-center">
          <h2 class="m-0 text-[32px] font-black tracking-normal text-[#101828]">{{ title }}</h2>
          <p class="mt-3 text-[14px] font-bold leading-6 text-[#526177]">{{ subtitle }}</p>
        </div>

        <form class="mt-7 grid gap-4" @submit.prevent="submit">
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
            <span v-if="isRegister" class="helper-text" :class="{ 'text-emerald-600': passwordValid }">
              {{ passwordValid ? '密码长度符合要求' : '至少 6 位密码' }}
            </span>
          </label>

          <label v-if="isRegister" class="auth-field">
            <span>确认密码</span>
            <div class="input-wrap">
              <LockKeyhole :size="19" />
              <input
                v-model="form.confirmPassword"
                autocomplete="new-password"
                placeholder="请再次输入密码"
                :type="showPassword ? 'text' : 'password'"
              />
            </div>
            <span v-if="form.confirmPassword" class="helper-text" :class="registerPasswordMatched ? 'text-emerald-600' : 'text-red-500'">
              {{ registerPasswordMatched ? '两次密码一致' : '两次输入的密码不一致' }}
            </span>
          </label>

          <div v-if="!isRegister" class="flex items-center text-[14px] font-extrabold text-[#344054]">
            <label class="flex cursor-pointer items-center gap-3">
              <input v-model="form.remember" class="remember-checkbox" type="checkbox" />
              记住我
            </label>
          </div>

          <button class="login-submit" :disabled="loading" type="submit">
            {{ loading ? '处理中...' : submitLabel }}
          </button>
        </form>

        <div class="my-6 flex items-center gap-4 text-sm font-bold text-[#98a2b3]">
          <span class="h-px flex-1 bg-[#e5e7eb]" />
          或
          <span class="h-px flex-1 bg-[#e5e7eb]" />
        </div>

        <p class="m-0 text-center text-[15px] font-extrabold text-[#344054]">
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
  min-height: 38px;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  padding: 0 16px;
  color: #5a43ff;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 14px 36px rgba(99, 102, 241, 0.08);
}

.hero-visual {
  position: relative;
  height: 300px;
  margin-top: 8px;
}

.orbit-line {
  position: absolute;
  left: 28px;
  top: 92px;
  width: 440px;
  height: 146px;
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
  left: 178px;
  top: 20px;
  width: 188px;
  height: 268px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 42px 78px rgba(99, 102, 241, 0.13);
  transform: rotate(11deg);
}

.resume-line {
  position: absolute;
  left: 38px;
  height: 8px;
  border-radius: 999px;
  background: rgba(112, 128, 255, 0.32);
}

.line-a {
  top: 78px;
  width: 96px;
}

.line-b {
  top: 100px;
  width: 78px;
}

.line-c {
  top: 124px;
  width: 126px;
}

.line-d {
  top: 148px;
  width: 108px;
}

.line-e {
  top: 172px;
  width: 88px;
}

.code-float,
.search-float {
  position: absolute;
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  color: #635bff;
  box-shadow: 0 28px 60px rgba(99, 102, 241, 0.14);
  backdrop-filter: blur(14px);
}

.code-float {
  left: 60px;
  top: 164px;
  font-size: 30px;
  font-weight: 900;
}

.search-float {
  left: 342px;
  top: 154px;
}

.metric-item {
  display: grid;
  grid-template-columns: 34px 1fr;
  column-gap: 10px;
  align-items: center;
}

.metric-icon {
  display: grid;
  grid-row: span 2;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
  color: #635bff;
}

.metric-item strong {
  color: #5a43ff;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.metric-item p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #8344ef 0%, #3b82f6 100%);
  color: white;
  box-shadow: 0 18px 36px rgba(99, 102, 241, 0.3);
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-field > span {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.input-wrap {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  padding: 0 15px;
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
  font-size: 14px;
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
  width: 17px;
  height: 17px;
  accent-color: #635bff;
}

.login-submit {
  min-height: 52px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 48%, #2386ff 100%);
  color: white;
  font-size: 17px;
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

.helper-text {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

button {
  font: inherit;
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 36px;
  }

  .login-shell > div {
    min-height: 520px;
  }

  .auth-card {
    margin: 0 auto;
  }
}
</style>
