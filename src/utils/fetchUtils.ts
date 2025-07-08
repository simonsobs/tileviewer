import { startTransition } from 'react';
import { SERVICE_URL } from '../configs/mapSettings';
import {
  Box,
  MapMetadataResponse,
  MapMetadataResponseWithClientBand,
  MapResponse,
  Source,
  SourceListResponse,
  SubmapDataWithBounds,
} from '../types/maps';
import { SubmapFileExtensions } from '../configs/submapConfigs';
import { transformBoxes } from './layerUtils';

type SourcesResponse = {
  catalogs: SourceListResponse[];
  sources: Source[];
};

export type ProductsResponse =
  | MapMetadataResponseWithClientBand[]
  | SourcesResponse;

/**
 *
 * @param type A literal type, either 'maps' or 'sources', used to determine endpoint and TypeScript types
 * @returns A SourceResponse or an array of MapMetadataResponse
 */
export async function fetchProducts(
  type: 'maps'
): Promise<MapMetadataResponseWithClientBand[]>;
export async function fetchProducts(type: 'sources'): Promise<SourcesResponse>;
export async function fetchProducts(
  type: 'maps' | 'sources'
): Promise<ProductsResponse> {
  // Get the list of products by type and unpack the response
  const productsList: MapResponse[] | SourceListResponse[] = await (
    await fetch(`${SERVICE_URL}/${type}`)
  ).json();

  // For each product in productsList, fetch its "child" data
  const productList = await Promise.all(
    productsList.map(async (product) =>
      (await fetch(`${SERVICE_URL}/${type}/${product.id}`)).json()
    )
  );

  if (type === 'maps') {
    // Map the bands to include color map properties, initially set to the recommended values
    const bandsWithCmapValues = (productList as MapMetadataResponse[]).map(
      (m) => {
        const map = {
          ...m,
          bands: m.bands.map((b) => {
            const {
              recommended_cmap,
              recommended_cmap_min,
              recommended_cmap_max,
              ...remainingProperties
            } = b;
            return {
              ...remainingProperties,
              cmap: recommended_cmap,
              cmapValues: {
                min: recommended_cmap_min,
                max: recommended_cmap_max,
                recommendedRange: recommended_cmap_max - recommended_cmap_min,
              },
            };
          }),
        };
        return map;
      }
    );
    return bandsWithCmapValues as MapMetadataResponseWithClientBand[];
  }

  return {
    catalogs: productsList as SourceListResponse[],
    sources: productList.flat(1) as Source[],
  };
}

export async function fetchBoxes() {
  const boxes: Box[] = await (
    await fetch(`${SERVICE_URL}/highlights/boxes`)
  ).json();
  return boxes;
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
  fileExtension: SubmapFileExtensions
) {
  // Use the submapEndpointData to construct the request endpoint
  const { mapId, bandId, left, right, top, bottom, vmin, vmax, cmap } =
    submapDataWithBounds;
  const endpoint = `${SERVICE_URL}/maps/${mapId}/${bandId}/submap/${left}/${right}/${top}/${bottom}/image.${fileExtension}?cmap=${cmap}&vmin=${vmin}&vmax=${vmax}`;

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

export async function addSubmapAsBox(
  boxData: {
    params: URLSearchParams;
    top_left: number[];
    bottom_right: number[];
  },
  flipped: boolean,
  setBoxes: (boxes: Box[]) => void,
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>,
  addOptimisticHighlightBox: (action: Box) => void
) {
  const { params, top_left, bottom_right } = boxData;

  let syncedPositionForBackend = {
    top_left_ra: top_left[0],
    top_left_dec: top_left[1],
    bottom_right_ra: bottom_right[0],
    bottom_right_dec: bottom_right[1],
  };

  if (flipped) {
    syncedPositionForBackend = transformBoxes(
      {
        top_left_ra: top_left[0],
        top_left_dec: top_left[1],
        bottom_right_ra: bottom_right[0],
        bottom_right_dec: bottom_right[1],
      },
      flipped
    );
  }

  const requestBody = {
    top_left: [
      syncedPositionForBackend.top_left_ra,
      syncedPositionForBackend.top_left_dec,
    ],
    bottom_right: [
      syncedPositionForBackend.bottom_right_ra,
      syncedPositionForBackend.bottom_right_dec,
    ],
  };

  const endpoint = `${SERVICE_URL}/highlights/boxes/new?${params.toString()}`;

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const newBoxId = await response.json();

      startTransition(() => {
        addOptimisticHighlightBox({
          id: newBoxId,
          name: params.get('name') ?? '',
          description: params.get('description') ?? '',
          top_left_ra: top_left[0],
          top_left_dec: top_left[1],
          bottom_right_ra: bottom_right[0],
          bottom_right_dec: bottom_right[1],
        });
      });

      // Add the new box to the list of active boxes so that it appears as soon
      // as we process the request
      setActiveBoxIds((prevState: number[]) => [...prevState, newBoxId]);

      const boxes = await fetchBoxes();
      setBoxes(boxes);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function deleteSubmapBox(
  boxId: number,
  setBoxes: (boxes: Box[]) => void,
  setActiveBoxIds: React.Dispatch<React.SetStateAction<number[]>>
) {
  try {
    const response = await fetch(`${SERVICE_URL}/highlights/boxes/${boxId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const boxes = await fetchBoxes();
      setBoxes(boxes);
      setActiveBoxIds((prevState) => prevState.filter((id) => boxId !== id));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}
