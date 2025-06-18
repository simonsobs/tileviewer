import { NUMBER_OF_FIXED_COORDINATE_DECIMALS } from '../configs/mapSettings';
import { transformGraticuleCoords } from '../utils/layerUtils';
import './styles/coordinates-display.css';

export function CoordinatesDisplay({
  coordinates,
  flipped,
}: {
  coordinates: number[];
  flipped: boolean;
}) {
  const transformedCoords = transformGraticuleCoords(coordinates, flipped);
  return (
    <div className="coordinates-display">
      <span className="parens">( </span>
      <span className="coords lat">
        {transformedCoords[0].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)} ,
      </span>
      <span className="coords lng">
        {transformedCoords[1].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}
      </span>
      <span className="parens"> )</span>
    </div>
  );
}
