import { SERVICE_URL } from '../configs/mapConfigs';
import { HistogramResponse } from '../types/histogram';
import {
  BandSummary,
  InternalBaselayer,
  LayerSummary,
  FilterMenuResponse,
  MapSummary,
  LayerResponse,
  DefaultDataResponse,
  DefaultData,
} from '../types/layers';
import { Box, BoxResponse, SubmapDataWithBounds } from '../types/submaps';
import {
  SourceGroup,
  SourceGroupResponse,
  SourceGroupSummaryResponse,
} from '../types/sources';
import { SubmapFileExtensions } from '../configs/submapConfigs';

class MapApiClient {
  private baseUrl: string;
  private cachedLayerIds = new Set<string>();
  private cmapCache = new Map<string, string>();
  private histogramCache = new Map<string, HistogramResponse>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { signal });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  /** Get initial state for app's startup */
  async getInitialState(): Promise<DefaultData> {
    // Get the default layer
    const initialState = await this.get<DefaultDataResponse>(`/layers/default`);
    const { layer, default_layer_menu } = initialState;

    let defaultLayer: InternalBaselayer | null;

    // If any nullable state is null, set defaultLayer to be null
    if (layer === null) {
      defaultLayer = null;
    } else {
      this.cachedLayerIds.add(layer.layer_id);

      // Set to undefined if 'auto' so we can know to set this value
      // with the layer's histogram response instead
      const vmin = layer.vmin === 'auto' ? undefined : layer.vmin;
      const vmax = layer.vmax === 'auto' ? undefined : layer.vmax;

      defaultLayer = {
        ...layer,
        isLogScale: false,
        isAbsoluteValue: false,
        vmin,
        vmax,
      };
    }

    return {
      defaultLayer,
      defaultMenuState: default_layer_menu,
    };
  }

  /** Get summary of maps associated with a map group */
  async getMapGroupMaps(groupId: string, signal?: AbortSignal) {
    return this.get<MapSummary[]>(`/map-groups/${groupId}/maps`, signal);
  }

  /** Get summary of bands associated with a map */
  async getMapBands(mapId: string, signal?: AbortSignal) {
    return this.get<BandSummary[]>(`/maps/${mapId}/bands`, signal);
  }

  /** Get summary of layers associated with a band */
  async getBandLayers(bandId: string, signal?: AbortSignal) {
    return this.get<LayerSummary[]>(`/bands/${bandId}/layers`, signal);
  }

  /** Get a layer's full data; uses a cache to prevent unnecessary requests */
  async getLayer(
    layerId: string,
    internalBaselayers: Map<string, InternalBaselayer> | undefined
  ) {
    const isCached = this.cachedLayerIds.has(layerId);
    if (isCached) {
      return internalBaselayers?.get(layerId);
    } else {
      this.cachedLayerIds.add(layerId);
      const newLayerData = await this.get<LayerResponse>(`/layers/${layerId}`);

      // Set to undefined if 'auto' so we can know to set this value
      // with the layer's histogram response instead
      const vmin = newLayerData.vmin === 'auto' ? undefined : newLayerData.vmin;
      const vmax = newLayerData.vmax === 'auto' ? undefined : newLayerData.vmax;

      const newLayer = {
        ...newLayerData,
        isLogScale: false,
        isAbsoluteValue: false,
        vmin,
        vmax,
      };

      return newLayer;
    }
  }

  /** Get the data of the source groups and their sources */
  async getSources(): Promise<SourceGroup[]> {
    // Get the list of source groups and unpack the response
    const sourceGroupSummaries =
      await this.get<SourceGroupSummaryResponse[]>(`/sources`);

    const fullSourceGroupsData = await Promise.all(
      // For each source group, fetch its sources and construct SourceGroup data structure
      sourceGroupSummaries.map(async (sg, idx): Promise<SourceGroup> => {
        const sourceGroup = await this.get<SourceGroupResponse>(
          `/sources/${sg.source_group_id}`
        );
        const fullData = {
          clientId: idx, // used for color mapping in legend and source markers
          ...sourceGroup,
        };
        return fullData;
      })
    );
    return fullSourceGroupsData;
  }

  async getHighlightBoxes() {
    const boxes = await this.get<BoxResponse[]>(`/highlights/boxes`);
    return boxes.map((b, idx): Box => ({ ...b, id: idx }));
  }

  /** Get histogram data; uses a cache to only fetch the data once */
  async getHistogramData(layerId: string): Promise<HistogramResponse> {
    if (this.histogramCache.has(layerId)) {
      return this.histogramCache.get(layerId)!;
    }
    const data = await this.get<HistogramResponse>(
      `/histograms/data/${layerId}`
    );
    this.histogramCache.set(layerId, data);
    return data;
  }

  /** Get cmap image; uses a cache to prevent needless server requests */
  async getCmapImage(cmap: string) {
    if (this.cmapCache.has(cmap)) {
      return this.cmapCache.get(cmap) as string;
    }
    const image = await fetch(`${this.baseUrl}/histograms/${cmap}.png`);
    this.cmapCache.set(cmap, image.url);
    return image.url;
  }

  /** Get menu state based on a search query */
  async getFilteredMenu(query: string) {
    return this.get<FilterMenuResponse>(`/search?q=${query}`);
  }

  /**
   * Downloads submap from the "select region" feature or from a box region selected in the layer menu
   * @param submapEndpointStub A stubbed string of the endpoint that contains the mapId and bandId of
   *  the active baselayer, plus the left, right, top, and bottom positions of the selected region
   * @param fileExtension One of the string literals defined in SubmapFileExtensions
   * @returns Nothing as of now
   */
  async downloadSubmap(
    submapDataWithBounds: SubmapDataWithBounds,
    fileExtension: SubmapFileExtensions,
    flip: boolean
  ) {
    // Use the submapEndpointData to construct the request endpoint
    const {
      layer_id,
      left,
      right,
      top,
      bottom,
      vmin,
      vmax,
      cmap,
      isLogScale,
      isAbsoluteValue,
    } = submapDataWithBounds;
    const endpoint = `${this.baseUrl}/layers/${layer_id}/submap/${left}/${right}/${top}/${bottom}/image.${fileExtension}?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}&log_norm=${isLogScale}&abs=${isAbsoluteValue}&flip=${flip}`;

    // Errors are intentionally left to propagate (not caught here) so
    // callers can surface them to the user -- swallowing them down here
    // used to mean a failed download just quietly stopped with no
    // visible feedback beyond a console.error.
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Error downloading the submap: ${response.status}`);
    }
    const blob = await response.blob();

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `tileviewer-submap.${fileExtension}`; // Give it a filename
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Clean up the blob URL
    window.URL.revokeObjectURL(url);
  }
}

export const mapApi = new MapApiClient(SERVICE_URL);
