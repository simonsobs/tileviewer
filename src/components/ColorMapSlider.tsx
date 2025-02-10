import { useEffect, useState } from 'react';
import { Range as RangeSlider, getTrackBackground } from 'react-range';
import { formatNumberForDisplay } from '../utils/numberUtils';
import { ColorMapControlsProps } from './ColorMapControls';
import './styles/color-map-controls.css';

interface ColorMapSlideProps
  extends Omit<
    ColorMapControlsProps,
    'activeLayerId' | 'cmap' | 'onCmapChange'
  > {
  /** The URL to the color map image */
  cmapImage?: string;
  /** The min, max, and step values for the range slider, determined by histogram's edges and
      the user's min and max setting */
  sliderAttributes: { min: number; max: number; step: number };
}

const regexToFindPercents = /\b\d+(\.\d+)?%/g;

export function ColorMapSlider(props: ColorMapSlideProps) {
  /**
   * Create temporary values for range slider min/max to maintain component state without setting the global state;
   * the RangeSlider has an onFinalChange handler that will set the global state once a user releases the slider handle
   */
  const [tempValues, setTempValues] = useState([
    props.values[0],
    props.values[1],
  ]);
  const { cmapImage, onCmapValuesChange, units, sliderAttributes, quantity } =
    props;

  /** Sync the temp values  */
  useEffect(() => {
    setTempValues([props.values[0], props.values[1]]);
  }, [props.values[0], props.values[1]]);

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
    values: tempValues,
    colors: ['#ccc', '#548BF4', '#ccc'],
    min: sliderAttributes.min,
    max: sliderAttributes.max,
  });
  const [leftThumbPosition, rightThumbPosition] = trackBackground
    .match(regexToFindPercents)
    ?.map((p) => p.replace('%', ''))
    .filter((_, i) => i === 2 || i === 3) ?? [0, 100];
  const cmapWidth = Number(rightThumbPosition) - Number(leftThumbPosition);

  /** Conditionally construct the quantity + units to display in the range slider such that:
   *  1. If both are defined, it reads as 'quantity [units]'
   *  2. If only quantity is defined, it reads as 'quantity'
   *  3. If only units is defined, it reads as '[units]'
   *  4. If neither are defined, it reads as 'unknown'
   */
  const rangeUnitsDisplay = quantity
    ? quantity + (units ? ` [${units}]` : '')
    : units
      ? `[${units}]`
      : 'unknown';

  return (
    <>
      {cmapImage && (
        <img
          src={cmapImage}
          style={{
            width: `${cmapWidth}%`,
            left: `${leftThumbPosition}%`,
          }}
        />
      )}
      <RangeSlider
        min={sliderAttributes.min}
        max={sliderAttributes.max}
        step={sliderAttributes.step}
        values={tempValues}
        // Used to set component state while user is actively moving a slider "thumb"
        onChange={(values) => setTempValues(values)}
        // Used to set higher-level state once user releases the slider "thumb"
        onFinalChange={onCmapValuesChange}
        renderThumb={({ props, isDragged }) => (
          <div
            {...props}
            key={props.key}
            style={{
              ...props.style,
              height: '20px',
              width: '20px',
              borderRadius: '4px',
              backgroundColor: '#FFF',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0px 2px 6px #AAA',
            }}
          >
            <div
              style={{
                height: '10px',
                width: '3px',
                backgroundColor: isDragged ? '#548BF4' : '#CCC',
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
              height: '12px',
              display: 'flex',
              zIndex: 2,
            }}
          >
            <div
              ref={props.ref}
              style={{
                height: '5px',
                width: '100%',
                borderRadius: '4px',
                background: trackBackground,
                alignSelf: 'center',
              }}
            >
              {children}
            </div>
          </div>
        )}
      />
      <div className="cmap-values-container">
        <span className="cmap-value vmin">
          {formatNumberForDisplay(tempValues[0], 7)}
        </span>
        <span className="cmap-label"> &lt; {rangeUnitsDisplay} &lt; </span>
        <span className="cmap-value">
          {formatNumberForDisplay(tempValues[1], 7)}
        </span>
      </div>
    </>
  );
}
