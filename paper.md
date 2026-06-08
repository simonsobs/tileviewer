---
title: 'TileMaker + TileViewer: A Web Application for Serving and Visualizing Astronomical Survey Maps'
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
    orcid: 0000-0002-1327-1921
    equal-contrib: true
    affiliation: '1, 2' # (Multiple affiliations must be quoted)
  - name: Jeremy Myers
    equal-contrib: true # (This is how you can denote equal contributions between multiple authors)
    affiliation: '1, 2'
affiliations:
  - name: University of Pennsylvania, United States
    index: 1
    ror: 00b30xv10
  - name: Simons Observatory
    index: 2
#    ror:
date: 03 June 2026
bibliography: paper.bib
# Optional fields if submitting to a AAS journal too, see this blog post:
# https://blog.joss.theoj.org/2018/12/a-new-collaboration-with-aas-publishing
# aas-doi: 10.3847/xxxxx <- update this with the DOI from AAS once you know it.
# aas-journal: Astrophysical Journal <- The name of the AAS journal.
---

# Summary

`TileMaker`, along with its bundled frontend, `TileViewer`, is a tool for visualizing and analyzing astronomical maps with an equirectangular projection, like those produced by the Atacama Cosmology Telescope (ACT) and Simons Observatory (SO). `TileMaker` ingests FITS files in order to create and serve map tiles that `TileViewer` then renders using [OpenLayers](https://openlayers.org/). Additionally, `TileMaker` can ingest and serve data to the `TileViewer` that represent source catalogs and regions of interest.

`TileMaker` uses the HTTP protocol to serve the tiles over a network connection, meaning that the server running the analysis can be in a completely different place than where they are viewed. This allows users to view maps on their computer even when maps are stored on a remote machine (e.g. an HPC facility), thereby eliminating any need for large file transfers.

`TileMaker` can be used in a number of modes:

- Locally to visualize and organize a collection of maps.
- Remotely over an SSH connection to view maps on an external machine.
- In 'production' mode, served from a Docker container (see e.g. [the Simons Observatory main viewer](https://maps.simonsobservatory.org/))

# Statement of need

CMB and radio survey experiments such as ACT and SO produce multi-gigabyte, multi-layer FITS datasets that must be inspected routinely by large, geographically distributed collaboration members for data quality assessment, calibration validation, and science verification. These datasets are typically stored on remote HPC facilities, and the maps within them span a hierarchy of frequency bands, Stokes components, and data releases that must all be navigable in a single interface.

No existing general-purpose tool satisfies all of these requirements simultaneously. Desktop tools such as SAOImageDS9 [@ds9] require the data to be locally accessible and loaded into memory, which is impractical at survey scale. Browser-based tools such as Aladin Lite [@aladinlite] require data to be pre-ingested into the HiPS tile standard [@hips], which is incompatible with the equirectangular projection used by ACT and SO maps and impractical in an HPC environment. Purpose-built viewers such as the NASA LAMBDA ACT Viewer [@actviewer] demonstrate the value of a tile-based web interface for this class of data, but are hard-coded to a single data release and cannot be deployed by other teams against their own maps.

`TileMaker` addresses these gaps by serving tiles on-the-fly directly from FITS files over HTTP, with no pre-ingestion step, no ancillary files, and no data
transfer. It is designed to run where the data live — including over an SSH tunnel from a laptop to an HPC facility — and to scale from single-user local inspection to multi-user production deployments via Docker and `memcached`. `TileViewer` provides the accompanying browser interface, with a graphical layer menu that reflects the full survey data hierarchy and supports the per-layer color map adjustment, log-scale normalization, and Stokes-component switching that CMB map inspection requires.

# State of the field

**SAOImageDS9** [@ds9] is a desktop tool for astronomical image inspection. It reads FITS files directly and supports region manipulation, colormap manipulation, catalog overlays, and many more features. However, DS9 operates on locally accessible files and loads data entirely into memory, making it less practical for the datasets produced by wide-field CMB surveys. It also requires installation on the machine where the data reside, which conflicts with the common workflow of storing data on remote HPC facilities while performing interactive inspection on a laptop.

**Aladin Lite** [@aladinlite], developed by the Centre de Données astronomiques de Strasbourg (CDS), is a mature browser-based sky atlas that streams image data using the Hierarchical Progressive Survey (HiPS) standard [@hips]. HiPS is well-suited to all-sky optical and infrared surveys and is supported by a broad ecosystem of tools. However, adopting HiPS for CMB and radio survey data introduces several practical obstacles. HiPS partitions the sphere using the HEALPix pixelization scheme
[@healpix], which does not align with the equirectangular projections used natively by ACT and SO maps. Ingesting data into the HiPS format therefore requires a reprojection step that introduces interpolation artifacts and is irreversible. Furthermore, the standard HiPS ingestion pipeline (`hipsgen`) writes a large number of small tile files to disk — a significant burden on the parallel filesystems used at HPC facilities. The pipeline also requires transferring data to CDS infrastructure or running a dedicated `hipsgen` server, adding operational overhead that is undesirable for survey teams that need to inspect proprietary or pre-publication data privately. Aladin Lite additionally lacks built-in support for per-layer colormap manipulation, log-normalization, and Stokes-component switching that are routine operations when inspecting CMB polarization maps.

**The NASA LAMBDA ACT Viewer** [@actviewer] is a purpose-built web viewer for the ACT DR5 data release, hosted at the NASA Legacy Archive for Microwave Background Data Analysis. It provides a tile-based, Google Maps-style interface for ACT maps and supports keyboard-driven switching between frequency bands (f090, f150, f220), Stokes components (T, Q, U, E, B), and data releases. It also supports region selection and FITS cutout download. However, the viewer is a static, dataset-specific deployment: the interface is hard-coded to the DR5 release and is not a general tool that survey teams can deploy against their own data. It does not expose a configuration interface, an API, or a mechanism for overlaying custom source catalogs or highlight regions. Keyboard-only navigation, while functional, is less discoverable than a graphical layer menu for users exploring an unfamiliar dataset with many bands and layers.

# Software design

The primary design decisions center on minimizing data transfers. `TileMaker` serves tiles over a network connection via HTTP protocol such that users can run `TileMaker` wherever the FITS files are stored (i.e. a remote server) while viewing the maps in a local browser. Files therefore need not be transferred between environments solely for the purpose of inspection. Second, production versions can make use of `memcached` to reduce server loads. Finally, the `TileMaker` server in conjunction with the `TileViewer` only sends layer data on-demand to further reduce server loads. Since full layer data is only sent if and when a user requests the layer in the layer menu, a large number of FITS files can be registered with the server without adversely affecting application performance.

`TileViewer` is a single-page application built with TypeScript + React. React is mature, well documented, and remains a popular library for single-page applications. As such, using React ensures that there is a large community of developers capable of contributing to and maintaining the UI. TypeScript further improves the UI's maintainability by clearly defining expected types for server responses, React components, and data structures. In choosing between available map libraries, the two main contenders were OpenLayers and Leaflet. Both are lightweight, versatile, open source, and widely used. Ultimately, OpenLayers was selected because it seamlessly handles the case in which tile sizes differ between layers whereas Leaflet does not. `TileMaker` is built with Python + FastAPI and its [PyPI package](https://pypi.org/project/tilemaker/) includes the static, bundled `TileViewer` to make it a standalone, out-of-the-box web application. FastAPI was chosen for its ease of use, speed, and documentation.

# Research impact statement

`TileMaker` is in active use for ongoing Simons Observatory science operations. While a [production version](https://maps.simonsobservatory.org/) exists with limited public maps, there are hundreds of maps available to members of the Simons Observatory for data quality assessment, calibration validation, and science map inspection. Meanwhile, many other members of the Simons Observatory use `TileMaker` locally in their research.

# AI usage disclosure

In `TileViewer`, both ChatGPT-4o and Claude Sonnet 4.6 have been used in the following ways:

- planning and evaluating visualization libraries
- assisting with refactors pertaining to some functions and components
- investigating error logs
- analyzing described behavior and/or code to pinpoint bugs

AI-assisted and AI-generated code is reviewed and tested during code review via pull requests to verify its quality and correctness.

Claude Sonnet was additionally used to suggest, edit, and proofread content for this paper.

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

Citations in this paper use the following keys, each corresponding to an entry
in `paper.bib`:

- `@ds9`: SAOImageDS9 [@ds9] — Joye & Mandel (2003), _ADASS XII_, ASP
  Conference Series, vol. 295, p. 489. The canonical citation for DS9 as
  recommended by the Chandra X-ray Center.

- `@aladinlite`: Aladin Lite [@aladinlite] — Boch & Fernique (2014), _ADASS
  XXIII_, ASP Conference Series, vol. 485, p. 277.

- `@hips`: The HiPS standard [@hips] — Fernique et al. (2017), IVOA
  Recommendation, arXiv:1708.09704. The normative IVOA specification for the
  Hierarchical Progressive Survey format.

- `@healpix`: HEALPix [@healpix] — Górski et al. (2005), _The Astrophysical
  Journal_, 622, 759–771. DOI: 10.1086/427976.

- `@actviewer`: The NASA LAMBDA ACT Viewer [@actviewer] is cited via the ACT
  DR5 maps paper — Naess et al. (2020), _JCAP_, 2020(12), 046, arXiv:2007.07290
  — which introduced the dataset visualized by the viewer and explicitly
  references the web atlas at
  `https://lambda.gsfc.nasa.gov/toolbox/actviewer/`.

# Figures

<!-- Figures can be included like this:
![Caption for example figure.\label{fig:example}](figure.png)
and referenced from text using \autoref{fig:example}.

Figure sizes can be customized by adding an optional second parameter:
![Caption for example figure.](figure.png){ width=20% } -->

![Screenshot of the Simons Observatory's production map viewer.\label{fig:so_mapviewer}](so_mapviewer.png)

# Acknowledgements

Funding was provided by the Simons Foundation, the University of Pennsylvania, and National Science Foundation grant AST-2153201.

# References
