<template>
  <div>
    <NuxtRouteAnnouncer />

    <!-- Skip link para usuarios de teclado y lectores de pantalla -->
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>

    <!-- Loading gate solo en cliente (evita hydration mismatch).
         Bloquea la UI hasta que el plugin de auth valide sesión con Supabase. -->
    <ClientOnly>
      <Transition name="auth-gate">
        <div
          v-if="!authReady"
          class="fixed inset-0 z-[200] bg-white flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="Cargando aplicación">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 rounded-full overflow-hidden shadow ring-2 ring-white">
              <MascotIcon />
            </div>
            <div class="flex gap-1.5" aria-hidden="true">
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 120ms"></span>
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 240ms"></span>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <div id="main-content" tabindex="-1">
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Si el plugin ya corrió y hydrated es true (ej: navegación SPA), arrancamos listos.
// Si es F5, hydrated empieza en false y esperamos a que el plugin lo resuelva.
const authReady = computed(() => authStore.hydrated)
</script>

<style>
/* Skip link: invisible hasta recibir foco con teclado */
.skip-link {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  padding: 0.75rem 1rem;
  background: #1A73E8;
  color: white;
  font-weight: 600;
  border-radius: 0 0 0.75rem 0;
  transform: translateY(-100%);
  transition: transform 0.18s ease;
}
.skip-link:focus,
.skip-link:focus-visible {
  transform: translateY(0);
  outline: 3px solid #fff;
  outline-offset: -3px;
}

/* Transición global entre páginas */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Salida del loading gate */
.auth-gate-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.auth-gate-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

/* Respeta preferencias de movimiento reducido del usuario */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
