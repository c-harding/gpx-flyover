<script setup lang="ts">
import { useTrackStore } from '@/stores/TrackStore.ts';
import { ref } from 'vue';

const trackStore = useTrackStore();

const fileInput = ref<HTMLInputElement>();

const drag = ref(false);

async function handleFiles(files: FileList) {
  try {
    await trackStore.addTracksFromFiles(files);
    return;
  } catch (e) {
    console.error(e);
  }
}

function onFileChange() {
  const input = fileInput.value;
  if (!input) return;
  if (!input.files?.length) return;
  void handleFiles(input.files).then(() => {
    input.value = '';
  });
}

function onDrop(event: DragEvent) {
  drag.value = false;
  if (!event.dataTransfer?.files.length) return;
  void handleFiles(event.dataTransfer.files);
}
</script>

<!-- A component containing an upload button -->
<template>
  <li :class="[$style.uploadArea, drag && $style.dragHover]">
    <label
      @dragover.prevent="drag = true"
      @drop.prevent="onDrop"
      @dragend="drag = false"
      @dragleave="drag = false"
    >
      Upload GPX files
      <input ref="fileInput" type="file" multiple accept=".gpx" @change="onFileChange" />
    </label>
  </li>
</template>

<style module lang="scss">
.uploadArea {
  padding: 0 !important;

  border: 2px dashed #888;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;

  &:hover,
  &.dragHover {
    background-color: var(--background-strong);
    border-color: var(--color);
  }

  > label {
    padding: 2em;
    display: block;
    cursor: pointer;
    font-weight: bold;
    color: var(--color);

    > input[type='file'] {
      display: none;
    }
  }
}
</style>
