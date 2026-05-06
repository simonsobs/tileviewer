import {
  ChangeEventHandler,
  useCallback,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {
  CMAP_OPTIONS,
  HISTOGRAM_SIZE_X,
  STEPS_DIVISOR,
} from '../configs/cmapControlSettings';
import { ColorMapSlider } from './ColorMapSlider';
import { HistogramResponse } from '../types/histogram';
import { ColorMapHistogram } from './ColorMapHistogram';
import { CustomColorMapDialog } from './CustomColorMapDialog';
import { safeLog } from '../utils/numberUtils';
import { getAbsoluteHistogramData } from '../utils/histogramUtils';
import { getCmapImage } from '../utils/fetchUtils';
import {
  BaselayersAction,
  CHANGE_LOG_SCALE,
  CHANGE_ABSOLUTE_VALUE,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
} from '../reducers/baselayersReducer';
import { InternalBaselayer } from '../types/layers';

export type ColorMapControlsProps = {
  activeBaselayer: InternalBaselayer;
  dispatchBaselayersChange: React.ActionDispatch<[BaselayersAction]>;
  /** the histogramData that is fetched/cached with each baselayer change */
  histogramData: HistogramResponse;
};

export type ColorMapConfigChangeAction =
  | {
      type: typeof CHANGE_LOG_SCALE;
      isLogScale: boolean;
    }
  | {
      type: typeof CHANGE_ABSOLUTE_VALUE;
      isAbsoluteValue: boolean;
    }
  | {
      type: typeof CHANGE_CMAP_TYPE;
      cmap: string;
    }
  | {
      type: typeof CHANGE_CMAP_VALUES;
      vmin: number;
      vmax: number;
    };

/**
 * A component that displays the ColorMapHistogram, along with components to control the histogram
 * settings: a range slider for quick adjustments and a CustomColorMapDialog for more fine-tuned
 * adjusting.
 * @param ColorMapControlsProps
 * @returns ColorMapControls
 */
export function ColorMapControls(props: ColorMapControlsProps) {
  const { activeBaselayer, dispatchBaselayersChange, histogramData } = props;

  const [cmapImage, setCmapImage] = useState<string | undefined>(undefined);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [cmapOptions, setCmapOptions] = useState(CMAP_OPTIONS);

  const { cmap, units, quantity, isLogScale, isAbsoluteValue } =
    activeBaselayer;

  // This should be set in the parent component, so let's just assert here to keep Typescript happy
  const vmin = activeBaselayer.vmin!;
  const vmax = activeBaselayer.vmax!;

  const onColorMapConfigChange = useCallback(
    (action: ColorMapConfigChangeAction) => {
      if (activeBaselayer) {
        dispatchBaselayersChange({
          ...action,
          activeBaselayer,
        });
      }
    },
    [activeBaselayer, dispatchBaselayersChange]
  );

  /**
   * Fetch or retrieve from cache the cmap image when user changes cmap selection
   */
  useEffect(() => {
    async function getImage() {
      const image = await getCmapImage(cmap);
      setCmapImage(image);
    }
    getImage();
  }, [cmap]);

  /** Processes the histogram data so that it's ready to create the polygon in ColorMapHistogram  */
  const processedHistogramData = useMemo(() => {
    if (histogramData) {
      let finalEdges;
      let finalHistogram;

      if (isLogScale && !isAbsoluteValue) {
        // Find where the first edge is positive
        const sliceStartingIndex = histogramData.edges.findIndex((v) => v > 0);
        // Use the found index to slice edge array into a new array of only positive values
        const positiveEdges = histogramData.edges.slice(sliceStartingIndex);
        // Transform edge values into log values
        finalEdges = positiveEdges.map(safeLog);

        // Slice the histogram data at the same point to make a new array
        const slicedHistogram =
          histogramData.histogram.slice(sliceStartingIndex);
        // Transform histogram values into log values
        finalHistogram = slicedHistogram.map(safeLog);
      } else if (isLogScale && isAbsoluteValue) {
        const absData = getAbsoluteHistogramData(
          histogramData.edges,
          histogramData.histogram
        );
        finalEdges = absData.edges.map(safeLog);
        finalHistogram = absData.histogram.map(safeLog);
      } else if (!isLogScale && isAbsoluteValue) {
        const absData = getAbsoluteHistogramData(
          histogramData.edges,
          histogramData.histogram
        );
        finalEdges = absData.edges;
        finalHistogram = absData.histogram.map(safeLog);
      } else {
        // Edges are unchanged if isLogScale and isAbsoluteValue are both false
        finalEdges = histogramData.edges;
        // Transform all of the histogram values into log values
        finalHistogram = histogramData.histogram.map(safeLog);
      }

      return {
        edges: finalEdges,
        histogram: finalHistogram,
        band_id: histogramData.band_id,
      };
    }
  }, [histogramData, isLogScale, isAbsoluteValue]);

  /** Determines the min, max, and step attributes for the range slider. Min and max are
        found by comparing the user-controlled (or default) 'values' to the histogram's 'edges',
        which allows for the range slider to resize itself according to min/max values that may 
        extend beyond the recommended cmap settings. The step attribute is the range of the
        histogram edges divided by STEPS_DIVISOR. */
  const sliderAttributes = useMemo(() => {
    if (!processedHistogramData?.edges) return;
    const min = Math.min(...processedHistogramData.edges, vmin);
    const max = Math.max(...processedHistogramData.edges, vmax);
    const stepCalc = (Math.abs(min) + Math.abs(max)) / STEPS_DIVISOR;

    const step = stepCalc >= 1 ? Math.floor(stepCalc) : stepCalc;

    return { min, max, step };
  }, [processedHistogramData?.edges, vmin, vmax]);

  /** Change handler for the color map <select> element */
  const handleCmapChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      onColorMapConfigChange({ type: CHANGE_CMAP_TYPE, cmap: e.target.value });
    },
    [onColorMapConfigChange]
  );

  const onCmapValuesChange = useCallback(
    (vals: number[]) => {
      onColorMapConfigChange({
        type: CHANGE_CMAP_VALUES,
        vmin: vals[0],
        vmax: vals[1],
      });
    },
    [onColorMapConfigChange]
  );

  const shouldDisableLog = vmin <= 0;

  return (
    <>
      <CustomColorMapDialog
        isOpen={showCustomDialog}
        closeModal={() => setShowCustomDialog(false)}
        cmapOptions={cmapOptions}
        setCmapOptions={setCmapOptions}
        values={[vmin, vmax]}
        cmap={cmap}
        units={units}
        isLogScale={isLogScale}
        isAbsoluteValue={isAbsoluteValue}
        onColorMapConfigChange={onColorMapConfigChange}
      />
      <div
        className="cmap-controls-pane"
        // The width of the controls pane should equal the HISTOGRAM_SIZE_X constant set in
        // cmapControlSettings.ts, so let's just use an inline style for easier maintenance.
        style={{ width: `${HISTOGRAM_SIZE_X}px` }}
      >
        <div className="cmap-values-container static-cmap-controls">
          <div className="cmap-inputs">
            <select
              className="cmap-select"
              title="Select a colormap"
              value={cmap}
              onChange={handleCmapChange}
            >
              {cmapOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="cmap-toggles">
              <label className="cmap-toggle checkbox">
                <input
                  type="checkbox"
                  checked={isLogScale}
                  onChange={(e) =>
                    onColorMapConfigChange({
                      type: CHANGE_LOG_SCALE,
                      isLogScale: e.target.checked,
                    })
                  }
                  disabled={shouldDisableLog}
                  title={
                    shouldDisableLog
                      ? 'Disabled due to a non-positive vmin value.'
                      : undefined
                  }
                />
                Log
              </label>
              <label className="cmap-toggle checkbox">
                <input
                  type="checkbox"
                  checked={isAbsoluteValue}
                  onChange={(e) =>
                    onColorMapConfigChange({
                      type: CHANGE_ABSOLUTE_VALUE,
                      isAbsoluteValue: e.target.checked,
                    })
                  }
                />
                Abs.
              </label>
            </div>
          </div>
          {/* Button to "pop out" the CustomColorMapDialog component; button only displays when mouse enters the histogram */}
          <button
            className="dialog-popout-btn"
            onClick={() => setShowCustomDialog(true)}
            title="Customize parameters"
          >
            &#x2197;
          </button>
        </div>
        <ColorMapHistogram
          data={processedHistogramData}
          userMinAndMaxValues={{ min: vmin, max: vmax }}
        />
        {sliderAttributes && (
          <ColorMapSlider
            cmapImage={cmapImage}
            vmin={vmin}
            vmax={vmax}
            cmapRange={vmax - vmin}
            onCmapValuesChange={onCmapValuesChange}
            units={units}
            quantity={quantity}
            sliderAttributes={sliderAttributes}
            isLogScale={isLogScale}
            isAbsoluteValue={isAbsoluteValue}
          />
        )}
      </div>
    </>
  );
}
