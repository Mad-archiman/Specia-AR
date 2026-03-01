import { egm96ToEllipsoid } from 'egm96-universal';

/**
 * 지오이드(EGM96) 고도를 WGS84 타원체 고도로 변환
 * 구글 어스 등에서 입력한 고도(지오이드 기준)를 GPS(타원체 기준)와 비교 가능하도록 변환
 * @param lat 위도 (도)
 * @param lon 경도 (도)
 * @param altGeoid 지오이드 고도(m), 구글 어스 등
 * @returns 타원체 고도(m)
 */
export function geoidToEllipsoid(lat: number, lon: number, altGeoid: number): number {
  try {
    return egm96ToEllipsoid(lat, lon, altGeoid);
  } catch {
    return altGeoid;
  }
}

/** 위경도 점1에서 점2로의 방위각 (도 단위, 0~360, 북쪽 기준 시계방향) */
export function getBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = (Math.atan2(y, x) * 180) / Math.PI;
  return (θ + 360) % 360;
}

/** 위경도 두 점 사이 수평 거리 (미터) - Haversine */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
