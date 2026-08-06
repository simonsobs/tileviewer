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
    (
      layer: InternalBaselayer | ExternalBaselayer,
      url: string | undefined,
      flip?: boolean
    ) => {
      const isInternal = assertInternalBaselayer(layer);
      // Internal layers are keyed per flip state (rather than reused via
      // source.setUrl()) so that toggling flip swaps to a distinct OL
      // layer/source/tile-cache instead of changing the URL on a shared
      // source. OL's canvas tile renderer falls back to rendering tiles
      // from a previous source key (its "stale keys" mechanism, meant to
      // avoid flashing blank tiles during smooth transitions) while the new
      // URL's tiles load -- for a flip toggle that previous content is the
      // mirror-opposite orientation, so it read as the map briefly (or, if
      // tiles are slow, not-so-briefly) showing the wrong/jumbled state.
      // Separate instances per flip state sidestep that fallback entirely,
      // and as a side effect make re-toggling to an already-visited flip
      // state instant (its tiles are still cached).
      const registryKey = isInternal
        ? `${layer.layer_id}::flip=${flip}`
        : layer.layer_id;

      if (registry.current.has(registryKey)) {
        const existing = registry.current.get(registryKey);
        const source = existing.getSource();

        if (isInternal) {
          source.setUrl(url);
        } else {
          return existing;
        }

        return existing;
      }

      if (isInternal) {
        // First request for this layer/flip combination: construct and cache it
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
            // Every internal layer's own pixel grid spans the full sky
            // (including a submap cutout's -- its array is padded out to
            // a full-sky-sized grid specifically so this holds; see
            // processing/wcs_utils.py::build_submap_wcs), so wrapping
            // (repeating the layer at +/-360 degree RA offsets to pan
            // continuously around the sky) is always meaningful here.
            wrapX: true,
          }),
        });

        registry.current.set(registryKey, newLayer);
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
