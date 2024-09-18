import { useEffect, useState } from "react";
import { CMAP_OPTIONS, SERVER } from "../configs/settings";
import { ColorMapSlider } from "./ColorMapSlider"

type ColorMapControlsProps = {
    values: number[]
    onCmapValuesChange: (values: number[]) => void;
    cmap: string;
    onCmapChange: (cmap: string) => void;
}

export function ColorMapControls({values, onCmapValuesChange, cmap, onCmapChange}: ColorMapControlsProps) {
    const [cmapImage, setCmapImage] = useState<undefined | string>(undefined)

    useEffect(() => {
        async function getCmapImage() {
            const image = await fetch(`${SERVER}/histograms/${cmap}.png`)
            setCmapImage(image.url);
        }
        getCmapImage();
    }, [cmap])

    return (
        <div className='cmap-controls-pane'>
            <select onChange={(e) => onCmapChange(e.target.value)}>
                {CMAP_OPTIONS.map(c => (
                    <option selected={c === cmap} key={c} value={c}>{c}</option>
                ))}
            </select>
            <ColorMapSlider
                cmapImage={cmapImage}
                values={values}
                onCmapValuesChange={onCmapValuesChange}
            />
        </div>
    )
}