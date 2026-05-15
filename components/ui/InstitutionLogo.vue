<template>
  <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
    <div
      v-if="showLoader"
      class="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
      <span class="w-5 h-5 rounded-full border-2 border-slate-300 border-t-primary-500 animate-spin"></span>
    </div>

    <img
      v-if="showImage"
      :src="props.logoUrl!"
      :alt="altText"
      class="w-full h-full object-contain transition-opacity duration-200"
      :class="isLoaded ? 'opacity-100' : 'opacity-0'"
      loading="lazy"
      decoding="async"
      @load="onLoad"
      @error="onError">

    <svg
      v-else
      class="w-7 h-7"
      :class="fallbackClass"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3 2 8l10 5 10-5-10-5Z"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 10v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M22 8v5"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  logoUrl?: string | null
  institutionName?: string | null
  fallbackClass?: string
}>(), {
  logoUrl: null,
  institutionName: null,
  fallbackClass: 'text-slate-500',
})

const isLoaded = ref(false)
const imageFailed = ref(false)

const showImage = computed(() => !!props.logoUrl && !imageFailed.value)
const showLoader = computed(() => showImage.value && !isLoaded.value)
const altText = computed(() => props.institutionName || 'Institución')

watch(() => props.logoUrl, () => {
  isLoaded.value = false
  imageFailed.value = false
})

function onLoad() {
  isLoaded.value = true
}

function onError() {
  isLoaded.value = false
  imageFailed.value = true
}
</script>
