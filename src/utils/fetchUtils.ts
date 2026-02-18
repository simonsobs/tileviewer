import { SERVICE_URL } from '../configs/mapSettings';
import {
  Box,
  BoxResponse,
  InternalBaselayer,
  MapGroupResponse,
  SourceGroup,
  SourceGroupResponse,
  SubmapDataWithBounds,
  HistogramResponse,
} from '../types/maps';
import { SubmapFileExtensions } from '../configs/submapConfigs';

export async function fetchMaps() {
  // Get the list of map groups and unpack the response
  const mapGroups: MapGroupResponse[] = await (
    await fetch(`${SERVICE_URL}/maps`)
  ).json();

  const internalBaselayers: InternalBaselayer[] = [];

  mapGroups.forEach((mapGroup) => {
    mapGroup.maps.forEach((map) =>
      map.bands.forEach((band) =>
        band.layers.forEach((layer) => {
          // Set to undefined if 'auto' so we can know to set this value
          // with the layer's histogram response instead
          const vmin = layer.vmin === 'auto' ? undefined : layer.vmin;
          const vmax = layer.vmax === 'auto' ? undefined : layer.vmax;

          const internalBaselayer: InternalBaselayer = {
            ...layer,
            mapId: map.map_id,
            bandId: band.band_id,
            isLogScale: false,
            isAbsoluteValue: false,
            vmin,
            vmax,
          };
          internalBaselayers.push(internalBaselayer);
        })
      )
    );
  });

  return {
    mapGroups,
    internalBaselayers,
  };
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
