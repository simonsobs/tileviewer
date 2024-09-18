import { useEffect, useState } from "react";
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

    return (
        <div className='cmap-controls-pane'>
            <select value={cmap} onChange={(e) => onCmapChange(e.target.value)}>
                {CMAP_OPTIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
            {histogramData && <ColorMapHistogram data={histogramData} />}
            <ColorMapSlider
                cmapImage={cmapImage}
                values={values}
                onCmapValuesChange={onCmapValuesChange}
            />
        </div>
    )
}