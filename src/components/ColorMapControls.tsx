import { 
    ChangeEventHandler, 
    MouseEventHandler, 
    useCallback, 
    useEffect, 
    useState, 
    useMemo 
} from "react";
import { SERVICE_URL } from "../configs/mapSettings";
import { CMAP_OPTIONS } from "../configs/cmapControlSettings";
import { ColorMapSlider } from "./ColorMapSlider"
import { HistogramResponse } from "../types/maps";
import { ColorMapHistogram } from "./ColorMapHistogram";
import { CustomColorMapDialog } from "./CustomColorMapDialog";

export type ColorMapControlsProps = {
    /** the selected or default min and max values for the slider */
    values: number[]
    /** handler to set new user-specified values for slider */
    onCmapValuesChange: (values: number[]) => void;
    /** the color map selected in the cmap selector */
    cmap: string;
    /** handler to set new color map */
    onCmapChange: (cmap: string) => void;
    /** the id of the selected map layer */
    activeLayerId: number;
    /** the units to display in the histogram range */
    units: string;
}

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
        activeLayerId,
        units,
    } = props;
    const [cmapImage, setCmapImage] = useState<undefined | string>(undefined);
    const [histogramData, setHistogramData] = useState<HistogramResponse | undefined>(undefined);
    const [showCmapSelector, setShowCmapSelector] = useState(false);
    const [showCustomDialog, setShowCustomDialog] = useState(false);
    const [cmapOptions, setCmapOptions] = useState(CMAP_OPTIONS);

    /** Fetch and set the URL to the color map image if/when cmap or its setter changes */
    useEffect(() => {
        async function getCmapImage() {
            const image = await fetch(`${SERVICE_URL}/histograms/${cmap}.png`)
            setCmapImage(image.url);
        }
        getCmapImage();
    }, [cmap, setCmapImage])

    /** Fetch and set the histogram data if/when the active layer and/or setHistogramData changes */
    useEffect(() => {
        async function getHistogramData() {
            const response = await fetch(`${SERVICE_URL}/histograms/data/${activeLayerId}`)
            const data: HistogramResponse = await response.json();
            setHistogramData(data);
        }
        getHistogramData();
    }, [activeLayerId, setHistogramData])

    /** Determines the min and max values for the range slider by comparing the
        user-controlled (or default) 'values' to the histogram's 'edges'.
        Allows for the range slider to resize itself according to min/max values
        that may extend beyond the recommended cmap settings. */
    const sliderMinAndMax = useMemo(
        () => {
            if (!histogramData) return
            const min = Math.min(...histogramData.edges, values[0]);
            const max = Math.max(...histogramData.edges, values[1]);
            return {min, max}
        }, [histogramData, values[0], values[1]]
    )

    /** Displays a <select> element for the color map when a user hovers over the histogram */
    const onMouseEnter: MouseEventHandler = useCallback(
        () => {
            if (!showCmapSelector) {
                setShowCmapSelector(true);
            }
        }, [showCmapSelector, setShowCmapSelector]
    )

    /** Hides the <select> element for the color map when a user mouses away from the histogram */
    const onMouseLeave: MouseEventHandler = useCallback(
        (e) => {
            const el = e.target as HTMLElement
            const selectEl = el.closest('select')
            if (showCmapSelector && !selectEl) {
                setShowCmapSelector(false);
            }
        }, [showCmapSelector, setShowCmapSelector]
    )

    /** Change handler for the color map <select> element */
    const handleCmapChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
        (e) => {
            onCmapChange(e.target.value);
        }, [onCmapChange]
    )

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
                className='cmap-controls-pane'
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div className="cmap-selector-container">
                    {showCmapSelector &&
                        <>
                            <label>
                                Colormap:
                                <select value={cmap} onChange={handleCmapChange}>
                                    {cmapOptions.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </label>
                            {/* Button to "pop out" the CustomColorMapDialog component; button only displays when mouse enters the histogram */}
                            <button onClick={() => setShowCustomDialog(true)} title="Customize parameters">&#x2197;</button>
                        </>
                    }
                </div>
                {histogramData && (
                    <ColorMapHistogram
                        data={histogramData}
                        userMinAndMaxValues={{min: values[0], max: values[1]}}
                    />
                )}
                {sliderMinAndMax && (
                    <ColorMapSlider
                        cmapImage={cmapImage}
                        values={values}
                        onCmapValuesChange={onCmapValuesChange}
                        units={units}
                        sliderMinAndMax={sliderMinAndMax}
                    />
                )}
            </div>
        
        </>
    )
}