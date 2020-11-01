# Reorient

A Web tool for reorienting and cropping MRI data.

Roberto Toro & Katja Heuer, January 2018

[![CircleCI](https://circleci.com/gh/neuroanatomy/reorient.svg?style=shield)](https://circleci.com/gh/neuroanatomy/reorient)
[![DOI](https://zenodo.org/badge/135712498.svg)](https://zenodo.org/badge/latestdoi/135712498)
[![DOI](https://joss.theoj.org/papers/10.21105/joss.02670/status.svg)](https://doi.org/10.21105/joss.02670)



<img width="1260" alt="screenshot" src="https://raw.githubusercontent.com/neuroanatomy/reorient/master/img/reorient.png">


Having a properly oriented MRI dataset is a fundamental step in any neuroimaging workflow. For example, manual segmentation is greatly simplified by the symmetry obtained by aligning brains with respect to the perpendicular stereotaxic planes. In human neuroimaging MRI orientation is often done automatically, using atlas registration to generate an affine matrix representing the rotation and translation necessary to align the superior/inferior, anterior/posterior and left/right directions. However, this is not always the case in other species, or in developmental data. For most species there is no reference atlas, and especially in ex vivo neuroimaging brains are often oriented in arbitrary ways with respect to the stereotaxic planes, and may have large non-tissue space surrounding the brain. Manually configuring the affine matrix, although possible, is difficult and time consuming. 

Reorient (https://neuroanatomy.github.io/reorient) is an open source Web application for the manual alignment and cropping of MRI nifti volumes in an intuitive way. The MRI data is dragged onto the Web interface and visualised in an interactive stereotaxic viewer. Users can then translate and rotate the brain by simply dragging inside the 3 view planes, and an adjustable selection box allows to define the crop of the image. Users can save the resulting affine matrix, selection box as well as the reoriented and cropped volume. The affine matrix and selection box can be used later within a scripted workflow, able to reproduce the reoriented volume from the original data. Existing rotation matrices can be loaded or appended.

Reorient complements existing tools by providing an intuitive approach for manual image reorientation and all components for a fully reproducible workflow. We have used it extensively to reorient many different vertebrate species, including to reorient and crop data from 60 different primate species. Even for completely arbitrarily oriented brains, with different data encodings and anisotropic voxels, the tool is intuitive to use and provides a fast and precise method to include manual alignment in a reproducible workflow.

### Doc
A description of a typical workflow can be found in the [doc](https://neuroanatomy.github.io/reorient/doc.html).

### How to cite reorient
Heuer, K, & Toro, R (2020). Reorient: A Web tool for reorienting and cropping MRI data. Journal of Open Source Software, 5(53), 2670. [https://doi.org/10.21105/joss.02670](https://doi.org/10.21105/joss.02670).  
🥰 Thank you.

