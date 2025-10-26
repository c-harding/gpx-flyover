import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowReactive, watch } from 'vue';
import { Track } from '@/model/Track.ts';
import { parseGPX } from '@we-gold/gpxjs';
import { escapeHtml } from '../utils/escape-html.ts';
import type { Marker } from 'mapbox-gl';

export const useTrackStore = defineStore('track', () => {
  const tracks = shallowReactive<Track[]>([]);

  const trackIcons = reactive(new Map<number, { initials: string; color: string; svg: string }>());
  const markers = shallowReactive(new Map<number, Marker>());

  const isPlaying = ref(false);

  const playbackSpeed = ref(60);
  let lastTickTime = Date.now();

  watch(isPlaying, (playing) => {
    lastTickTime = Date.now();
    if (playing) requestAnimationFrame(tick);
  });

  function tick() {
    if (!isPlaying.value) return;
    if (currentTime.value === undefined || range.value === undefined) {
      isPlaying.value = false;
      return;
    }

    const time = Date.now();
    const delta = time - lastTickTime;
    lastTickTime = time;
    currentTime.value = new Date(
      Math.min(delta * playbackSpeed.value + +currentTime.value, range.value.max),
    );

    if (+currentTime.value >= range.value.max) {
      isPlaying.value = false;
      return;
    }

    requestAnimationFrame(tick);
  }

  const range = computed(() =>
    tracks.reduce<{ min: number; max: number } | undefined>(
      (limits, track) => ({
        min: limits ? Math.min(limits.min, +track.duration.startTime) : +track.duration.startTime,
        max: limits ? Math.max(limits.max, +track.duration.endTime) : +track.duration.endTime,
      }),
      undefined,
    ),
  );

  const currentTime = ref<Date>();

  watch(
    range,
    (newRange) => {
      if (newRange) {
        if (
          !currentTime.value ||
          +currentTime.value < newRange.min ||
          +currentTime.value > newRange.max
        ) {
          currentTime.value = new Date(newRange.min);
        }
      } else if (currentTime.value) {
        currentTime.value = undefined;
      }
    },
    { immediate: true },
  );

  const warnings = reactive<string[]>([]);

  function warn(message: string) {
    warnings.push(message);
    setTimeout(() => {
      warnings.splice(warnings.indexOf(message), 1);
    }, 5000);
  }

  async function addTracksFromFiles(files: FileList) {
    for (const file of Array.from(files)) {
      const contents = await file.text();

      const [gpx, error] = parseGPX(contents);
      if (error) throw error;

      if (gpx.tracks.length) {
        for (let i = 0; i < gpx.tracks.length; i++) {
          const gpxTrack = gpx.tracks[i];
          const name =
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- An empty string is not a valid name
            gpxTrack.name || (gpx.metadata.name || file.name) + (i > 0 ? String(i + 1) : '');
          let track: Track;
          try {
            track = new Track(name, gpxTrack);
          } catch (e: unknown) {
            warn(`Skipping track "${name}": ${(e as Error).message}`);
            continue;
          }
          tracks.push(track);
          setTrackIcon(track.id, track.id.toString());
        }
      } else if (gpx.routes.length) {
        warn('GPX routes are not supported, because they do not have timing data.');
      } else {
        warn('No tracks found in GPX file.');
      }
    }
  }

  function setTrackIcon(trackId: number, initials: string, color?: string) {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Fallback to existing color if blank
    color ||= trackIcons.get(trackId)?.color || '#00f';
    const size = Math.min(300, 400 / initials.length);
    const svg = `
    <svg viewBox="0 0 500 500">
      <circle cx="250" cy="250" r="200" fill="${escapeHtml(color)}" />
      <text x="250" y="250" text-anchor="middle" dominant-baseline="central" font-size="${size}" fill="#fff"
        >${escapeHtml(initials)}</text
      >
    </svg>
  `;
    trackIcons.set(trackId, { initials, color, svg });
    markers.delete(trackId);
  }

  function getTrackIcon(trackId: number) {
    return trackIcons.get(trackId) ?? { initials: '?', color: '#888', svg: '' };
  }

  function getMarker(trackId: number, createMarker: (svg: string) => Marker): Marker {
    let marker: Marker | undefined = markers.get(trackId);
    if (!marker) {
      const svg = getTrackIcon(trackId).svg;
      marker = createMarker(svg);
      markers.set(trackId, marker);
    }
    return marker;
  }

  return {
    tracks,
    trackIcons,
    markers,
    getMarker,
    addTracksFromFiles,
    getTrackIcon,
    setTrackIcon,
    range,
    currentTime,
    warnings,
    isPlaying,
    playbackSpeed,
  };
});
