<script lang="ts">
import * as mapboxgl from 'mapbox-gl';
import { onBeforeUnmount, onMounted, ref, useCssModule, watch } from 'vue';
import { applyTracks, mapboxToken } from '@/utils/map';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapStyle, useMapStyle } from '@/utils/map-style';

declare global {
  interface Window {
    cachedMapElement?: mapboxgl.Map;
  }
}

const mapStyleUrls: Record<MapStyle, string> = {
  [MapStyle.MAPBOX]: import.meta.env.BASE_URL + '/mapbox-style.json',
  [MapStyle.SATELLITE]: 'mapbox://styles/mapbox/standard-satellite',
};
</script>

<script setup lang="ts">
import { useTrackStore } from '@/stores/TrackStore.ts';
import MaterialIcon from '@/components/MaterialIcon.vue';
import { markerPosition, trackSegment } from '@/model/Track.ts';
import { addLayersToMap, applyCompletedTracks } from '@/utils/map.ts';

const center = defineModel<mapboxgl.LngLatLike>('center');
const zoom = defineModel<number>('zoom');

const trackStore = useTrackStore();

const style = useCssModule();

const container = ref<HTMLDivElement>();

const { mapStyle, nextMapStyle } = useMapStyle();

const makeMarker = (svg: string) => {
  const wrapper = document.createElement('div');
  wrapper.className = style.markerWrapper;
  wrapper.innerHTML = svg;
  return wrapper;
};

if (!window.cachedMapElement) {
  const newMap = new mapboxgl.Map({
    accessToken: mapboxToken,
    container: document.createElement('div'),
    style: mapStyleUrls[mapStyle.value],
    center: center.value,
    zoom: zoom.value,
    maxZoom: 16 * (1 - Number.EPSILON),
  });

  newMap.addControl(new mapboxgl.FullscreenControl({ container: document.body }), 'top-right');
  newMap.addControl(
    new mapboxgl.NavigationControl({ showZoom: false, visualizePitch: true }),
    'top-right',
  );

  newMap.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

  window.cachedMapElement = newMap;
}
const map = window.cachedMapElement;

const topRight = map.getContainer().querySelector(`.mapboxgl-ctrl-top-right`);

const resize = () => {
  map.resize();
};

onMounted(() => {
  container.value?.appendChild(map.getContainer());
  resize();
});

map.on('zoomend', () => {
  zoomend(map);
});
map.on('moveend', () => {
  moveend(map);
});

watch(mapStyle, (mapStyle) => {
  map.setStyle(mapStyleUrls[mapStyle]);
});

watch(
  mapStyle,
  () => {
    map.once('style.load', () => {
      mapLoaded(map);
    });
  },
  { immediate: true },
);

watch(
  () => [trackStore.currentTime, trackStore.tracks] as const,
  ([time, tracks]) => {
    applyCompletedTracks(map, tracks, time);
  },
  { immediate: true, deep: true },
);

watch(
  () => [trackStore.currentTime, trackStore.tracks, trackStore.trackIcons] as const,
  ([time, tracks]) => {
    const usedMarkers: mapboxgl.Marker[] = [];
    for (const track of tracks) {
      const segment = trackSegment(track, time);
      // add marker
      const marker = trackStore.getMarker(track.id, (svg) => new mapboxgl.Marker(makeMarker(svg)));
      usedMarkers.push(marker);
      const { lon, lat /* heading */ } = markerPosition(track, segment);
      marker.setLngLat([lon, lat]);
      // track.marker.setRotation(heading);
      marker.addTo(map);
    }
  },
  { immediate: true, deep: true },
);

onMounted(() => {
  window.addEventListener('transitionend', resize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('transitionend', resize);
});

watch(
  () => trackStore.tracks,
  (tracks) => {
    applyTracks(map, tracks);
  },
  { deep: true },
);

const mapLoaded = (map: mapboxgl.Map) => {
  resize();
  addLayersToMap(map);

  applyTracks(map, trackStore.tracks);
};

const zoomend = (map: mapboxgl.Map): void => {
  zoom.value = map.getZoom();
};

const moveend = (map: mapboxgl.Map): void => {
  center.value = map.getCenter();
};

// const flyToSelection = () => {
//   if (!selectedWalks.value.length) return;
//   const walk = selectedWalks.value[0];
//
//   const padding = 50;
//
//   const coordinates = polyline.decode(walk.polyline).map<[number, number]>(([y, x]) => [x, y]);
//   const bounds = coordinates.reduce(
//     (acc, coord) => acc.extend(coord),
//     new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
//   );
//   map.fitBounds(bounds, { padding, maxZoom: 20 });
// };

// const { click } = useMapSelection({
//   getExternalSelection: () => selected.value,
//   flyToSelection,
//   emitUpdate: () => undefined,
// });

// function dblclick(e: mapboxgl.MapMouseEvent) {
//   if (selected.value) {
//     e.preventDefault();
//     void nextTick(flyToSelection);
//   }
// }
</script>

<template>
  <div ref="container" :class="$style.mapContainer"></div>
  <Teleport :to="topRight">
    <div class="mapboxgl-ctrl mapboxgl-ctrl-group">
      <button @click="nextMapStyle">
        <MaterialIcon>layers</MaterialIcon>
      </button>
    </div>
  </Teleport>
</template>

<style lang="scss" module>
.mapContainer {
  display: contents;

  :global(.mapboxgl-map) {
    flex: 1;
    z-index: 0;

    :global(.mapboxgl-canvas) {
      cursor: pointer;
    }
  }
}

:global(.mapboxgl-ctrl-bottom-right) {
  margin-left: 100px;
}

.markerWrapper {
  svg {
    width: 2em;
    height: 2em;
  }
}
</style>
