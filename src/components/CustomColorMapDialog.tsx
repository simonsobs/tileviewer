import { useCallback, useEffect, useState } from 'react';
import { ColorMapControlsProps } from './ColorMapControls';
import './styles/color-map-dialog.css';
import { Dialog } from './Dialog';
import { safeLog } from '../utils/numberUtils';

/**
 * TODOS/QUESTIONS:
 * 1. Should we persist in browser storage a user's custom cmap options?
 * 2. Should we also persist a user's parameters?
 */

interface Props extends Omit<ColorMapControlsProps, 'activeLayerId'> {
  /** Boolean to control dialog display/hide status */
  isOpen: boolean;
  /** Handler to set modal to be closed */
  closeModal: () => void;
  /** Handler that allows us to add new user-specified color maps to the histogram's <select> menu */
  setCmapOptions: (options: string[]) => void;
  /** The list of color map options used to determine whether or not to append a new color map option */
  cmapOptions: string[];
}

export function CustomColorMapDialog({
  isOpen,
  closeModal,
  values,
  cmap,
  onCmapChange,
  onCmapValuesChange,
  cmapOptions,
  setCmapOptions,
  units,
  isLogScale,
  onLogScaleChange,
}: Props) {
  // Create temporary values to maintain component state without setting the global state, which is only done during "Update Map"
  const [tempCmap, setTempCmap] = useState(cmap);
  const [tempValues, setTempValues] = useState<Array<string | undefined>>(
    values.map((v) => (isLogScale ? String(Math.pow(10, v)) : String(v)))
  );
  const [tempIsLogScale, setTempIsLogScale] = useState(isLogScale);

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

  /** Handles "submitting" the temp values set in the dialog and closes the modal */
  const handleUpdate = useCallback(() => {
    // For each input, only fire the update handler if the value changed

    if (tempCmap !== cmap) {
      onCmapChange(tempCmap);
    }

    if (
      Number(tempValues[0]) !== values[0] ||
      Number(tempValues[1]) !== values[1]
    ) {
      onCmapValuesChange(
        tempValues.map((v) =>
          v ? (isLogScale ? safeLog(Number(v)) : Number(v)) : 0
        )
      );
    }

    if (tempIsLogScale !== isLogScale) {
      onLogScaleChange(tempIsLogScale);
    }

    // Check if tempCmap exists in cmapOptions and concat as a new option if not
    if (!cmapOptions.includes(tempCmap)) {
      setCmapOptions(cmapOptions.concat(tempCmap));
    }
    closeModal();
  }, [
    onCmapChange,
    tempCmap,
    onCmapValuesChange,
    tempValues,
    closeModal,
    cmapOptions,
    setCmapOptions,
    isLogScale,
    tempIsLogScale,
    cmap,
    values,
    onLogScaleChange,
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
        <label>
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
        <label>
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
        <label>
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
          <label className="cmap-dialog-toggle">
            <input
              type="checkbox"
              checked={tempIsLogScale}
              onChange={(e) => setTempIsLogScale(e.target.checked)}
            />
            Log Scale
          </label>
          <label className="cmap-dialog-toggle disabled" title="Coming soon">
            <input type="checkbox" disabled />
            Abs. Value
          </label>
        </div>
        <input type="submit" value="Update Map" />
      </form>
    </Dialog>
  );
}
