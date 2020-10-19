/* globals MUI, $ */

/**
 * @description Global variables
 */
const globals = {
  mouseIsDown: false,
  // Global variable that keeps track of the tool used: Translate, Rotate or Select
  // (set to Translate by default).
  selectedTool: 'Translate',
  cropBox: {
    min: {
      x: -30,
      y: -30,
      z: 0
    },
    max: {
      x: 30,
      y: 30,
      z: 30
    }
  },
  mv: null,
  origMatrix: null,
  prevMatrix: null
};
window.globals = globals;

function updateProgress(e) {
  if (e.lengthComputable) {
    const percentComplete = e.loaded / e.total;
    console.log("%", percentComplete);
  } else {
    console.log('Unable to compute progress information since the total size is unknown');
  }
}

function matrix2str(matrix) {
  const str = matrix.map((row) => {
    return row.map((value) => {
      return ((value>=0)?' ':'') + value.toPrecision(2)
    });
  }).join('\n');

  return str;
}

function printInfo() {
  const {cropBox, mv} = globals;
  const v2m = mv.mri.MatrixVox2Mm;
  const m2v = mv.mri.MatrixMm2Vox;
  const str = [
    `${mv.mri.fileName}`,
    `${mv.mri.dim[0]}x${mv.mri.dim[1]}x${mv.mri.dim[2]}`,
    matrix2str(m2v),
    matrix2str(v2m),
    `(${cropBox.min.x},${cropBox.min.y},${cropBox.min.z})\n(${cropBox.max.x},${cropBox.max.y},${cropBox.max.z})`
  ];
  for(let i = 0; i < str.length; i++ ) {
    document.querySelector(`#info${i}`).innerHTML = `<pre>${str[i]}</pre>`;
}
}

/**
 * Rotation in the X-axis
 * @param {number} a Rotation angle in radians
 */
function alpha(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);

  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Rotation in the Y-axis
 * @param {number} a Rotation angle in radians
 */
function beta(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);

  return [
    [c, 0, -s, 0],
    [0, 1, 0, 0],
    [s, 0, c, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Rotation in the Z-axis
 * @param {number} a Rotation angle in radians
 */
function gamma(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);

  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * 4x4 Identity matrix
 */
function eye() {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

/**
 * Update the current MRI affine matrix
 * @param {array} mat 4x4 matrix
 */
function multiplyAndUpdate(mat) {
  const {mv} = globals;
  let m2v = mv.mri.MatrixMm2Vox;
  const tmp = mv.mri.inv4x4Mat([...m2v[0], ...m2v[1], ...m2v[2], ...m2v[3]]);
  const v2m = [tmp.splice(0, 4), tmp.splice(0, 4), tmp.splice(0, 4), tmp];
  if(globals.prevMatrix === null ) {
    globals.prevMatrix = JSON.parse(JSON.stringify(m2v));
  }
  m2v = mv.mri.multMatMat(globals.prevMatrix, mat);
  mv.mri.MatrixMm2Vox = m2v;
  mv.mri.MatrixVox2Mm = v2m;
}

/**
 * Rotate the current MRI
 * @param {string} axis Rotation axis, either 'x', 'y' or 'z'
 * @param {number} val Rotation angle
 */
function rotate(axis, val) {
  const {mv} = globals;

  if(globals.prevMatrix === null) {
    globals.prevMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));
  }
  switch(axis) {
    case 'x':
      multiplyAndUpdate(alpha(val));
      break;
    case 'y':
      multiplyAndUpdate(beta(val));
      break;
    case 'z':
      multiplyAndUpdate(gamma(val));
      break;
  }
  mv.draw();
  printInfo();
}

/**
 * Translate the current MRI
* @param {array} delta Array with translation [x, y, z]
 */
function trans(delta) {
  const {mv} = globals;
  if(globals.prevMatrix === null) {
    console.log('set');
    globals.prevMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));
  }
  const m = eye();
  const [pix] = mv.mri.pixdim;
  m[0][3] = delta[0]*pix;
  m[1][3] = delta[1]*pix;
  m[2][3] = delta[2]*pix;
  multiplyAndUpdate(m);
  mv.draw();
  printInfo();
}

/**
 * Transform mouse coordinates to canvas
 * @param {object} canvas Viewer canvas
 * @param {object} e Mouse event
 */
function mouse2canvas(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;

  return {
    x: parseInt((e.clientX - r.left)*sx),
    y: parseInt((e.clientY - r.top)*sy)
  };
}

/**
 * Respond to mouse down
 * @param {object} view MRIViewer object
 * @param {object} e Mouse event
 */
function mouseDown(view, e) {
  globals.mouseIsDown = true;
  view.prevMouseCoords = mouse2canvas(view.canvas, e);
  console.log("down on", view.plane, view.prevMouseCoords);
}

/**
 * Respond to mouse move for rotations and translations
 * @param {object} view MRIViewer object
 * @param {object} e Event
 */
function mouseMove(view, e) {
  if( !globals.mouseIsDown ) {
    return;
  }
  const m = mouse2canvas(view.canvas, e);
  const delta = {
    x: m.x - view.prevMouseCoords.x,
    y: m.y - view.prevMouseCoords.y
  };

  switch(globals.selectedTool) {
    case 'Translate':
      switch(view.plane) {
        case 'sag':
          trans([0, -delta.x, delta.y]);
          break;
        case 'cor':
          trans([-delta.x, 0, delta.y]);
          break;
        case 'axi':
          trans([-delta.x, delta.y, 0]);
          break;
      }
      break;
    case 'Rotate': {
      const n = Math.sqrt(view.prevMouseCoords.x*view.prevMouseCoords.x + view.prevMouseCoords.y*view.prevMouseCoords.y);
      const i = {
        x: view.prevMouseCoords.x/n,
        y: view.prevMouseCoords.y/n
      };
      const j = {x:-i.y, y: i.x};
      const x = m.x*i.x + m.y*i.y;
      const y = m.x*j.x + m.y*j.y;
      const angle = Math.atan2(y, x);
      switch(view.plane) {
        case 'sag':
          rotate('z', angle);
          break;
        case 'cor':
          rotate('y', angle);
          break;
        case 'axi':
          rotate('x', angle);
          break;
      }
      break;
    }
  }
}

/**
 * Respond to mouse up, resets the transformation matrix
 */
function mouseUp() {
  globals.mouseIsDown = false;
  globals.prevMatrix = null;
}

/**
 * Update the display of the selection box overlay base
 * on the cropBox dimensions
 */
function updateOverlaysFromCropBox() {
  const {cropBox, mv} = globals;
  /*
  Currently, all views have the same dimensions, which allows us to get rect only
  from the first one
  */
  const rect = mv.views[0].canvas.getBoundingClientRect();

  // the size of the cropBox in millimetres
  const worldBox = [
    cropBox.min.x, cropBox.min.y, cropBox.min.z,
    cropBox.max.x, cropBox.max.y, cropBox.max.z
  ];

  // the size of the cropBox in screen pixels
  const screenBox = worldBox.map((o) => o*rect.width/mv.dimensions.absolute.sag.W);
  const min = {
    x: screenBox[0],
    y: screenBox[1],
    z: screenBox[2]
  };
  const max = {
    x: screenBox[3],
    y: screenBox[4],
    z: screenBox[5]
  };

  for(const view of mv.views) {
    const [ov] = $(view.elem).find('.overlay');
    switch(view.plane) {
      case 'sag':
        $(ov).css({
          left: `calc( 50% + (${min.y}px) )`,
          top: `calc( 50% + (${-max.z}px) )`,
          width: `${max.y - min.y}px`,
          height: `${max.z - min.z}`
        });
        break;
      case 'cor':
        $(ov).css({
          left: `calc( 50% + (${min.x}px) )`,
          top: `calc( 50% + (${-max.z}px) )`,
          width: `${max.x - min.x}`,
          height: `${max.z - min.z}`
        });
        break;
      case 'axi':
        $(ov).css({
          left: `calc( 50% + (${min.x}px) )`,
          top: `calc( 50% + (${-max.y}px) )`,
          width: `${max.x - min.x}px`,
          height: `${max.y - min.y}px`
        });
        break;
    }
  }
}

/**
 * Update the cropBox based on the displayed overlay
 * @param {object} view MRIViewer object
 * @param {object} box A rectangle with properties {left, top, width, height}
 */
function updateCropBoxFromOverlay(view, box) {
  const {mv, cropBox} = globals;
  const rect = view.canvas.getBoundingClientRect();
  const g = mv.dimensions.absolute.sag.W/rect.width;

  switch(view.plane) {
    case 'sag':
      cropBox.min.y = Math.round(g*(box.left - rect.width/2));
      cropBox.min.z = Math.round(g*(rect.height/2 - box.top - box.height));
      cropBox.max.y = Math.round(g*(box.width + box.left - rect.width/2));
      cropBox.max.z = Math.round(g*(rect.height/2 - box.top));
      break;
    case 'cor':
      cropBox.min.x = Math.round(g*(box.left - rect.width/2));
      cropBox.min.z = Math.round(g*(rect.height/2 - box.top - box.height));
      cropBox.max.x = Math.round(g*(box.width + box.left - rect.width/2));
      cropBox.max.z = Math.round(g*(rect.height/2 - box.top));
      break;
    case 'axi':
      cropBox.min.x = Math.round(g*(box.left - rect.width/2));
      cropBox.min.y = Math.round(g*(rect.height/2 - box.top - box.height));
      cropBox.max.x = Math.round(g*(box.width + box.left - rect.width/2));
      cropBox.max.y = Math.round(g*(rect.height/2 - box.top));
      break;
  }
  updateOverlaysFromCropBox();
  printInfo();
}

/**
 * Reset the MRI affine matrix to its original value
 */
function resetMatrix() {
  const {mv, origMatrix} = globals;
  mv.mri.MatrixMm2Vox = JSON.parse(JSON.stringify(origMatrix));
  globals.prevMatrix = null;
  multiplyAndUpdate(eye());
  mv.draw();
  printInfo();
}

/**
 * Load an affine matrix from a text file. Use it instead of
 * the one in the current MRI.
 */
function loadMatrix() {
  const {mv} = globals;
  const input=document.createElement("input");
  input.type="file";
  input.onchange=function() {
    const [file]=this.files;
    const reader = new FileReader();
    reader.onload = function(e) {
      const str = e.target.result;
      const arr = str.split('\n');
      const v2m = arr.map((o) => o.split(' ').map((oo) => parseFloat(oo))).slice(0, 4);
      mv.mri.NiiHdrLE.fields.srow_x[0] = v2m[0][0];
      mv.mri.NiiHdrLE.fields.srow_x[1] = v2m[0][1];
      mv.mri.NiiHdrLE.fields.srow_x[2] = v2m[0][2];
      mv.mri.NiiHdrLE.fields.srow_x[3] = v2m[0][3];
      mv.mri.NiiHdrLE.fields.srow_y[0] = v2m[1][0];
      mv.mri.NiiHdrLE.fields.srow_y[1] = v2m[1][1];
      mv.mri.NiiHdrLE.fields.srow_y[2] = v2m[1][2];
      mv.mri.NiiHdrLE.fields.srow_y[3] = v2m[1][3];
      mv.mri.NiiHdrLE.fields.srow_z[0] = v2m[2][0];
      mv.mri.NiiHdrLE.fields.srow_z[1] = v2m[2][1];
      mv.mri.NiiHdrLE.fields.srow_z[2] = v2m[2][2];
      mv.mri.NiiHdrLE.fields.srow_z[3] = v2m[2][3];
      mv.mri.MatrixMm2Vox = mv.mri.mm2vox();
      globals.prevMatrix = null;
      multiplyAndUpdate(eye());
      mv.draw();
      printInfo();
    };
    reader.readAsText(file);
  };
  input.click();
}

/**
 * Load an affine matrix from a text file. Append it to
 * the one in the current MRI.
 */
function appendMatrix() {
  const {mv} = globals;
  const input=document.createElement("input");
  input.type="file";
  input.onchange=function() {
    const [file]=this.files;
    const reader = new FileReader();
    reader.onload = function(e) {
      const str = e.target.result;
      const arr = str.split('\n');
      const newV2M = arr.map((o) => o.split(' ').map((oo) => parseFloat(oo))).slice(0, 4);
      const v2m = mv.mri.multMatMat(mv.mri.MatrixVox2Mm, newV2M);
      mv.mri.NiiHdrLE.fields.srow_x[0] = v2m[0][0];
      mv.mri.NiiHdrLE.fields.srow_x[1] = v2m[0][1];
      mv.mri.NiiHdrLE.fields.srow_x[2] = v2m[0][2];
      mv.mri.NiiHdrLE.fields.srow_x[3] = v2m[0][3];
      mv.mri.NiiHdrLE.fields.srow_y[0] = v2m[1][0];
      mv.mri.NiiHdrLE.fields.srow_y[1] = v2m[1][1];
      mv.mri.NiiHdrLE.fields.srow_y[2] = v2m[1][2];
      mv.mri.NiiHdrLE.fields.srow_y[3] = v2m[1][3];
      mv.mri.NiiHdrLE.fields.srow_z[0] = v2m[2][0];
      mv.mri.NiiHdrLE.fields.srow_z[1] = v2m[2][1];
      mv.mri.NiiHdrLE.fields.srow_z[2] = v2m[2][2];
      mv.mri.NiiHdrLE.fields.srow_z[3] = v2m[2][3];
      mv.mri.MatrixMm2Vox = mv.mri.mm2vox();
      globals.prevMatrix = null;
      multiplyAndUpdate(eye());
      mv.draw();
      printInfo();
    };
    reader.readAsText(file);
  };
  input.click();
}

/**
 * Save the affine matrix of the current MRI
 * to a text file.
 */
function saveMatrix() {
  const {mv} = globals;
  const a = document.createElement('a');
  const m = mv.mri.MatrixVox2Mm;
  const str = m.map((o) => o.join(' ')).join('%0A');
  a.href = 'data:text/plain;charset=utf-8,' + str;
  const name = prompt("Save Voxel To World Matrix (the inverse of the one displayed) As...", "reorient.mat");
  if(name !== null) {
    a.download=name;
    document.body.appendChild(a);
    a.click();
  }
}

/**
 * Load a volume selection from a text file.
 */
function loadSelection() {
  const {cropBox, mv} = globals;
  const input=document.createElement("input");
  input.type="file";
  input.onchange=function() {
    const [file]=this.files;
    const reader = new FileReader();
    reader.onload = function(e) {
      const str = e.target.result;
      const arr = str.split('\n');
      const sel = arr.map((o) => o.split(' ').map((oo) => parseFloat(oo)));
      cropBox.min = {
        x: sel[0][0],
        y: sel[0][1],
        z: sel[0][2]
      };
      cropBox.max = {
        x: sel[1][0],
        y: sel[1][1],
        z: sel[1][2]
      };
      updateOverlaysFromCropBox();
      mv.draw();
      printInfo();
    };
    reader.readAsText(file);
  };
  input.click();
}

/**
 * Save the current selection to a text file.
 */
function saveSelection() {
  const {cropBox} = globals;
  const a = document.createElement('a');
  const str =[
    [cropBox.min.x, cropBox.min.y, cropBox.min.z].join(' '),
    [cropBox.max.x, cropBox.max.y, cropBox.max.z].join(' ')
  ].join('%0A');
  a.href = 'data:text/plain;charset=utf-8,' + str;
  const name = prompt("Save Selection As...", "selection.txt");
  if(name !== null) {
    a.download=name;
    document.body.appendChild(a);
    a.click();
  }
}

/**
 * Load a nifti file.
 */
function loadNifti() {
  const input=document.createElement("input");
  input.type="file";
  input.onchange=function() {
    const [file]=this.files;
    console.log('loading', file);
    init(file);
  };
  input.click();
}

/**
 * Save the transformed version of the current MRI
 * in nifti format.
 */
function saveNifti() {
  const {cropBox, mv} = globals;
  const {pixdim} = mv.dimensions.absolute;
  const dim = [
    Math.ceil(cropBox.max.x - cropBox.min.x),
    Math.ceil(cropBox.max.y - cropBox.min.y),
    Math.ceil(cropBox.max.z - cropBox.min.z)
  ];

  console.log("Crop volume dimensions:", dim);

  // Crop
  const data = new Float32Array(dim[0]*dim[1]*dim[2]);

  for(let i=0; i<dim[0]; i++) {
    for(let j=0; j<dim[1]; j++) {
      for(let k=0; k<dim[2]; k++) {
        const w = [
          (cropBox.min.x + i)*pixdim[0],
          (cropBox.min.y + j)*pixdim[1],
          (cropBox.min.z + k)*pixdim[2]
        ];
        const val = mv.A2Value(w);
        data[k*dim[1]*dim[0] + j*dim[0] + i] = val;
      }
    }
  }
  const v2m = [
    [pixdim[0], 0, 0, cropBox.min.x*pixdim[0]],
    [0, pixdim[1], 0, cropBox.min.y*pixdim[1]],
    [0, 0, pixdim[2], cropBox.min.z*pixdim[2]],
    [0, 0, 0, 1]
  ];
  const niigz = mv.mri.createNifti(dim, pixdim, v2m, data);
  const name = prompt("Save selection as...", "reoriented.nii.gz");
  if(name !== null) {
    mv.mri.saveNifti(niigz, name);
  }
}

/**
 * Create an MRI viewer with 3 panes
 */
function _newMRIViewer({file, path}) {
  globals.mv = new MRIViewer({
    mriFile: file,
    mriPath: path,
    space: "absolute",
    views: [
      { elem: $('#viewer1').get(0), plane: 'sag' },
      { elem: $('#viewer2').get(0), plane: 'cor' },
      { elem: $('#viewer3').get(0), plane: 'axi' }
    ]
  });
}

/**
 * Load and display the MRI views
 */
async function _display() {
  const {mv} = globals;

  try {
    await mv.display(updateProgress);
  } catch(err) {
    throw new Error(err);
  }

  // Save the original matrix for reset
  globals.origMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));

  // Add click event listeners
  for(let ii=0; ii<mv.views.length; ii++) {
    (function(i) {
      mv.views[i].canvas.addEventListener('mousedown', (e) => mouseDown(mv.views[i], e));
      mv.views[i].canvas.addEventListener('mousemove', (e) => mouseMove(mv.views[i], e));
      mv.views[i].canvas.addEventListener('mouseup', (e) => mouseUp(mv.views[i], e));
    }(ii));
  }

  // Add an overlay for the cropping
  for(let ii=0; ii<mv.views.length; ii++) {
    $(mv.views[ii].elem).find('.wrap')
      .append(`<div class='overlay' id='overlay${ii}'>`);
    (function(i) {
      MUI.crop(`#overlay${i}`, (box) => { updateCropBoxFromOverlay(mv.views[i], box); });
    }(ii));
  }
  updateOverlaysFromCropBox();

  // print transformation matrix
  printInfo();

  $('span').show();
  $('#tools, #saveNifti, #loadSelection, #saveSelection, #loadMatrix, #appendMatrix, #saveMatrix, #resetMatrix, #info').show();
  $('#buttons').removeClass('init');
  $('#loadNifti').removeClass('mui-no-border');
}

/**
 * Start Reorient from an MRI file path
 * @param {string} path Local path to MRI file
 */
async function initWithPath(path) {
  _newMRIViewer({path});
  await _display();
  console.log("globals.mv.mri", globals.mv.mri);
}

/**
 * Start Reorient from a File object
 * @param {object} file File object
 */
async function init(file) {
  _newMRIViewer({file: file});
  await _display();
}

/**
 * Connect UI elements to functions
 * @param {object} MUI Reference to UI widgets
 */
function initUI(MUI) {
  // Initialise UI
  MUI.chose($('#tools'), function(option) {
    globals.selectedTool = option;
    if(globals.selectedTool === 'Select') {
      $('.overlay').show();
    } else {
      $('.overlay').hide();
    }
  });
  MUI.push($('#loadNifti'), loadNifti);
  MUI.push($('#saveNifti'), saveNifti);
  MUI.push($('#loadMatrix'), loadMatrix);
  MUI.push($('#appendMatrix'), appendMatrix);
  MUI.push($('#saveMatrix'), saveMatrix);
  MUI.push($('#loadSelection'), loadSelection);
  MUI.push($('#saveSelection'), saveSelection);
  MUI.push($('#resetMatrix'), resetMatrix);
}
