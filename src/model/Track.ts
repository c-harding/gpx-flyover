import { type Track as GpxTrack } from '@we-gold/gpxjs';

export interface TrackPoint {
  readonly lonLat: [number, number];
  readonly time: Date;
  readonly distance: number;
}

export class Track {
  private static index = 0;
  private static layerPrefix = 'track-';

  readonly id = ++Track.index;
  readonly featureId = Track.layerPrefix + String(this.id);

  readonly points: TrackPoint[];
  readonly duration: { startTime: Date; endTime: Date; total: number };
  readonly distance: number;

  constructor(
    gpx: GpxTrack,
    readonly name: string,
  ) {
    const points: TrackPoint[] = [];
    for (let i = 0; i < gpx.points.length; i++) {
      const point = gpx.points[i];
      const distance = gpx.distance.cumulative[i];
      if (point.time === null) continue;
      points.push({
        lonLat: [point.longitude, point.latitude],
        time: point.time,
        distance,
      });
    }
    this.points = points;
    this.distance = gpx.distance.total;

    this.duration = {
      startTime: Track.ensureDate(gpx.duration.startTime, 'start time'),
      endTime: Track.ensureDate(gpx.duration.endTime, 'end time'),
      total: gpx.duration.totalDuration,
    };
  }

  private static ensureDate(date: Date | null, field: string): Date {
    if (date == null) {
      throw new Error(`Track point is missing time data for ${field}`);
    }
    return date;
  }
}

export function trackSegment(track: Track, date: Date | undefined): number {
  const startTime = track.duration.startTime;
  const endTime = track.duration.endTime;
  if (!date) return 0;
  if (date <= startTime) return 0;
  if (date >= endTime) return track.points.length - 1;

  const i = binarySearchTime(track, date);
  if (i >= track.points.length - 1) return track.points.length - 1;
  const p0 = track.points[i];
  const p1 = track.points[i + 1];

  const timeDiff = +p1.time - +p0.time;
  const timeIntoSegment = +date - +p0.time;
  const segmentProportion = timeDiff === 0 ? 0 : timeIntoSegment / timeDiff;

  return i + segmentProportion;
}

export function distanceProportion(track: Track, segment: number): number {
  const i = Math.floor(segment);
  const segmentProportion = segment - i;

  if (i >= track.points.length - 1) return 1;
  const p0 = track.points[i];
  const p1 = track.points[i + 1];

  const distanceDiff = p1.distance - p0.distance;
  const distanceAtSegment = p0.distance + segmentProportion * distanceDiff;

  return distanceAtSegment / track.distance;
}

export function markerPosition(
  track: Track,
  segment: number,
): { lon: number; lat: number; heading: number } {
  let i = Math.floor(segment);
  let segmentProportion = segment - i;

  if (i >= track.points.length - 1) {
    i = track.points.length - 2;
    segmentProportion = 1;
  }

  const p0 = track.points[i];
  const p1 = track.points[i + 1];

  const lon = p0.lonLat[0] + segmentProportion * (p1.lonLat[0] - p0.lonLat[0]);
  const lat = p0.lonLat[1] + segmentProportion * (p1.lonLat[1] - p0.lonLat[1]);

  let heading = headingBetweenPoints(p0, p1);

  if (segmentProportion === 0 && i > 0) {
    const pPrev = track.points[i - 1];
    const headingPrev = headingBetweenPoints(pPrev, p0);
    heading = (heading + headingPrev) / 2;
  }

  return { lon, lat, heading };
}

function headingBetweenPoints(p0: TrackPoint, p1: TrackPoint): number {
  return Math.atan2(p1.lonLat[0] - p0.lonLat[0], p1.lonLat[1] - p0.lonLat[1]) * (180 / Math.PI);
}

// Get the index of the point at or before the given time
function binarySearchTime(track: Track, date: Date): number {
  let low = 0;
  let high = track.points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTime = track.points[mid].time;
    if (midTime < date) {
      low = mid + 1;
    } else if (midTime > date) {
      high = mid - 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, high);
}
