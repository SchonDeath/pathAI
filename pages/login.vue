<template>
  <div class="min-h-screen flex relative overflow-hidden bg-slate-900">
    <!-- Fondo móvil — imagen bosque -->
    <div class="lg:hidden absolute inset-0 z-0 overflow-hidden">
      <img
        :src="loginImage"
        alt="Paisaje bosque"
        class="absolute inset-0 w-full h-full object-cover object-[center_top]"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/25 to-slate-900/60" />
    </div>

    <!-- Lado izquierdo — imagen -->
    <div class="hidden lg:flex lg:w-[58%] xl:w-[60%] relative overflow-hidden">
      <img
        :src="loginImage"
        alt="Paisaje montañas"
        class="absolute inset-0 w-full h-full object-cover object-[center_top]"
      />
      <!-- Overlay oscuro suave -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
      <!-- Botón volver sobre la imagen -->
      <NuxtLink
        to="/"
        class="absolute top-8 left-8 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md text-slate-700 text-sm font-medium hover:bg-white transition">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver
      </NuxtLink>
    </div>

    <!-- Lado derecho — formulario -->
  <div class="w-full lg:w-[42%] xl:w-[40%] relative z-10 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-16 py-8 sm:py-10 lg:py-12 lg:bg-white">
      <!-- Volver móvil -->
      <NuxtLink
        to="/"
        class="inline-flex lg:hidden items-center gap-1.5 mb-6 w-fit px-3 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md text-slate-700 text-sm font-medium hover:bg-white transition">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver
      </NuxtLink>

      <div class="w-full max-w-sm mx-auto space-y-7 rounded-3xl border border-slate-200 bg-white shadow-2xl p-5 sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:p-0">
        <!-- Encabezado -->
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Bienvenido</h1>
          <p class="text-slate-500 text-sm mt-1.5">
            {{ activeTab === 'login'
              ? 'Ingresa tus datos para acceder a tu cuenta.'
              : 'Crea tu cuenta para guardar carreras y más.' }}
          </p>
        </div>

        <!-- Aviso post-registro -->
        <Transition name="fade-slide">
          <div v-if="postRegisterEmail"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-3">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div class="flex-1">
              <div class="font-semibold">¡Cuenta creada!</div>
              <div class="text-xs text-emerald-700 mt-0.5">
                Enviamos un correo de confirmación a <b>{{ postRegisterEmail }}</b>. Ábrelo para activar tu cuenta y luego inicia sesión aquí.
              </div>
            </div>@success="onRegisterSuccess" 
          </div>
        </Transition>

        <!-- Google -->
        <GoogleButton :loading="googleLoading" @click="loginWithGoogle" />

        <div class="flex items-center gap-3">
          <div class="flex-1 h-px bg-slate-100" />
          <span class="text-xs text-slate-500">o con correo</span>
          <div class="flex-1 h-px bg-slate-100" />
        </div>

        <!-- Formulario dinámico -->
        <Transition name="form-slide" mode="out-in">
          <LoginForm v-if="activeTab === 'login'" key="login" />
          <RegisterForm v-else key="register" />
        </Transition>

        <!-- Cambiar tab -->
        <div class="pt-2 border-t border-slate-100 text-center space-y-1">
          <p v-if="activeTab === 'login'" class="text-sm text-slate-500">
            ¿Eres nuevo en KoraChile?
            <br />
            <span class="text-slate-500 text-xs">Crea tu cuenta para guardar carreras y personalizar tu experiencia.</span>
          </p>
          <p v-else class="text-sm text-slate-500">¿Ya tienes una cuenta?</p>
          <button
            @click="activeTab = activeTab === 'login' ? 'register' : 'login'"
            class="text-sm font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 rounded-xl px-5 py-2 transition hover:bg-primary-50 mt-1">
            {{ activeTab === 'login' ? 'Crear cuenta' : 'Iniciar sesión' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import loginImage from '~/assets/css/login.png'
import { useAuthStore } from '~/stores/auth'

useHead({ title: 'Iniciar sesión — KoraChile' })

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const googleLoading = ref(false)
const activeTab = ref<'login' | 'register'>('login')
const postRegisterEmail = ref<string | null>(null)

const route = useRoute()

onMounted(async () => {
  if (authStore.isAuthenticated) {
    const redirect = route.query.redirect as string | undefined
    await navigateTo(redirect || '/profile')
  }
})

function onRegisterSuccess(email: string) {
  postRegisterEmail.value = email
  activeTab.value = 'login'
  setTimeout(() => { postRegisterEmail.value = null }, 15000)
}

async function loginWithGoogle() {
  googleLoading.value = true
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    })
    if (error) throw error
  } catch (e: any) {
    console.warn('[login] google oauth failed:', e?.message)
    googleLoading.value = false
  }
}
</script>

<style scoped>
.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.form-slide-enter-from { opacity: 0; transform: translateY(8px); }
.form-slide-leave-to   { opacity: 0; transform: translateY(-8px); }

.fade-slide-enter-active,
.fade-slide-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-slide-enter-from   { opacity: 0; transform: translateY(-6px); }
.fade-slide-leave-to     { opacity: 0; transform: translateY(-6px); }
</style>
