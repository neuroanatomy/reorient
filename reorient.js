// Global variable used to detect mouse drag
var mouseIsDown = false;

// Global variable that keeps track of the tool used: Translate, Rotate or Select
// (set to Translate by default).
var selectedTool = 'Translate';

var cropBox = {
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
};

// Initialise UI
MUI.chose($('#tools'), function(option) {
    selectedTool = option;
    if(selectedTool == 'Select') {
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

var mv;

// Initialise mriviewerjs
function init(file) {
    mv = new MRIViewer({
    //    mriPath: 'http://localhost/reorient/data/sloth_bear.nii.gz',
    //    mriPath: 'http://localhost/mrijs/data/2dseq-1.nii.gz',
    //    mriPath: 'data/sloth_bear.nii.gz',
    //    mriPath: 'data/ApelleCebusApell_f4b9.nii.gz',
        mriFile: file,
        views: [
                { elem: $('#viewer1').get(0), plane: 'sag' },
                { elem: $('#viewer2').get(0), plane: 'cor' },
                { elem: $('#viewer3').get(0), plane: 'axi' }
        ]
    });
    console.log('load and display mri');
    mv.display(updateProgress)
    .then( (o)=> {
        console.log('got', o);
        if(0) {
            // print nii header
            var h=JSON.stringify(MRI.NiiHdrLE.fields,undefined,2);
            $('body').append('<pre>'+h+'</pre>');
        }

        // Save the original matrix for reset
        origMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));

        // Add click event listeners
        var ii;
        for(ii=0; ii<mv.views.length; ii++) {
            (function(i) {
                mv.views[i].canvas.addEventListener('mousedown', (e)=>mouseDown(mv.views[i], e));
                mv.views[i].canvas.addEventListener('mousemove', (e)=>mouseMove(mv.views[i], e));
                mv.views[i].canvas.addEventListener('mouseup', (e)=>mouseUp(mv.views[i], e));
            }(ii));
        }

        // Add an overlay for the cropping
        for(ii=0; ii<mv.views.length; ii++) {
            $(mv.views[ii].elem).find('.wrap').append(`<div class='overlay' id='overlay${ii}'>`);
            (function(i) {
                MUI.crop(`#overlay${i}`, (box) => {updateCropBoxFromOverlay(mv.views[i], box)});
            }(ii));
        }
        updateOverlaysFromCropBox();

        // print transformation matrix
        printInfo();

        /*
        // display voxel volume
        // render 3d box
        var mat = [
            [mv.mri.dim[0],0,0,-mv.mri.dim[0]/2],
            [0,mv.mri.dim[1],0,-mv.mri.dim[1]/2],
            [0,0,mv.mri.dim[2],-mv.mri.dim[2]/2],
            [0,0,0,1]
        ];
        initRenderer(mat);
        animate(mat);
        */

        $('span').show();
        $('#tools, #saveNifti, #loadSelection, #saveSelection, #loadMatrix, #appendMatrix, #saveMatrix, #resetMatrix, #info').show();
        $('#buttons').removeClass('init');
        $('#loadNifti').removeClass('mui-no-border');

    })
    .catch((err)=>{
        console.log(err);
    });
}

function updateProgress(e) {
    if (oEvent.lengthComputable) {
        var percentComplete = oEvent.loaded / oEvent.total;
        console.log("%", percentComplete);
    } else {
        console.log('Unable to compute progress information since the total size is unknown');
    }
}

function printInfo() {
    var v2m = mv.mri.MatrixVox2Mm;
    var m2v = mv.mri.MatrixMm2Vox;
    var str1=matrix2str(m2v);
    var str3=matrix2str(v2m);
    var str2=`(${cropBox.min.x},${cropBox.min.y},${cropBox.min.z})\n(${cropBox.max.x},${cropBox.max.y},${cropBox.max.z})`;
    $('#info1').html(`<pre>${str1}`);
    $('#info2').html(`<pre>${str3}`);
    $('#info3').html(`<pre>${str2}`);
}

function alpha(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [
        [c,-s, 0, 0],
        [s, c, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
}

function beta(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [
        [c, 0,-s, 0],
        [0, 1, 0, 0],
        [s, 0, c, 0],
        [0, 0, 0, 1]
    ];
}

function gamma(a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [
        [1, 0, 0, 0],
        [0, c,-s, 0],
        [0, s, c, 0],
        [0, 0, 0, 1]
    ];
}

function eye() {
    return [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
}

let origMatrix = null;
let prevMatrix = null;
function multiplyAndUpdate(mat) {
    var m2v = mv.mri.MatrixMm2Vox;
    var tmp = mv.mri.inv4x4Mat([...m2v[0], ...m2v[1], ...m2v[2], ...m2v[3]]);
    var v2m = [tmp.splice(0,4), tmp.splice(0,4), tmp.splice(0,4), tmp];
    if(prevMatrix == null ) {
        prevMatrix = JSON.parse(JSON.stringify(m2v));
    }
    m2v = mv.mri.multMatMat(prevMatrix, mat);
    mv.mri.MatrixMm2Vox = m2v;
    mv.mri.MatrixVox2Mm = v2m;
}

function rotate(axis, val) {
    //val = val/10;
    console.log(`rotate ${val}`);
    if(prevMatrix === null) {
        prevMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));
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
  * @param array array containing 3 values: [dx, dy, dz]
  */
function trans(delta) {
    //val = parseInt(val);
    if(prevMatrix === null) {
        console.log('set');
        prevMatrix = JSON.parse(JSON.stringify(mv.mri.MatrixMm2Vox));
    }
    let m = eye();
    const pix = mv.mri.pixdim[0];
    m[0][3] = delta[0]*pix;
    m[1][3] = delta[1]*pix;
    m[2][3] = delta[2]*pix;
    multiplyAndUpdate(m)
    mv.draw();
    printInfo();
}

function release(el) {
    console.log('release');
    prevMatrix = null;
    el.value = 0;
}

function mouse2canvas(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;

    return {
        x: parseInt((e.clientX - r.left)*sx),
        y: parseInt((e.clientY - r.top)*sy)
    }
}

function mouseDown(view, e) {
    mouseIsDown = true;
    view.prevMouseCoords = mouse2canvas(view.canvas, e);
    prevCropBox = JSON.parse(JSON.stringify(cropBox));
    console.log("down on", view.plane, view.prevMouseCoords);
}

function mouseMove(view, e) {
    if( !mouseIsDown ) {
        return;
    }
    //console.log("move on", view.plane, mouse2canvas(view.canvas, e));
    let m = mouse2canvas(view.canvas, e);
    let delta = {
        x: m.x - view.prevMouseCoords.x,
        y: m.y - view.prevMouseCoords.y
    }

    switch(selectedTool) {
        case 'Translate':
            switch(view.plane) {
                case 'sag':
                    trans([0,-delta.x,delta.y]);
                    break;
                case 'cor':
                    trans([-delta.x,0,delta.y]);
                    break;
                case 'axi':
                    trans([-delta.x,delta.y,0]);
                    break;
            }
            break;
        case 'Rotate':
            let n = Math.sqrt(view.prevMouseCoords.x*view.prevMouseCoords.x + view.prevMouseCoords.y*view.prevMouseCoords.y);
            let i = {
                x: view.prevMouseCoords.x/n,
                y: view.prevMouseCoords.y/n
            };
            let j = {x:-i.y, y: i.x};
            let x = m.x*i.x + m.y*i.y;
            let y = m.x*j.x + m.y*j.y;
            let angle = Math.atan2(y,x);
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

function mouseUp(view, e) {
    mouseIsDown = false;
    prevMatrix = null;
}

function matrix2str(matrix) {
    var str=matrix.map(row=>row.map(value=>((value>=0)?' ':'')+value.toPrecision(2))).join('\n');
    return str;
}

function updateOverlaysFromCropBox() {
    let view;
    let rect;
    let screenBox; // the size of the cropBox in screen pixels
    let worldBox; // the size of the cropBox in millimetres
    let max, min;

    /* Currently, all views have the same dimensions, which allows us to get rect only
       from the first one
    */
    rect = mv.views[0].canvas.getBoundingClientRect();
    worldBox = [cropBox.min.x,cropBox.min.y,cropBox.min.z,cropBox.max.x,cropBox.max.y,cropBox.max.z];
    screenBox = worldBox.map((o) => o*rect.width/mv.dimensions.absolute.sag.W);
    min = {
        x: screenBox[0],
        y: screenBox[1],
        z: screenBox[2]
    };
    max = {
        x: screenBox[3],
        y: screenBox[4],
        z: screenBox[5]
    };

    for(view of mv.views) {
        let ov = $(view.elem).find('.overlay')[0];
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

function updateCropBoxFromOverlay(view, box) {
    let rect = view.canvas.getBoundingClientRect();
    let g = mv.dimensions.absolute.sag.W/rect.width;

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

function resetMatrix() {
    console.log('reset matrix');
    mv.mri.MatrixMm2Vox = JSON.parse(JSON.stringify(origMatrix));
    multiplyAndUpdate(eye());
    mv.draw();
    printInfo();
}

function loadMatrix() {
    var input=document.createElement("input");
    input.type="file";
    input.onchange=function(e){
        var file=this.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            let str = e.target.result;
            let arr = str.split('\n');
            let v2m = arr.map((o) => o.split(' ').map((oo)=>parseFloat(oo))).slice(0,4);
            mv.mri.NiiHdrLE.fields.srow_x[0] = v2m[0][0]
            mv.mri.NiiHdrLE.fields.srow_x[1] = v2m[0][1]
            mv.mri.NiiHdrLE.fields.srow_x[2] = v2m[0][2]
            mv.mri.NiiHdrLE.fields.srow_x[3] = v2m[0][3]
            mv.mri.NiiHdrLE.fields.srow_y[0] = v2m[1][0]
            mv.mri.NiiHdrLE.fields.srow_y[1] = v2m[1][1]
            mv.mri.NiiHdrLE.fields.srow_y[2] = v2m[1][2]
            mv.mri.NiiHdrLE.fields.srow_y[3] = v2m[1][3]
            mv.mri.NiiHdrLE.fields.srow_z[0] = v2m[2][0]
            mv.mri.NiiHdrLE.fields.srow_z[1] = v2m[2][1]
            mv.mri.NiiHdrLE.fields.srow_z[2] = v2m[2][2]
            mv.mri.NiiHdrLE.fields.srow_z[3] = v2m[2][3]
            mv.mri.MatrixMm2Vox = mv.mri.mm2vox();
            multiplyAndUpdate(eye());
            mv.draw();
            printInfo();
        };
        reader.readAsText(file);
    }
    input.click();
}
function appendMatrix() {
    var input=document.createElement("input");
    input.type="file";
    input.onchange=function(e){
        var file=this.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            let str = e.target.result;
            let arr = str.split('\n');
            let newV2M = arr.map((o) => o.split(' ').map((oo)=>parseFloat(oo))).slice(0,4);
            let v2m = mv.mri.multMatMat(mv.mri.MatrixVox2Mm, newV2M);
            mv.mri.NiiHdrLE.fields.srow_x[0] = v2m[0][0]
            mv.mri.NiiHdrLE.fields.srow_x[1] = v2m[0][1]
            mv.mri.NiiHdrLE.fields.srow_x[2] = v2m[0][2]
            mv.mri.NiiHdrLE.fields.srow_x[3] = v2m[0][3]
            mv.mri.NiiHdrLE.fields.srow_y[0] = v2m[1][0]
            mv.mri.NiiHdrLE.fields.srow_y[1] = v2m[1][1]
            mv.mri.NiiHdrLE.fields.srow_y[2] = v2m[1][2]
            mv.mri.NiiHdrLE.fields.srow_y[3] = v2m[1][3]
            mv.mri.NiiHdrLE.fields.srow_z[0] = v2m[2][0]
            mv.mri.NiiHdrLE.fields.srow_z[1] = v2m[2][1]
            mv.mri.NiiHdrLE.fields.srow_z[2] = v2m[2][2]
            mv.mri.NiiHdrLE.fields.srow_z[3] = v2m[2][3]
            mv.mri.MatrixMm2Vox = mv.mri.mm2vox();
            multiplyAndUpdate(eye());
            mv.draw();
            printInfo();
        };
        reader.readAsText(file);
    }
    input.click();
}
function saveMatrix() {
    var a = document.createElement('a');
    var m = mv.mri.MatrixVox2Mm;
    var str = m.map((o) => o.join(' ')).join('\n');
    a.href = 'data:text/csv;charset=utf-8,' + str;
    let name = prompt("Save Voxel To World Matrix (the inverse of the one displayed) As...", "reorient.mat");
    if(name !== null) {
        a.download=name;
        document.body.appendChild(a);
        a.click();
    }
}
function loadSelection() {
    var input=document.createElement("input");
    input.type="file";
    input.onchange=function(e){
        var file=this.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            let str = e.target.result;
            let arr = str.split('\n');
            let sel = arr.map((o) => o.split(' ').map((oo)=>parseFloat(oo)));
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
    }
    input.click();
}
function saveSelection() {
    var a = document.createElement('a');
    var str =[
        [cropBox.min.x, cropBox.min.y, cropBox.min.z].join(' '),
        [cropBox.max.x, cropBox.max.y, cropBox.max.z].join(' ')
    ].join('\n');
    a.href = 'data:text/csv;charset=utf-8,' + str;
    let name = prompt("Save Selection As...", "selection.txt");
    if(name !== null) {
        a.download=name;
        document.body.appendChild(a);
        a.click();
    }
}
function loadNifti() {
    var input=document.createElement("input");
    input.type="file";
    input.onchange=function(e){
        var file=this.files[0];
        console.log('loading', file);
        init(file);
    }
    input.click();
}
function saveNifti() {
    let rect = mv.views[0].canvas.getBoundingClientRect();
    let pixdim = mv.dimensions.absolute.pixdim;
    let dim = [
        Math.ceil(cropBox.max.x - cropBox.min.x),//*pixdim[0]),
        Math.ceil(cropBox.max.y - cropBox.min.y),//*pixdim[1]),
        Math.ceil(cropBox.max.z - cropBox.min.z)//*pixdim[2])
    ];

    console.log("Crop volume dimensions:", dim);
    
    // Crop
    let data = new Float32Array(dim[0]*dim[1]*dim[2]);
    let x, y, z;
    let i, s, w;
    let ijk;
    for(i=0;i<dim[0];i++) {
        for(j=0;j<dim[1];j++) {
            for(k=0;k<dim[2];k++) {
                w = [
                    (cropBox.min.x + i)*pixdim[0],
                    (cropBox.min.y + j)*pixdim[1],
                    (cropBox.min.z + k)*pixdim[2]
                ];
                val = mv.A2Value(w);
                data[k*dim[1]*dim[0] + j*dim[0] + i] = val;
            }
        }
    }
    let v2m = [
        [pixdim[0], 0, 0, cropBox.min.x*pixdim[0]],
        [0, pixdim[1], 0, cropBox.min.y*pixdim[1]],
        [0, 0, pixdim[2], cropBox.min.z*pixdim[2]],
        [0,0,0,1]
    ];
    let niigz = mv.mri.createNifti(dim, pixdim, v2m, data);
    let name = prompt("Save selection as...", "reoriented.nii.gz");
    if(name !== null) {
        mv.mri.saveNifti(niigz, name);
    }
}

/*
//
//    3D render
//
var    R,S,C,T,M;
function newVector(vec) {
    return new THREE.Vector3(vec[0],vec[1],vec[2])
}
function initRenderer(mat) {
    R = new THREE.WebGLRenderer({canvas:document.getElementById('3d')});
    var w=300, h=300;
    R.setSize(w,h);
    R.setClearColor(new THREE.Color( 0xffffff ));
    S = new THREE.Scene();
//        C = new THREE.PerspectiveCamera( 50, w/h, 1, 2000);
//        C.position.z = 1000;
    C = new THREE.OrthographicCamera(-w,w,h,-h,-1e6,1e6);
    C.position.y=20000;
    C.lookAt(new THREE.Vector3(0,0,0));
    C.up=new THREE.Vector3(0,0,1);
    S.add(C);
    T = new THREE.TrackballControls(C,R.domElement);
    
    // draw a box with lines
    // draw axes
    var line_r = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 2});
    var line_g = new THREE.LineBasicMaterial({color: 0x00ff00, linewidth: 2});
    var line_b = new THREE.LineBasicMaterial({color: 0x0000ff, linewidth: 2});
    var line_x = new THREE.Geometry();
    var line_y = new THREE.Geometry();
    var line_z = new THREE.Geometry();
    line_x.vertices.push( newVector(mv.mri.multMatVec(mat,[0,0,0])), newVector(mv.mri.multMatVec(mat,[1,0,0])));
    S.add( new THREE.Line( line_x, line_r ) );
    line_y.vertices.push( newVector(mv.mri.multMatVec(mat,[0,0,0])), newVector(mv.mri.multMatVec(mat,[0,1,0])));
    S.add( new THREE.Line( line_y, line_g ) );
    line_z.vertices.push( newVector(mv.mri.multMatVec(mat,[0,0,0])), newVector(mv.mri.multMatVec(mat,[0,0,1])));
    S.add( new THREE.Line( line_z, line_b ) );
    // end: axes
    // draw outline
    var line_w = new THREE.LineBasicMaterial({color: 0xcfcfcf, linewidth: 1});
    var line_o = new THREE.Geometry();
    line_o.vertices.push(...[
        [1,1,1], [1,0,1], [1,0,0], [1,1,0],
        [1,1,1], [0,1,1], [0,0,1], [1,0,1]
     ].map(function(v){return newVector(mv.mri.multMatVec(mat,v));}));
    S.add( new THREE.Line( line_o, line_w ) );
    var line_o = new THREE.Geometry();
    line_o.vertices.push(...[
        [1,1,0], [0,1,0], [0,1,1]
     ].map(function(v){return newVector(mv.mri.multMatVec(mat,v));}));
    S.add( new THREE.Line( line_o, line_w ) );
    // end: draw outline
    
    // update dimensions
    $('#minx').text(-10);
    $('#maxx').text(10);
    $('#miny').text(-10);
    $('#maxy').text(-10);
    $('#3d').css('border','thin solid black');
}

function screenXY(x,y,z) {
    var vector = new THREE.Vector3(x,y,z);
    var canvas = R.domElement;

    // map to normalized device coordinate space
    vector.project(C);

    // map to 2D screen space
    return {
        x: Math.round( (   vector.x + 1 ) * canvas.width  / 2 ),
        y: Math.round( ( - vector.y + 1 ) * canvas.height / 2 )
    }
}

function render() {
    R.render(S,C);
    T.update();
}
function animate(mat) {
    requestAnimationFrame(function(){animate(mat)});
    render();
    
    var p;
    var o=[R.domElement.offsetLeft,R.domElement.offsetTop];
    var d=[R.domElement.width,R.domElement.height];
    var x=mv.mri.multMatVec(mat,[1,0,0])
    var y=mv.mri.multMatVec(mat,[0,1,0])
    var z=mv.mri.multMatVec(mat,[0,0,1])
    p=screenXY(x[0],x[1],x[2]);
    $("#x").css({left:p.x+o[0], top:p.y+o[1]});
    p=screenXY(y[0],y[1],y[2]);
    $("#y").css({left:p.x+o[0], top:p.y+o[1]});
    p=screenXY(z[0],z[1],z[2]);
    $("#z").css({left:p.x+o[0], top:p.y+o[1]});
    
    $('#minx').css({left:o[0],      top:o[1]+d[1]});
    $('#maxx').css({left:o[0]+d[0], top:o[1]+d[1]});
    $('#miny').css({left:o[0],      top:o[1]+d[1]});
    $('#maxy').css({left:o[0],      top:o[1]});
}
*/
