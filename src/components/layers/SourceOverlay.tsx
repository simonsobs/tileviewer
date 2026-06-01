import { useRef, useEffect } from 'react';
import { Map, Overlay } from 'ol';
import {
  createSourcePopupContent,
  transformFeatureCoords,
} from '../../utils/layerUtils';
import { SourceData } from '../../types/sources';

export type SourcePopupData = SourceData & {
  offsetX: number;
  offsetY: number;
};

type SourceOverlayProps = {
  mapRef: React.RefObject<Map | null>;
  flipped: boolean;
  sourcePopupData: SourcePopupData | undefined;
};

export function SourceOverlay({
  mapRef,
  flipped,
  sourcePopupData,
}: SourceOverlayProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const popupOverlayRef = useRef<Overlay | null>(null);

  // Set up popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const popupElement = document.createElement('div');
    popupElement.className = 'source-popup';
    popupRef.current = popupElement;

    // Add popup overlay
    const popupOverlay = new Overlay({
      element: popupElement,
    });
    popupOverlayRef.current = popupOverlay;
    map.addOverlay(popupOverlay);

    return () => {
      map.removeOverlay(popupOverlay);
    };
  }, [mapRef]);

  useEffect(() => {
    const popupOverlay = popupOverlayRef.current;
    const popupElement = popupRef.current;
    if (!popupOverlay || !popupElement) return;
    if (!sourcePopupData) {
      popupOverlay.setPosition(undefined);
      popupElement.innerHTML = '';
    } else {
      const popupCoords = popupOverlay.getPosition();
      const newRa = flipped
        ? sourcePopupData.ra < 0
          ? sourcePopupData.ra + 360
          : sourcePopupData.ra
        : sourcePopupData.ra;
      if (
        popupCoords &&
        sourcePopupData.offsetX === popupCoords[0] &&
        sourcePopupData.dec === popupCoords[1]
      ) {
        console.log('sync overlay position');
        popupOverlay.setPosition([newRa, sourcePopupData.dec]);
      } else {
        popupOverlay.setPosition([
          sourcePopupData.offsetX,
          sourcePopupData.dec,
        ]);
      }
      createSourcePopupContent(popupElement, { ...sourcePopupData, ra: newRa });
    }
  }, [sourcePopupData, flipped]);

  return null;
}
