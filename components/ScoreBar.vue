<template>
  <div class="bg-white rounded-xl p-3 border border-slate-200">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ label }}</span>
      <span class="text-[10px] font-semibold text-slate-500">{{ weight }}</span>
    </div>
    <div class="flex items-baseline gap-1 mb-1.5">
      <span class="text-xl font-extrabold" :class="textClass">{{ value }}</span>
      <span class="text-xs text-slate-500">/100</span>
    </div>
    <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500" :class="barClass" :style="{ width: `${Math.max(0, Math.min(100, value))}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: number
  weight: string
  color: 'emerald' | 'blue' | 'violet' | 'amber'
}>()

const textClass = computed(() => ({
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  violet: 'text-violet-600',
  amber: 'text-amber-600',
})[props.color])

const barClass = computed(() => ({
  emerald: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
  blue: 'bg-gradient-to-r from-blue-400 to-blue-500',
  violet: 'bg-gradient-to-r from-violet-400 to-violet-500',
  amber: 'bg-gradient-to-r from-amber-400 to-amber-500',
})[props.color])
</script>
