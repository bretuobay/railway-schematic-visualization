import { CoordinateSystemType, type GeographicCoordinate, type ScreenCoordinate } from './types';

const EARTH_RADIUS_METERS = 6_378_137;

export function projectWebMercator(
  coordinate: GeographicCoordinate,
): ScreenCoordinate {
  const longitudeRadians = (coordinate.longitude * Math.PI) / 180;
  const latitudeRadians = (coordinate.latitude * Math.PI) / 180;

  return {
    type: CoordinateSystemType.Screen,
    x: EARTH_RADIUS_METERS * longitudeRadians,
    y:
      EARTH_RADIUS_METERS *
      Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  };
}

export function inverseWebMercator(
  coordinate: ScreenCoordinate,
): GeographicCoordinate {
  const longitude = (coordinate.x / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const latitude =
    (2 * Math.atan(Math.exp(coordinate.y / EARTH_RADIUS_METERS)) - Math.PI / 2) *
    (180 / Math.PI);

  return {
    type: CoordinateSystemType.Geographic,
    latitude,
    longitude,
  };
}
