import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { Range as RangeSlider, getTrackBackground } from 'react-range';
import {
  formatNumber,
  formatNumberForDisplay,
  safeLog,
} from '../utils/numberUtils';
import { ColorMapControlsProps } from './ColorMapControls';
import './styles/color-map-controls.css';

interface ColorMapSliderProps
  extends Omit<
    ColorMapControlsProps,
    | 'activeBaselayerId'
    | 'cmap'
    | 'onCmapChange'
    | 'onLogScaleChange'
    | 'onAbsoluteValueChange'
  > {
  /** The URL to the color map image */
  cmapImage?: string;
  /** The min, max, and step values for the range slider, determined by histogram's edges and
      the user's min and max setting */
  sliderAttributes: { min: number; max: number; step: number };
}

const regexToFindPercents = /\b\d+(\.\d+)?%/g;

export function ColorMapSlider(props: ColorMapSliderProps) {
  const {
    cmapImage,
    onCmapValuesChange,
    units,
    sliderAttributes,
    quantity,
    values,
    cmapRange,
    isLogScale,
    isAbsoluteValue,
  } = props;
  /**
   * Create temporary values for range slider min/max to maintain component state without setting the global state;
   * the RangeSlider has an onFinalChange handler that will set the global state once a user releases the slider handle
   */
  const [tempValues, setTempValues] = useState([values[0], values[1]]);
  const prevKeyUpHandler = useRef<(e: KeyboardEvent) => void>(null);
  const prevKeyDownHandler = useRef<(e: KeyboardEvent) => void>(null);

  const [showVminVmaxInputs, setShowVminVmaxInputs] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const vminRef = useRef<HTMLInputElement>(null);
  const vmaxRef = useRef<HTMLInputElement>(null);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!showVminVmaxInputs) {
        setShowVminVmaxInputs(true);
      }
    },
    [showVminVmaxInputs]
  );

  useEffect(() => {
    if (showVminVmaxInputs) {
      vminRef.current?.focus();
    }
  }, [showVminVmaxInputs]);

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!formRef.current) return;
      // If the click happened outside the form, close it
      if (!formRef.current.contains(e.target as Node)) {
        setShowVminVmaxInputs(false);
      }
    }

    document.addEventListener('click', handleDocClick);
    return () => {
      document.removeEventListener('click', handleDocClick);
    };
  }, []);

  const validateVminVmaxInputs = useCallback(() => {
    vminRef.current?.setCustomValidity('');
    vmaxRef.current?.setCustomValidity('');

    const vmin = parseFloat(vminRef.current?.value ?? '');
    const vmax = parseFloat(vmaxRef.current?.value ?? '');

    if (!Number.isNaN(vmin) && !Number.isNaN(vmax)) {
      if (vmin >= vmax) {
        const msg = 'vmax must be greater than vmin';
        vmaxRef.current?.setCustomValidity(msg);
      }

      // Ensure vmin and vmax are valid for isLogScale
      if (isLogScale) {
        if (vmin <= 0) {
          const msg = 'vmin must be greater than 0';
          vminRef.current?.setCustomValidity(msg);
        }

        if (vmax <= 0) {
          const msg = 'vmax must be greater than 0';
          vmaxRef.current?.setCustomValidity(msg);
        }
      }

      // isLogScale validation is generally the same as isAbsValue
      // except that 0 is valid if only isAbsValue is true
      if (!isLogScale && isAbsoluteValue) {
        if (vmin < 0) {
          const msg = 'vmin must be greater than or equal to 0';
          vminRef.current?.setCustomValidity(msg);
        }

        if (vmax < 0) {
          const msg = 'vmax must be greater than or equal to 0';
          vmaxRef.current?.setCustomValidity(msg);
        }
      }
    }
  }, [isLogScale, isAbsoluteValue]);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      const vminStr = String(formData.get('vmin'));
      const vmaxStr = String(formData.get('vmax'));

      if (vminStr.length && vmaxStr.length) {
        const vmin = parseFloat(vminStr);
        const vmax = parseFloat(vmaxStr);

        if (isLogScale) {
          onCmapValuesChange([safeLog(vmin), safeLog(vmax)]);
        } else {
          onCmapValuesChange([vmin, vmax]);
        }
        setShowVminVmaxInputs(false);
        (e.target as HTMLFormElement).reset();
      }
    },
    [onCmapValuesChange, isLogScale]
  );

  useEffect(() => {
    if (prevKeyUpHandler.current) {
      document.removeEventListener('keyup', prevKeyUpHandler.current);
    }
    if (prevKeyDownHandler.current) {
      document.removeEventListener('keydown', prevKeyDownHandler.current);
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input')) return;
      // Only set and fetch cmap settings when keyup is fired
      // so we're not fetching while keydown is firing
      switch (e.key) {
        case 'a':
          onCmapValuesChange(tempValues);
          break;
        case 'd':
          onCmapValuesChange(tempValues);
          break;
        case 'w':
          onCmapValuesChange(tempValues);
          break;
        case 's':
          onCmapValuesChange(tempValues);
          break;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input')) return;
      const stepValue = isLogScale
        ? safeLog(cmapRange) * 0.05
        : cmapRange * 0.05;
      let computedVmin = tempValues[0];
      let computedVmax = tempValues[1];

      switch (e.key) {
        case 'a':
          computedVmin -= stepValue;
          computedVmax -= stepValue;
          break;
        case 'd':
          computedVmin += stepValue;
          computedVmax += stepValue;
          break;
        case 'w':
          computedVmin -= stepValue;
          computedVmax += stepValue;
          break;
        case 's':
          computedVmin += stepValue;
          computedVmax -= stepValue;
          break;
      }

      // Do nothing if we're in log mode and either value is invalid
      if (isLogScale && (computedVmin <= 0 || computedVmax <= 0)) {
        return;
      }

      // Similarly do nothing if we're in absolute value mode and either value is invalid
      if (isAbsoluteValue && (computedVmin < 0 || computedVmax < 0)) {
        return;
      }

      // Only set new values if valid
      setTempValues([formatNumber(computedVmin), formatNumber(computedVmax)]);
    };

    document.addEventListener('keydown', handleKeyDown);
    prevKeyDownHandler.current = handleKeyDown;

    document.addEventListener('keyup', handleKeyUp);
    prevKeyUpHandler.current = handleKeyUp;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    tempValues,
    cmapRange,
    setTempValues,
    onCmapValuesChange,
    isLogScale,
    isAbsoluteValue,
  ]);

  /** Sync the temp values  */
  useEffect(() => {
    setTempValues([values[0], values[1]]);
  }, [values]);

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
    <div className="cmap-slider-container">
      {cmapImage && (
        <img
          className="histo-img"
          src={cmapImage}
          style={{
            width: `${cmapWidth}%`,
            left: `${leftThumbPosition}%`,
          }}
        />
      )}
      <RangeSlider
        draggableTrack
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
              boxShadow: '0 0 5px #bbb',
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
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onClick={onClick}
        className="cmap-values-container"
      >
        <span
          className="cmap-value vmin"
          style={{ display: !showVminVmaxInputs ? 'inline-block' : 'none' }}
        >
          {formatNumberForDisplay(
            isLogScale ? Math.pow(10, tempValues[0]) : tempValues[0],
            7
          )}
        </span>
        <span
          className="cmap-value"
          style={{ display: showVminVmaxInputs ? 'inline-block' : 'none' }}
        >
          <input
            ref={vminRef}
            required
            name="vmin"
            className="vmin-vmax-input vmin-input"
            type="text"
            placeholder="Enter vmin..."
            onInput={validateVminVmaxInputs}
            onBlur={validateVminVmaxInputs}
          />
        </span>
        <span className="cmap-label"> &lt; {rangeUnitsDisplay} &lt; </span>
        <span
          className="cmap-value"
          style={{ display: !showVminVmaxInputs ? 'inline-block' : 'none' }}
        >
          {formatNumberForDisplay(
            isLogScale ? Math.pow(10, tempValues[1]) : tempValues[1],
            7
          )}
        </span>
        <span
          className="cmap-value"
          style={{ display: showVminVmaxInputs ? 'inline-block' : 'none' }}
        >
          <input
            ref={vmaxRef}
            required
            name="vmax"
            className="vmin-vmax-input"
            type="text"
            placeholder="Enter vmax..."
            onInput={validateVminVmaxInputs}
            onBlur={validateVminVmaxInputs}
          />
        </span>
        <input type="submit" style={{ display: 'none' }} aria-hidden={true} />
      </form>
    </div>
  );
}
