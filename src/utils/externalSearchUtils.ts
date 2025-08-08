import { Feature, Map } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { Geometry, Point } from 'ol/geom';
import { transformGraticuleCoords } from './layerUtils';

export function generateSearchContent(coords: number[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'external-search-content';

  const header = document.createElement('h1');
  header.textContent = 'External Searches';
  div.append(header);

  const ul = document.createElement('ul');
  const li1 = document.createElement('li');
  const li2 = document.createElement('li');

  li1.append(
    generateAnchorElement(
      `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${coords[0]}+${coords[1]}&Radius=5&Radius.unit=arcmin`,
      'SIMBAD'
    )
  );
  li2.append(
    generateAnchorElement(
      `https://www.legacysurvey.org/viewer?ra=${coords[0]}&dec=${coords[1]}&layer=ls-dr10&zoom=14&mark=${coords[0]},${coords[1]}`,
      'Legacy Survey'
    )
  );

  ul.append(li1, li2);
  div.append(ul);

  return div;
}

function generateAnchorElement(
  href: string,
  externalSiteName: string
): HTMLAnchorElement {
  const a = document.createElement('a');
  a.target = '_blank';
  a.referrerPolicy = 'no-referrer';
  a.href = href;
  a.text = `Search ${externalSiteName}`;
  return a;
}

export function searchOverlayHelper(
  map: Map,
  externalSearchRef: React.RefObject<HTMLDivElement | null>,
  externalSearchMarkerRef: React.RefObject<Feature<Geometry> | null>,
  coords: Coordinate,
  flipTiles: boolean
) {
  if (!map) return;

  const simbadOverlay = map.getOverlayById('simbad-search-overlay');
  if (simbadOverlay) {
    if (externalSearchRef.current) {
      while (externalSearchRef.current.firstChild) {
        externalSearchRef.current.removeChild(
          externalSearchRef.current.firstChild
        );
      }
    }
    const searchCoords = transformGraticuleCoords(coords, flipTiles);
    externalSearchRef.current?.append(generateSearchContent(searchCoords));
    simbadOverlay.setPosition(coords);
    externalSearchMarkerRef.current?.setGeometry(new Point(coords));
  }
}
