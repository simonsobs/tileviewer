import { ChangeEventHandler, MouseEventHandler, useCallback, useEffect, useState } from "react";
import { SERVER } from "../configs/mapSettings";
import { CMAP_OPTIONS } from "../configs/cmapControlSettings";
import { ColorMapSlider } from "./ColorMapSlider"
import { HistogramResponse } from "../types/maps";
import { ColorMapHistogram } from "./ColorMapHistogram";

type ColorMapControlsProps = {
    values: number[]
    onCmapValuesChange: (values: number[]) => void;
    cmap: string;
    onCmapChange: (cmap: string) => void;
    activeLayerId: number;
}

export function ColorMapControls({values, onCmapValuesChange, cmap, onCmapChange, activeLayerId}: ColorMapControlsProps) {
    const [cmapImage, setCmapImage] = useState<undefined | string>(undefined);
    const [histogramData, setHistogramData] = useState<HistogramResponse | undefined>(undefined);
    const [showCmapSelector, setShowCmapSelector] = useState(false) 

    useEffect(() => {
        async function getCmapImage() {
            const image = await fetch(`${SERVER}/histograms/${cmap}.png`)
            setCmapImage(image.url);
        }
        getCmapImage();
    }, [cmap, setCmapImage])

    useEffect(() => {
        async function getHistogramData() {
            const response = await fetch(`${SERVER}/histograms/data/${activeLayerId}`)
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
        <div
            className='cmap-controls-pane'
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="cmap-selector-container">
                <select className={showCmapSelector ? undefined : 'hide'} value={cmap} onChange={handleCmapChange}>
                    {CMAP_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
            {histogramData && <ColorMapHistogram data={histogramData} />}
            <ColorMapSlider
                cmapImage={cmapImage}
                values={values}
                onCmapValuesChange={onCmapValuesChange}
            />
        </div>
    )
}