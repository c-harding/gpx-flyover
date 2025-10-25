<script setup lang="ts">
import type { PointOnLine } from '@/interfaces/Point';
import type Walk from '@/interfaces/Walk';
import { ref } from 'vue';
import MaterialIcon from './MaterialIcon.vue';
import SidebarWalk from './SidebarWalk.vue';

const { walks, selected, lockFilter, lockContributions, showFullLink } = defineProps<{
  walks: Walk[] | undefined;
  selected?: string;
  allTags?: string[];
  lockFilter?: boolean;
  lockContributions?: boolean;
  showFullLink?: boolean;
}>();

const emit = defineEmits<{ hoverPoint: [point: PointOnLine | undefined] }>();

const tagFilter = defineModel<string>('filter', { default: '' });

const minimised = ref(false);

const sidebarItemListRef = ref<HTMLElement>();
</script>

<template>
  <div :class="[$style.sidebar, minimised && $style.minimised]">
    <div :class="$style.topBox"></div>
    <div :class="[$style.minimisedMessage, $style.map]">
      <p><MaterialIcon>map</MaterialIcon></p>
      <p>Map</p>
    </div>
    <div :class="$style.minimisedMessage">
      <p><MaterialIcon>arrow_back</MaterialIcon></p>
      <p>Back</p>
    </div>
    <ul ref="sidebarItemListRef">
      <SidebarWalk
        v-for="walk of sortedWalks"
        :key="walk.id"
        :walk="walk"
        :selected="selected !== undefined && walk.id === selected"
        :lockFilter="lockFilter"
        @select="select(walk)"
        @hover-point="emit('hoverPoint', $event)"
        @set-tag-filter="tagFilter = $event"
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
</style>
