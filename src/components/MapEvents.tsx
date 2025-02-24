import { useMap, useMapEvents } from 'react-leaflet';
import { getControlPaneOffsets } from '../utils/paneUtils';
import { Box } from '../types/maps';
import L, { latLng, latLngBounds } from 'leaflet';
import { useCallback } from 'react';

type MapEventsProps = {
  /** A callback function that allows us to set state for the new baselayer */
  onBaseLayerChange: (newLayer: L.TileLayer) => void;
  /** The bounds of the "select area" functionality */
  selectionBounds?: L.LatLngBounds;
  /** The "highlight" boxes available in the map legend */
  boxes?: Box[];
  /** The ids of the highlight boxes that are currently "checked" in the map legend
        and visible in the map */
  activeBoxIds: number[];
  /** Setter to add or remove box ids from the activeBoxIds state */
  setActiveBoxIds: (ids: number[]) => void;
};

/**
 * Handles applying the new position and dimensions to the overlay
 * @param map
 * @param bounds
 * @param overlayContainer
 */
function repositionOverlay(
  map: L.Map,
  bounds: L.LatLngBounds,
  overlayContainer: HTMLDivElement
) {
  const { top, left, width, height } = getControlPaneOffsets(map, bounds);
  overlayContainer.style.top = top as string;
  overlayContainer.style.left = left as string;
  overlayContainer.style.width = width as string;
  overlayContainer.style.height = height as string;
}

/**
 * Used in moveend and zoomend map events in order to compute and apply
 * new positions, width, and height for the visible box overlays.
 * @param map
 * @param boxes
 * @param activeBoxIds
 */
function repositionBoxOverlays(
  map: L.Map,
  boxes: Box[],
  activeBoxIds: number[]
) {
  activeBoxIds.forEach((id) => {
    const pane = map.getPane(`highlight-boxes-pane-${id}`);
    const box = boxes.find((b) => b.id === id);

    if (pane && box) {
      const bounds = latLngBounds(
        latLng(box.top_left_dec, box.top_left_ra),
        latLng(box.bottom_right_dec, box.bottom_right_ra)
      );
      const overlayContainer = pane.firstChild as HTMLDivElement;

      if (overlayContainer) {
        repositionOverlay(map, bounds, overlayContainer);
      }
    }
  });
}

function getBoxIdFromLayer(layer: L.Layer) {
  const paneName = layer.options.pane;
  if (paneName && paneName.includes('highlight-boxes-pane')) {
    const splitPaneName = paneName.split('-');
    return Number(splitPaneName[splitPaneName.length - 1]);
  }
}

function handleAddOrDeleteBoxOverlay(
  layer: L.Layer,
  activeBoxIds: number[],
  setActiveBoxIds: (ids: number[]) => void
) {
  const boxId = getBoxIdFromLayer(layer);
  if (boxId) {
    if (!activeBoxIds.includes(boxId)) {
      setActiveBoxIds(activeBoxIds.concat(boxId));
    } else {
      setActiveBoxIds(activeBoxIds.filter((id) => id !== boxId));
    }
  }
}

/**
 * Customizes Leaflet's generic map events
 * @param MapEventsProps
 * @returns null
 */
export function MapEvents({
  onBaseLayerChange,
  selectionBounds,
  boxes,
  activeBoxIds,
  setActiveBoxIds,
}: MapEventsProps) {
  const map = useMap();

  const positionBoxLayerPane = useCallback(
    (layer: L.Layer) => {
      const boxId = getBoxIdFromLayer(layer);

      if (!boxId) return;

      const box = boxes?.find((b) => b.id === boxId);

      if (box) {
        const bounds = latLngBounds(
          latLng(box.top_left_dec, box.top_left_ra),
          latLng(box.bottom_right_dec, box.bottom_right_ra)
        );

        const overlayContainer = map.getPane(layer.options.pane!)
          ?.firstChild as HTMLDivElement;

        repositionOverlay(map, bounds, overlayContainer);
      }
    },
    [map, boxes]
  );

  useMapEvents({
    baselayerchange: (e) => {
      onBaseLayerChange(e.layer as L.TileLayer);
    },
    moveend: () => {
      if (boxes) {
        repositionBoxOverlays(map, boxes, activeBoxIds);
      }
    },
    overlayadd: (e) => {
      handleAddOrDeleteBoxOverlay(e.layer, activeBoxIds, setActiveBoxIds);
      positionBoxLayerPane(e.layer);
    },
    overlayremove: (e) => {
      handleAddOrDeleteBoxOverlay(e.layer, activeBoxIds, setActiveBoxIds);
    },
    /** Resize the "select region" overlay if the map is zoomed while overlay is drawn */
    zoomend: () => {
      const regionControlsOverlay = map.getPane(
        'region-controls-overlay'
      ) as HTMLDivElement;
      if (
        regionControlsOverlay &&
        regionControlsOverlay.style.display === 'block' &&
        selectionBounds
      ) {
        repositionOverlay(map, selectionBounds, regionControlsOverlay);
      }

      if (boxes) {
        repositionBoxOverlays(map, boxes, activeBoxIds);
      }
    },
  });

  return null;
}
