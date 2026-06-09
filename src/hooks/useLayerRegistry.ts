import { useRef, useCallback, useEffect } from 'react';
import { TileGrid } from 'ol/tilegrid';
import { Tile as TileLayer } from 'ol/layer';
import { XYZ } from 'ol/source';
import { EXTERNAL_BASELAYERS } from '../configs/mapConfigs';
import { getBaselayerResolutions } from '../utils/layerUtils';
import { ExternalBaselayer, InternalBaselayer } from '../types/layers';
import { assertInternalBaselayer } from '../reducers/baselayersReducer';

export function useLayerRegistry() {
  const registry = useRef(new Map()); // layerId -> TileLayer

  // Create and set external baselayers once
  useEffect(() => {
    EXTERNAL_BASELAYERS.forEach((b) => {
      registry.current.set(
        b.layer_id,
        new TileLayer({
          properties: { id: b.layer_id },
          source: new XYZ({
            url: typeof b.url === 'string' ? b.url : undefined,
            tileUrlFunction: typeof b.url !== 'string' ? b.url : undefined,
            projection: b.projection,
            tileGrid: new TileGrid({
              extent: b.extent,
              resolutions: getBaselayerResolutions(
                b.extent[2] - b.extent[0],
                256,
                b.maxZoom
              ),
              origin: [b.extent[0], b.extent[3]],
            }),
            wrapX: true,
          }),
        })
      );
    });
  }, []);

  const getOrCreateLayer = useCallback(
    (layer: InternalBaselayer | ExternalBaselayer, url: string | undefined) => {
      const isInternal = assertInternalBaselayer(layer);

      if (registry.current.has(layer.layer_id)) {
        const existing = registry.current.get(layer.layer_id);
        const source = existing.getSource();

        if (isInternal) {
          source.setUrl(url);
        } else {
          return existing;
        }

        return existing;
      }

      if (isInternal) {
        // First request for this layer: construct and cache it
        const newLayer = new TileLayer({
          properties: { id: 'baselayer-' + layer.layer_id },
          source: new XYZ({
            url,
            tileGrid: new TileGrid({
              extent: [-180, -90, 180, 90],
              origin: [-180, 90],
              tileSize: layer.tile_size,
              resolutions: getBaselayerResolutions(
                180,
                layer.tile_size,
                layer.number_of_levels - 1
              ),
            }),
            interpolate: false,
            projection: 'EPSG:4326',
            tilePixelRatio: layer.tile_size / 256,
          }),
        });

        registry.current.set(layer.layer_id, newLayer);
        return newLayer;
      }
    },
    []
  );

  const getLayer = useCallback((layerId: string) => {
    return registry.current.get(layerId) ?? null;
  }, []);

  return { getOrCreateLayer, getLayer, registry };
}
