import { useMemo } from "react";
import {
    PointArray,
  } from "@svgdotjs/svg.js";
import { HistogramResponse } from "../types/maps";
import { HISTOGRAM_SIZE_X, HISTOGRAM_SIZE_Y } from "../configs/cmapControlSettings";
import { safeLog } from "../utils/numberUtils";

type Props = {
    /** The data from the histogram response */
    data: HistogramResponse,
    /** The user's min and max values for the range slider to use as edgeStart or edgeEnd
      in the event the user sets these beyond the histogram's min or max edges */
    userMinAndMaxValues: {min: number, max: number}
}

export function ColorMapHistogram({data, userMinAndMaxValues}: Props) {
    const { edges, histogram } = data;

    /**
     * The polygon constructed for use as the SVG for the histogram.
     * We memoized polygon so that it's only generated when the
     * props change.
     */
    const polygon = useMemo(
      () => {
        /** Convert the histogram into log values using the safeLog utility function */
        const logarithmicHistogram = histogram.map(safeLog)
        /** Include user's min value in case we need to rescale the histogram accordingly */
        const edgeStart = Math.min(...edges, userMinAndMaxValues.min);
        /** Include user's max value in case we need to rescale the histogram accordingly */
        const edgeEnd = Math.max(...edges, userMinAndMaxValues.max);
        
        const histogramStart = Math.min(...logarithmicHistogram);
        // Add a little buffer; we don't want the histogram to touch the top of the image
        const histogramEnd = Math.max(...logarithmicHistogram) * 1.05;

        return generatePolygon(
          edges.map((x) => {
            return translateDatum(x, edgeStart, edgeEnd, HISTOGRAM_SIZE_X);
          }),
          logarithmicHistogram.map((y) => {
            return translateDatum(y, histogramStart, histogramEnd, HISTOGRAM_SIZE_Y);
          }),
          HISTOGRAM_SIZE_X,
          HISTOGRAM_SIZE_Y,
        );
      }, [edges, histogram, userMinAndMaxValues.min, userMinAndMaxValues.max]
    )

    return (
      <svg
        className="cmap-histogram"
        width={HISTOGRAM_SIZE_X}
        height={HISTOGRAM_SIZE_Y}>
        <polyline
            opacity={0.65}
            fill="black"
            points={polygon.toString()}
        />
      </svg>
    )
}

/**
 * Generates a polygon to be rendered as a histogram SVG
 * @param edges Edges of the histogram
 * @param histogram Values of the histogram
 * @param size_x Fixed width of the histogram
 * @param size_y Fixed height of the histogram
 * @returns PointArray used to render a polyline SVG
 */
function generatePolygon(
    edges: number[],
    histogram: number[],
    size_x: number,
    size_y: number
  ): PointArray {
    const polygon: number[] = [];

    /* First point is the bottom left corner */
    polygon.push(0, size_y);
    polygon.push(edges[0], size_y - histogram[0]);

    for (let i = 0; i <= histogram.length - 1; i++) {
      polygon.push(edges[i], size_y - histogram[i]);
      polygon.push(edges[i + 1], size_y - histogram[i]);
    }

    /* Last point is bottom right corner, then wrap back around to the start. */
    polygon.push(edges[edges.length - 1], size_y - histogram[histogram.length - 1]);
    polygon.push(size_x, size_y);
    polygon.push(0, size_y);

    return new PointArray(polygon);
  };

  /**
   * Scales the edge and histogram data according to a provided fixed size
   * @param data The edge or histogram data point
   * @param min Min edge or histogram value
   * @param max Max edge or histogram value
   * @param size Fixed width or height of the histogram
   * @returns A scaled value
   */
  function translateDatum(data: number, min: number, max: number, size: number): number {
    return ((data - min) / (max - min)) * size;
  }
