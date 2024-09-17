import { useState } from 'react';
import { Range as RangeSlider, getTrackBackground } from 'react-range';
import { MAX_TEMP, MIN_TEMP } from '../configs/settings';
import './styles/color-map-controls.css';

type ColorMapSlideProps = {
    values: number[];
    onCmapValuesChange: (values: number[]) => void;
}

export function ColorMapSlider(props: ColorMapSlideProps) {
    const [values, setValues] = useState([props.values[0], props.values[1]])
    const rtl = false;

    return (
        <>
            <RangeSlider
                min={MIN_TEMP}
                max={MAX_TEMP}
                values={values}
                onChange={(values) => setValues(values)}
                onFinalChange={props.onCmapValuesChange}
                rtl={rtl}
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
                      width: "100%",
                    }}
                  >
                    <div
                      ref={props.ref}
                      style={{
                        height: "5px",
                        width: "100%",
                        borderRadius: "4px",
                        background: getTrackBackground({
                          values,
                          colors: ["#ccc", "#548BF4", "#ccc"],
                          min: MIN_TEMP,
                          max: MAX_TEMP,
                          rtl,
                        }),
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