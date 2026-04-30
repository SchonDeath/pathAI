<!--
  Layout opt-in que renderiza AppHeader. Para usarlo en una página:
    definePageMeta({ layout: 'with-header' })
  y eliminar el <AppHeader /> directo del template de la página.

  Se mantiene como opt-in para no romper páginas existentes que aún
  incluyen <AppHeader /> en su template.
-->
<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <slot />
  </div>
</template>
