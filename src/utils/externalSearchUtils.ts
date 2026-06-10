import { Feature, Map } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { Geometry, Point } from 'ol/geom';
import { externalSearches } from '../configs/externalSearchConfigs';

export function generateSearchContent(coords: number[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'external-search-content';

  const header = document.createElement('h1');
  header.textContent = 'External Searches';
  div.append(header);

  const ul = document.createElement('ul');

  for (const [name, makeUrl] of Object.entries(externalSearches)) {
    const li = document.createElement('li');
    const href = makeUrl(coords[0], coords[1]);
    li.append(generateAnchorElement(href, name));
    ul.append(li);
  }

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
  overlayCoords: Coordinate,
  searchCoords: Coordinate
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
    externalSearchRef.current?.append(generateSearchContent(searchCoords));
    simbadOverlay.setPosition(overlayCoords);
    externalSearchMarkerRef.current?.setGeometry(new Point(overlayCoords));
  }
}
