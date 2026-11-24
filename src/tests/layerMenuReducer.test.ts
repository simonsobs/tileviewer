import { afterEach, describe, expect, test, vi } from 'vitest';
import { layerMenuReducer, LayerMenuState } from '../reducers/layerMenuReducer';
import {
  BandMenuState,
  LayerSummary,
  LoadState,
  MapGroupMenuState,
  MapMenuState,
} from '../types/layers';
import { makeLayer } from './baselayerFixtures';

type Action = Parameters<typeof layerMenuReducer>[1];

/** Applies the actions in order, as React does for dispatches batched in one handler */
const run = (state: LayerMenuState, ...actions: Action[]) =>
  actions.reduce(layerMenuReducer, state);

const IDLE = { status: 'idle' } as const;
const LOADING = { status: 'loading' } as const;
const loaded = <T>(data: T) => ({ status: 'loaded', data }) as const;

const summary = (id: string) => ({ name: id, description: '' });
const layer = (id: string): LayerSummary => ({ layer_id: id, ...summary(id) });
const band = (
  id: string,
  layers: LoadState<LayerSummary[]> = IDLE
): BandMenuState => ({ band_id: id, ...summary(id), layers });
const map = (
  id: string,
  bands: LoadState<BandMenuState[]> = IDLE
): MapMenuState => ({ map_id: id, ...summary(id), bands });
const group = (
  id: string,
  maps: LoadState<MapMenuState[]> = IDLE
): MapGroupMenuState => ({ map_group_id: id, ...summary(id), maps });

const makeMenuState = (
  mapGroups: MapGroupMenuState[],
  expandedIds: Record<string, true> = {}
): LayerMenuState => ({ mapGroups, expandedIds, search: undefined });

/** Narrows a LoadState to its data, failing the test if it isn't loaded */
function dataOf<T>(loadState: LoadState<T>): T {
  if (loadState.status !== 'loaded') {
    throw new Error(`Expected loaded, got ${loadState.status}`);
  }
  return loadState.data;
}

/** A layer the user picked from search results, located at g1 > m1 > b1 */
const SELECTED_LAYER = makeLayer('l1', {
  map_group_id: 'g1',
  map_id: 'm1',
  band_id: 'b1',
});

/** What useLayerMenu fetches for SELECTED_LAYER: every map in g1, every band in m1, the layers in b1 */
const mergeSelection = (): Action => ({
  type: 'MERGE_SEARCH_SELECTION',
  layer: SELECTED_LAYER,
  maps: ['m1', 'm2'].map((id) => ({ map_id: id, ...summary(id) })),
  bands: ['b1', 'b2'].map((id) => ({ band_id: id, ...summary(id) })),
  layers: [layer('l1'), layer('l2')],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('lazy loading the tree', () => {
  test('FETCH_MAPS marks only the target group as loading', () => {
    const other = group('g2');
    const state = run(makeMenuState([group('g1'), other]), {
      type: 'FETCH_MAPS',
      groupId: 'g1',
    });
    expect(state.mapGroups[0].maps).toEqual(LOADING);
    expect(state.mapGroups[1]).toBe(other);
  });

  test('LOADED_MAPS stores the maps and expands the group', () => {
    const maps = [map('m1'), map('m2')];
    const state = run(makeMenuState([group('g1', LOADING)], { x: true }), {
      type: 'LOADED_MAPS',
      groupId: 'g1',
      maps,
    });
    expect(state.mapGroups[0].maps).toEqual(loaded(maps));
    expect(state.expandedIds).toEqual({ x: true, g1: true });
  });

  test('FETCH_BANDS marks only the target map as loading', () => {
    const state = run(
      makeMenuState([group('g1', loaded([map('m1'), map('m2')]))]),
      { type: 'FETCH_BANDS', groupId: 'g1', mapId: 'm1' }
    );
    const [m1, m2] = dataOf(state.mapGroups[0].maps);
    expect(m1.bands).toEqual(LOADING);
    expect(m2.bands).toEqual(IDLE);
  });

  test('LOADED_BANDS stores the bands and expands the map', () => {
    const bands = [band('b1')];
    const state = run(
      makeMenuState([group('g1', loaded([map('m1', LOADING)]))]),
      {
        type: 'LOADED_BANDS',
        groupId: 'g1',
        mapId: 'm1',
        bands,
      }
    );
    expect(dataOf(state.mapGroups[0].maps)[0].bands).toEqual(loaded(bands));
    expect(state.expandedIds).toEqual({ m1: true });
  });

  test('FETCH_LAYERS marks only the target band as loading', () => {
    const state = run(
      makeMenuState([
        group('g1', loaded([map('m1', loaded([band('b1'), band('b2')]))])),
      ]),
      { type: 'FETCH_LAYERS', groupId: 'g1', mapId: 'm1', bandId: 'b1' }
    );
    const [b1, b2] = dataOf(dataOf(state.mapGroups[0].maps)[0].bands);
    expect(b1.layers).toEqual(LOADING);
    expect(b2.layers).toEqual(IDLE);
  });

  test('LOADED_LAYERS stores the layers and expands the band', () => {
    const layers = [layer('l1')];
    const state = run(
      makeMenuState([
        group('g1', loaded([map('m1', loaded([band('b1', LOADING)]))])),
      ]),
      {
        type: 'LOADED_LAYERS',
        groupId: 'g1',
        mapId: 'm1',
        bandId: 'b1',
        layers,
      }
    );
    const [b1] = dataOf(dataOf(state.mapGroups[0].maps)[0].bands);
    expect(b1.layers).toEqual(loaded(layers));
    expect(state.expandedIds).toEqual({ b1: true });
  });

  test('a full fetch sequence, as useLayerMenu dispatches it, loads and expands the path', () => {
    const state = run(
      makeMenuState([group('g1')]),
      { type: 'FETCH_MAPS', groupId: 'g1' },
      { type: 'LOADED_MAPS', groupId: 'g1', maps: [map('m1')] },
      { type: 'FETCH_BANDS', groupId: 'g1', mapId: 'm1' },
      { type: 'LOADED_BANDS', groupId: 'g1', mapId: 'm1', bands: [band('b1')] },
      { type: 'FETCH_LAYERS', groupId: 'g1', mapId: 'm1', bandId: 'b1' },
      {
        type: 'LOADED_LAYERS',
        groupId: 'g1',
        mapId: 'm1',
        bandId: 'b1',
        layers: [layer('l1')],
      }
    );
    expect(state.mapGroups).toEqual([
      group(
        'g1',
        loaded([map('m1', loaded([band('b1', loaded([layer('l1')]))]))])
      ),
    ]);
    expect(state.expandedIds).toEqual({ g1: true, m1: true, b1: true });
  });
});

describe('lazy loading edge cases', () => {
  test('FETCH_BANDS does nothing when the group’s maps are not loaded', () => {
    const initial = makeMenuState([group('g1', LOADING)]);
    const state = run(initial, {
      type: 'FETCH_BANDS',
      groupId: 'g1',
      mapId: 'm1',
    });
    expect(state.mapGroups).toEqual(initial.mapGroups);
  });

  test('FETCH_LAYERS does nothing when the map’s bands are not loaded', () => {
    const initial = makeMenuState([group('g1', loaded([map('m1', LOADING)]))]);
    const state = run(initial, {
      type: 'FETCH_LAYERS',
      groupId: 'g1',
      mapId: 'm1',
      bandId: 'b1',
    });
    expect(state.mapGroups).toEqual(initial.mapGroups);
  });

  test('actions for ids that are not in the tree leave the tree unchanged', () => {
    const initial = makeMenuState([
      group('g1', loaded([map('m1', loaded([band('b1')]))])),
    ]);
    const state = run(
      initial,
      { type: 'FETCH_MAPS', groupId: 'nope' },
      { type: 'FETCH_BANDS', groupId: 'g1', mapId: 'nope' },
      { type: 'FETCH_LAYERS', groupId: 'g1', mapId: 'm1', bandId: 'nope' }
    );
    expect(state.mapGroups).toEqual(initial.mapGroups);
  });

  test('reloading a group replaces its maps, dropping deeper loaded state', () => {
    const state = run(
      makeMenuState([group('g1', loaded([map('m1', loaded([band('b1')]))]))]),
      { type: 'LOADED_MAPS', groupId: 'g1', maps: [map('m1')] }
    );
    expect(dataOf(state.mapGroups[0].maps)[0].bands).toEqual(IDLE);
  });
});

describe('TOGGLE_EXPAND', () => {
  test('expands a collapsed node and collapses an expanded one', () => {
    const initial = makeMenuState([], { g1: true, m1: true });
    expect(
      run(initial, { type: 'TOGGLE_EXPAND', id: 'b1' }).expandedIds
    ).toEqual({ g1: true, m1: true, b1: true });
    expect(
      run(initial, { type: 'TOGGLE_EXPAND', id: 'm1' }).expandedIds
    ).toEqual({ g1: true });
  });

  test('toggling twice returns to the original expanded ids', () => {
    const initial = makeMenuState([], { g1: true });
    const toggle: Action = { type: 'TOGGLE_EXPAND', id: 'm1' };
    expect(run(initial, toggle, toggle).expandedIds).toEqual({ g1: true });
  });

  test('while searching, toggles the search tree instead of the main tree', () => {
    const initial: LayerMenuState = {
      ...makeMenuState([], { g1: true }),
      search: { groups: [], expandedIds: { g2: true }, matchedIds: new Set() },
    };
    const state = run(
      initial,
      { type: 'TOGGLE_EXPAND', id: 'g1' },
      { type: 'TOGGLE_EXPAND', id: 'g2' }
    );
    expect(state.search?.expandedIds).toEqual({ g1: true });
    expect(state.expandedIds).toEqual({ g1: true });
  });
});

describe('SET_SEARCH_STATE', () => {
  const groups = [group('g1', loaded([map('m1')]))];
  const expandedIds = { g1: true } as const;
  const matchedIds = new Set(['m1']);

  test('stores the search results without touching the main tree', () => {
    const initial = makeMenuState([group('g2')], { g2: true });
    const state = run(initial, {
      type: 'SET_SEARCH_STATE',
      groups,
      expandedIds,
      matchedIds,
    });
    expect(state.search).toEqual({ groups, expandedIds, matchedIds });
    expect(state.mapGroups).toBe(initial.mapGroups);
    expect(state.expandedIds).toBe(initial.expandedIds);
  });

  test.each([
    { groups: undefined, expandedIds, matchedIds },
    { groups, expandedIds: undefined, matchedIds },
    { groups, expandedIds, matchedIds: undefined },
    { groups: undefined, expandedIds: undefined, matchedIds: undefined },
  ])('clears the search when any part is missing (%#)', (parts) => {
    const searching = run(makeMenuState([]), {
      type: 'SET_SEARCH_STATE',
      groups,
      expandedIds,
      matchedIds,
    });
    expect(run(searching, { type: 'SET_SEARCH_STATE', ...parts }).search).toBe(
      undefined
    );
  });
});

describe('MERGE_SEARCH_SELECTION', () => {
  test('fills in an unloaded group down to the selected layer and expands its path', () => {
    const other = group('g2');
    const state = run(
      makeMenuState([group('g1'), other], { x: true }),
      mergeSelection()
    );
    const [m1] = dataOf(state.mapGroups[0].maps);
    const [b1] = dataOf(m1.bands);
    expect(b1.layers).toEqual(loaded([layer('l1'), layer('l2')]));
    expect(state.mapGroups[1]).toBe(other);
    expect(state.expandedIds).toEqual({
      x: true,
      g1: true,
      m1: true,
      b1: true,
    });
  });

  test('keeps loaded sibling maps as they are when only the selected map’s bands are missing', () => {
    const m2 = map('m2', loaded([band('b9', loaded([layer('l9')]))]));
    const state = run(
      makeMenuState([group('g1', loaded([map('m1'), m2]))]),
      mergeSelection()
    );
    const [m1, mergedM2] = dataOf(state.mapGroups[0].maps);
    expect(dataOf(dataOf(m1.bands)[0].layers)).toEqual([
      layer('l1'),
      layer('l2'),
    ]);
    expect(mergedM2).toBe(m2);
  });

  test('keeps loaded sibling bands as they are when only the selected band’s layers are missing', () => {
    const b2 = band('b2', loaded([layer('l9')]));
    const state = run(
      makeMenuState([
        group('g1', loaded([map('m1', loaded([band('b1'), b2]))])),
      ]),
      mergeSelection()
    );
    const [b1, mergedB2] = dataOf(dataOf(state.mapGroups[0].maps)[0].bands);
    expect(b1.layers).toEqual(loaded([layer('l1'), layer('l2')]));
    expect(mergedB2).toBe(b2);
  });

  test('keeps an already loaded band as it is', () => {
    const b1 = band('b1', loaded([layer('l1')]));
    const state = run(
      makeMenuState([group('g1', loaded([map('m1', loaded([b1]))]))]),
      mergeSelection()
    );
    expect(dataOf(dataOf(state.mapGroups[0].maps)[0].bands)[0]).toBe(b1);
  });

  // useLayerMenu only fetches the selected map's bands, so marking a sibling as loaded would show
  // it with the wrong bands, and expanding it would never fetch the right ones
  test('leaves unselected maps unloaded when filling in an unloaded group', () => {
    const state = run(makeMenuState([group('g1')]), mergeSelection());
    const [, m2] = dataOf(state.mapGroups[0].maps);
    expect(m2.bands).toEqual(IDLE);
  });

  // Likewise, only the selected band's layers are fetched
  test('leaves unselected bands unloaded when filling in an unloaded map', () => {
    const state = run(
      makeMenuState([group('g1', loaded([map('m1')]))]),
      mergeSelection()
    );
    const [, b2] = dataOf(dataOf(state.mapGroups[0].maps)[0].bands);
    expect(b2.layers).toEqual(IDLE);
  });
});

describe('other actions', () => {
  test('FETCH_ERROR logs the message and leaves state as it is', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const initial = makeMenuState([group('g1', LOADING)]);
    expect(run(initial, { type: 'FETCH_ERROR', message: 'boom' })).toBe(
      initial
    );
    expect(error).toHaveBeenCalledWith('boom');
  });

  test('SET_ACTIVE_LAYER is not handled and leaves state as it is', () => {
    const initial = makeMenuState([group('g1')]);
    expect(run(initial, { type: 'SET_ACTIVE_LAYER', layerId: 'l1' })).toBe(
      initial
    );
  });

  test('an unknown action leaves state as it is', () => {
    const initial = makeMenuState([group('g1')]);
    expect(run(initial, { type: 'NOPE' } as unknown as Action)).toBe(initial);
  });
});

describe('purity (React StrictMode calls reducers twice)', () => {
  test.each<Action>([
    { type: 'FETCH_MAPS', groupId: 'g2' },
    { type: 'LOADED_MAPS', groupId: 'g2', maps: [map('m9')] },
    { type: 'FETCH_BANDS', groupId: 'g1', mapId: 'm2' },
    { type: 'LOADED_BANDS', groupId: 'g1', mapId: 'm2', bands: [band('b9')] },
    { type: 'FETCH_LAYERS', groupId: 'g1', mapId: 'm1', bandId: 'b2' },
    {
      type: 'LOADED_LAYERS',
      groupId: 'g1',
      mapId: 'm1',
      bandId: 'b2',
      layers: [layer('l9')],
    },
    { type: 'TOGGLE_EXPAND', id: 'm1' },
    {
      type: 'SET_SEARCH_STATE',
      groups: [group('g1')],
      expandedIds: { g1: true },
      matchedIds: new Set(['g1']),
    },
    mergeSelection(),
  ])(
    '$type does not mutate state and gives the same result twice',
    (action) => {
      const initial = makeMenuState(
        [
          group(
            'g1',
            loaded([map('m1', loaded([band('b1'), band('b2')])), map('m2')])
          ),
          group('g2'),
        ],
        { g1: true, m1: true }
      );
      const snapshot = structuredClone(initial);
      const first = layerMenuReducer(initial, action);
      const second = layerMenuReducer(initial, action);
      expect(initial).toEqual(snapshot);
      expect(second).toEqual(first);
    }
  );
});
