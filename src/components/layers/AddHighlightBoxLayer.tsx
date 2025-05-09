import { useState, useEffect, useRef, useCallback } from 'react';
import { NewBoxData } from '../../types/maps';
import Draw, { createBox } from 'ol/interaction/Draw.js';
import { AddBoxDialog } from '../AddBoxDialog';
import { BoxMenu } from '../BoxMenu';
import VectorLayer from 'ol/layer/Vector';
import { Map } from 'ol';
import { MapProps } from '../OpenLayersMap';

type AddHightlightBoxLayerProps = {
  mapRef: React.RefObject<Map | null>;
  drawBoxRef: React.RefObject<VectorLayer | null>;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  submapData: MapProps['submapData'];
  setBoxes: MapProps['setBoxes'];
  setActiveBoxIds: MapProps['setActiveBoxIds'];
  addOptimisticHighlightBox: MapProps['addOptimisticHighlightBox'];
};

export function AddHighlightBoxLayer({
  mapRef,
  drawBoxRef,
  isDrawing,
  setIsDrawing,
  submapData,
  setBoxes,
  setActiveBoxIds,
  addOptimisticHighlightBox,
}: AddHightlightBoxLayerProps) {
  // const drawBoxRef = useRef<VectorLayer | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const [newBoxData, setNewBoxData] = useState<NewBoxData | undefined>(
    undefined
  );
  const [showNewBoxMenu, setShowNewBoxMenu] = useState(false);
  const [showAddBoxDialog, setShowAddBoxDialog] = useState(false);
  const [showMenuOverlay, setShowMenuOverlay] = useState(false);

  /**
   * Handles adding/removing Draw interaction in response to isDrawing state
   */
  useEffect(() => {
    const map = mapRef.current;
    const source = drawBoxRef.current?.getSource();
    if (map && source) {
      if (isDrawing) {
        source.clear();
        setNewBoxData(undefined);
        setShowNewBoxMenu(false);
        const draw = new Draw({
          source: source,
          type: 'Circle',
          geometryFunction: createBox(),
          geometryName: 'drawn-box-feature',
        });

        draw.on('drawend', (e) => {
          const extent = e.feature.getGeometry()?.getExtent();

          if (extent) {
            const [
              top_left_ra,
              bottom_right_dec,
              bottom_right_ra,
              top_left_dec,
            ] = extent;
            const topLeftBoxPosition = map.getPixelFromCoordinate([
              top_left_ra,
              top_left_dec,
            ]);
            const bottomRightBoxPosition = map.getPixelFromCoordinate([
              bottom_right_ra,
              bottom_right_dec,
            ]);
            const boxWidth = Math.abs(
              topLeftBoxPosition[0] - bottomRightBoxPosition[0]
            );
            const boxHeight = Math.abs(
              topLeftBoxPosition[1] - bottomRightBoxPosition[1]
            );
            setNewBoxData({
              top_left_ra,
              top_left_dec,
              bottom_right_ra,
              bottom_right_dec,
              top: topLeftBoxPosition[1],
              left: topLeftBoxPosition[0],
              width: boxWidth,
              height: boxHeight,
            });
          }

          setIsDrawing(false);
        });
        map.addInteraction(draw);
        drawRef.current = draw;

        map.on('pointermove', (e) => {
          const feature = map.getFeaturesAtPixel(e.pixel);
          if (feature.length) {
            const featureProperties = feature[0].getProperties();
            if ('drawn-box-feature' in featureProperties && !showMenuOverlay) {
              setShowMenuOverlay(true);
            }
          } else {
            setShowMenuOverlay(false);
          }
        });
      } else {
        if (drawRef.current) {
          map.removeInteraction(drawRef.current);
          drawRef.current = null;
          setNewBoxData(undefined);
          setShowNewBoxMenu(false);
        }
      }

      return () => {
        if (drawRef.current) {
          map.removeInteraction(drawRef.current);
          drawRef.current = null;
        }
      };
    }
  }, [mapRef.current, isDrawing]);

  const handleAddBoxCleanup = useCallback(() => {
    setNewBoxData(undefined);
    const source = drawBoxRef.current?.getSource();
    if (source) {
      source.clear();
    }
  }, [drawBoxRef.current]);

  return (
    <>
      {newBoxData && (
        <BoxMenu
          isNewBox={true}
          boxData={newBoxData}
          setShowMenu={setShowNewBoxMenu}
          showMenu={showNewBoxMenu}
          submapData={submapData}
          additionalButtons={[
            <button
              key="add-new-box"
              className="area-select-button highlight-box-button"
              onClick={() => setShowAddBoxDialog(true)}
            >
              Add as Box
            </button>,
            <button
              key="remove-region"
              className="area-select-button highlight-box-button"
              onClick={handleAddBoxCleanup}
            >
              Remove Region
            </button>,
          ]}
          showMenuOverlay={showMenuOverlay}
        />
      )}
      <AddBoxDialog
        showAddBoxDialog={showAddBoxDialog}
        setShowAddBoxDialog={setShowAddBoxDialog}
        newBoxData={newBoxData}
        setBoxes={setBoxes}
        setActiveBoxIds={setActiveBoxIds}
        addOptimisticHighlightBox={addOptimisticHighlightBox}
        handleAddBoxCleanup={handleAddBoxCleanup}
      />
    </>
  );
}
