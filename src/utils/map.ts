import { bounds as viewportBounds } from '@placemarkio/geo-viewport';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import * as mapboxgl from 'mapbox-gl';
import { nextTick, watch } from 'vue';
import { markerPosition, type Track, trackSegment } from '@/model/Track.ts';

export const mapboxToken =
  'pk.eyJ1IjoiY2hhcmRpbmciLCJhIjoiY2tocjJpcW5wMGYyOTJydDBicTZvam8xcCJ9.ZJfnHJE_5dJNCsEsQCrwJw';

export interface MapProperties {
  id: string;
}

export enum MapSourceLayer {
  LINES = 'lines',
  COMPLETED = 'completed',
}

export enum MapLayer {
  LINES = 'lines',
  COMPLETED = 'completed',
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
  cutOffTime?: Date,
): FeatureCollection<LineString, MapProperties> => ({
  type: 'FeatureCollection',
  features: tracks.map<Feature<LineString, MapProperties>>((track) => ({
    type: 'Feature',
    properties: {
      id: track.featureId,
    },
    geometry: toGeoJSON(track, cutOffTime),
  })),
});

const toGeoJSON = (track: Track, cutOffTime?: Date): GeoJSON.LineString => {
  let coordinates: [number, number][];
  if (cutOffTime !== undefined) {
    const segment = trackSegment(track, cutOffTime);
    const { lon, lat } = markerPosition(track, segment);
    coordinates = track.points
      .slice(0, segment)
      .map((point) => point.lonLat)
      .concat([lon, lat]);
  } else {
    coordinates = track.points.map((point) => point.lonLat);
  }
  return { type: 'LineString', coordinates };
};

const makeGeoJson = (tracks: readonly Track[] = []): mapboxgl.GeoJSONSourceSpecification => ({
  type: 'geojson',
  data: makeGeoJsonData(tracks),
});

interface LayerDef {
  source: MapSourceLayer;
  color: mapboxgl.ExpressionSpecification | string;
  width: mapboxgl.ExpressionSpecification | number;
  opacity: mapboxgl.ExpressionSpecification | number;
}

const layers: Record<MapLayer, LayerDef> = {
  [MapLayer.LINES]: {
    source: MapSourceLayer.LINES,
    color: '#00F',
    opacity: 0.25,
    width: fromZoom([5, 1], [17, 4], [22, 8]),
  },
  [MapLayer.COMPLETED]: {
    source: MapSourceLayer.COMPLETED,
    color: '#00F',
    opacity: 1,
    width: fromZoom([5, 4], [17, 8]),
  },
};

const buildLineLayer = (id: string, layer: LayerDef): mapboxgl.Layer => ({
  id,
  type: 'line',
  source: layer.source,
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': layer.color,
    'line-width': layer.width,
    'line-opacity': layer.opacity,
  },
});

export const addLayersToMap = (map: mapboxgl.Map) => {
  Object.values(MapSourceLayer).forEach(
    (id) => map.getSource(id) ?? map.addSource(id, makeGeoJson()),
  );

  Object.entries(layers).forEach(([id, layer]) => {
    if (map.getLayer(id)) map.removeLayer(id);
    map.addLayer(buildLineLayer(id, layer));
  });
};

export const applyTracks = (
  map: mapboxgl.Map,
  tracks: readonly Track[],
  zoomToSelection = false,
): void => {
  const source = map.getSource<mapboxgl.GeoJSONSource>(MapSourceLayer.LINES);
  source?.setData(makeGeoJsonData(tracks));

  if (zoomToSelection && tracks[0].points.length > 0) {
    const bounds = tracks[0].points.reduce(
      (bounds, point) => bounds.extend(point.lonLat),
      new mapboxgl.LngLatBounds(tracks[0].points[0].lonLat, tracks[0].points[0].lonLat),
    );
    map.fitBounds(bounds, { padding: 20 });
  }
};

export const applyCompletedTracks = (
  map: mapboxgl.Map,
  tracks: readonly Track[],
  cutOffTime: Date | undefined,
): void => {
  const source = map.getSource<mapboxgl.GeoJSONSource>(MapSourceLayer.COMPLETED);
  source?.setData(makeGeoJsonData(tracks, cutOffTime));
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
}

interface UseMapSelection {
  click: (e: mapboxgl.MapMouseEvent) => void;
}

export const useMapSelection = ({
  getExternalSelection,
  flyToSelection,
  emitUpdate,
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
        layers: [MapSourceLayer.LINES],
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
