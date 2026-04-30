<template>
  <form @submit.prevent="handleRegister" class="space-y-4" novalidate>
    <div class="space-y-1">
      <label for="reg-name" class="text-sm font-medium text-slate-700">Nombre completo</label>
      <input
        id="reg-name"
        v-model.trim="form.name"
        type="text"
        autocomplete="name"
        placeholder="Tu nombre"
        maxlength="80"
        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition text-sm"
        :class="{ 'border-red-400 focus:ring-red-300': errors.name }"
      />
      <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
    </div>

    <div class="space-y-1">
      <label for="reg-email" class="text-sm font-medium text-slate-700">Correo electrónico</label>
      <input
        id="reg-email"
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
      <label for="reg-password" class="text-sm font-medium text-slate-700">Contraseña</label>
      <div class="relative">
        <input
          id="reg-password"
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
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
      <!-- Barra de fortaleza -->
      <div class="flex gap-1 mt-1">
        <div v-for="i in 4" :key="i"
          class="h-1 flex-1 rounded-full transition-all duration-300"
          :class="strengthColor(i)" />
      </div>
      <p class="text-xs text-slate-500">{{ strengthLabel }}</p>
      <p v-if="errors.password" class="text-xs text-red-500">{{ errors.password }}</p>
    </div>

    <div class="space-y-1">
      <label for="reg-confirm" class="text-sm font-medium text-slate-700">Confirmar contraseña</label>
      <input
        id="reg-confirm"
        v-model="form.confirm"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        placeholder="Repite tu contraseña"
        maxlength="128"
        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition text-sm"
        :class="{ 'border-red-400 focus:ring-red-300': errors.confirm }"
      />
      <p v-if="errors.confirm" class="text-xs text-red-500">{{ errors.confirm }}</p>
    </div>

    <div v-if="serverError" class="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
      {{ serverError }}
    </div>

    <div v-if="success" class="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
      ✅ Cuenta creada. Revisa tu correo para confirmar tu cuenta.
    </div>

    <button
      type="submit"
      :disabled="loading || success"
      class="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed text-sm">
      {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
    </button>

    <p class="text-center text-xs text-slate-500 leading-relaxed">
      Al registrarte aceptas nuestros términos. Tu contraseña se almacena de forma segura y cifrada.
    </p>
  </form>
</template>

<script setup lang="ts">
const emit = defineEmits<{ success: [email: string] }>()

const supabase = useSupabaseClient()
const loading = ref(false)
const showPassword = ref(false)
const serverError = ref<string | null>(null)
const success = ref(false)

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const errors = reactive({ name: '', email: '', password: '', confirm: '' })

// --- Fortaleza de contraseña ---
const strength = computed(() => {
  const p = form.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][strength.value] ?? ''
})

function strengthColor(bar: number) {
  if (!form.password) return 'bg-slate-100'
  if (bar > strength.value) return 'bg-slate-100'
  return ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][strength.value]
}

// --- Validación ---
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sanitizeName(name: string) {
  // Elimina HTML y caracteres peligrosos
  return name.replace(/[<>"'`]/g, '').trim()
}

function validate() {
  errors.name = ''
  errors.email = ''
  errors.password = ''
  errors.confirm = ''
  let ok = true

  const cleanName = sanitizeName(form.name)
  if (!cleanName || cleanName.length < 2) {
    errors.name = 'Ingresa tu nombre (mínimo 2 caracteres).'
    ok = false
  }

  if (!form.email) {
    errors.email = 'El correo es requerido.'
    ok = false
  } else if (!validateEmail(form.email)) {
    errors.email = 'Ingresa un correo válido.'
    ok = false
  }

  if (!form.password || form.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
    ok = false
  } else if (strength.value < 2) {
    errors.password = 'La contraseña es muy débil. Agrega mayúsculas o números.'
    ok = false
  }

  if (form.password !== form.confirm) {
    errors.confirm = 'Las contraseñas no coinciden.'
    ok = false
  }

  return ok
}

async function handleRegister() {
  serverError.value = null
  success.value = false
  if (!validate()) return

  loading.value = true
  try {
    const cleanName = sanitizeName(form.name)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: cleanName, name: cleanName },
      },
    })
    if (error) throw error
    success.value = true
    emit('success', form.email)
  } catch (err: any) {
    // Mensaje genérico para no filtrar info interna
    if (err.message?.includes('already registered')) {
      serverError.value = 'Ya existe una cuenta con ese correo.'
    } else {
      serverError.value = 'No se pudo crear la cuenta. Inténtalo de nuevo.'
    }
  } finally {
    loading.value = false
  }
}
</script>
