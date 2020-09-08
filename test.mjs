import assert from 'assert';
import puppeteer from 'puppeteer';

function compareMatrices(a, b) {
  let sum = 0;
  for(let i=0;i<4;i++) {
    for(let j=0;j<4;j++) {
      sum += (a[i][j] - b[i][j])**2;
    }
  }
  return Math.sqrt(sum);
}

describe('Test Reorient', () => {
  let browser, page;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    await page.goto('http://127.0.0.1:8080');  
  });

  describe('Unit tests', () => {
    describe('eye()', () => {
      it('should return identity matrix', async () => {
        const I = await page.evaluate(() => {
          return window.eye();
        });
        const expected = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        assert.deepEqual(I, expected);
      });
    });
    describe('alpha(π/2)', () => {
      it('should return a 90 deg X rotation matrix', async () => {
        const a = await page.evaluate(() => {
          return window.alpha(Math.PI/2.0);
        });
        const expected = [[ 0,-1,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,1]];
        assert(compareMatrices(a,expected)<1e-6, "Element-by-element squared distance too large");
      });
    });
    describe('beta(π/2)', () => {
      it('should return a 90 deg Y rotation matrix', async () => {
        const a = await page.evaluate(() => {
          return window.beta(Math.PI/2.0);
        });
        const expected = [[0,0,-1,0],[0,1,0,0],[1,0,0,0],[0,0,0,1]];
        assert(compareMatrices(a, expected)<1e-6, "Element-by-element squared distance too large");
      });
    });
    describe('gamma(π/2)', () => {
      it('should return a 90 deg Z rotation matrix', async () => {
        const a = await page.evaluate(() => {
          return window.gamma(Math.PI/2.0);
        });
        const expected = [[1,0,0,0],[0,0,-1,0],[0,1,0,0],[0,0,0,1]];
        assert(compareMatrices(a, expected)<1e-6, "Element-by-element squared distance too large");
      });
    });
    describe('matrix2str', () => {
      it('should return a string representation of a matrix', async () => {
        const str = await page.evaluate(() => {
          return window.matrix2str([[1,2.21,3,4],[5,6,7,8],[9,0,1,2],[3,4,5,6]]);
        });
        const expected = " 1.0, 2.2, 3.0, 4.0\n 5.0, 6.0, 7.0, 8.0\n 9.0, 0.0, 1.0, 2.0\n 3.0, 4.0, 5.0, 6.0";
        assert.equal(str, expected);
      });
    });
  });
  
  describe('End to end tests', () => {
    describe('Load a file', async () => {
      it('should display title', async () => {
        var title = await page.evaluate(() => {
          return document.title;
        });
        assert.equal(title, "Reorient");
      });
      it('should display "Choose..." message', async () => {
        var msg = await page.evaluate(() => {
          return document.querySelector(".box_input").innerText;
        })
        assert.equal(msg, "\nChoose a .nii.gz file or drag it here.");
      });
      it('init with test nifti file', async () => {
        this.timeout(5000);
        const path = "./img/bear_uchar.nii.gz";
        const res = await page.evaluate(async (path) => {
          await window.initWithPath(path);
          window.initUI(window.MUI);
          return typeof window.globals.mv.mri;
        }, path);
        assert.equal(res, "object");
      });
      it('has the expected dimensions', async () => {
        const res = await page.evaluate(async () => {
          return window.globals.mv.mri.dim;
        });
        const expected = JSON.stringify([225, 328, 210]);
        assert.equal(JSON.stringify(res), expected);
      });
      it('has the expected datatype', async () => {
        const datatype = await page.evaluate(async () => {
          return window.globals.mv.mri.datatype;
        });
        const expected = 2;
        assert.equal(datatype, expected);
      });
      it('can rotate the image', async () => {
        const res = await page.evaluate(async () => {
          // const m2vBefore = window.globals.mv.mri.MatrixMm2Vox;
          window.rotate('z', Math.PI/4);
          window.globals.prevMatrix = null;
          const m2vAfter = window.globals.mv.mri.MatrixMm2Vox;
          return m2vAfter;
        });
        assert(res[2][1] === -res[1][2], "unexpected matrix values");
      });
      it('can translate the image', async () => {
        const res = await page.evaluate(async () => {
          const m2vBefore = window.globals.mv.mri.MatrixMm2Vox;
          window.trans([0,50,0]);
          window.globals.prevMatrix = null;
          const m2vAfter = window.globals.mv.mri.MatrixMm2Vox;
          return m2vAfter[1][3] - m2vBefore[1][3];
        });
        assert.equal(res.toPrecision(4), "35.36");
      });
  
    });
  });

});
