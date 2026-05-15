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
          class="relative mx-4 w-full max-w-[21rem] overflow-hidden rounded-[2rem] shadow-2xl sm:max-w-4xl sm:rounded-3xl aspect-[10/16] sm:aspect-[16/10]"
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
const discoveringSrc = '/compositions/discovering/index.html?v=20260514-1'
</script>