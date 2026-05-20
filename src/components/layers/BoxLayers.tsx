import { useMemo } from 'react';
import { HighlightBoxData } from '../../hooks/useOverlayData';
import { BaselayersState } from '../../types/layers';
import {
  AddHighlightBoxLayer,
  AddHightlightBoxLayerProps,
} from './AddHighlightBoxLayer';
import { assertInternalBaselayer } from '../../reducers/baselayersReducer';
import { HighlightBoxLayer } from './HighlightBoxLayer';

type BoxLayersProps = AddHightlightBoxLayerProps &
  Omit<
    HighlightBoxData,
    'areHighlightBoxesLoading' | 'onSelectedHighlightBoxChange'
  > & {
    activeBaselayer: BaselayersState['activeBaselayer'];
  };

export function BoxLayers({
  mapRef,
  drawBoxRef,
  isDrawing,
  setIsDrawing,
  setIsNewBoxDrawn,
  flipped,
  highlightBoxes,
  activeBoxIds,
  setActiveBoxIds,
  activeBaselayer,
}: BoxLayersProps) {
  /** Creates an object of data needed by the submap endpoints to download and to add regions. Since it's 
    composed from state at this level, we must construct it here and pass it down. */
  const submapData = useMemo(() => {
    if (assertInternalBaselayer(activeBaselayer)) {
      const { layer_id, cmap, vmin, vmax, isLogScale, isAbsoluteValue } =
        activeBaselayer;
      return {
        layer_id,
        vmin,
        vmax,
        cmap,
        isLogScale,
        isAbsoluteValue,
      };
    }
  }, [activeBaselayer]);

  return (
    <>
      <HighlightBoxLayer
        mapRef={mapRef}
        highlightBoxes={highlightBoxes}
        activeBoxIds={activeBoxIds}
        setActiveBoxIds={setActiveBoxIds}
        submapData={submapData}
        flipped={flipped}
      />
      <AddHighlightBoxLayer
        mapRef={mapRef}
        drawBoxRef={drawBoxRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        setIsNewBoxDrawn={setIsNewBoxDrawn}
        submapData={submapData}
        flipped={flipped}
      />
    </>
  );
}
