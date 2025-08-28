import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { SERVICE_URL } from '../configs/mapSettings';
import {
  CMAP_OPTIONS,
  HISTOGRAM_SIZE_X,
  STEPS_DIVISOR,
} from '../configs/cmapControlSettings';
import { ColorMapSlider } from './ColorMapSlider';
import { HistogramResponse } from '../types/maps';
import { ColorMapHistogram } from './ColorMapHistogram';
import { CustomColorMapDialog } from './CustomColorMapDialog';
import { safeLog } from '../utils/numberUtils';
import { getAbsoluteHistogramData } from '../utils/histogramUtils';

export type ColorMapControlsProps = {
  /** the selected or default min and max values for the slider */
  values: number[];
  /** used to determine increment/decrement value for keyboard controls */
  cmapRange: number;
  /** handler to set new user-specified values for slider */
  onCmapValuesChange: (values: number[]) => void;
  /** the color map selected in the cmap selector */
  cmap: string;
  /** handler to set new color map */
  onCmapChange: (cmap: string) => void;
  /** the id of the selected map baselayer */
  activeBaselayerId: string;
  /** the units to display in the histogram range */
  units?: string;
  /** the quantity to display in the histogram range */
  quantity?: string;
  /** whether or not cmap x-axis is log scale */
  isLogScale: boolean;
  /** whether or not cmap x-axis is set to be absolute values */
  isAbsoluteValue: boolean;
  /** handler to update isLogScale state and to convert cmap values */
  onLogScaleChange: (checked: boolean) => void;
  /** handler to update isAbsoluteValue state and to set cmap values as necessary */
  onAbsoluteValueChange: (checked: boolean) => void;
};

/**
 * A component that displays the ColorMapHistogram, along with components to control the histogram
 * settings: a range slider for quick adjustments and a CustomColorMapDialog for more fine-tuned
 * adjusting.
 * @param ColorMapControlsProps
 * @returns ColorMapControls
 */
export function ColorMapControls(props: ColorMapControlsProps) {
  const {
    values,
    cmapRange,
    onCmapValuesChange,
    cmap,
    onCmapChange,
    activeBaselayerId,
    units,
    quantity,
    isLogScale,
    isAbsoluteValue,
    onLogScaleChange,
    onAbsoluteValueChange,
  } = props;
  const [cmapImage, setCmapImage] = useState<undefined | string>(undefined);
  const [histogramData, setHistogramData] = useState<
    HistogramResponse | undefined
  >(undefined);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [cmapOptions, setCmapOptions] = useState(CMAP_OPTIONS);

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

  /** Fetch and set the URL to the color map image if/when cmap or its setter changes */
  useEffect(() => {
    async function getCmapImage() {
      const image = await fetch(`${SERVICE_URL}/histograms/${cmap}.png`);
      setCmapImage(image.url);
    }
    getCmapImage();
  }, [cmap, setCmapImage]);

  /** Fetch and set the histogram data if/when the active layer and/or setHistogramData changes */
  useEffect(() => {
    async function getHistogramData() {
      const response = await fetch(
        `${SERVICE_URL}/histograms/data/${activeBaselayerId}`
      );
      const data: HistogramResponse = await response.json();
      setHistogramData(data);
    }
    getHistogramData();
  }, [activeBaselayerId, setHistogramData]);

  /** Determines the min, max, and step attributes for the range slider. Min and max are
        found by comparing the user-controlled (or default) 'values' to the histogram's 'edges',
        which allows for the range slider to resize itself according to min/max values that may 
        extend beyond the recommended cmap settings. The step attribute is the range of the
        histogram edges divided by STEPS_DIVISOR. */
  const sliderAttributes = useMemo(() => {
    if (!processedHistogramData?.edges) return;
    const min = Math.min(...processedHistogramData.edges, values[0]);
    const max = Math.max(...processedHistogramData.edges, values[1]);
    const stepCalc = (Math.abs(min) + Math.abs(max)) / STEPS_DIVISOR;

    const step = stepCalc >= 1 ? Math.floor(stepCalc) : stepCalc;

    return { min, max, step };
  }, [processedHistogramData?.edges, values, isLogScale]);

  /** Change handler for the color map <select> element */
  const handleCmapChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      onCmapChange(e.target.value);
    },
    [onCmapChange]
  );

  return (
    <>
      <CustomColorMapDialog
        isOpen={showCustomDialog}
        closeModal={() => setShowCustomDialog(false)}
        cmapOptions={cmapOptions}
        setCmapOptions={setCmapOptions}
        {...props}
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
                  onChange={(e) => onLogScaleChange(e.target.checked)}
                />
                Log
              </label>
              <label className="cmap-toggle checkbox">
                <input
                  type="checkbox"
                  checked={isAbsoluteValue}
                  onChange={(e) => onAbsoluteValueChange(e.target.checked)}
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
          userMinAndMaxValues={{ min: values[0], max: values[1] }}
        />
        {sliderAttributes && (
          <ColorMapSlider
            cmapImage={cmapImage}
            values={values}
            cmapRange={cmapRange}
            onCmapValuesChange={onCmapValuesChange}
            units={units}
            quantity={quantity}
            sliderAttributes={sliderAttributes}
            isLogScale={isLogScale}
          />
        )}
      </div>
    </>
  );
}
