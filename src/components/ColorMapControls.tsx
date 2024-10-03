import { ChangeEventHandler, MouseEventHandler, useCallback, useEffect, useState } from "react";
import { SERVICE_URL } from "../configs/mapSettings";
import { CMAP_OPTIONS } from "../configs/cmapControlSettings";
import { ColorMapSlider } from "./ColorMapSlider"
import { HistogramResponse } from "../types/maps";
import { ColorMapHistogram } from "./ColorMapHistogram";
import { CustomColorMapDialog } from "./CustomColorMapDialog";

export type ColorMapControlsProps = {
    values: number[]
    onCmapValuesChange: (values: number[]) => void;
    cmap: string;
    onCmapChange: (cmap: string) => void;
    activeLayerId: number;
}

export function ColorMapControls(props: ColorMapControlsProps) {
    const {values, onCmapValuesChange, cmap, onCmapChange, activeLayerId} = props;
    const [cmapImage, setCmapImage] = useState<undefined | string>(undefined);
    const [histogramData, setHistogramData] = useState<HistogramResponse | undefined>(undefined);
    const [showCmapSelector, setShowCmapSelector] = useState(false);
    const [showCustomDialog, setShowCustomDialog] = useState(false);
    const [cmapOptions, setCmapOptions] = useState(CMAP_OPTIONS);

    useEffect(() => {
        async function getCmapImage() {
            const image = await fetch(`${SERVICE_URL}/histograms/${cmap}.png`)
            setCmapImage(image.url);
        }
        getCmapImage();
    }, [cmap, setCmapImage])

    useEffect(() => {
        async function getHistogramData() {
            const response = await fetch(`${SERVICE_URL}/histograms/data/${activeLayerId}`)
            const data: HistogramResponse = await response.json();
            setHistogramData(data);
        }
        getHistogramData()
    }, [activeLayerId, setHistogramData])

    const onMouseEnter: MouseEventHandler = useCallback(
        () => {
            if (!showCmapSelector) {
                setShowCmapSelector(true);
            }
        }, [showCmapSelector, setShowCmapSelector]
    )

    const onMouseLeave: MouseEventHandler = useCallback(
        (e) => {
            const el = e.target as HTMLElement
            const selectEl = el.closest('select')
            if (showCmapSelector && !selectEl) {
                setShowCmapSelector(false);
            }
        }, [showCmapSelector, setShowCmapSelector]
    )

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
                            <button onClick={() => setShowCustomDialog(true)} title="Customize parameters">&#x2197;</button>
                        </>
                    }
                </div>
                {histogramData && <ColorMapHistogram data={histogramData} />}
                <ColorMapSlider
                    cmapImage={cmapImage}
                    values={values}
                    onCmapValuesChange={onCmapValuesChange}
                />
            </div>
        
        </>
    )
}