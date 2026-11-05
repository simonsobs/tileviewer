/** Every endpoint the app uses for CDS services (SIMBAD and Sesame), including the mirrors of them
 * hosted elsewhere. */

/** Sesame name resolver restricted to SIMBAD (the "S"), with XML output ("-ox") */
export const SESAME_URL = 'https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/S?';

export type SimbadHost = {
  /** SIMBAD's web pages, which we link out to */
  pagesUrl: string;
  /** SIMBAD's synchronous TAP (ADQL query) endpoint */
  tapUrl: string;
  /** How this host resolves names. Harvard's copy of Sesame was returning 502s, and its
   * sim-nameresolver treats the "*" in names like "Sgr A*" as a wildcard, so it uses TAP. */
  nameResolver: 'sesame' | 'tap';
};

/** SIMBAD hosts in the order to try them. Both serve the same data. */
export const SIMBAD_HOSTS: SimbadHost[] = [
  {
    pagesUrl: 'https://simbad.cds.unistra.fr/simbad',
    tapUrl: 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync',
    nameResolver: 'sesame',
  },
  {
    pagesUrl: 'https://simbad.cfa.harvard.edu/simbad',
    tapUrl: 'https://simbad.cfa.harvard.edu/simbad/sim-tap/sync',
    nameResolver: 'tap',
  },
];

/** How long to wait on each SIMBAD host before moving on to the next one. Kept short because a
 * host that's down tends to hang rather than refuse the connection. */
export const SIMBAD_HOST_TIMEOUT_MS = 8000;
