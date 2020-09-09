---
title: 'Reorient: A Web tool for reorienting and cropping MRI data.'  
tags:
  - Neuroscience
  - Neuroanatomy
  - Neuroimaging
  - Nifti
  - JavaScript
  - Web tool  
authors:
  - name: Katja Heuer  
    orcid: 0000-0002-7237-0196  
    affiliation: "1, 2"
  - name: Roberto Toro^[Corresponding author]  
    orcid: 0000-0002-6671-858X  
    affiliation: "2, 3"  
affiliations:
 - name: Center for Research and Interdisciplinarity, University of Paris  
   index: 1
 - name: Max Planck Institute for Human Cognitive and Brain Sciences  
   index: 2
 - name: Institut Pasteur  
   index: 3
date: 9 September 2020  
bibliography: paper.bib

# Summary
Reorient (https://neuroanatomy.github.io/reorient) is an open source Web application for the manual alignment and cropping of MRI nifti volumes in an intuitive way. The MRI data is dragged onto the Web interface and visualised in an interactive stereotaxic viewer. Users can then translate and rotate the brain by simply dragging inside the 3 view planes, and an adjustable selection box allows to define the crop of the image. Users can save the resulting affine matrix, selection box as well as the reoriented and cropped volume. The affine matrix and selection box can be used later within a scripted workflow, able to reproduce the reoriented volume from the original data. Existing rotation matrices can be loaded or appended.

# Statement of need 
Having a properly oriented MRI dataset is a fundamental step in any neuroimaging workflow. For example, manual segmentation is greatly simplified by the symmetry obtained by aligning brains with respect to the perpendicular stereotaxic planes. In human neuroimaging MRI orientation is often done automatically, using atlas registration to generate an affine matrix representing the rotation and translation necessary to align the superior/inferior, anterior/posterior and left/right directions. However, this is not always the case in other species, or in developmental data. For most species there is no reference atlas, and especially in ex vivo neuroimaging brains are often oriented in arbitrary ways with respect to the stereotaxic planes, and may have large non-tissue space surrounding the brain. Manually configuring the affine matrix, although possible, is difficult and time consuming.

Reorient complements existing tools by providing an intuitive approach for manual image reorientation and all components for a fully reproducible workflow. We have used it extensively to reorient many different vertebrate species, including to reorient and crop data from 60 different primate species. Even for completely arbitrarily oriented brains, with different data encodings and anisotropic voxels, the tool is intuitive to use and provides a fast and precise method to include manual alignment in a reproducible workflow.

# Methods
Reorient was coded in JavaScript and runs as a GitHub Web page. Code style was verified using eslint (https://eslint.org). Unit tests and end-to-end tests were implemented using mocha.js (https://mochajs.org) and puppeteer (https://pptr.dev). Modifications in the code are continuously tested using CircleCI (https://circleci.com).

# Citations

# Figures
![Reorient. A Web tool for reorienting and cropping MRI data. Top: Reorient interface. Interactive stereotaxic viewers with orientation information panel on the side. Dragging is used to easily translate, rotate and crop the data. Save the reorientation matrix and the crop box along with the reoriented Nifti volume for a reproducible workflow. Middle: Reorientation example using a macaque from Prime-DE (site "amu", Brochier et al., 10.5281/zenodo.3402456). Left: Center brain by dragging in the interface. Middle: Rotate brain with respect to the standard view axes. Right: Select brain and crop the surrounding tissue. Bottom: Reorientation result. A reorientation matrix and selection box can be obtained in ~1 min for a typical brain. The image shows the Nifti volume saved by reorient, produced using trilinear interpolation displayed in FSLeyes.\label{fig:reorient}](https://raw.githubusercontent.com/neuroanatomy/reorient/master/img/reorient_180mm_HeuerToro.png)

# Acknowledgements

# References
