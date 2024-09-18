import { useState } from 'react';
import { Range as RangeSlider, getTrackBackground } from 'react-range';
import { MAX_TEMP, MIN_TEMP } from '../configs/cmapControlSettings';
import './styles/color-map-controls.css';

type ColorMapSlideProps = {
    values: number[];
    onCmapValuesChange: (values: number[]) => void;
    cmapImage?: string;
}

const regexToFindPercents = /\b\d+(\.\d+)?%/g;

export function ColorMapSlider(props: ColorMapSlideProps) {
    const [values, setValues] = useState([props.values[0], props.values[1]])
    const { cmapImage, onCmapValuesChange } = props;

    /** 
     * The getTrackBackground react-range function returns a string with a CSS gradient that
     * is used to determine thumb positions. The thumb positions are determined by parsing
     * the gradient string for percentages, then by removing the percentage sign.
     * 
     * The thumb positions can then be used to determine:
     *   1. the width of the cmap image which is equal to the distance between the thumbs
     *   2. the left offset which is equal to the relative position of the left thumb
     * 
     * Note that the thumb positions default to 0% and 100% if the position logic craps out,
     * which would result in the cmap image spanning the full length of the range slider.
    */
    const trackBackground = getTrackBackground({
            values,
            colors: ["#ccc", "#548BF4", "#ccc"],
            min: MIN_TEMP,
            max: MAX_TEMP,
        })
    const [ leftThumbPosition, rightThumbPosition ] = trackBackground
        .match(regexToFindPercents)?.map(p => p.replace('%', ''))
        .filter((_, i) => (i === 2 || i === 3)) ?? [0, 100];
    const cmapWidth = Number(rightThumbPosition) - Number(leftThumbPosition);

    return (
        <>
            <RangeSlider
                min={MIN_TEMP}
                max={MAX_TEMP}
                values={values}
                onChange={(values) => setValues(values)}
                onFinalChange={onCmapValuesChange}
                renderThumb={({ props, isDragged }) => (
                    <div
                    {...props}
                    key={props.key}
                    style={{
                      ...props.style,
                      height: "20px",
                      width: "20px",
                      borderRadius: "4px",
                      backgroundColor: "#FFF",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      boxShadow: "0px 2px 6px #AAA",
                    }}
                  >
                    <div
                      style={{
                        height: "10px",
                        width: "3px",
                        backgroundColor: isDragged ? "#548BF4" : "#CCC",
                      }}
                    />
                  </div>
                )}
                renderTrack={({ props, children }) => (
                    <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    style={{
                      ...props.style,
                      height: "25px",
                      display: "flex",
                    }}
                  >
                    {cmapImage && (
                        <img
                            src={cmapImage}
                            style={{
                                width: `${cmapWidth}%`,
                                left: `${leftThumbPosition}%`,
                            }}
                        />
                    )}
                    <div
                      ref={props.ref}
                      style={{
                        height: "5px",
                        width: "100%",
                        borderRadius: "4px",
                        background: trackBackground,
                        alignSelf: "center",
                      }}
                    >
                      {children}
                    </div>
                  </div>
                )}
            />
            <div className="cmap-values-container">
                <span className="cmap-value vmin">{values[0]}</span>
                <span className="cmap-label"> &lt; T [&mu;K] &lt; </span>
                <span className="cmap-value">{values[1]}</span>
            </div>
        </>
    )
}