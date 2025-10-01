import { Feature } from 'ol';
import { BoxExtent, SourceData } from '../types/maps';
import {
  CATALOG_COLORWAY,
  NUMBER_OF_FIXED_COORDINATE_DECIMALS,
} from '../configs/mapSettings';
import { Point } from 'ol/geom';
import { Fill, Stroke, Style } from 'ol/style';
import { FeatureLike } from 'ol/Feature';

export function getBaselayerResolutions(
  worldWidth: number,
  tileSize: number,
  maxZoom: number
) {
  const resolutionZ0 = worldWidth / tileSize;
  const resolutions = [];
  for (let i = 0; i <= maxZoom; i++) {
    resolutions.push(resolutionZ0 / 2 ** i);
  }
  return resolutions;
}

export function transformGraticuleCoords(
  coords: number[],
  isFlipped: boolean
): number[] {
  if (isFlipped) {
    const [ra, dec] = coords;
    const newRa = ra * -1 + 180;
    return [newRa, dec];
  } else {
    return coords;
  }
}

export function transformCoords(
  coords: number[],
  isFlipped: boolean,
  context: 'search' | 'layer'
): number[] {
  const [ra, dec] = coords;
  const newRa = coords[0] * -1 + (coords[0] > 0 ? 180 : -180);
  if (isFlipped) {
    if (context === 'search') {
      return [ra > 0 ? ra : ra + 360, dec];
    }
    if (context === 'layer') {
      return [newRa, dec];
    }
    return coords;
  } else {
    return [newRa, dec];
  }
}

export function transformSources(feature: Feature, flipped: boolean) {
  const sourceData = feature.get('sourceData') as SourceData;
  let newOverlayCoords = [sourceData.ra, sourceData.dec];
  let newSourceData = { ...sourceData };
  if (flipped) {
    newOverlayCoords = transformCoords(
      [sourceData.ra, sourceData.dec],
      flipped,
      'layer'
    );
    newSourceData = {
      ...sourceData,
      ra: sourceData.ra < 0 ? sourceData.ra + 360 : sourceData.ra,
    };
  }
  return {
    newOverlayCoords,
    newSourceData,
  };
}

export function transformBoxes(boxExtent: BoxExtent, flipped: boolean) {
  let newBoxPosition = {
    ...boxExtent,
  };

  if (flipped) {
    const isLeftRaNegative = boxExtent.top_left_ra < 0;
    const isRightRaNegative = boxExtent.bottom_right_ra < 0;
    const newRaLeft = transformCoords(
      [boxExtent.bottom_right_ra, boxExtent.bottom_right_dec],
      flipped,
      'layer'
    )[0];
    if (
      (isLeftRaNegative && isRightRaNegative) ||
      (!isLeftRaNegative && !isRightRaNegative)
    ) {
      newBoxPosition['top_left_ra'] = newRaLeft;
      newBoxPosition['bottom_right_ra'] = transformCoords(
        [boxExtent.top_left_ra, boxExtent.top_left_dec],
        flipped,
        'layer'
      )[0];
    } else {
      const newRaRight =
        newRaLeft + Math.abs(boxExtent.bottom_right_ra - boxExtent.top_left_ra);
      newBoxPosition['top_left_ra'] = newRaLeft;
      newBoxPosition['bottom_right_ra'] = newRaRight;
    }
  }

  return newBoxPosition;
}

export function isBoxSynced(currentData: BoxExtent, originalData: BoxExtent) {
  return (
    currentData.top_left_ra === originalData.top_left_ra &&
    currentData.top_left_dec === originalData.top_left_dec &&
    currentData.bottom_right_ra === originalData.bottom_right_ra &&
    currentData.bottom_right_dec === originalData.bottom_right_dec
  );
}

function createSourceP(label: string, data: string | number) {
  const p = document.createElement('p');
  const labelEl = document.createElement('span');
  labelEl.className = 'source-data-label';
  const content = document.createElement('span');
  labelEl.textContent = label + ': ';
  content.textContent = String(data);

  p.appendChild(labelEl);
  p.appendChild(content);

  return p;
}

export function createSourcePopupContent(
  containerEl: HTMLDivElement,
  data: SourceData
) {
  containerEl.innerHTML = '';

  if (data.name) {
    // Create a header if the source name exists
    const h3 = document.createElement('h3');
    h3.textContent = data.name;
    containerEl.appendChild(h3);
  }

  // Create p element w/ coordinate data
  const p = document.createElement('p');
  const label = document.createElement('span');
  label.className = 'source-data-label';
  const content = document.createElement('span');
  label.textContent = 'RA, Dec: ';
  content.textContent = `(${data.ra.toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)}, ${data.dec.toFixed(NUMBER_OF_FIXED_COORDINATE_DECIMALS)})`;
  p.appendChild(label);
  p.appendChild(content);
  containerEl.appendChild(p);

  // Create p elements for data contained in `extra` attribute
  if (data.extra) {
    const entries = Object.entries(data.extra);
    for (const entry of entries) {
      containerEl.appendChild(
        createSourceP(entry[0], entry[1] as string | number)
      );
    }
  }
}

/**
 * Used to override default styling of the Draw feature so we can
 * remove the blue Point that tracks the mouse cursor
 */
export function drawStyle(feature: FeatureLike) {
  const geometry = feature.getGeometry();

  // Hide the sketch point
  if (geometry instanceof Point) {
    return undefined;
  }

  return new Style({
    stroke: new Stroke({
      color: '#3399CC',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  });
}

/**
 * Simple function to map colorway hex strings to catalogs;
 * note that we reuse colors if we have more than the number of colors
 * defined in the CATALOG_COLORWAY array
 * @param index Index of the catalog
 * @returns A color's hex string
 */
export function getCatalogMarkerColor(index: number) {
  return CATALOG_COLORWAY[index % CATALOG_COLORWAY.length];
}
