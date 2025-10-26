import { computed, ref, watch } from 'vue';

export enum MapStyle {
  MAPBOX = 'MAPBOX',
  SATELLITE = 'SATELLITE',
}

const localStorageMapStyleKey = 'gpx-library-map-style';
const mapStyles = [MapStyle.MAPBOX, MapStyle.SATELLITE];

const cachedMapStyleIndex = mapStyles.indexOf(
  localStorage.getItem(localStorageMapStyleKey) as MapStyle,
);

export function updateMapStyleCache(style: MapStyle) {
  localStorage.setItem(localStorageMapStyleKey, style);
}

export function useMapStyle() {
  const mapStyleIndex = ref(cachedMapStyleIndex > -1 ? cachedMapStyleIndex : 0);

  const mapStyle = computed(() => mapStyles[mapStyleIndex.value]);

  const nextMapStyle = () => {
    mapStyleIndex.value = (mapStyleIndex.value + 1) % mapStyles.length;
  };

  watch(mapStyle, (mapStyle) => {
    updateMapStyleCache(mapStyle);
  });

  return { mapStyle, nextMapStyle };
}
