<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-vue-next'
import { login, register } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { notify } from '@/utils/notify'

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
  isRegister.value
    ? '注册 DevCareer AI，开启你的智能求职工作台。'
    : '登录 DevCareer AI，开启你的智能求职工作台。',
)
const submitLabel = computed(() => (isRegister.value ? '注册' : '登录'))
const passwordValid = computed(() => form.password.length >= 6)
const registerPasswordMatched = computed(
  () => !isRegister.value || form.password === form.confirmPassword,
)

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
  <main class="login-page">
    <section class="login-shell" aria-label="DevCareer AI 登录">
      <aside class="login-brand-panel">
        <div class="brand-link">
          <span class="brand-mark"><Sparkles :size="24" stroke-width="1.9" /></span>
          <strong>DevCareer AI</strong>
        </div>

        <div class="brand-copy">
          <span class="soft-tag">AI 求职工作台</span>
          <h1>继续进入你的求职工作台</h1>
          <p>登录后可继续管理简历诊断、项目优化、岗位匹配、模拟面试和历史复盘。</p>
        </div>

        <div class="workspace-preview" aria-hidden="true">
          <div class="preview-header">
            <span />
            <span />
            <span />
          </div>
          <div class="preview-score">
            <strong>78</strong>
            <span>简历综合评分</span>
          </div>
          <div class="preview-rows">
            <span class="row-long" />
            <span class="row-medium" />
            <span class="row-short" />
          </div>
        </div>
      </aside>

      <section class="auth-card">
        <div class="auth-heading">
          <span class="brand-mark auth-brand"><Sparkles :size="22" /></span>
          <div>
            <h2>{{ title }}</h2>
            <p>{{ subtitle }}</p>
          </div>
        </div>

        <div class="mode-switch" role="tablist" aria-label="切换登录或注册">
          <button type="button" :class="{ active: !isRegister }" @click="switchMode('login')">
            登录
          </button>
          <button type="button" :class="{ active: isRegister }" @click="switchMode('register')">
            注册
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
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
              <input
                v-else
                v-model="form.account"
                autocomplete="username"
                placeholder="请输入邮箱或用户名"
              />
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
              <button
                type="button"
                class="eye-btn"
                aria-label="切换密码可见性"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="21" />
                <Eye v-else :size="21" />
              </button>
            </div>
            <span
              v-if="isRegister"
              class="helper-text"
              :class="{ 'text-emerald-600': passwordValid }"
            >
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
            <span
              v-if="form.confirmPassword"
              class="helper-text"
              :class="registerPasswordMatched ? 'text-emerald-600' : 'text-red-500'"
            >
              {{ registerPasswordMatched ? '两次密码一致' : '两次输入的密码不一致' }}
            </span>
          </label>

          <div
            v-if="!isRegister"
            class="flex items-center text-[14px] font-extrabold text-[#344054]"
          >
            <label class="flex cursor-pointer items-center gap-3">
              <input v-model="form.remember" class="remember-checkbox" type="checkbox" />
              记住我
            </label>
          </div>

          <button class="login-submit" :disabled="loading" type="submit">
            {{ loading ? '处理中...' : submitLabel }}
          </button>
        </form>

        <p class="auth-link-row">
          {{ isRegister ? '已有账号?' : '没有账号?' }}
          <button @click="switchMode(isRegister ? 'login' : 'register')">
            {{ isRegister ? '立即登录' : '立即注册' }}
          </button>
        </p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  overflow: hidden;
  place-items: center;
  padding: 28px;
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.72) 0 18%, transparent 18% 100%),
    radial-gradient(circle at 12% 85%, rgba(31, 112, 86, 0.18), transparent 23%),
    radial-gradient(circle at 91% 12%, rgba(150, 178, 228, 0.38), transparent 31%),
    radial-gradient(circle at 44% 38%, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(135deg, #e8f4ff 0%, #f5f9ff 36%, #e9f4f1 72%, #eef5ff 100%);
}

.login-page::before,
.login-page::after {
  content: '';
  position: fixed;
  pointer-events: none;
  filter: blur(18px);
}

.login-page::before {
  top: -5%;
  right: 7%;
  width: 520px;
  height: 680px;
  border-radius: 80px;
  background:
    linear-gradient(
      122deg,
      rgba(255, 255, 255, 0.64),
      rgba(183, 211, 246, 0.18) 48%,
      transparent 49%
    ),
    radial-gradient(circle at 60% 20%, rgba(255, 255, 255, 0.72), transparent 36%);
  opacity: 0.72;
  transform: rotate(-8deg);
}

.login-page::after {
  bottom: -18%;
  left: 14%;
  width: 660px;
  height: 460px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 20% 30%, rgba(26, 116, 96, 0.15), transparent 34%),
    radial-gradient(circle at 75% 55%, rgba(82, 137, 219, 0.14), transparent 40%);
  opacity: 0.8;
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 1040px);
  min-height: 620px;
  grid-template-columns: minmax(0, 0.9fr) minmax(390px, 0.72fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.68), rgba(246, 250, 255, 0.4)),
    rgba(255, 255, 255, 0.52);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    0 22px 54px rgba(31, 73, 125, 0.1);
  backdrop-filter: blur(24px) saturate(132%);
}

.login-brand-panel {
  position: relative;
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 38px;
}

.login-brand-panel::after {
  content: '';
  position: absolute;
  top: 34px;
  right: 0;
  bottom: 34px;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(37, 99, 235, 0.14), transparent);
}

.brand-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 11px;
  color: #0b55e8;
}

.brand-link strong {
  background: linear-gradient(135deg, #0b55e8 0%, #2563eb 45%, #06b6d4 100%);
  background-clip: text;
  color: transparent;
  font-size: 24px;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(135deg, #74a8ff, #2563eb);
  color: #fff;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.2);
}

.brand-copy {
  max-width: 430px;
  margin-top: 58px;
}

.soft-tag {
  min-height: 30px;
  border-color: rgba(37, 99, 235, 0.14);
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.brand-copy h1 {
  margin: 22px 0 0;
  background: linear-gradient(135deg, #07163f 0%, #102e6d 58%, #2563eb 100%);
  background-clip: text;
  color: transparent;
  font-size: 38px;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.12;
}

.brand-copy p {
  max-width: 390px;
  margin: 16px 0 0;
  color: #425b84;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.9;
}

.workspace-preview {
  width: min(100%, 430px);
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.46);
  padding: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 14px 30px rgba(31, 73, 125, 0.07);
}

.preview-header {
  display: flex;
  gap: 7px;
}

.preview-header span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(79, 124, 255, 0.3);
}

.preview-score {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 28px;
}

.preview-score strong {
  color: #2563eb;
  font-size: 52px;
  font-weight: 950;
  line-height: 1;
}

.preview-score span {
  color: #18345f;
  font-size: 14px;
  font-weight: 850;
}

.preview-rows {
  display: grid;
  gap: 11px;
  margin-top: 22px;
}

.preview-rows span {
  height: 10px;
  border-radius: 999px;
  background: rgba(79, 124, 255, 0.16);
}

.row-long {
  width: 82%;
}

.row-medium {
  width: 66%;
}

.row-short {
  width: 48%;
}

.auth-card {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  padding: 42px 46px;
  scrollbar-color: rgba(99, 102, 241, 0.32) rgba(226, 232, 240, 0.46);
  scrollbar-width: thin;
}

.auth-card::-webkit-scrollbar {
  width: 8px;
}

.auth-card::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.46);
}

.auth-card::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.32);
}

.auth-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.auth-brand {
  width: 46px;
  height: 46px;
}

.auth-heading h2 {
  margin: 0;
  color: #07163f;
  font-size: 31px;
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
}

.auth-heading p {
  margin: 8px 0 0;
  color: #425b84;
  font-size: 14px;
  font-weight: 720;
  line-height: 1.6;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 30px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.46);
  padding: 5px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.mode-switch button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #425b84;
  font-size: 14px;
  font-weight: 850;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.mode-switch button.active {
  background: rgba(255, 255, 255, 0.82);
  color: #2563eb;
  box-shadow: 0 10px 22px rgba(31, 73, 125, 0.08);
}

.auth-form {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-field > span {
  color: #18345f;
  font-size: 13px;
  font-weight: 850;
}

.input-wrap {
  display: flex;
  min-height: 46px;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(171, 190, 218, 0.48);
  border-radius: 13px;
  padding: 0 15px;
  background: rgba(255, 255, 255, 0.58);
  color: #4f7cff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 8px 20px rgba(31, 73, 125, 0.035);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.input-wrap:focus-within {
  border-color: rgba(79, 124, 255, 0.48);
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 0 0 4px rgba(79, 124, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.input-wrap input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #10204a;
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
  color: #4b6388;
  cursor: pointer;
}

.remember-checkbox {
  width: 17px;
  height: 17px;
  accent-color: #2563eb;
}

.login-submit {
  min-height: 48px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, #6ea8ff 0%, #2563eb 100%);
  color: white;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease,
    filter 0.18s ease;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.3);
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

.auth-link-row {
  margin: 24px 0 0;
  color: #425b84;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
}

.auth-link-row button {
  margin-left: 10px;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-weight: 900;
  transition: color 0.18s ease;
}

.auth-link-row button:hover {
  color: #0b55e8;
}

button {
  font: inherit;
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-brand-panel {
    gap: 34px;
  }

  .login-brand-panel::after {
    top: auto;
    right: 34px;
    bottom: 0;
    left: 34px;
    width: auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.14), transparent);
  }

  .workspace-preview {
    display: none;
  }
}

@media (max-width: 760px) {
  .login-page {
    align-items: stretch;
    overflow-y: auto;
    padding: 14px;
  }

  .login-shell {
    width: 100%;
    border-radius: 18px;
  }

  .login-brand-panel,
  .auth-card {
    padding: 26px 22px;
  }

  .brand-copy {
    margin-top: 30px;
  }

  .brand-copy h1 {
    font-size: 30px;
  }

  .auth-heading {
    align-items: flex-start;
  }

  .auth-heading h2 {
    font-size: 28px;
  }
}
</style>
