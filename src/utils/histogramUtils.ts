export function getAbsoluteHistogramData(edges: number[], histogram: number[]) {
  let sliceIndex = edges.findIndex((e) => e >= 0);
  let newEdges;
  let newHistogram;

  // If edges array includes 0, we need not do any preprocessing of the arrays
  if (edges[sliceIndex] === 0) {
    newEdges = [...edges];
    newHistogram = [...histogram];
    // If edges array does not include 0, we add it and amend histogram array to include additional bin values
  } else {
    // Add 0 to the appropriate edge position
    newEdges = edges.slice(0, sliceIndex).concat(0, edges.slice(sliceIndex));

    // Determine the difference between the first negative and the first positive edge values
    const deltaX = edges[sliceIndex] - edges[sliceIndex - 1];
    // This is the value assigned to the original bin spanning the edges of deltaX
    const deltaY = histogram[sliceIndex - 1];
    // Calculate how much of the bin value proportionally "belongs" to the new bin from
    // the first negative edge to 0; round the value to the nearest integer
    const newBin1Value = Math.round(
      (deltaY / deltaX) * Math.abs(edges[sliceIndex - 1])
    );
    // Use the difference between previous calc and the original bin value as the bin value from
    // 0 to the first positive edge
    const newBin2Value = deltaY - newBin1Value;
    // Create new histogram that replaces the original bin value with newBin1Value and adds newBin2Value to the
    // appropriate position
    newHistogram = histogram
      .slice(0, sliceIndex - 1)
      .concat(newBin1Value, newBin2Value, histogram.slice(sliceIndex));
  }

  // When the absolute value of the first edge is greater than the value of the last edge, we need to add more edges
  // and histogram data accordingly
  if (Math.abs(newEdges[0]) > newEdges[newEdges.length - 1]) {
    const edgeExtension = [];
    const histoExtension = [];
    for (let k = 0; k < newEdges.length; k++) {
      const negEdgeStart = newEdges[k];

      if (negEdgeStart >= 0) {
        break;
      }

      const negEdgeEnd = newEdges[k + 1];
      const maxEdge = newEdges[newEdges.length - 1];

      // When Math.abs(negEdgeEnd) is greater than maxEdge OR when Math.abs(negEdgeEnd) and
      // Math.abs(negEdgeStart) overlaps maxEdge, we need to extend the edges array to include
      // Math.abs(negEdgeStart) and assign a 0 placeholder for the new bin's value, which will
      // later on be processed to deal with the overlap
      if (
        Math.abs(negEdgeEnd) >= maxEdge ||
        (Math.abs(negEdgeStart) > maxEdge && Math.abs(negEdgeEnd) < maxEdge)
      ) {
        edgeExtension.push(Math.abs(negEdgeStart));
        histoExtension.push(0);
      }
    }

    // Now that we've determined what new edge values and histogram placeholders need to be
    // added to newEdges and newHistogram, let's reverse the temp array then re-assign
    // newEdges and newHistogram such that the extended values are included
    edgeExtension.reverse();
    histoExtension.reverse();
    newEdges = [...newEdges].concat(edgeExtension);
    newHistogram = [...newHistogram].concat(histoExtension);
  }

  for (let i = 0; i < newEdges.length; i++) {
    // Break loop such that we're only processing the negative edge values
    if (newEdges[i] >= 0 || newEdges[i + 1] === undefined) {
      break;
    }

    // Since edges[i] and edges[i+1] are both negative, a positive edges[i]
    // will become the binEnd and a positive edges[i+1] will become binStart
    const absBinStart = Math.abs(newEdges[i + 1]);
    const absBinEnd = Math.abs(newEdges[i]);

    const binValue = newHistogram[i];

    // Find the lower and upper bin bounds in the positive edges
    // for which the absBinStart and absBinEnd correspond
    const lowerBoundIdx = newEdges.findIndex((e) => e >= absBinStart);
    const upperBoundIdx = newEdges.findIndex((e) => e >= absBinEnd);

    const lowerBound = newEdges[lowerBoundIdx];
    const upperBound = newEdges[upperBoundIdx];

    // If the negative bin corresponds nicely with a positive bin, simply add its contents to the positive bin
    if (absBinStart >= lowerBound && absBinEnd <= upperBound) {
      newHistogram[lowerBoundIdx] += binValue;
    } else {
      // We need to interpolate over multiple bins
      const minBoundIdx =
        absBinStart >= lowerBound ? lowerBoundIdx : lowerBoundIdx - 1;
      const maxBoundIdx =
        absBinEnd <= upperBound ? upperBoundIdx : upperBoundIdx + 1;

      const unitCount = binValue / (absBinEnd - absBinStart);

      // Iterate over minBoundIdx to maxBoundIdx
      for (let j = minBoundIdx; j < maxBoundIdx; j++) {
        if (newEdges[j] <= absBinStart) {
          newHistogram[j] += Math.round(
            (newEdges[j + 1] - absBinStart) * unitCount
          );
        } else if (absBinEnd <= newEdges[j + 1]) {
          newHistogram[j] += Math.round((absBinEnd - newEdges[j]) * unitCount);
        } else {
          newHistogram[j] += Math.round(
            (newEdges[j + 1] - newEdges[j]) * unitCount
          );
        }
      }
    }
  }

  sliceIndex = newEdges.findIndex((e) => e === 0);
  const finalEdges = newEdges.slice(sliceIndex);
  const finalHistogram = newHistogram.slice(sliceIndex);
  return { edges: finalEdges, histogram: finalHistogram };
}
