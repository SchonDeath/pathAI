<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-8 overflow-hidden" style="background:transparent;">

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Mockup (izquierda) -->
        <div class="relative order-2 lg:order-1">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10" style="background: radial-gradient(ellipse, rgba(0,113,227,0.1) 0%, rgba(201,89,221,0.06) 60%, transparent 80%);"></div>
          <div class="absolute top-4 left-8 hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm" style="border:1px solid #cce0ff; background:#ffffff; color:#0071e3;">
            <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Fuentes oficiales conectadas
          </div>
          <div class="absolute bottom-4 right-6 hidden lg:flex rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-200/60">
            <div>
              <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Respuesta promedio</div>
              <div class="mt-1 text-lg font-extrabold text-slate-900">2.4 s</div>
            </div>
          </div>
          <div class="relative overflow-hidden bg-white/95" style="border-radius:28px; border:1px solid #e8e8ed;">
            <div class="flex items-center justify-between gap-3 px-5 py-3 sm:py-4" style="border-bottom:1px solid #e8e8ed; background:#f5f5f7;">
              <div class="flex items-center gap-3 min-w-0">
                <div class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 shadow-sm shrink-0">
                  <div class="w-6 h-6 rounded-full overflow-hidden ring-1 ring-cyan-100 bg-cyan-50 shrink-0">
                    <MascotIcon />
                  </div>
                  <span class="text-xs font-semibold" style="color:#1d1d1f;">Kora</span>
                  <span class="text-[11px] text-emerald-600 inline-flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    en línea
                  </span>
                </div>
                <h3 class="text-base sm:text-lg font-bold leading-tight truncate">
                  <span style="background: linear-gradient(135deg, #1A73E8, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Habla con Kora</span>
                </h3>
              </div>
            </div>

              <div class="space-y-4 p-5 sm:p-6" style="background:#ffffff;">
              <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div class="flex gap-2 flex-wrap">
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f0f6ff; color:#0071e3;">Aranceles</span>
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f0fff4; color:#1a7a4a;">Acreditación</span>
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f5f5f7; color:#474747;">Becas</span>
                </div>
                <div class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                  120+ instituciones
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
                <div class="space-y-3">
                  <div v-for="msg in chatPreview" :key="msg.text" class="flex" :class="msg.isUser ? 'justify-end' : 'justify-start'">
                    <div class="max-w-[85%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed font-medium"
                      :class="msg.isUser ? 'bg-[#0071e3] text-white rounded-tr-sm' : 'bg-slate-100 border border-slate-200 text-slate-700 rounded-tl-sm'">
                      {{ msg.text }}
                    </div>
                  </div>
                  <div class="flex justify-start">
                    <div class="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-[12px] leading-relaxed font-medium bg-slate-100 border border-slate-200 text-slate-700">
                      También tiene acreditación de 6 años. El arancel en la UCH es $3.200.000. ¿Quieres ver las becas?
                    </div>
                  </div>
                  <div class="flex justify-start">
                    <div class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
                      <span class="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                      Kora está pensando...
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-[1fr_0.9fr]">
                <div class="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span class="text-[12px] text-slate-500 flex-1">Pregúntame sobre cualquier carrera...</span>
                  <div class="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                  </div>
                </div>
                <div class="rounded-2xl p-4" style="border:1px solid #cce0ff; background:#f0f6ff;">
                  <div class="text-[10px] font-bold uppercase tracking-[0.18em]" style="color:#0071e3;">Fuentes citadas</div>
                  <div class="mt-3 space-y-2 text-[11px]" style="color:#474747;">
                    <div class="flex items-center justify-between rounded-xl px-3 py-2" style="background:#ffffff; border:1px solid #cce0ff;">
                      <span>SIES empleabilidad</span>
                      <span class="font-semibold" style="color:#0071e3;">2025</span>
                    </div>
                    <div class="flex items-center justify-between rounded-xl px-3 py-2" style="background:#ffffff; border:1px solid #cce0ff;">
                      <span>Mineduc aranceles</span>
                      <span class="font-semibold" style="color:#0071e3;">oficial</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Texto + features (derecha) -->
        <div class="space-y-8 order-1 lg:order-2">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider" style="background:#f0f6ff; border:1px solid #cce0ff; color:#0071e3; border-radius:999px;">Asistente Vocacional a todo momento</span>
            <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style="color:#1d1d1f; letter-spacing:-0.02em;">Kora, tu orientadora<br>de educación superior</h2>
            <p style="color:#474747;" class="mt-4 text-base leading-relaxed">Kora conoce cada institución, carrera, arancel y proceso de admisión del sistema de educación superior chileno en un solo lugar.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><Building2 class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Datos de todas las instituciones</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Pregunta por aranceles, matrículas, acreditación y programas de cualquiera de las más de 121 instituciones del país acreditadas.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><CalendarDays class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Fechas PAES y admisión</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Consulta plazos de postulación, puntajes de corte y requisitos de admisión para cualquier carrera y año para simular tus posibles postulaciones.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><GraduationCap class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Becas y financiamiento</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Kora te explica qué becas existen, a cuáles podrías acceder y cómo postular al financiamiento estudiantil.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/chat" class="inline-flex items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80" style="background:#0071e3; color:#ffffff; border-radius:999px; padding:0.75rem 1.75rem;">
            Hablar con Kora <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, Building2, CalendarDays, GraduationCap } from 'lucide-vue-next'
const chatPreview = [
  { text: '¿Cuánto gana un ingeniero civil recién egresado?', isUser: true },
  { text: 'El sueldo promedio inicial es $1.200.000 CLP según datos SIES 2025. En minería puede superar los $1.800.000.', isUser: false },
]
</script>
