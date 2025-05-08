import { Band } from '../types/maps';

/**
 * A utility function to format a layer's name.
 * @param band The band object
 * @returns A string of map_name + stokes_parameter + quantity, where quantity
 *  and stokes_parameter are conditionally rendered based on their truthiness
 */
export function makeLayerName(band: Band) {
  return (
    band.map_name +
    (band.stokes_parameter ? ` ${band.stokes_parameter}` : '') +
    (band.quantity ? ` ${band.quantity}` : '')
  );
}

export function handleSelectChange(
  event: React.ChangeEvent<HTMLInputElement>,
  setter: (value: React.SetStateAction<number[]>) => void
) {
  if (event.target.checked) {
    setter((prevState) => prevState.concat(Number(event.target.value)));
  } else {
    setter((prevState) =>
      prevState.filter((id) => id !== Number(event.target.value))
    );
  }
}
