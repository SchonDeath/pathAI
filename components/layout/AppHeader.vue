<template>
  <header class="fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-300"
    :class="scrolled ? 'bg-white/95 shadow-sm border-b border-slate-100' : 'header-gradient'">
    <div class="max-w-[90rem] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5 group">
        <!-- KoraChile mascota -->
        <div class="w-9 h-9 shrink-0 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
          <MascotIcon />
        </div>
        <span class="font-bold text-slate-900 text-lg tracking-tight group-hover:opacity-80 transition-opacity">
          KoraChile
        </span>
      </NuxtLink>

      <nav ref="navEl" class="hidden md:flex items-center gap-1 relative" aria-label="Navegación principal">
        <!-- Indicador deslizante que salta entre links -->
        <span
          v-show="indicator.visible"
          class="nav-indicator"
          :style="{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
          }"></span>

        <NuxtLink
          to="/"
          class="nav-link"
          active-class="route-partial-active"
          exact-active-class="router-link-active"
        >
          <span class="relative z-10 flex items-center gap-1.5"><House class="w-4 h-4" />Inicio</span>
        </NuxtLink>

        <NuxtLink
          to="/discover"
          class="nav-link">
          <span class="relative z-10 flex items-center gap-1.5"><Star class="w-4 h-4" />Kora descubre</span>
        </NuxtLink>

        <ClientOnly>
          <NuxtLink v-if="user" to="/chat"
            class="nav-link">
            <span class="relative z-10 flex items-center gap-1.5"><MessageCircle class="w-4 h-4" />Chat con Kora</span>
          </NuxtLink>
          <NuxtLink v-if="user" to="/ranking"
            class="nav-link">
            <span class="relative z-10 flex items-center gap-1.5"><Trophy class="w-4 h-4" />Ranking</span>
          </NuxtLink>
          <NuxtLink v-if="user" to="/compare"
            class="nav-link">
            <span class="relative z-10 flex items-center gap-1.5"><Scale class="w-4 h-4" />Comparar</span>
          </NuxtLink>
          <NuxtLink v-if="user" to="/paes-simulator"
            class="nav-link">
            <span class="relative z-10 flex items-center gap-1.5"><Target class="w-4 h-4" />Simular PAES</span>
          </NuxtLink>
        </ClientOnly>
        <!-- PAES dropdown -->
        <div class="relative" ref="paesMenuEl">
          <button
            @click="paesOpen = !paesOpen"
            class="nav-link flex items-center gap-1.5 cursor-pointer select-none"
            aria-haspopup="true"
            :aria-expanded="paesOpen"
            aria-label="Calendario PAES">
            <span class="relative z-10 flex items-center gap-1.5">
              <CalendarDays class="w-4 h-4" />
              PAES
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" :class="paesOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          <Transition
            enter-active-class="transition-[opacity,transform] duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-[opacity,transform] duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1">
            <div
              v-if="paesOpen"
              class="absolute right-0 top-full mt-2 w-[380px] z-[60] origin-top-right">
              <PaesCalendar />
            </div>
          </Transition>
        </div>
        <ClientOnly>
          <template v-if="user">
            <NuxtLink v-if="isAdmin" to="/admin"
              class="nav-link nav-link-admin">
              <span class="relative z-10 flex items-center gap-1.5"><Shield class="w-4 h-4" />Admin</span>
            </NuxtLink>
            <!-- Botón de usuario con dropdown -->
            <div class="relative" ref="userMenuEl">
              <button
                @click="userMenuOpen = !userMenuOpen"
                class="nav-link flex items-center gap-1.5 cursor-pointer select-none"
                aria-haspopup="true"
                :aria-expanded="userMenuOpen"
                aria-label="Menú de usuario">
                <UserAvatar :avatar="user.avatar_url" :name="user.name" :email="user.email" size="xs" />
                {{ user.name?.split(' ')[0] || 'Mi perfil' }}
                <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" :class="userMenuOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <Transition
                enter-active-class="transition-[opacity,transform] duration-150 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-[opacity,transform] duration-100 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1">
                <div
                  v-if="userMenuOpen"
                  class="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-200 py-1.5 z-[60] origin-top-right">
                  <NuxtLink
                    to="/profile"
                    @click="userMenuOpen = false"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition rounded-xl mx-1">
                    <UserRound class="w-4 h-4" /> Mi perfil
                  </NuxtLink>
                  <div class="border-t border-slate-100 my-1"></div>
                  <button
                    @click="logout"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition rounded-xl mx-1">
                    <LogOut class="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              </Transition>
            </div>
          </template>
          <template v-else>
            <NuxtLink to="/login"
              class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style="background: #0071e3; border-radius: 999px;">
              Iniciar sesión
            </NuxtLink>
          </template>
          <template #fallback>
            <div class="w-28 h-8"></div>
          </template>
        </ClientOnly>
      </nav>

      <button
        @click="menuOpen = !menuOpen"
        class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50 transition"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu">
        <svg v-if="!menuOpen" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <Transition
      enter-active-class="transition-[opacity,transform] duration-180 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-[opacity,transform] duration-140 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2">
      <div
        v-if="menuOpen"
        id="mobile-menu"
        class="md:hidden px-4 pb-4">
        <div class="rounded-2xl border border-slate-200 bg-white shadow-card p-2 flex flex-col">
          <NuxtLink
            to="/"
            @click="menuOpen = false"
            class="px-3 py-2.5 rounded-xl text-sm font-medium transition inline-flex items-center gap-2"
            :class="route.path === '/' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'"
          >
            <House class="w-4 h-4" />Inicio
          </NuxtLink>
          <NuxtLink
            to="/discover"
            @click="menuOpen = false"
            class="px-3 py-2.5 rounded-xl text-sm font-medium transition inline-flex items-center gap-2"
            :class="route.path.startsWith('/discover') ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-100'">
            <Star class="w-4 h-4" />Kora descubre
          </NuxtLink>

          <ClientOnly>
            <NuxtLink v-if="user" to="/chat" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-2"><MessageCircle class="w-4 h-4" />Chat con Kora</NuxtLink>
            <NuxtLink v-if="user" to="/ranking" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-2"><Trophy class="w-4 h-4" />Ranking</NuxtLink>
            <NuxtLink v-if="user" to="/compare" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-2"><Scale class="w-4 h-4" />Comparar</NuxtLink>
            <NuxtLink v-if="user" to="/paes-simulator" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-2"><Target class="w-4 h-4" />Simular PAES</NuxtLink>
          </ClientOnly>
          <!-- PAES móvil: toggle inline -->
          <button @click="paesOpenMobile = !paesOpenMobile" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition flex items-center justify-between" :aria-expanded="paesOpenMobile" aria-label="Calendario PAES">
            <span class="inline-flex items-center gap-2"><CalendarDays class="w-4 h-4" />PAES</span>
            <svg class="w-4 h-4 text-slate-500 transition-transform" :class="paesOpenMobile ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-if="paesOpenMobile" class="px-1 pb-1">
            <PaesCalendar />
          </div>
          <ClientOnly>
            <template v-if="user">
              <NuxtLink v-if="isAdmin" to="/admin" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition inline-flex items-center gap-2"><Shield class="w-4 h-4" />Admin</NuxtLink>
              <NuxtLink to="/profile" @click="menuOpen = false" class="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-2"><UserRound class="w-4 h-4" />{{ user.name?.split(' ')[0] || 'Mi perfil' }}</NuxtLink>
              <button @click="logout" class="px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition text-left inline-flex items-center gap-2"><LogOut class="w-4 h-4" />Cerrar sesión</button>
            </template>
            <template v-else>
              <NuxtLink to="/login" @click="menuOpen = false" class="mt-1 px-3 py-2.5 rounded-[999px] text-sm font-semibold text-white transition-opacity hover:opacity-80 text-center" style="background:#0071e3;">Iniciar sesión</NuxtLink>
            </template>
          </ClientOnly>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { CalendarDays, House, LogOut, MessageCircle, Scale, Shield, Star, Target, Trophy, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const { y } = useWindowScroll()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const scrolled = computed(() => mounted.value && y.value > 20)
const route = useRoute()
const menuOpen = ref(false)

const authStore = useAuthStore()
const user = computed(() => authStore.profile)
const isAdmin = computed(() => authStore.isAdmin)
const userMenuOpen = ref(false)
const userMenuEl = ref<HTMLElement | null>(null)
const paesOpen = ref(false)
const paesOpenMobile = ref(false)
const paesMenuEl = ref<HTMLElement | null>(null)

async function logout() {
  userMenuOpen.value = false
  menuOpen.value = false
  await authStore.signOut()
  navigateTo('/login')
}

// Cierra los dropdowns al hacer click fuera
function handleClickOutside(e: MouseEvent) {
  if (userMenuEl.value && !userMenuEl.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
  if (paesMenuEl.value && !paesMenuEl.value.contains(e.target as Node)) {
    paesOpen.value = false
  }
}

// Cierra dropdowns y menú móvil al presionar Esc
function handleEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (userMenuOpen.value) { userMenuOpen.value = false; return }
  if (paesOpen.value) { paesOpen.value = false; return }
  if (paesOpenMobile.value) { paesOpenMobile.value = false; return }
  if (menuOpen.value) menuOpen.value = false
}

// Indicador deslizante en la nav
const navEl = ref<HTMLElement | null>(null)
const indicator = reactive({ left: 0, width: 0, visible: false })

function findActiveLink(): HTMLElement | null {
  if (!navEl.value) return null
  // Nuxt agrega la clase 'router-link-active' al link activo
  return navEl.value.querySelector<HTMLElement>('a.router-link-exact-active')
    || navEl.value.querySelector<HTMLElement>('a.router-link-active')
}

function updateIndicator(target?: HTMLElement | null) {
  const nav = navEl.value
  if (!nav) return
  const el = target || findActiveLink()
  if (!el) {
    indicator.visible = false
    return
  }
  const navRect = nav.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  indicator.left = rect.left - navRect.left
  indicator.width = rect.width
  indicator.visible = true
}

function onNavEnter(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('a.nav-link') as HTMLElement | null
  if (target) updateIndicator(target)
}

function onNavLeave() {
  updateIndicator()
}

const onResize = () => updateIndicator()

watch(() => route.fullPath, () => {
  menuOpen.value = false
  nextTick(() => updateIndicator())
})

onMounted(() => {
  nextTick(() => {
    updateIndicator()
    if (navEl.value) {
      navEl.value.addEventListener('mouseover', onNavEnter)
      navEl.value.addEventListener('mouseleave', onNavLeave)
    }
  })
  window.addEventListener('resize', onResize)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  if (navEl.value) {
    navEl.value.removeEventListener('mouseover', onNavEnter)
    navEl.value.removeEventListener('mouseleave', onNavLeave)
  }
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #474747;
  transition: color 220ms ease, opacity 220ms ease;
  white-space: nowrap;
}

.nav-link:hover {
  color: #0071e3;
}

.nav-link.router-link-active,
.nav-link.route-partial-active {
  color: #0071e3;
  font-weight: 700;
}

.nav-link-admin {
  color: rgb(180 83 9);
}

.nav-link-admin.router-link-active {
  color: rgb(180 83 9);
}

.nav-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  height: calc(100% - 0.25rem);
  transform: translateX(0);
  background: rgba(0, 113, 227, 0.09);
  border-radius: 0.75rem;
  transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
              width 380ms cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 200ms ease-out;
  transform-origin: left center;
  pointer-events: none;
  margin-top: -0.875rem;
  z-index: 0;
}

.header-gradient {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
