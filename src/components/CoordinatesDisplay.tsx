import { NUMBER_OF_FIXED_COORDINATE_DECIMALS } from '../configs/mapSettings';
import './styles/coordinates-display.css';

export function CoordinatesDisplay({ coordinates }: { coordinates: number[] }) {
  return (
    <div className="coordinates-display">
      <span className="parens">( </span>
      <span className="coords lat">
        {coordinates[0].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)} ,
      </span>
      <span className="coords lng">
        {coordinates[1].toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}
      </span>
      <span className="parens"> )</span>
    </div>
  );
}
