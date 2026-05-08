<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-400 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      >
        <div
          class="relative w-full max-w-4xl mx-4 rounded-3xl overflow-hidden shadow-2xl"
          style="aspect-ratio: 16/10; min-height: 460px;"
        >
          <iframe
            :src="discoveringSrc"
            frameborder="0"
            scrolling="no"
            style="width:100%;height:100%;border:none;display:block;"
            title="Descubriendo tu carrera"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()

// Evita que el browser sirva una versión vieja del HTML del loader tras cambios visuales.
const discoveringSrc = '/compositions/discovering/index.html?v=20260508-3'
</script>