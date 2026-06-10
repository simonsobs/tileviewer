export const externalSearches = {
  SIMBAD: (ra: number, dec: number) =>
    `https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${ra}+${dec}&Radius=5&Radius.unit=arcmin`,
  CDS: (ra: number, dec: number) =>
    `https://portal.cds.unistra.fr/?target=${ra}%20${dec}`,
  'Legacy Survey': (ra: number, dec: number) =>
    `https://www.legacysurvey.org/viewer?ra=${ra}&dec=${dec}&layer=ls-dr10&zoom=14&mark=${ra},${dec}`,
};
