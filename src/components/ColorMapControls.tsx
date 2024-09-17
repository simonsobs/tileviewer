import { CMAP_OPTIONS } from "../configs/settings";
import { ColorMapSlider } from "./ColorMapSlider"

type ColorMapControlsProps = {
    values: number[]
    onCmapValuesChange: (values: number[]) => void;
    cmap: string;
    onCmapChange: (cmap: string) => void;
}

export function ColorMapControls({values, onCmapValuesChange, cmap, onCmapChange}: ColorMapControlsProps) {
    return (
        <div className='cmap-controls-pane'>
            <select onChange={(e) => onCmapChange(e.target.value)}>
                {CMAP_OPTIONS.map(c => (
                    <option selected={c === cmap} key={c} value={c}>{c}</option>
                ))}
            </select>
            <ColorMapSlider
                values={values}
                onCmapValuesChange={onCmapValuesChange}
            />
        </div>
    )
}