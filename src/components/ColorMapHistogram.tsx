import {
    PointArray,
  } from "@svgdotjs/svg.js";
import { HistogramResponse } from "../types/maps";
import { HISTOGRAM_SIZE_X, HISTOGRAM_SIZE_Y } from "../configs/cmapControlSettings";

type Props = {
    data: HistogramResponse,
}

export function ColorMapHistogram({data}: Props) {
    const { edges, histogram } = data;
    const logarithmicHistogram = histogram.map(Math.log10)
    const edgeStart = Math.min(...edges);
    const edgeEnd = Math.max(...edges);
    
    const histogramStart = Math.min(...logarithmicHistogram);
    // Add a little buffer; we don't want the histogram to touch the top of the image
    const histogramEnd = Math.max(...logarithmicHistogram) * 1.05;

    const polygon = generatePolygon(
        edges.map((x) => {
          return translateDatum(x, edgeStart, edgeEnd, HISTOGRAM_SIZE_X);
        }),
        logarithmicHistogram.map((y) => {
          return translateDatum(y, histogramStart, histogramEnd, HISTOGRAM_SIZE_Y);
        }),
        HISTOGRAM_SIZE_X,
        HISTOGRAM_SIZE_Y,
      );

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

function generatePolygon(
    edges: number[],
    histogram: number[],
    size_x: number,
    size_y: number
  ): PointArray {
    const polygon: number[] = [];

    /* First point is the bottom left corner */
    polygon.push(0, size_y);
    polygon.push(histogram[0], size_y);

    for (let i = 0; i <= histogram.length - 1; i++) {
      polygon.push(edges[i], size_y - histogram[i]);
      polygon.push(edges[i + 1], size_y - histogram[i]);
    }

    /* Last point is bottom right corner, then wrap back around to the start. */
    polygon.push(edges[edges.length - 1], size_y);
    polygon.push(size_x, size_y);
    polygon.push(0, size_y);

    return new PointArray(polygon);
  };

  function translateDatum(data: number, min: number, max: number, size: number): number {
    return ((data - min) / (max - min)) * size;
  }
