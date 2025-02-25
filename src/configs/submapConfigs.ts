/** Literal type of possible submap file extensions */
export type SubmapFileExtensions = 'fits' | 'jpg' | 'png' | 'webp';

export type SubmapDownloadOption = {
  display: string;
  ext: SubmapFileExtensions;
};

/** An array of download options used to create the buttons and the click events that download submaps */
export const SUBMAP_DOWNLOAD_OPTIONS: SubmapDownloadOption[] = [
  { display: 'FITS', ext: 'fits' },
  { display: 'PNG', ext: 'png' },
  { display: 'JPG', ext: 'jpg' },
  { display: 'WebP', ext: 'webp' },
];
