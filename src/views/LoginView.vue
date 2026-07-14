<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const form = ref(null)
const email = ref('')
const password = ref('')
const rememberSession = ref(false)
const showPassword = ref(false)
const loginLoading = ref(false)
const loginError = ref('')

const requiredRule = (value) => Boolean(value) || 'Este campo es requerido'
const emailRule = (value) => /.+@.+\..+/.test(value) || 'Ingresa un correo valido'

const handleSubmit = async () => {
  const validation = await form.value?.validate()

  if (validation && !validation.valid) {
    return
  }

  loginLoading.value = true
  loginError.value = ''

  try {
    const response = await login({
      email: email.value,
      password: password.value,
    })
    const sessionData = response?.data
    const user = sessionData?.user
    const accessToken = sessionData?.access_token
    const tokenType = sessionData?.token_type

    if (!user?.id) {
      throw new Error('No se recibio el id del usuario.')
    }

    authStore.setSession({
      user,
      accessToken,
      tokenType,
    })
    await router.push('/chat')
  } catch (error) {
    loginError.value =
      error.response?.data?.message || error.message || 'No se pudo iniciar sesion.'
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <v-container class="login-view" fluid>
    <v-card class="login-panel" elevation="12" rounded="lg">
      <v-card-text class="pa-8">
        <div class="login-brand">
          <v-avatar color="primary" rounded="lg" size="56">
            <span class="login-logo">EC</span>
          </v-avatar>

          <div>
            <p class="login-eyebrow">Sistema de cotizaciones</p>
            <h1>Iniciar sesion</h1>
          </div>
        </div>

        <v-form ref="form" class="login-form" @submit.prevent="handleSubmit">
          <v-text-field
            v-model="email"
            autocomplete="email"
            color="primary"
            label="Correo electronico"
            name="email"
            placeholder="usuario@empresa.com"
            prepend-inner-icon="mdi-email-outline"
            required
            :rules="[requiredRule, emailRule]"
            type="email"
            variant="outlined"
          />

          <v-text-field
            v-model="password"
            autocomplete="current-password"
            color="primary"
            label="Contrasena"
            name="password"
            placeholder="Ingresa tu contrasena"
            prepend-inner-icon="mdi-lock-outline"
            required
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :rules="[requiredRule]"
            :type="showPassword ? 'text' : 'password'"
            variant="outlined"
            @click:append-inner="showPassword = !showPassword"
          />

          <div class="login-options">
            <v-checkbox
              v-model="rememberSession"
              class="remember-session"
              color="primary"
              density="compact"
              hide-details
              label="Recordarme"
            />

            <v-btn class="forgot-password" color="primary" size="small" variant="text">
              Olvide mi contrasena
            </v-btn>
          </div>

          <v-alert
            v-if="loginError"
            color="error"
            density="compact"
            type="error"
            variant="tonal"
          >
            {{ loginError }}
          </v-alert>

          <v-btn
            block
            color="primary"
            :loading="loginLoading"
            size="large"
            type="submit"
            variant="flat"
          >
            Entrar
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  background:
    linear-gradient(135deg, rgb(var(--v-theme-primary) / 14%), transparent 36%),
    linear-gradient(315deg, rgb(var(--v-theme-secondary) / 14%), transparent 40%),
    rgb(var(--v-theme-appBackground));
}

.login-panel {
  width: min(100%, 440px);
  border: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-surface));
}

.login-brand {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 32px;
}

.login-logo {
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
}

.login-eyebrow {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.9rem;
}

h1 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.8rem;
  line-height: 1.2;
}

.login-form {
  display: grid;
  gap: 8px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin: -4px 0 12px;
}

.forgot-password {
  font-weight: 600;
}

@media (max-width: 480px) {
  .login-brand,
  .login-options {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
