<script setup lang="ts">
import { useTrackStore } from '@/stores/TrackStore.ts';
import { ref } from 'vue';

const trackStore = useTrackStore();

const fileInput = ref<HTMLInputElement>();

const onFileChange = () => {
  const files = fileInput.value?.files;
  if (!files?.length) return;
  // TODO proper error handling
  trackStore.addTracksFromFiles(files).catch((e: unknown) => {
    console.error(e);
  });
};
</script>

<!-- A component containing an upload button -->
<template>
  <div>
    <label>
      Upload GPX files
      <input ref="fileInput" type="file" multiple accept=".gpx" @change="onFileChange" />
    </label>
  </div>
</template>

<style scoped lang="scss"></style>
