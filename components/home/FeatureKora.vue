<template>
  <section class="relative px-4 sm:px-6 py-20 sm:py-28 bg-slate-50 border-t border-slate-100 overflow-hidden">
    <!-- Glow de fondo -->
    <div class="absolute top-0 left-0 w-[600px] h-[500px] -z-10 pointer-events-none"
      style="background: radial-gradient(ellipse at top left, #ecfeff 0%, #cffafe 40%, transparent 70%); opacity: 0.8"></div>

    <div class="max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Mockup (izquierda) -->
        <div class="relative order-2 lg:order-1">
          <div class="absolute -inset-4 rounded-3xl blur-3xl -z-10" style="background: radial-gradient(ellipse, #a5f3fc 0%, #bae6fd 60%, transparent 80%); opacity: 0.4"></div>
          <div class="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xl shadow-slate-100">
            <!-- Header chat -->
            <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div class="w-9 h-9 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-lg">🤖</div>
              <div>
                <div class="text-sm font-bold text-slate-900">Kora</div>
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span class="text-[11px] text-emerald-600 font-medium">en línea</span>
                </div>
              </div>
              <div class="ml-auto flex items-center gap-1">
                <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                <div class="w-2 h-2 rounded-full bg-slate-200"></div>
              </div>
            </div>
            <!-- Mensajes -->
            <div class="space-y-3">
              <div v-for="msg in chatPreview" :key="msg.text" class="flex" :class="msg.isUser ? 'justify-end' : 'justify-start'">
                <div class="max-w-[85%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed font-medium"
                  :class="msg.isUser ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-slate-100 border border-slate-200 text-slate-700 rounded-tl-sm'">
                  {{ msg.text }}
                </div>
              </div>
              <div class="flex justify-start">
                <div class="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-[12px] leading-relaxed font-medium bg-slate-100 border border-slate-200 text-slate-700">
                  También tiene acreditación de 6 años. El arancel en la UCH es $3.200.000. ¿Quieres ver las becas?
                </div>
              </div>
            </div>
            <!-- Input -->
            <div class="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <span class="text-[12px] text-slate-500 flex-1">Pregúntame sobre cualquier carrera...</span>
              <div class="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center shrink-0">
                <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Texto + features (derecha) -->
        <div class="space-y-8 order-1 lg:order-2">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-4">🤖 Asistente IA</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Kora, tu orientadora<br>de educación superior</h2>
            <p class="text-slate-500 mt-4 text-base leading-relaxed">No es un chatbot genérico. Kora conoce cada institución, carrera, arancel y proceso de admisión del sistema de educación superior chileno.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-cyan-200 transition-colors">🏛️</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Datos de todas las instituciones</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Pregunta por aranceles, matrículas, acreditación y programas de cualquiera de las más de 200 instituciones del país.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-cyan-200 transition-colors">📅</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Fechas PAES y admisión</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Consulta plazos de postulación, puntajes de corte y requisitos de admisión para cualquier carrera y año.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-cyan-200 transition-colors">🎓</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Becas y financiamiento</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Kora te explica qué becas existen, a cuáles podrías acceder y cómo postular al financiamiento estudiantil.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/chat" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-cyan-200">
            Hablar con Kora →
          </NuxtLink>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const chatPreview = [
  { text: '¿Cuánto gana un ingeniero civil recién egresado?', isUser: true },
  { text: 'El sueldo promedio inicial es $1.200.000 CLP según datos SIES 2025. En minería puede superar los $1.800.000.', isUser: false },
]
</script>
