import { useCallback, useEffect, useRef, useState } from "react";
import { ColorMapControlsProps } from "./ColorMapControls";
import './styles/color-map-dialog.css';

/**
 * TODOS/QUESTIONS:
 * 1. Should we persist in browser storage a user's custom cmap options?
 * 2. Should we also persist a user's parameters?
 */

interface Props extends Omit<ColorMapControlsProps, 'activeLayerId'> {
    isOpen: boolean;
    closeModal: () => void;
    setCmapOptions: (options: string[]) => void;
    cmapOptions: string[];
}

export function CustomColorMapDialog({isOpen, closeModal, values, cmap, onCmapChange, onCmapValuesChange, cmapOptions, setCmapOptions}: Props) {
    const ref = useRef<HTMLDialogElement | null>(null);
    const [tempCmap, setTempCmap] = useState(cmap);
    const [tempValues, setTempValues] = useState<Array<string | undefined>>(values.map(v => String(v)));

    useEffect(
        () => {
            setTempCmap(cmap)
        }, [cmap]
    )

    useEffect(
        () => {
            setTempValues(values.map(v => String(v)))
        }, [values]
    )

    useEffect(
        () => {
            if (isOpen) {
                ref.current?.showModal();
             } else {
                ref.current?.close();
             }

            () => ref.current?.close();
        }, [isOpen]
    )

    const handleUpdate = useCallback(
        () => {
            onCmapChange(tempCmap);
            onCmapValuesChange(tempValues.map(v => v ? Number(v) : 0));
            if (!cmapOptions.includes(tempCmap)) {
                setCmapOptions(cmapOptions.concat(tempCmap))
            }
            closeModal();
        }, [onCmapChange, tempCmap, onCmapValuesChange, tempValues]
    )

    return (
        <dialog
            ref={ref}
            onCancel={closeModal}
        >
            <header>
                <h1>Custom Colormap Parameters</h1>
                <button className="close-dialog" title="Close" onClick={closeModal}>&#9747;</button>
            </header>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdate();
                }}
            >
                <label>
                    <span>
                        Specify a <a target="_blank" href="https://matplotlib.org/stable/gallery/color/colormap_reference.html#colormap-reference">matplotlib colormap option</a>
                    </span>
                    <input type="text" value={tempCmap} onChange={(e) => setTempCmap(e.target.value)} />
                </label>
                <label>
                    Minimum of T[&mu;K]
                    <input type="number" value={tempValues[0]} onChange={(e) => setTempValues(values => [e.target.value, values[1]])} />
                </label>
                <label>
                    Maximum of T[&mu;K]
                    <input type="number" value={tempValues[1]} onChange={(e) => setTempValues(values => [values[0], e.target.value])} />
                </label>
                <input type="submit" value="Update Map" />
            </form>
        </dialog>
    )
}