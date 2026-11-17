// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import {
  BaselayersAction,
  baselayersReducer,
  CHANGE_ABSOLUTE_VALUE,
  CHANGE_BASELAYER,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
  CHANGE_LOG_SCALE,
  CHANGE_SYNC_CMAP_VALUES,
  SET_BASELAYERS_STATE,
} from '../reducers/baselayersReducer';
import { EXTERNAL_BASELAYERS } from '../configs/mapConfigs';
import { BaselayersState } from '../types/layers';
import { HISTOGRAM_DATA, makeLayer, makeState } from './baselayerFixtures';

/** Applies the actions in order, as React does for dispatches batched in one handler */
const run = (state: BaselayersState, ...actions: BaselayersAction[]) =>
  actions.reduce(baselayersReducer, state);

const SYNC = { type: CHANGE_SYNC_CMAP_VALUES } as const;

describe('SET_BASELAYERS_STATE', () => {
  test('sets the default layer as active with an empty sync Map', () => {
    const layer = makeLayer('a');
    const state = run(makeState([]), {
      type: SET_BASELAYERS_STATE,
      defaultInternalBaselayer: layer,
      histogramData: HISTOGRAM_DATA,
    });
    expect(state.activeBaselayer).toBe(layer);
    expect(state.internalBaselayers?.get('a')).toBe(layer);
    expect(state.syncedCmapValuesByType?.size).toBe(0);
  });

  test('falls back to the first external baselayer without a default layer', () => {
    const state = run(makeState([]), {
      type: SET_BASELAYERS_STATE,
      defaultInternalBaselayer: undefined,
      histogramData: undefined,
    });
    expect(state.activeBaselayer).toBe(EXTERNAL_BASELAYERS[0]);
    expect(state.internalBaselayers?.size).toBe(0);
  });
});

describe('cmap changes on an unsynced layer', () => {
  test('CHANGE_CMAP updates the active layer and its stored copy', () => {
    const state = run(makeState([makeLayer('a')]), {
      type: CHANGE_CMAP_TYPE,
      cmap: 'plasma',
    });
    expect(state.activeBaselayer).toMatchObject({ cmap: 'plasma' });
    expect(state.internalBaselayers?.get('a')).toBe(state.activeBaselayer);
  });

  test('CHANGE_CMAP_VALUES updates vmin and vmax', () => {
    const state = run(makeState([makeLayer('a')]), {
      type: CHANGE_CMAP_VALUES,
      vmin: -5,
      vmax: 5,
    });
    expect(state.activeBaselayer).toMatchObject({ vmin: -5, vmax: 5 });
  });

  test('CHANGE_LOG_SCALE converts positive values to and from log10', () => {
    const on = run(makeState([makeLayer('a', { vmin: 10, vmax: 1000 })]), {
      type: CHANGE_LOG_SCALE,
      isLogScale: true,
    });
    expect(on.activeBaselayer).toMatchObject({
      isLogScale: true,
      vmin: 1,
      vmax: 3,
    });

    const off = run(on, { type: CHANGE_LOG_SCALE, isLogScale: false });
    expect(off.activeBaselayer).toMatchObject({ isLogScale: false });
    expect((off.activeBaselayer as { vmin: number }).vmin).toBeCloseTo(10);
    expect((off.activeBaselayer as { vmax: number }).vmax).toBeCloseTo(1000);
  });

  test('CHANGE_ABSOLUTE_VALUE clamps a negative vmin to 0', () => {
    const state = run(makeState([makeLayer('a')]), {
      type: CHANGE_ABSOLUTE_VALUE,
      isAbsoluteValue: true,
    });
    expect(state.activeBaselayer).toMatchObject({
      isAbsoluteValue: true,
      vmin: 0,
      vmax: 100,
    });
  });

  test('cmap changes do not affect other layers of the same type', () => {
    const state = run(makeState([makeLayer('a'), makeLayer('b')]), {
      type: CHANGE_CMAP_TYPE,
      cmap: 'plasma',
    });
    expect(state.internalBaselayers?.get('b')).toMatchObject({
      cmap: 'viridis',
    });
  });
});

describe('cmap change edge cases', () => {
  test('CHANGE_LOG_SCALE falls back to a 1-2 log range for non-positive values', () => {
    const state = run(makeState([makeLayer('a', { vmin: -5, vmax: 0 })]), {
      type: CHANGE_LOG_SCALE,
      isLogScale: true,
    });
    expect(state.activeBaselayer).toMatchObject({ vmin: 1, vmax: 2 });
  });

  test('CHANGE_ABSOLUTE_VALUE uses the histogram range when vmax is negative', () => {
    const state = run(makeState([makeLayer('a', { vmin: -50, vmax: -10 })]), {
      type: CHANGE_ABSOLUTE_VALUE,
      isAbsoluteValue: true,
    });
    expect(state.activeBaselayer).toMatchObject({ vmin: 0, vmax: 400 });
  });

  test('turning off CHANGE_ABSOLUTE_VALUE leaves the values as they are', () => {
    const state = run(
      makeState([makeLayer('a', { vmin: 0, vmax: 5, isAbsoluteValue: true })]),
      { type: CHANGE_ABSOLUTE_VALUE, isAbsoluteValue: false }
    );
    expect(state.activeBaselayer).toMatchObject({
      isAbsoluteValue: false,
      vmin: 0,
      vmax: 5,
    });
  });

  test.each([
    { type: CHANGE_LOG_SCALE, isLogScale: true },
    { type: CHANGE_ABSOLUTE_VALUE, isAbsoluteValue: true },
  ] as const)('$type is a no-op while vmin/vmax are unset', (action) => {
    const initial = makeState([
      makeLayer('a', { vmin: undefined, vmax: undefined }),
    ]);
    expect(run(initial, action)).toEqual(initial);
  });

  test('consecutive actions build on each other instead of the original layer', () => {
    const state = run(
      makeState([makeLayer('a')]),
      { type: CHANGE_CMAP_TYPE, cmap: 'plasma' },
      { type: CHANGE_CMAP_VALUES, vmin: 10, vmax: 1000 },
      { type: CHANGE_LOG_SCALE, isLogScale: true },
      { type: CHANGE_ABSOLUTE_VALUE, isAbsoluteValue: true }
    );
    expect(state.activeBaselayer).toMatchObject({
      cmap: 'plasma',
      vmin: 1,
      vmax: 3,
      isLogScale: true,
      isAbsoluteValue: true,
    });
  });
});

describe('syncing', () => {
  const layers = () => [
    makeLayer('a', { cmap: 'plasma', vmin: -5, vmax: 5 }),
    makeLayer('b'),
    makeLayer('c', { units: 'K' }),
    makeLayer('d', { quantity: 'Q' }),
  ];

  test('linking copies the active layer values to layers of the same type only', () => {
    const state = run(makeState(layers()), SYNC);
    const synced = { cmap: 'plasma', vmin: -5, vmax: 5 };
    expect(state.syncedCmapValuesByType?.get('uK-T')).toMatchObject(synced);
    expect(state.internalBaselayers?.get('b')).toMatchObject(synced);
    // Matching units or quantity alone isn't enough
    expect(state.internalBaselayers?.get('c')).toMatchObject({
      cmap: 'viridis',
    });
    expect(state.internalBaselayers?.get('d')).toMatchObject({
      cmap: 'viridis',
    });
  });

  test('changes while linked propagate and update the stored synced values', () => {
    const state = run(
      makeState(layers()),
      SYNC,
      { type: CHANGE_CMAP_TYPE, cmap: 'gray' },
      { type: CHANGE_CMAP_VALUES, vmin: 10, vmax: 1000 },
      { type: CHANGE_LOG_SCALE, isLogScale: true }
    );
    const expected = { cmap: 'gray', vmin: 1, vmax: 3, isLogScale: true };
    expect(state.activeBaselayer).toMatchObject(expected);
    expect(state.internalBaselayers?.get('b')).toMatchObject(expected);
    expect(state.syncedCmapValuesByType?.get('uK-T')).toMatchObject(expected);
    expect(state.internalBaselayers?.get('c')).toMatchObject({
      cmap: 'viridis',
      isLogScale: false,
    });
  });

  test('unlinking removes the type but keeps every layer at its current values', () => {
    const state = run(makeState(layers()), SYNC, SYNC);
    expect(state.syncedCmapValuesByType?.has('uK-T')).toBe(false);
    expect(state.internalBaselayers?.get('b')).toMatchObject({
      cmap: 'plasma',
    });
  });

  test('changes after unlinking only affect the active layer', () => {
    const state = run(makeState(layers()), SYNC, SYNC, {
      type: CHANGE_CMAP_TYPE,
      cmap: 'gray',
    });
    expect(state.activeBaselayer).toMatchObject({ cmap: 'gray' });
    expect(state.internalBaselayers?.get('b')).toMatchObject({
      cmap: 'plasma',
    });
  });

  test('linking is a no-op while an external baselayer is active', () => {
    const initial = {
      ...makeState(layers()),
      activeBaselayer: EXTERNAL_BASELAYERS[0],
    };
    expect(run(initial, SYNC)).toEqual(initial);
  });
});

describe('CHANGE_BASELAYER', () => {
  test('a newly fetched layer of a synced type gets the synced values', () => {
    const state = run(makeState([makeLayer('a', { cmap: 'plasma' })]), SYNC, {
      type: CHANGE_BASELAYER,
      newBaselayer: makeLayer('b'),
      histogramData: HISTOGRAM_DATA,
    });
    expect(state.activeBaselayer).toMatchObject({
      layer_id: 'b',
      cmap: 'plasma',
    });
    expect(state.internalBaselayers?.get('b')).toBe(state.activeBaselayer);
  });

  test('a newly fetched layer of an unsynced type keeps its own values', () => {
    const state = run(makeState([makeLayer('a', { cmap: 'plasma' })]), SYNC, {
      type: CHANGE_BASELAYER,
      newBaselayer: makeLayer('c', { units: 'K' }),
      histogramData: HISTOGRAM_DATA,
    });
    expect(state.activeBaselayer).toMatchObject({ cmap: 'viridis' });
  });

  test('keeps the sync Map when changing layers', () => {
    const state = run(makeState([makeLayer('a')]), SYNC, {
      type: CHANGE_BASELAYER,
      newBaselayer: makeLayer('c', { units: 'K' }),
      histogramData: HISTOGRAM_DATA,
    });
    expect(state.syncedCmapValuesByType?.has('uK-T')).toBe(true);
  });

  test('an already loaded layer is reused as is', () => {
    const b = makeLayer('b', { cmap: 'gray' });
    const state = run(makeState([makeLayer('a'), b]), {
      type: CHANGE_BASELAYER,
      newBaselayer: b,
      histogramData: HISTOGRAM_DATA,
    });
    expect(state.activeBaselayer).toBe(b);
    expect(state.internalBaselayers?.get('b')).toBe(b);
  });

  test('an external baselayer becomes active without being stored', () => {
    const state = run(makeState([makeLayer('a')]), {
      type: CHANGE_BASELAYER,
      newBaselayer: EXTERNAL_BASELAYERS[0],
    });
    expect(state.activeBaselayer).toBe(EXTERNAL_BASELAYERS[0]);
    expect(state.internalBaselayers?.size).toBe(1);
    expect(state.histogramData).toBe(HISTOGRAM_DATA);
  });
});

describe('invalid use', () => {
  test.each([
    { type: CHANGE_CMAP_TYPE, cmap: 'plasma' },
    { type: CHANGE_CMAP_VALUES, vmin: 0, vmax: 1 },
    { type: CHANGE_LOG_SCALE, isLogScale: true },
    { type: CHANGE_ABSOLUTE_VALUE, isAbsoluteValue: true },
  ] as const)(
    '$type is a no-op while an external baselayer is active',
    (action) => {
      const initial = {
        ...makeState([makeLayer('a')]),
        activeBaselayer: EXTERNAL_BASELAYERS[0],
      };
      expect(run(initial, action)).toEqual(initial);
    }
  );

  test('an unknown action throws', () => {
    expect(() =>
      run(makeState([]), {
        type: 'NOT_AN_ACTION',
      } as unknown as BaselayersAction)
    ).toThrow('Unknown action');
  });
});

describe('purity (React StrictMode calls reducers twice)', () => {
  test.each<BaselayersAction>([
    SYNC,
    { type: CHANGE_CMAP_TYPE, cmap: 'plasma' },
    { type: CHANGE_CMAP_VALUES, vmin: 1, vmax: 2 },
    { type: CHANGE_LOG_SCALE, isLogScale: true },
    { type: CHANGE_ABSOLUTE_VALUE, isAbsoluteValue: true },
    {
      type: CHANGE_BASELAYER,
      newBaselayer: makeLayer('new'),
      histogramData: HISTOGRAM_DATA,
    },
  ])(
    '$type does not mutate state and gives the same result twice',
    (action) => {
      const initial = makeState([
        makeLayer('a', { vmin: 10, vmax: 100 }),
        makeLayer('b'),
      ]);
      const snapshot = structuredClone(initial);
      const first = baselayersReducer(initial, action);
      const second = baselayersReducer(initial, action);
      expect(initial).toEqual(snapshot);
      expect(second).toEqual(first);
    }
  );
});
