import { useEffect, useState } from 'react';
import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

export function useTileLoading(mapRef: React.RefObject<Map | null>) {
  const [isLoadingTiles, setIsLoadingTiles] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let pendingTiles = 0;

    function onLoadStart() {
      pendingTiles++;
      setIsLoadingTiles(true);
    }

    function onLoadEnd() {
      pendingTiles = Math.max(0, pendingTiles - 1);
      if (pendingTiles === 0) setIsLoadingTiles(false);
    }

    // Attach to all current and future tile sources
    function bindSource(layer: TileLayer<XYZ>) {
      const source = layer.getSource();
      if (!source) return;
      source.on('tileloadstart', onLoadStart);
      source.on('tileloadend', onLoadEnd);
      source.on('tileloaderror', onLoadEnd); // don't hang on error
    }

    function unbindSource(layer: TileLayer<XYZ>) {
      const source = layer.getSource();
      if (!source) return;
      source.un('tileloadstart', onLoadStart);
      source.un('tileloadend', onLoadEnd);
      source.un('tileloaderror', onLoadEnd);
    }

    // Bind existing layers
    map.getLayers().forEach((layer) => {
      if (layer instanceof TileLayer) bindSource(layer as TileLayer<XYZ>);
    });

    // Bind layers added after mount
    const layerCollection = map.getLayers();
    layerCollection.on('add', (e) => {
      if (e.element instanceof TileLayer)
        bindSource(e.element as TileLayer<XYZ>);
    });
    layerCollection.on('remove', (e) => {
      if (e.element instanceof TileLayer)
        unbindSource(e.element as TileLayer<XYZ>);
      pendingTiles = 0;
      setIsLoadingTiles(false);
    });

    return () => {
      map.getLayers().forEach((layer) => {
        if (layer instanceof TileLayer) unbindSource(layer as TileLayer<XYZ>);
      });
      setIsLoadingTiles(false);
    };
  }, [mapRef]);

  return isLoadingTiles;
}
