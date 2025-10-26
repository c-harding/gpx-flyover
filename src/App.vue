<script setup lang="ts">
import SidebarContent from '@/components/SidebarContent.vue';
import MapView from '@/components/MapView.vue';
import { ref } from 'vue';
import type { Point } from '@/interfaces/Point.ts';

const location = ref<Point>({
  lat: 48,
  lng: 11,
});

const zoom = ref(3);
</script>

<template>
  <SidebarContent />
  <MapView v-model:center="location" v-model:zoom="zoom" />
</template>

<style>
:root {
  --transition-speed: 0.5s;
  font-size: 12px;

  @media screen and (min-width: 800px) {
    font-size: 14px;
  }

  @media screen and (min-width: 1000px) {
    font-size: 16px;
  }

  @media screen and (min-width: 1500px) {
    font-size: 18px;
  }
}

a {
  color: var(--link-color);
}

html,
body {
  height: 100%;
  overflow: hidden;
  margin: 0;
  background-color: var(--background);
}

body {
  height: 100%;
  display: flex;
  align-items: stretch;
  flex-direction: row;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color);
  background-color: var(--background);
  transition: font-size var(--transition-speed);
}

:root {
  --color: #222;
  --link-color: #00e;
  --background: #fff;
  --background-slight: #eee;
  --background-strong: #ccc;
  --background-error: #f88;
  --background-warn: #ffd;
  --color-weak: #555;
  --color-error: #800;
  --color-success: #080;
  --overlay-color: rgba(255, 255, 255, 0.5);
  --invert: 0%;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color: #fff;
    --link-color: #8cf;
    --background: #222;
    --background-slight: #224;
    --background-strong: #555;
    --background-error: #800;
    --background-warn: #551;
    --color-weak: #ccc;
    --color-error: #f88;
    --color-success: #8f8;
    --overlay-color: rgba(0, 0, 0, 0.5);
    --invert: 100%;
  }
}
</style>
