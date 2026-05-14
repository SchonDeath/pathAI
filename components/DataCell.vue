<template>
  <div class="bg-white rounded-xl p-3 border border-slate-200">
    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{{ label }}</div>
    <div class="text-base font-bold" :class="valueClass || 'text-slate-900'">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string; valueClass?: string }>()
</script>
