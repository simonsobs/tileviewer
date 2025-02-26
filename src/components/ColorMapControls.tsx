import {
  ChangeEventHandler,
  MouseEventHandler,
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

export type ColorMapControlsProps = {
  /** the selected or default min and max values for the slider */
  values: number[];
  /** handler to set new user-specified values for slider */
  onCmapValuesChange: (values: number[]) => void;
  /** the color map selected in the cmap selector */
  cmap: string;
  /** handler to set new color map */
  onCmapChange: (cmap: string) => void;
  /** the id of the selected map baselayer */
  activeBaselayerId: number;
  /** the units to display in the histogram range */
  units?: string;
  /** the quantity to display in the histogram range */
  quantity?: string;
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
    onCmapValuesChange,
    cmap,
    onCmapChange,
    activeBaselayerId,
    units,
    quantity,
  } = props;
  const [cmapImage, setCmapImage] = useState<undefined | string>(undefined);
  const [histogramData, setHistogramData] = useState<
    HistogramResponse | undefined
  >(undefined);
  const [showCmapSelector, setShowCmapSelector] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [cmapOptions, setCmapOptions] = useState(CMAP_OPTIONS);

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
    if (!histogramData) return;
    const histogramMin = Math.min(...histogramData.edges);
    const histogramMax = Math.max(...histogramData.edges);
    const min = Math.min(histogramMin, values[0]);
    const max = Math.max(histogramMax, values[1]);
    const stepCalc =
      (Math.abs(histogramMin) + Math.abs(histogramMax)) / STEPS_DIVISOR;
    const step = stepCalc >= 1 ? Math.floor(stepCalc) : stepCalc;
    return { min, max, step };
  }, [histogramData, values]);

  /** Displays a <select> element for the color map when a user hovers over the histogram */
  const onMouseEnter: MouseEventHandler = useCallback(() => {
    if (!showCmapSelector) {
      setShowCmapSelector(true);
    }
  }, [showCmapSelector, setShowCmapSelector]);

  /** Hides the <select> element for the color map when a user mouses away from the histogram */
  const onMouseLeave: MouseEventHandler = useCallback(
    (e) => {
      const el = e.target as HTMLElement;
      const selectEl = el.closest('select');
      if (showCmapSelector && !selectEl) {
        setShowCmapSelector(false);
      }
    },
    [showCmapSelector, setShowCmapSelector]
  );

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
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="cmap-selector-container">
          {showCmapSelector && (
            <>
              <label>
                Colormap:
                <select value={cmap} onChange={handleCmapChange}>
                  {cmapOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              {/* Button to "pop out" the CustomColorMapDialog component; button only displays when mouse enters the histogram */}
              <button
                className="dialog-popout-btn"
                onClick={() => setShowCustomDialog(true)}
                title="Customize parameters"
              >
                &#x2197;
              </button>
            </>
          )}
        </div>
        {histogramData && (
          <ColorMapHistogram
            data={histogramData}
            userMinAndMaxValues={{ min: values[0], max: values[1] }}
          />
        )}
        {sliderAttributes && (
          <ColorMapSlider
            cmapImage={cmapImage}
            values={values}
            onCmapValuesChange={onCmapValuesChange}
            units={units}
            quantity={quantity}
            sliderAttributes={sliderAttributes}
          />
        )}
      </div>
    </>
  );
}
