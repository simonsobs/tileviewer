import { SERVICE_URL } from '../configs/mapSettings';
import { InternalBaselayer } from '../types/layers';
import { Box, BoxResponse, SubmapDataWithBounds } from '../types/submaps';
import { SourceGroup, SourceGroupResponse } from '../types/sources';
import { HistogramResponse } from '../types/histogram';
import { SubmapFileExtensions } from '../configs/submapConfigs';

const cachedLayerIds = new Set<string>();

export async function fetchInitialState() {
  // Get the default layer
  const defaultLayerData = await (
    await fetch(`${SERVICE_URL}/layers/default`)
  ).json();

  cachedLayerIds.add(defaultLayerData.layer.layer_id);

  // Set to undefined if 'auto' so we can know to set this value
  // with the layer's histogram response instead
  const vmin =
    defaultLayerData.layer.vmin === 'auto'
      ? undefined
      : defaultLayerData.layer.vmin;
  const vmax =
    defaultLayerData.layer.vmax === 'auto'
      ? undefined
      : defaultLayerData.layer.vmax;

  const defaultLayer = {
    ...defaultLayerData.layer,
    isLogScale: false,
    isAbsoluteValue: false,
    vmin,
    vmax,
  };

  return {
    defaultLayer,
    defaultMenuState: defaultLayerData.default_layer_menu,
  };
}

export async function fetchLayer(
  layerId: string,
  internalBaselayers: Map<string, InternalBaselayer> | undefined
) {
  const isCached = cachedLayerIds.has(layerId);
  if (isCached) {
    return internalBaselayers?.get(layerId);
  } else {
    const newLayerData = await (
      await fetch(`${SERVICE_URL}/layers/${layerId}`)
    ).json();

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

export async function fetchSources() {
  // Get the list of source groups and unpack the response
  const sourceGroups: SourceGroupResponse[] = await (
    await fetch(`${SERVICE_URL}/sources`)
  ).json();

  // For each source group in sourceGroups, fetch its data
  const sources = await Promise.all(
    sourceGroups.map(async (sourceGroup, idx) => {
      const data = await (
        await fetch(`${SERVICE_URL}/sources/${sourceGroup.source_group_id}`)
      ).json();
      return {
        clientId: idx, // used for color mapping in legend and source markers
        ...data,
      };
    })
  );

  return sources as SourceGroup[];
}

export async function fetchBoxes() {
  const boxes: BoxResponse[] = await (
    await fetch(`${SERVICE_URL}/highlights/boxes`)
  ).json();

  const boxesWithId: Box[] = boxes.map((b, idx) => ({ ...b, id: idx }));

  return boxesWithId;
}

/**
 * A fetch utility that downloads a submap with the "select region" feature
 * @param submapEndpointStub A stubbed string of the endpoint that contains the mapId and bandId of
 *  the active baselayer, plus the left, right, top, and bottom positions of the selected region
 * @param fileExtension One of the string literals defined in SubmapFileExtensions
 * @returns Nothing as of now
 */
export function downloadSubmap(
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
  const endpoint = `${SERVICE_URL}/maps/${layer_id}/submap/${left}/${right}/${top}/${bottom}/image.${fileExtension}?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}&log_norm=${isLogScale}&abs=${isAbsoluteValue}&flip=${flip}`;

  fetch(endpoint, { method: 'GET' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error downloading the submap: ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => {
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
    })
    .catch((error) => {
      console.error('Error downloading the file:', error);
    });
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Create a cache for cmap images
const cmapCache = new Map<string, string>();

// Get cmap image from a fetch or from the cache
export async function getCmapImage(cmap: string) {
  if (cmapCache.has(cmap)) {
    return cmapCache.get(cmap) as string;
  }

  const image = await fetch(`${SERVICE_URL}/histograms/${cmap}.png`);
  cmapCache.set(cmap, image.url);

  return image.url;
}

// Create a cache of histogram data
const histogramCache = new Map<string, HistogramResponse>();

// Get histogram data; uses a cache to only fetch the data once
export async function getHistogramData(layerId: string) {
  if (histogramCache.has(layerId)) {
    return histogramCache.get(layerId) as HistogramResponse;
  }

  const response = await fetch(`${SERVICE_URL}/histograms/data/${layerId}`);

  const data: HistogramResponse = await response.json();
  histogramCache.set(layerId, data);
  return data;
}
