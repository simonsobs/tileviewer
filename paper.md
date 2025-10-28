---
title: 'TileMaker + TileViewer: A Web App for Creating and Visualizing Astronomical Maps'
tags:
  - Python
  - React
  - OpenLayers
  - FastAPI
  - astronomy
  - mapping
  - Simons Observatory
authors:
  - name: Josh Borrow
    # orcid: 0000-0000-0000-0000
    equal-contrib: true
    affiliation: '1, 2' # (Multiple affiliations must be quoted)
  - name: Jeremy Myers
    equal-contrib: true # (This is how you can denote equal contributions between multiple authors)
    affiliation: '1, 2'
affiliations:
  - name: University of Pennsylvania, United States
    index: 1
  #    ror:
  - name: Simons Observatory
    index: 2
#    ror:
date: 20 October 2025
# bibliography: paper.bib

# Optional fields if submitting to a AAS journal too, see this blog post:
# https://blog.joss.theoj.org/2018/12/a-new-collaboration-with-aas-publishing
# aas-doi: 10.3847/xxxxx <- update this with the DOI from AAS once you know it.
# aas-journal: Astrophysical Journal <- The name of the AAS journal.
---

# Summary

TileMaker, along with its bundled frontend, TileViewer, is a tool for visualizing and analyzing astronomical maps with an equirectangular projection, like those used by the Atacama Cosmology Telescope and Simons Observatory. TileMaker ingests FITS files in order to create and serve map tiles that TileViewer then renders using [OpenLayers](https://openlayers.org/). Additionally, TileMaker can ingest and serve data to the TileViewer that represent source catalogs and regions of interest.

TileMaker uses the HTTP protocol to serve the tiles over a network connection, meaning that the server running the analysis can be in a completely different place than where they are being viewed. This allows users to view maps on their computer even when maps are stored on a remote machine (e.g. a HPC facility), thereby eliminating any need for large file transfers.

TileMaker can be used in a number of modes:

- Locally to visualize and organize a colleciton of maps.
- Remotely over an SSH connection to view maps on an external machine.
- In 'production' mode, served from a Docker container (see e.g. [the Simons Observatory main viewer](https://maps.simonsobservatory.org/))

# Statement of need

TileMaker excels over its competition by not requiring any pre-ingestion process and by not creating any ancillary files. To reduce load on filesystems, TileMaker supports local in-memory caches (primarily for use in the 'investigative' local and remote modes) as well as `memcached` for production modes where multithreaded ASGI servers are recommended.

# Citations

<!-- Citations to entries in paper.bib should be in
[rMarkdown](http://rmarkdown.rstudio.com/authoring_bibliographies_and_citations.html)
format.

If you want to cite a software repository URL (e.g. something on GitHub without a preferred
citation) then you can do it with the example BibTeX entry below for @fidgit.

For a quick reference, the following citation commands can be used:
- `@author:2001`  ->  "Author et al. (2001)"
- `[@author:2001]` -> "(Author et al., 2001)"
- `[@author1:2001; @author2:2001]` -> "(Author1 et al., 2001; Author2 et al., 2002)" -->

# Figures

<!-- Figures can be included like this:
![Caption for example figure.\label{fig:example}](figure.png)
and referenced from text using \autoref{fig:example}.

Figure sizes can be customized by adding an optional second parameter:
![Caption for example figure.](figure.png){ width=20% } -->

# Acknowledgements

# References
