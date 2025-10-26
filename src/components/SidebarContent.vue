<script setup lang="ts">
import { computed, ref } from 'vue';
import MaterialIcon from './MaterialIcon.vue';
import SidebarTrack from './SidebarTrack.vue';
import { useTrackStore } from '@/stores/TrackStore.ts';
import UploadArea from '@/components/UploadArea.vue';
import DropdownControl from '@/components/DropdownControl.vue';
import { appName } from '@/config.ts';

const trackStore = useTrackStore();

const minimised = ref(false);

const currentTime = computed({
  get: () => +(trackStore.currentTime ?? 0),
  set: (value: string) => {
    trackStore.currentTime = new Date(+value);
  },
});

const isSameDay = computed(() => {
  if (!trackStore.range) return true;
  const minDate = new Date(trackStore.range.min);
  const maxDate = new Date(trackStore.range.max);
  return (
    minDate.getFullYear() === maxDate.getFullYear() &&
    minDate.getMonth() === maxDate.getMonth() &&
    minDate.getDate() === maxDate.getDate()
  );
});

const formatDateTime = (date: Date | number) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const formatDate = (date: Date | number) =>
  new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
  });

const formatTime = (date: Date | number) =>
  new Date(date).toLocaleString(undefined, {
    timeStyle: 'short',
  });

const formatTimeWithSeconds = (date: Date | number) =>
  new Date(date).toLocaleString(undefined, {
    timeStyle: 'medium',
  });

const dropdownOptions = [30, 60, 120, 300, 600, 1200].map((speed) => ({
  value: speed.toString(),
  label: `${speed.toString()}x`,
}));
</script>

<template>
  <div :class="[$style.sidebar, minimised && $style.minimised]">
    <div :class="$style.topBox">
      <h1>{{ appName }}</h1>
    </div>
    <div :class="[$style.minimisedMessage, $style.map]" @click="minimised = true">
      <p><MaterialIcon>map</MaterialIcon></p>
      <p>Map</p>
    </div>
    <div :class="$style.minimisedMessage" @click="minimised = false">
      <p><MaterialIcon>arrow_back</MaterialIcon></p>
      <p>Back</p>
    </div>
    <ul>
      <UploadArea :class="$style.dummy" />

      <li :class="$style.dummy">
        <div :class="$style.timeControls">
          <!--          play/pause-->
          <MaterialIcon @click="trackStore.isPlaying = !trackStore.isPlaying">
            {{ trackStore.isPlaying ? 'pause' : 'play_arrow' }}
          </MaterialIcon>
          <div :class="$style.timeDisplay">
            {{
              !trackStore.currentTime
                ? ' '
                : isSameDay
                  ? formatTimeWithSeconds(trackStore.currentTime)
                  : formatDateTime(trackStore.currentTime)
            }}
          </div>
          <DropdownControl
            :options="dropdownOptions"
            :modelValue="trackStore.playbackSpeed.toString()"
            @update:modelValue="trackStore.playbackSpeed = +$event"
          />
        </div>
        <label :class="$style.timeSlider">
          <span v-if="trackStore.range" :class="$style.timeLabels">
            <span v-if="!isSameDay">{{ formatDate(trackStore.range.min) }}</span>
            <span>{{ formatTime(trackStore.range.min) }}</span>
          </span>
          <input
            :disabled="!trackStore.range"
            type="range"
            :min="trackStore.range?.min ?? 0"
            :max="trackStore.range?.max ?? 1"
            step="1000"
            v-model="currentTime"
          />
          <span v-if="trackStore.range" :class="$style.timeLabels">
            <span v-if="!isSameDay">{{ formatDate(trackStore.range.max) }}</span>
            <span>{{ formatTime(trackStore.range.max) }}</span>
          </span>
        </label>
      </li>
      <li
        v-for="warning of trackStore.warnings"
        :class="[$style.dummy, $style.warning]"
        :key="warning"
      >
        <MaterialIcon inline>warning</MaterialIcon> {{ warning }}
      </li>
      <SidebarTrack
        v-for="track of trackStore.tracks"
        :key="track.id"
        :track="track"
        :initials="trackStore.getTrackIcon(track.id).initials"
        :iconSvg="trackStore.getTrackIcon(track.id).svg"
        @rename="trackStore.setTrackIcon(track.id, $event)"
        @delete="trackStore.removeTrack(track.id)"
      />
    </ul>
    <div :class="$style.overlay" @click="minimised = !minimised" @wheel="minimised = true" />
  </div>
</template>

<style lang="scss" module>
@use '@/styles/tablet';

$max-sidebar-width: calc(100vw - 6rem);
$sidebar-width: 25rem;

$minimised-width: 5rem;

.sidebar {
  flex: 0 $sidebar-width;
  max-width: $max-sidebar-width;
  display: flex;
  flex-direction: column;
  color: var(--color);
  background-color: var(--background);
  transition: margin var(--transition-speed);
  z-index: 1;
  position: relative;

  > ul {
    flex: 1;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    background-color: var(--background);
    transition: margin var(--transition-speed);

    > * {
      list-style: none;
      margin: 1em;
      padding: 1em;
      border-radius: 0.5em;
      background-color: var(--background-slight);
    }
  }
}

.topBox {
  padding: 2vh 1em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 10vh;
}

.overlay {
  display: none;
  cursor: pointer;
}

.minimisedMessage {
  height: 5rem;
  background: var(--background);
  width: $minimised-width;
  display: flex;
  margin-bottom: -5rem;
  flex-direction: column;
  justify-content: space-evenly;
  margin-inline-start: auto;
  text-align: center;
  transition: margin var(--transition-speed);

  p {
    margin: 0 1em;
  }

  &.map {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
    border-start-end-radius: 1em;
    border-end-end-radius: 1em;
    position: relative;
    z-index: -1;

    &::before,
    &::after {
      position: absolute;
      content: '';
      height: 2em;
      inset-inline-start: 0;
      width: 1em;
      background-color: transparent;
    }
    &::before {
      bottom: 100%;
      box-shadow: 0 1em 0 0 var(--background);
      border-end-start-radius: 1em;
    }
    &::after {
      top: 100%;
      box-shadow: 0 -1em 0 0 var(--background);
      border-start-start-radius: 1em;
    }
  }
}

@media screen and (max-width: 600px) {
  .overlay {
    display: block;
    position: absolute;
    z-index: 2;
    inset-inline-end: 100%;
    top: 0;
    bottom: 0;
    width: 100vw;
  }

  .sidebar {
    $sidebar-overlap-fallback: -20rem;
    $sidebar-overlap: calc(#{$minimised-width} - min(#{$sidebar-width}, #{$max-sidebar-width}));

    margin-inline-end: $sidebar-overlap-fallback;
    margin-inline-end: $sidebar-overlap;

    &.minimised {
      margin-inline-start: $sidebar-overlap-fallback;
      margin-inline-start: $sidebar-overlap;
      margin-inline-end: 0;

      > ul {
        margin-inline-start: -$minimised-width;
        margin-inline-end: $minimised-width;
      }

      .topBox .logo {
        $minimised-padding: 1rem;

        margin-inline-start: $minimised-padding;
        max-width: $minimised-width - 2 * $minimised-padding;
      }

      .overlay {
        inset-inline-end: 0;
        inset-inline-start: unset;
      }

      .info {
        margin-inline-end: $minimised-width;
      }
    }

    &:not(.minimised) .minimisedMessage.map {
      margin-inline-end: -$minimised-width;
    }
  }
}
.timeControls {
  display: flex;
  gap: 1em;
  align-items: center;
}
.timeDisplay {
  text-align: center;
  flex: 1;
  font-variant-numeric: tabular-nums;
}
.timeSlider {
  display: flex;
  gap: 0.5em;
  align-items: center;

  input[type='range'] {
    flex: 1 0;
  }

  .timeLabels {
    display: flex;
    flex-direction: column;
    font-size: 0.8em;
    text-align: center;
    min-width: max-content;
    font-variant-numeric: tabular-nums;
  }
}

.warning {
  background-color: var(--background-warn);
}
</style>
