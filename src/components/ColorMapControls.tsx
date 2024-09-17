import { ColorMapSlider } from "./ColorMapSlider"

type ColorMapControlsProps = {
    values: number[]
    onCmapValuesChange: (values: number[]) => void;
}

export function ColorMapControls({values, onCmapValuesChange}: ColorMapControlsProps) {
    return (
        <div className='cmap-controls-pane'>
            <ColorMapSlider
                values={values}
                onCmapValuesChange={onCmapValuesChange}
            />
        </div>
    )
}