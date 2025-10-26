<script setup lang="ts">
import type { Track } from '@/model/Track.ts';
import { computed } from 'vue';
import MaterialIcon from '@/components/MaterialIcon.vue';

const { track, initials } = defineProps<{
  track: Track;
  initials: string;
  iconSvg?: string;
}>();

const emit = defineEmits<{
  (e: 'rename', newInitials: string): void;
  (e: 'delete'): void;
}>();

const duration = computed(() => {
  const totalSeconds = track.duration.total;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [days, hours, minutes, seconds];
  const labels = ['d', 'h', 'm', 's'];
  const firstNonZeroIndex = parts.findIndex((part) => part > 0);
  return parts
    .slice(firstNonZeroIndex)
    .map((part, index) => `${String(part)}${labels[firstNonZeroIndex + index]}`)
    .join(' ');
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

const timeRange = computed(() =>
  timeFormatter.formatRange(track.duration.startTime, track.duration.endTime),
);

function rename() {
  const newName = prompt('Enter new track name:', initials);
  if (newName !== null && newName.trim() !== '') {
    emit('rename', newName.trim());
  }
}
</script>

<template>
  <li :key="track.id" :class="$style.track">
    <div :class="$style.nameRow">
      <div v-if="iconSvg" :class="$style.initials" v-html="iconSvg" @dblclick="rename"></div>
      <h3>{{ track.name }}</h3>
      <div :class="$style.deleteButton">
        <MaterialIcon inline @click="$emit('delete')">delete</MaterialIcon>
      </div>
    </div>
    <p>{{ timeRange }}<br />({{ duration }})</p>
  </li>
</template>

<style lang="scss" module>
@use '@/styles/tablet';

.track {
  cursor: pointer;
  display: flex;
  flex-direction: column;

  h3 {
    position: sticky;
    top: 0;
    background: inherit;
    margin: 0;
    padding: 0.25em 0;
    flex: 1;
  }
}

.deleteButton {
  cursor: default;
  color: var(--color-weak);

  &:hover {
    color: var(--color-error);
  }
}

.nameRow {
  display: flex;
  gap: 1em;
  align-items: center;
}

.initials {
  width: 2.5em;
  height: 2.5em;
}
</style>
