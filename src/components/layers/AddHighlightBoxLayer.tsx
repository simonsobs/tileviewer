import { useState, useEffect, useRef, useCallback } from 'react';
import { NewBoxData } from '../../types/maps';
import Draw, { createBox } from 'ol/interaction/Draw.js';
import { BoxMenu } from '../BoxMenu';
import VectorLayer from 'ol/layer/Vector';
import { Map } from 'ol';
import { MapProps } from '../OpenLayersMap';
import { drawStyle } from '../../utils/layerUtils';

type AddHightlightBoxLayerProps = {
  mapRef: React.RefObject<Map | null>;
  drawBoxRef: React.RefObject<VectorLayer | null>;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  setIsNewBoxDrawn: (drawn: boolean) => void;
  submapData: MapProps['submapData'];
  flipped: boolean;
};

export function AddHighlightBoxLayer({
  mapRef,
  drawBoxRef,
  isDrawing,
  setIsDrawing,
  setIsNewBoxDrawn,
  submapData,
  flipped,
}: AddHightlightBoxLayerProps) {
  const drawRef = useRef<Draw | null>(null);
  const [newBoxData, setNewBoxData] = useState<NewBoxData | undefined>(
    undefined
  );
  const [showNewBoxMenu, setShowNewBoxMenu] = useState(false);
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
          style: drawStyle,
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
              width: boxWidth,
              height: boxHeight,
            });
          }

          setIsDrawing(false);
          setIsNewBoxDrawn(true);
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
  }, [
    mapRef,
    isDrawing,
    drawBoxRef,
    setIsDrawing,
    setIsNewBoxDrawn,
    showMenuOverlay,
  ]);

  const handleAddBoxCleanup = useCallback(() => {
    setNewBoxData(undefined);
    setIsNewBoxDrawn(false);
    const source = drawBoxRef.current?.getSource();
    if (source) {
      source.clear();
    }
  }, [setIsNewBoxDrawn, drawBoxRef]);

  return (
    <>
      {newBoxData && (
        <BoxMenu
          mapRef={mapRef}
          isNewBox={true}
          flipped={flipped}
          boxData={newBoxData}
          setShowMenu={setShowNewBoxMenu}
          showMenu={showNewBoxMenu}
          submapData={submapData}
          additionalButtons={[
            <button
              key="remove-region"
              className="map-btn menu-btn"
              onClick={handleAddBoxCleanup}
            >
              Remove Region
            </button>,
          ]}
          showMenuOverlay={showMenuOverlay}
        />
      )}
    </>
  );
}
