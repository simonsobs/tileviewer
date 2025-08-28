import { getAbsoluteHistogramData } from '../utils/histogramUtils';
import { describe, expect, test } from 'vitest';

describe('symmetric bins with a 0', () => {
  const edges = [-6, -4, -2, 0, 2, 4, 6];
  const histogram = [5, 3, 10, 7, 4, 1];
  const expectedEdges = [0, 2, 4, 6];
  const expectedHistogram = [17, 7, 6];
  test('edges array is symmetric and includes 0', () => {
    expect(getAbsoluteHistogramData(edges, histogram)).toEqual({
      edges: expectedEdges,
      histogram: expectedHistogram,
    });
  });
});

describe('bins do not include 0', () => {
  const edges = [-4.75, -1.5, 1.75, 5.0, 8.25];
  const histogram = [9, 4, 7, 10];
  const expectedEdges = [0, 1.75, 5.0, 8.25];
  const expectedHistogram = [5, 15, 10];
  test('edges array does not include 0', () => {
    expect(getAbsoluteHistogramData(edges, histogram)).toEqual({
      edges: expectedEdges,
      histogram: expectedHistogram,
    });
  });
});

describe('bins that skew negative', () => {
  const edges1 = [-6, -4, -2, 0, 2, 4];
  const histogram1 = [5, 3, 10, 7, 4];
  const expectedEdges1 = [0, 2, 4, 6];
  const expectedHistogram1 = [17, 7, 5];
  test('symmetric bins where abs value of min edge is greater than max edge', () => {
    expect(getAbsoluteHistogramData(edges1, histogram1)).toEqual({
      edges: expectedEdges1,
      histogram: expectedHistogram1,
    });
  });

  const edges2 = [-9, -7, -6, -4, -2, 0, 2, 4];
  const histogram2 = [1, 2, 5, 3, 10, 7, 4];
  const expectedEdges2 = [0, 2, 4, 6, 7, 9];
  const expectedHistogram2 = [17, 7, 5, 2, 1];
  test('asymmetric bins without overlap where abs value of min edge is greater than max edge', () => {
    expect(getAbsoluteHistogramData(edges2, histogram2)).toEqual({
      edges: expectedEdges2,
      histogram: expectedHistogram2,
    });
  });

  const edges3 = [-9, -3, -2, 0, 2, 4];
  const histogram3 = [5, 3, 10, 7, 4];
  const expectedEdges3 = [0, 2, 4, 9];
  const expectedHistogram3 = [17, 8, 4];
  test('asymmetric bins with overlap where abs value of min edge is greater than max edge', () => {
    expect(getAbsoluteHistogramData(edges3, histogram3)).toEqual({
      edges: expectedEdges3,
      histogram: expectedHistogram3,
    });
  });
});
