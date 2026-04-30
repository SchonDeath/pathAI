<template>
  <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
    <div class="space-y-1">
      <label for="login-email" class="text-sm font-medium text-slate-700">Correo electrónico</label>
      <input
        id="login-email"
        v-model.trim="form.email"
        type="email"
        autocomplete="email"
        placeholder="tu@correo.com"
        maxlength="254"
        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition text-sm"
        :class="{ 'border-red-400 focus:ring-red-300': errors.email }"
      />
      <p v-if="errors.email" class="text-xs text-red-500">{{ errors.email }}</p>
    </div>

    <div class="space-y-1">
      <label for="login-password" class="text-sm font-medium text-slate-700">Contraseña</label>
      <div class="relative">
        <input
          id="login-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          maxlength="128"
          class="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition text-sm"
          :class="{ 'border-red-400 focus:ring-red-300': errors.password }"
        />
        <button type="button" @click="showPassword = !showPassword"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 transition">
          <svg v-if="showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      </div>
      <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
    </div>

    <div v-if="serverError" class="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
      {{ serverError }}
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed text-sm">
      {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
    </button>
  </form>
</template>

<script setup lang="ts">
const emit = defineEmits<{ success: [] }>()

const supabase = useSupabaseClient()
const loading = ref(false)
const showPassword = ref(false)
const serverError = ref<string | null>(null)

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validate() {
  errors.email = ''
  errors.password = ''
  let ok = true

  if (!form.email) {
    errors.email = 'El correo es requerido.'
    ok = false
  } else if (!validateEmail(form.email)) {
    errors.email = 'Ingresa un correo válido.'
    ok = false
  }

  if (!form.password) {
    errors.password = 'La contraseña es requerida.'
    ok = false
  }

  return ok
}

async function handleLogin() {
  serverError.value = null
  if (!validate()) return

  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    // Mensaje genérico para no revelar si el email existe (seguridad)
    if (error) throw new Error('Correo o contraseña incorrectos.')
    emit('success')
    await navigateTo('/profile')
  } catch (err: any) {
    serverError.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
