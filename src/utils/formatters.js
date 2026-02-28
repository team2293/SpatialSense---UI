import { METERS_TO_FEET, SQ_METERS_TO_SQ_FEET, CUBIC_METERS_TO_CUBIC_FEET } from '../constants';

export function formatLength(meters, unit, decimals = 3) {
  if (unit === 'feet') {
    return `${(meters * METERS_TO_FEET).toFixed(decimals)}ft`;
  }
  return `${meters.toFixed(decimals)}m`;
}

export function formatArea(sqMeters, unit, decimals = 2) {
  if (unit === 'feet') {
    return `${(sqMeters * SQ_METERS_TO_SQ_FEET).toFixed(decimals)}ft²`;
  }
  return `${sqMeters.toFixed(decimals)}m²`;
}

export function formatVolume(cubicMeters, unit, decimals = 2) {
  if (unit === 'feet') {
    return `${(cubicMeters * CUBIC_METERS_TO_CUBIC_FEET).toFixed(decimals)}ft³`;
  }
  return `${cubicMeters.toFixed(decimals)}m³`;
}
