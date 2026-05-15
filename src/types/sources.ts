export type SourceGroupSummaryResponse = {
  /** id of the source catalog */
  source_group_id: string;
  /** name of the source group */
  name: string;
  /** optional description attribute */
  description?: string;
};

export type Source = {
  /** optional name attribute */
  name?: string;
  /** value of right ascension for the source */
  ra: number;
  /** value of declination for the source */
  dec: number;
  /** additional information about the source */
  extra: Record<string, unknown>;
};

export type SourceData = Source & { id: string };

export interface SourceGroupResponse extends SourceGroupSummaryResponse {
  /** the list of sources associated with a source catalog */
  sources: Source[];
}

export interface SourceGroup extends SourceGroupResponse {
  /** used to map colorway hex strings to source groups */
  clientId: number;
}
