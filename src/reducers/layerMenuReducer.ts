import type {
  MapGroupMenuState,
  BandMenuState,
  MapMenuState,
  LayerSummary,
  InternalBaselayer,
  MapSummary,
  BandSummary,
} from '../types/layers';

export interface LayerMenuState {
  mapGroups: MapGroupMenuState[];
  expandedIds: Record<string, true>;
  search:
    | {
        groups: MapGroupMenuState[];
        expandedIds: Record<string, true>;
        matchedIds: Set<string>;
      }
    | undefined;
}

type Action =
  | { type: 'FETCH_MAPS'; groupId: string }
  | { type: 'LOADED_MAPS'; groupId: string; maps: MapMenuState[] }
  | { type: 'FETCH_BANDS'; groupId: string; mapId: string }
  | {
      type: 'LOADED_BANDS';
      groupId: string;
      mapId: string;
      bands: BandMenuState[];
    }
  | { type: 'FETCH_LAYERS'; groupId: string; mapId: string; bandId: string }
  | {
      type: 'LOADED_LAYERS';
      groupId: string;
      mapId: string;
      bandId: string;
      layers: LayerSummary[];
    }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'TOGGLE_EXPAND'; id: string }
  | {
      type: 'MERGE_SEARCH_SELECTION';
      layer: InternalBaselayer;
      maps: MapSummary[];
      bands: BandSummary[];
      layers: LayerSummary[];
    }
  | { type: 'SET_ACTIVE_LAYER'; layerId: string }
  | {
      type: 'SET_SEARCH_STATE';
      groups: MapGroupMenuState[] | undefined;
      expandedIds: Record<string, true> | undefined;
      matchedIds: Set<string> | undefined;
    };

export function layerMenuReducer(
  state: LayerMenuState,
  action: Action
): LayerMenuState {
  switch (action.type) {
    case 'FETCH_MAPS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id === action.groupId
            ? { ...g, maps: { status: 'loading' } }
            : g
        ),
      };

    case 'LOADED_MAPS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id === action.groupId
            ? { ...g, maps: { status: 'loaded', data: action.maps } }
            : g
        ),
        expandedIds: { ...state.expandedIds, [action.groupId]: true },
      };

    case 'FETCH_BANDS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id !== action.groupId || g.maps.status !== 'loaded'
            ? g
            : {
                ...g,
                maps: {
                  ...g.maps,
                  data: g.maps.data.map((m) =>
                    m.map_id === action.mapId
                      ? { ...m, bands: { status: 'loading' } }
                      : m
                  ),
                },
              }
        ),
      };

    case 'LOADED_BANDS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id !== action.groupId || g.maps.status !== 'loaded'
            ? g
            : {
                ...g,
                maps: {
                  ...g.maps,
                  data: g.maps.data.map((m) =>
                    m.map_id === action.mapId
                      ? {
                          ...m,
                          bands: { status: 'loaded', data: action.bands },
                        }
                      : m
                  ),
                },
              }
        ),
        expandedIds: { ...state.expandedIds, [action.mapId]: true },
      };

    case 'FETCH_LAYERS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id !== action.groupId || g.maps.status !== 'loaded'
            ? g
            : {
                ...g,
                maps: {
                  ...g.maps,
                  data: g.maps.data.map((m) =>
                    m.map_id !== action.mapId || m.bands.status !== 'loaded'
                      ? m
                      : {
                          ...m,
                          bands: {
                            ...m.bands,
                            data: m.bands.data.map((b) =>
                              b.band_id === action.bandId
                                ? { ...b, layers: { status: 'loading' } }
                                : b
                            ),
                          },
                        }
                  ),
                },
              }
        ),
      };

    case 'LOADED_LAYERS':
      return {
        ...state,
        mapGroups: state.mapGroups.map((g) =>
          g.map_group_id !== action.groupId || g.maps.status !== 'loaded'
            ? g
            : {
                ...g,
                maps: {
                  ...g.maps,
                  data: g.maps.data.map((m) =>
                    m.map_id !== action.mapId || m.bands.status !== 'loaded'
                      ? m
                      : {
                          ...m,
                          bands: {
                            ...m.bands,
                            data: m.bands.data.map((b) =>
                              b.band_id === action.bandId
                                ? {
                                    ...b,
                                    layers: {
                                      status: 'loaded',
                                      data: action.layers,
                                    },
                                  }
                                : b
                            ),
                          },
                        }
                  ),
                },
              }
        ),
        expandedIds: { ...state.expandedIds, [action.bandId]: true },
      };

    case 'TOGGLE_EXPAND':
      // If we're in search state, mutate state.search's expandedIds
      if (state.search) {
        const newExpandedState = updateExpandedState(
          state.search.expandedIds,
          action.id
        );
        return {
          ...state,
          search: {
            ...state.search,
            expandedIds: newExpandedState,
          },
        };
        // Otherwise, mutate state's expandedIds
      } else {
        const newExpandedState = updateExpandedState(
          state.expandedIds,
          action.id
        );
        return {
          ...state,
          expandedIds: newExpandedState,
        };
      }

    case 'FETCH_ERROR':
      console.error(action.message);
      return state;

    case 'SET_SEARCH_STATE':
      if (action.groups && action.matchedIds && action.expandedIds) {
        return {
          ...state,
          search: {
            groups: action.groups,
            matchedIds: action.matchedIds,
            expandedIds: action.expandedIds,
          },
        };
      } else {
        return { ...state, search: undefined };
      }

    case 'MERGE_SEARCH_SELECTION': {
      const { map_group_id, map_id, band_id } = action.layer;
      const { maps, bands, layers } = action;
      const newMapGroupState: MapGroupMenuState[] = state.mapGroups.map((g) => {
        if (g.map_group_id === map_group_id) {
          if (g.maps.status === 'loaded') {
            // if maps were already loaded, we need to spread the map groups' existing maps
            // so as not to lose deeper state
            return {
              ...g,
              maps: {
                ...g.maps,
                data: g.maps.data.map((m) => {
                  if (m.map_id === map_id) {
                    // if bands are already loaded, spread map
                    if (m.bands.status === 'loaded') {
                      return {
                        ...m,
                        bands: {
                          ...m.bands,
                          data: m.bands.data.map((b) => {
                            if (b.band_id === band_id) {
                              if (b.layers.status === 'loaded') {
                                return b;
                              } else {
                                return {
                                  ...b,
                                  layers: {
                                    status: 'loaded',
                                    data: layers,
                                  },
                                };
                              }
                            } else {
                              return b;
                            }
                          }),
                        },
                      };
                    } else {
                      // bands were not loaded, so add fetched bands and fetched layers
                      return {
                        ...m,
                        bands: {
                          status: 'loaded',
                          data: bands.map((b) => ({
                            ...b,
                            layers: {
                              status: 'loaded',
                              data: layers,
                            },
                          })),
                        },
                      };
                    }
                  } else {
                    return m;
                  }
                }),
              },
            };
          } else {
            // if maps were not previously loaded, we know that deeper data has not been fetched either
            return {
              ...g,
              maps: {
                status: 'loaded',
                data: maps.map((m) => ({
                  ...m,
                  bands: {
                    status: 'loaded',
                    data: bands.map((b) => ({
                      ...b,
                      layers: {
                        status: 'loaded',
                        data: layers,
                      },
                    })),
                  },
                })),
              },
            };
          }
        } else {
          return g;
        }
      });

      return {
        ...state,
        mapGroups: newMapGroupState,
        expandedIds: {
          ...state.expandedIds,
          [map_group_id]: true,
          [map_id]: true,
          [band_id]: true,
        },
      };
    }

    default:
      return state;
  }
}

function updateExpandedState(
  state: Record<string, true>,
  id: string
): Record<string, true> {
  if (state[id]) {
    const { [id]: _, ...remaining } = state;
    return remaining;
  } else {
    return { ...state, [id]: true };
  }
}
