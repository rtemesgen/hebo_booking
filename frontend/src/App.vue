<template>
  <div class="app-shell">
    <router-view />
  </div>
</template>

<style>
:root {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: #152218;
  background:
    radial-gradient(circle at top, rgba(255, 208, 122, 0.35), transparent 28%),
    linear-gradient(180deg, #f7f1df 0%, #f2efe5 45%, #ebe6d9 100%);
  line-height: 1.5;
  font-weight: 400;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

button,
input,
select {
  font: inherit;
}

html,
body,
#app {
  height: 100%;
}

.app-shell {
  min-height: 100svh;
  min-height: 100dvh;
}

div[class*='fixed'][class*='items-end'] > section {
  max-height: calc(100dvh - 1rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
