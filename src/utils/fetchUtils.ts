import { SERVICE_URL } from "../configs/mapSettings";
import { MapMetadataResponse, MapResponse, Source, SourceListResponse } from "../types/maps";

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