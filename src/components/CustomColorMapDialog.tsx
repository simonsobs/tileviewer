import { useCallback, useEffect, useState } from 'react';
import { ColorMapConfigChangeAction } from './ColorMapControls';
import './styles/color-map-dialog.css';
import { Dialog } from './Dialog';
import { safeLog } from '../utils/numberUtils';
import { InternalBaselayer } from '../types/layers';
import {
  CHANGE_LOG_SCALE,
  CHANGE_ABSOLUTE_VALUE,
  CHANGE_CMAP_TYPE,
  CHANGE_CMAP_VALUES,
} from '../reducers/baselayersReducer';

/**
 * TODOS/QUESTIONS:
 * 1. Should we persist in browser storage a user's custom cmap options?
 * 2. Should we also persist a user's parameters?
 */

interface Props
  extends Pick<
    InternalBaselayer,
    'cmap' | 'units' | 'isLogScale' | 'isAbsoluteValue'
  > {
  values: [number, number];
  /** Boolean to control dialog display/hide status */
  isOpen: boolean;
  /** Handler to set modal to be closed */
  closeModal: () => void;
  /** Handler that allows us to add new user-specified color maps to the histogram's <select> menu */
  setCmapOptions: (options: string[]) => void;
  /** The list of color map options used to determine whether or not to append a new color map option */
  cmapOptions: string[];
  onColorMapConfigChange: (action: ColorMapConfigChangeAction) => void;
}

export function CustomColorMapDialog({
  isOpen,
  closeModal,
  values,
  cmap,
  cmapOptions,
  setCmapOptions,
  units,
  isLogScale,
  isAbsoluteValue,
  onColorMapConfigChange,
}: Props) {
  // Create temporary values to maintain component state without setting the global state, which is only done during "Update Map"
  const [tempCmap, setTempCmap] = useState(cmap);
  const [tempValues, setTempValues] = useState<Array<string | undefined>>(
    values.map((v) => (isLogScale ? String(Math.pow(10, v)) : String(v)))
  );
  const [tempIsLogScale, setTempIsLogScale] = useState(isLogScale);
  const [tempIsAbsValue, setTempIsAbsValue] = useState(isAbsoluteValue);

  /** Sync the tempCmap with higher-level cmap state changes */
  useEffect(() => {
    setTempCmap(cmap);
  }, [cmap]);

  /** Sync the tempValues with higher-level values state changes */
  useEffect(() => {
    setTempValues(
      values.map((v) => (isLogScale ? String(Math.pow(10, v)) : String(v)))
    );
  }, [values, isLogScale]);

  /** Sync the tempIsLogScale with higher-level isLogScale state changes */
  useEffect(() => {
    setTempIsLogScale(isLogScale);
  }, [isLogScale]);

  /** Sync the tempIsAbsValue with higher-level isLogScale state changes */
  useEffect(() => {
    setTempIsAbsValue(isAbsoluteValue);
  }, [isAbsoluteValue]);

  /** Handles "submitting" the temp values set in the dialog and closes the modal */
  const handleUpdate = useCallback(() => {
    // For each input, only fire the update handler if the value changed

    if (tempCmap !== cmap) {
      onColorMapConfigChange({ type: CHANGE_CMAP_TYPE, cmap: tempCmap });
    }

    if (
      Number(tempValues[0]) !== values[0] ||
      Number(tempValues[1]) !== values[1]
    ) {
      const safeVmin = tempValues[0]
        ? isLogScale
          ? safeLog(Number(tempValues[0]))
          : Number(tempValues[0])
        : 0;
      const safeVmax = tempValues[1]
        ? isLogScale
          ? safeLog(Number(tempValues[1]))
          : Number(tempValues[1])
        : 0;
      onColorMapConfigChange({
        type: CHANGE_CMAP_VALUES,
        vmin: safeVmin,
        vmax: safeVmax,
      });
    }

    if (tempIsLogScale !== isLogScale) {
      onColorMapConfigChange({
        type: CHANGE_LOG_SCALE,
        isLogScale: tempIsLogScale,
      });
    }

    if (tempIsAbsValue !== isAbsoluteValue) {
      onColorMapConfigChange({
        type: CHANGE_ABSOLUTE_VALUE,
        isAbsoluteValue: tempIsAbsValue,
      });
    }

    // Check if tempCmap exists in cmapOptions and concat as a new option if not
    if (!cmapOptions.includes(tempCmap)) {
      setCmapOptions(cmapOptions.concat(tempCmap));
    }
    closeModal();
  }, [
    onColorMapConfigChange,
    tempCmap,
    tempValues,
    closeModal,
    cmapOptions,
    setCmapOptions,
    isLogScale,
    tempIsLogScale,
    cmap,
    values,
    tempIsAbsValue,
    isAbsoluteValue,
  ]);

  return (
    <Dialog
      dialogKey="custom-cmap-dialog"
      openDialog={isOpen}
      closeDialog={closeModal}
      headerText="Custom Colormap Parameters"
    >
      <form
        className="generic-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdate();
        }}
      >
        <label className="dialog-label">
          <span>
            Specify a{' '}
            <a
              target="_blank"
              href="https://matplotlib.org/stable/gallery/color/colormap_reference.html#colormap-reference"
            >
              matplotlib colormap option
            </a>
          </span>
          <input
            type="text"
            value={tempCmap}
            onChange={(e) => setTempCmap(e.target.value)}
          />
        </label>
        <label className="dialog-label">
          Minimum of {units}
          <input
            type="number"
            step="any"
            // Prevent user from setting the min to be more than the max
            max={tempValues[1]}
            value={tempValues[0]}
            onChange={(e) =>
              setTempValues((values) => [e.target.value, values[1]])
            }
          />
        </label>
        <label className="dialog-label">
          Maximum of {units}
          <input
            type="number"
            step="any"
            // Prevent user from setting the max to be less than the min
            min={tempValues[0]}
            value={tempValues[1]}
            onChange={(e) =>
              setTempValues((values) => [values[0], e.target.value])
            }
          />
        </label>
        <div className="cmap-toggles">
          <label className="dialog-label cmap-dialog-toggle">
            <input
              type="checkbox"
              checked={tempIsLogScale}
              onChange={(e) => setTempIsLogScale(e.target.checked)}
            />
            Log Scale
          </label>
          <label className="dialog-label cmap-dialog-toggle">
            <input
              type="checkbox"
              checked={tempIsAbsValue}
              onChange={(e) => setTempIsAbsValue(e.target.checked)}
            />
            Abs. Value
          </label>
        </div>
        <input type="submit" value="Update Map" />
      </form>
    </Dialog>
  );
}
