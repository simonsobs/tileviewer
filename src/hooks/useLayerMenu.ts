import { useReducer, useCallback } from 'react';
import { layerMenuReducer, LayerMenuState } from '../reducers/layerMenuReducer';
import { fetchMaps, fetchBands, fetchLayers } from '../utils/fetchUtils';
import {
  BandMenuState,
  DefaultData,
  InternalBaselayer,
  MapGroup,
  MapMenuState,
  MapGroupMenuState,
  FilterMenuResponse,
  LoadState,
} from '../types/layers';

function hydrateSearchResponse(res: MapGroup[]): MapGroupMenuState[] {
  return res.map((mapGroup) => ({
    ...mapGroup,
    maps: {
      status: 'loaded',
      data: mapGroup.maps.map((map) => ({
        ...map,
        bands: {
          status: 'loaded',
          data: map.bands.map((band) => ({
            ...band,
            layers: {
              status: 'loaded',
              data: band.layers,
            },
          })),
        },
      })),
    },
  }));
}

function extractExpandedIds(
  filteredGroups: MapGroupMenuState[]
): Record<string, true> {
  const expandedIds: Record<string, true> = {};

  for (const group of filteredGroups) {
    expandedIds[group.map_group_id] = true;
    if (group.maps.status !== 'loaded') continue;
    for (const map of group.maps.data) {
      expandedIds[map.map_id] = true;
      if (map.bands.status !== 'loaded') continue;
      for (const band of map.bands.data) {
        // Bands are only added if they have layers — terminal nodes are never expanded
        if (band.layers.status === 'loaded' && band.layers.data.length > 0) {
          expandedIds[band.band_id] = true;
        }
      }
    }
  }

  return expandedIds;
}

function buildInitialState(defaultData: DefaultData): LayerMenuState {
  const { defaultMenuState, defaultMapGroupId, defaultMapId, defaultBandId } =
    defaultData;

  const mapGroups = defaultMenuState.map(
    (mapGroup: MapGroup): MapGroupMenuState => {
      if (mapGroup.map_group_id === defaultMapGroupId) {
        const hydratedMapGroup = {
          ...mapGroup,
          maps: {
            status: 'loaded',
            data: mapGroup.maps.map((map) => {
              if (map.map_id === defaultMapId) {
                return {
                  ...map,
                  bands: {
                    status: 'loaded',
                    data: map.bands.map((band) => {
                      if (band.band_id === defaultBandId) {
                        return {
                          ...band,
                          layers: {
                            status: 'loaded',
                            data: band.layers,
                          },
                        };
                      } else {
                        return { ...band, status: 'idle' };
                      }
                    }),
                  } as LoadState<BandMenuState[]>,
                };
              } else {
                return { ...map, bands: { status: 'idle' } };
              }
            }),
          } as LoadState<MapMenuState[]>,
        };
        return hydratedMapGroup;
      } else {
        return { ...mapGroup, maps: { status: 'idle' } };
      }
    }
  );

  const expandedIds: Record<string, true> = {};

  if (defaultMapGroupId && defaultMapId && defaultBandId) {
    expandedIds[defaultMapGroupId] = true;
    expandedIds[defaultMapId] = true;
    expandedIds[defaultBandId] = true;
  }

  return {
    mapGroups,
    search: undefined,
    expandedIds,
  };
}

export function useLayerMenu(defaultData: DefaultData) {
  const [state, dispatch] = useReducer(
    layerMenuReducer,
    buildInitialState(defaultData)
  );

  const expandGroup = useCallback(
    async (groupId: string) => {
      if (state.search) {
        dispatch({ type: 'TOGGLE_EXPAND', id: groupId });
        return;
      }

      const group = state?.mapGroups.find((g) => g.map_group_id === groupId);
      if (group && group.maps.status === 'loaded') {
        dispatch({ type: 'TOGGLE_EXPAND', id: groupId });
        return;
      }
      if (!group || group.maps.status !== 'idle') return;

      dispatch({ type: 'FETCH_MAPS', groupId });
      try {
        const mapsSummary = await fetchMaps(groupId);
        const maps: MapMenuState[] = mapsSummary.map((m) => ({
          ...m,
          bands: { status: 'idle' },
        }));
        dispatch({ type: 'LOADED_MAPS', groupId, maps });
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Unknown error attempting to load maps.';
        dispatch({ type: 'FETCH_ERROR', message });
      }
    },
    [state?.mapGroups, state.search]
  );

  const expandMap = useCallback(
    async (groupId: string, mapId: string) => {
      if (state.search) {
        dispatch({ type: 'TOGGLE_EXPAND', id: mapId });
        return;
      }

      const group = state?.mapGroups.find((g) => g.map_group_id === groupId);
      if (!group || group.maps.status !== 'loaded') return;
      const map = group.maps.data.find((m) => m.map_id === mapId);
      if (map && map.bands.status === 'loaded') {
        dispatch({ type: 'TOGGLE_EXPAND', id: mapId });
        return;
      }
      if (!map || map.bands.status !== 'idle') return;
      dispatch({ type: 'FETCH_BANDS', groupId, mapId });
      try {
        const bandsSummary = await fetchBands(mapId);
        const bands: BandMenuState[] = bandsSummary.map((b) => ({
          ...b,
          layers: { status: 'idle' },
        }));
        dispatch({ type: 'LOADED_BANDS', groupId, mapId, bands });
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Unknown error attempting to load bands.';
        dispatch({ type: 'FETCH_ERROR', message });
      }
    },
    [state?.mapGroups, state.search]
  );

  const expandBand = useCallback(
    async (groupId: string, mapId: string, bandId: string) => {
      if (state.search) {
        dispatch({ type: 'TOGGLE_EXPAND', id: bandId });
        return;
      }

      const group = state?.mapGroups.find((g) => g.map_group_id === groupId);
      if (!group || group.maps.status !== 'loaded') return;
      const map = group.maps.data.find((m) => m.map_id === mapId);
      if (!map || map.bands.status !== 'loaded') return;
      const band = map.bands.data.find((b) => b.band_id === bandId);
      if (band && band.layers.status === 'loaded') {
        dispatch({ type: 'TOGGLE_EXPAND', id: bandId });
        return;
      }
      if (!band || band.layers.status !== 'idle') return;

      dispatch({ type: 'FETCH_LAYERS', groupId, mapId, bandId });
      try {
        const layers = await fetchLayers(bandId);
        dispatch({ type: 'LOADED_LAYERS', groupId, mapId, bandId, layers });
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Unknown error attempting to load layers.';

        dispatch({ type: 'FETCH_ERROR', message });
      }
    },
    [state?.mapGroups, state.search]
  );

  const setSearchState = useCallback((res: FilterMenuResponse | undefined) => {
    if (res === undefined) {
      dispatch({
        type: 'SET_SEARCH_STATE',
        groups: undefined,
        expandedIds: undefined,
        matchedIds: undefined,
      });
    } else {
      const groups = hydrateSearchResponse(res.filtered_layer_menu);
      const matchedIds = new Set(res.matched_ids);
      const expandedIds = extractExpandedIds(groups);
      dispatch({ type: 'SET_SEARCH_STATE', groups, expandedIds, matchedIds });
    }
  }, []);

  const mergeSearchSelection = useCallback(
    async (selectedLayer: InternalBaselayer) => {
      if (state.search !== undefined) {
        const maps = await fetchMaps(selectedLayer.map_group_id);
        const bands = await fetchBands(selectedLayer.map_id);
        const layers = await fetchLayers(selectedLayer.band_id);
        dispatch({
          type: 'MERGE_SEARCH_SELECTION',
          layer: selectedLayer,
          maps,
          bands,
          layers,
        });
      }
    },
    [state.search]
  );

  return {
    state,
    expandGroup,
    expandMap,
    expandBand,
    setSearchState,
    mergeSearchSelection,
  };
}
