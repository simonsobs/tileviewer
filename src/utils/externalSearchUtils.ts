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
