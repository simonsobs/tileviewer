// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import {
  raDecToMapCoords,
  transformCoords,
  transformGraticuleCoords,
} from '../utils/layerUtils';

/** RAs in SIMBAD's 0 -> 360 convention, covering both halves of the sky and the seams */
const SIMBAD_RAS = [0, 0.5, 10.68, 83.82, 179.9, 180, 187.28, 266.42, 359.5];

/** The same RA in the -180 -> 180 convention */
const to180 = (ra: number) => (ra > 180 ? ra - 360 : ra);

describe.each([false, true])('raDecToMapCoords (flipped: %s)', (flipped) => {
  test.each(SIMBAD_RAS)('keeps RA %s within the map extent', (ra) => {
    const [x] = raDecToMapCoords([ra, 0], flipped);
    expect(x).toBeGreaterThanOrEqual(-180);
    expect(x).toBeLessThanOrEqual(180);
  });

  test.each(SIMBAD_RAS)(
    'is displayed as RA %s once centered on (up to the 360 wrap)',
    (ra) => {
      const center = raDecToMapCoords([ra, 41.27], flipped);
      const [shownRa, shownDec] = transformGraticuleCoords(center, flipped);
      // Wrapped to -180 -> 180 so that floating-point noise either side of 0 compares as ~0
      expect(((((shownRa - ra) % 360) + 540) % 360) - 180).toBeCloseTo(0);
      expect(shownDec).toBe(41.27);
    }
  );

  test.each(SIMBAD_RAS)(
    'gives the same position for RA %s in either convention',
    (ra) => {
      expect(raDecToMapCoords([to180(ra), 0], flipped)[0]).toBeCloseTo(
        raDecToMapCoords([ra, 0], flipped)[0]
      );
    }
  );
});

describe('raDecToMapCoords in the flipped (0 -> 360) view', () => {
  test.each([
    [187.28, -7.28],
    [266.42, -86.42],
    [359.5, -179.5],
    [10.68, 169.32],
  ])('puts RA %s at x = %s', (ra, x) => {
    expect(raDecToMapCoords([ra, 0], true)[0]).toBeCloseTo(x);
  });

  test.each(SIMBAD_RAS.filter((ra) => ra !== 0 && ra !== 180))(
    'agrees with how the flip toggle moves RA %s',
    (ra) => {
      const unflipped = raDecToMapCoords([ra, 0], false);
      expect(transformCoords(unflipped, true, 'layer')[0]).toBeCloseTo(
        raDecToMapCoords([ra, 0], true)[0]
      );
    }
  );
});
