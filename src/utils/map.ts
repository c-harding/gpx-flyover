import { bounds as viewportBounds } from '@placemarkio/geo-viewport';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import * as mapboxgl from 'mapbox-gl';
import { nextTick, type Ref, watch } from 'vue';
import type { Track } from '@/model/Track.ts';

export const mapboxToken =
  'pk.eyJ1IjoiY2hhcmRpbmciLCJhIjoiY2tocjJpcW5wMGYyOTJydDBicTZvam8xcCJ9.ZJfnHJE_5dJNCsEsQCrwJw';

export interface MapProperties {
  id: string;
}

const fromZoom = (
  ...pairs: (readonly [zoom: number, value: unknown])[]
): mapboxgl.ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  ...pairs.flatMap(([zoomLevel, value]) => [zoomLevel, value]),
];

const makeGeoJsonData = (
  tracks: readonly Track[] = [],
): FeatureCollection<LineString, MapProperties> => ({
  type: 'FeatureCollection',
  features: tracks.map<Feature<LineString, MapProperties>>((track) => ({
    type: 'Feature',
    properties: {
      id: String(track.id),
    },
    geometry: toGeoJSON(track),
  })),
});

const toGeoJSON = (track: Track): GeoJSON.LineString => ({
  type: 'LineString',
  coordinates: track.points.map((point) => point.lonLat),
});

const makeGeoJson = (tracks: readonly Track[] = []): mapboxgl.GeoJSONSourceSpecification => ({
  type: 'geojson',
  lineMetrics: true,
  data: makeGeoJsonData(tracks),
});

const buildLineLayer = (id: string): mapboxgl.Layer => ({
  id,
  type: 'line',
  source: id,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#00F',
    'line-width': fromZoom([5, 1], [17, 4], [22, 8]),
    'line-opacity': fromZoom([5, 0.75], [10, 0.55]),
  },
});

export const applyTracks = (
  map: mapboxgl.Map,
  tracks: readonly Track[],
  zoomToSelection = false,
): void => {
  for (const track of tracks) {
    const id = track.layerId;
    if (!map.getSource<mapboxgl.GeoJSONSource>(id)) {
      const source = makeGeoJson([track]);
      map.addSource(id, source);

      if (zoomToSelection && track.points.length > 0) {
        const bounds = track.points.reduce(
          (bounds, point) => bounds.extend(point.lonLat),
          new mapboxgl.LngLatBounds(track.points[0].lonLat, track.points[0].lonLat),
        );
        map.fitBounds(bounds, { padding: 20 });
        zoomToSelection = false;
      }
    }

    if (map.getLayer(id)) map.removeLayer(id);
    map.addLayer(buildLineLayer(id));
  }
};

export const removeOldTracks = (map: mapboxgl.Map, ids: string[]): void => {
  for (const id of ids) {
    map.removeSource(id);
  }
};

const surround = (
  point: mapboxgl.Point,
  offset: number,
): [mapboxgl.PointLike, mapboxgl.PointLike] => [
  [point.x - offset, point.y + offset],
  [point.x + offset, point.y - offset],
];

export type IdSelection = string | undefined;

interface UseMapSelectionConfig {
  getExternalSelection: () => IdSelection;
  flyToSelection: () => void;
  emitUpdate: (newSelection: IdSelection) => void;
  layers: Readonly<Ref<string[]>>;
}

interface UseMapSelection {
  click: (e: mapboxgl.MapMouseEvent) => void;
}

export const useMapSelection = ({
  getExternalSelection,
  flyToSelection,
  emitUpdate,
  layers,
}: UseMapSelectionConfig): UseMapSelection => {
  let localSelection: IdSelection;

  watch(getExternalSelection, () =>
    nextTick(() => {
      if (getExternalSelection() !== localSelection) {
        localSelection = getExternalSelection();
        flyToSelection();
      }
    }),
  );

  function select(id: IdSelection): void {
    localSelection = id;
    emitUpdate(localSelection);
  }

  const click = (e: mapboxgl.MapMouseEvent): void => {
    const map = e.target;
    const originalEvent = e.originalEvent;
    // Ignore duplicate clicks
    if (originalEvent.detail > 1) return;

    for (let i = 0; i < 5; i += 1) {
      const neighbours = map.queryRenderedFeatures(surround(e.point, i), {
        layers: layers.value,
      });
      if (neighbours.length > 0) {
        select((neighbours[0].properties as MapProperties).id);
        return;
      }
    }
    select(undefined);
  };

  return { click };
};

export function greaterBounds(bounds: mapboxgl.LngLatBoundsLike, map: mapboxgl.Map) {
  const { center, zoom } = map.cameraForBounds(bounds) ?? {};
  if (!center || !zoom) {
    return bounds;
  }
  const dimensions: [number, number] = [
    Math.floor(map.getCanvas().offsetWidth),
    Math.floor(map.getCanvas().offsetHeight),
  ];
  // Mapbox vector tiles are 512x512, as opposed to the library's assumed default of 256x256, hence the final `512` argument
  return viewportBounds(mapboxgl.LngLat.convert(center).toArray(), zoom, dimensions, 512);
}
