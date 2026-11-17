import { useCallback, useMemo, useState } from 'react';
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

/** Converts stored vmin/vmax values into the linear strings displayed in the dialog's inputs */
function toDisplayValues(values: [number, number], isLogScale: boolean) {
  return values.map((v) => String(isLogScale ? Math.pow(10, v) : v));
}

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
  /** Whether the layer's color mapping is synced across layers with the same 'units-quantity' combination */
  isLinked: boolean;
  onColorMapConfigChange: (action: ColorMapConfigChangeAction) => void;
  /** Handler that toggles syncing of the layer's color mapping */
  onSyncCmapValuesChange: () => void;
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
  isLinked,
  onColorMapConfigChange,
  onSyncCmapValuesChange,
}: Props) {
  // Create temporary values to maintain component state without setting the global state, which is only done during "Update Map".
  // The parent only mounts this component while the dialog is open, so these are initialized from the current settings on each open.
  const [initialDisplayValues] = useState(() =>
    toDisplayValues(values, isLogScale)
  );
  const [tempCmap, setTempCmap] = useState(cmap);
  const [tempValues, setTempValues] = useState<string[]>(initialDisplayValues);
  const [tempIsLogScale, setTempIsLogScale] = useState(isLogScale);
  const [tempIsAbsValue, setTempIsAbsValue] = useState(isAbsoluteValue);
  const [tempIsLinked, setTempIsLinked] = useState(isLinked);

  /** A message describing why the temp settings can't be submitted, if they're invalid */
  const submitError = useMemo(() => {
    if (tempValues.some((v) => v === '')) {
      return 'Enter both a minimum and maximum value';
    }
    if (tempIsLogScale && tempValues.some((v) => Number(v) <= 0)) {
      return 'Log scale requires positive minimum and maximum values';
    }
  }, [tempValues, tempIsLogScale]);

  /** Handles "submitting" the temp values set in the dialog and closes the modal */
  const handleUpdate = useCallback(() => {
    if (submitError) return;

    // For each input, only fire the update handler if the value changed

    // Toggle linking first so that any other changes below are synced (or not) accordingly
    if (tempIsLinked !== isLinked) {
      onSyncCmapValuesChange();
    }

    if (tempCmap !== cmap) {
      onColorMapConfigChange({ type: CHANGE_CMAP_TYPE, cmap: tempCmap });
    }

    // Change the scale before the values so that the values below are set in the new scale
    if (tempIsLogScale !== isLogScale) {
      onColorMapConfigChange({
        type: CHANGE_LOG_SCALE,
        isLogScale: tempIsLogScale,
      });
    }

    // Compare against the displayed values, since stored values are in log units when in log scale
    if (
      tempValues[0] !== initialDisplayValues[0] ||
      tempValues[1] !== initialDisplayValues[1]
    ) {
      const [vmin, vmax] = tempValues.map((v) =>
        tempIsLogScale ? safeLog(Number(v)) : Number(v)
      );
      onColorMapConfigChange({
        type: CHANGE_CMAP_VALUES,
        vmin,
        vmax,
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
    submitError,
    onColorMapConfigChange,
    tempCmap,
    tempValues,
    initialDisplayValues,
    closeModal,
    cmapOptions,
    setCmapOptions,
    isLogScale,
    tempIsLogScale,
    cmap,
    tempIsAbsValue,
    isAbsoluteValue,
    tempIsLinked,
    isLinked,
    onSyncCmapValuesChange,
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
          <label
            className="dialog-label cmap-dialog-toggle"
            title="Use a logarithmic color scale"
          >
            <input
              type="checkbox"
              checked={tempIsLogScale}
              onChange={(e) => setTempIsLogScale(e.target.checked)}
            />
            Log Scale
          </label>
          <label
            className="dialog-label cmap-dialog-toggle"
            title="Color by absolute value of the data"
          >
            <input
              type="checkbox"
              checked={tempIsAbsValue}
              onChange={(e) => setTempIsAbsValue(e.target.checked)}
            />
            Abs. Value
          </label>
          <label
            className="dialog-label cmap-dialog-toggle"
            title="Sync color mapping across all maps with the same 'units-quantity' combination"
          >
            <input
              type="checkbox"
              checked={tempIsLinked}
              onChange={(e) => setTempIsLinked(e.target.checked)}
            />
            Link
          </label>
        </div>
        <input
          type="submit"
          value="Update Map"
          disabled={!!submitError}
          title={submitError ?? 'Apply these settings to the map'}
        />
      </form>
    </Dialog>
  );
}
