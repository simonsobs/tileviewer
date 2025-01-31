import { SERVICE_URL } from "../configs/mapSettings";
import { MapMetadataResponse, MapResponse, Source, SourceListResponse } from "../types/maps";
import { SubmapFileExtensions } from "../components/AreaSelection";

type SourcesResponse = {
    catalogs: SourceListResponse[];
    sources: Source[];
}

export type ProductsResponse =
    | MapMetadataResponse[]
    | SourcesResponse;

/**
 * 
 * @param type A literal type, either 'maps' or 'sources', used to determine endpoint and TypeScript types
 * @returns A SourceResponse or an array of MapMetadataResponse
 */
export async function fetchProducts(type: 'maps'): Promise<MapMetadataResponse[]>;
export async function fetchProducts(type: 'sources'): Promise<SourcesResponse>;
export async function fetchProducts(type: 'maps' | 'sources'): Promise<ProductsResponse> {
    // Get the list of products by type and unpack the response
    const productsList: MapResponse[] | SourceListResponse[] = await (await fetch(`${SERVICE_URL}/${type}`)).json();

    // For each product in productsList, fetch its "child" data
    const productList = await Promise.all(
        productsList.map(
            async (product) => (await fetch(`${SERVICE_URL}/${type}/${product.id}`)).json()
        )
    )

    if (type === 'maps') {
        return productList as MapMetadataResponse[]
    }

    return {
        catalogs: productsList as SourceListResponse[],
        sources: productList.flat(1) as Source[],
    }
}

/**
 * A fetch utility that downloads a submap with the "select region" feature
 * @param submapEndpointStub A stubbed string of the endpoint that contains the mapId and bandId of
 *  the active baselayer, plus the left, right, top, and bottom positions of the selected region
 * @param fileExtension One of the string literals defined in SubmapFileExtensions
 * @returns Nothing as of now
 */
export function downloadSubmap(
    submapEndpointStub: string,
    fileExtension: SubmapFileExtensions,
) {
    fetch(submapEndpointStub + fileExtension, {
        method: 'GET',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error downloading the submap: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
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
    .catch(error => {
        console.error('Error downloading the file:', error);
    });
}