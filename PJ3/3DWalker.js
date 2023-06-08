
"use strict";

window.onload = () => {
  let canvas = document.getElementById('webgl');
  let positon_text = document.getElementById('position');
  let lookat_text = document.getElementById('lookat');
  canvas.setAttribute("width", 500);
  canvas.setAttribute("height", 500);
  window.ratio = canvas.width / canvas.height;
  let gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Load a new scene
  new SceneLoader(gl, positon_text, lookat_text).init();
};

class SceneLoader {
  constructor(gl, positon_text, lookat_text) {
    this.gl = gl;
    this.position_text = positon_text;
    this.lookat_text = lookat_text;
    this.loaders = [];
    this.keyboardController = new KeyboardController();
  }

  init() {

    this.initKeyController();

    this.initLoaders();

    let render = (timestamp) => {
      this.initWebGL();

      this.initCamera(timestamp);

      for (let loader of this.loaders) {
        loader.render(timestamp, Camera.eye, Camera.state.pointLightOpen);
      }
      
      requestAnimationFrame(render, this.gl);
    };

    render();
  }


  initWebGL() {
    // Set clear color and enable hidden surface removal
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear color and depth buffer
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  initKeyController() {
    Camera.init();
    let cameraMap = new Map();
    // 加入其他方向按键
    cameraMap.set('a', 'posLeft');
    cameraMap.set('d', 'posRight');
    cameraMap.set('w', 'posUp');
    cameraMap.set('s', 'posDown');

    cameraMap.set('j', 'rotLeft');
    cameraMap.set('l', 'rotRight');
    cameraMap.set('i', 'rotUp');
    cameraMap.set('k', 'rotDown');
    // 点光源开关
    cameraMap.set('f', 'pointLightOpen');

    cameraMap.forEach((val, key)=> {
      if (val == 'pointLightOpen') {
        this.keyboardController.bind(key, {
          on: (() => {
            Camera.state[val] = 1 - Camera.state[val];
          }),
          off: (() => {
          })
        });
      } 
      else {
          this.keyboardController.bind(key, {
            on: (()=> {
              Camera.state[val] = 1;
            }),
            off: (()=> {
              Camera.state[val] = 0;
            })
          });
        }
      }
    )
  }

  initCamera(timestamp) {
    let elapsed = timestamp - this.keyboardController.last;
    this.keyboardController.last = timestamp;
    // 仿照实现其他方向
    let posY = (Camera.state.posRight - Camera.state.posLeft) * MOVE_VELOCITY * elapsed / 1000;
    let posX = (Camera.state.posUp - Camera.state.posDown) * MOVE_VELOCITY * elapsed / 1000;

    let rotY = (Camera.state.rotRight - Camera.state.rotLeft) * ROT_VELOCITY * elapsed / 1000 / 180 * Math.PI;
    let rotX = (Camera.state.rotUp - Camera.state.rotDown) * ROT_VELOCITY * elapsed / 1000 / 180 * Math.PI;

    if (posY) Camera.move(0, posY, this.position_text, this.lookat_text);
    if (posX) Camera.move(posX, 0, this.position_text, this.lookat_text);
    if (rotY) Camera.rotate(0, rotY, this.position_text, this.lookat_text);
    if (rotX) Camera.rotate(rotX, 0, this.position_text, this.lookat_text);
  }

  initLoaders() {
    // Load floor
    let floorLoader = new TextureLoader(floorRes, {
      'gl': this.gl,
      'activeTextureIndex': 0,
      'enableLight': true
    }).init();
    this.loaders.push(floorLoader);

    // Load box
    let boxLoader = new TextureLoader(boxRes, {
      'gl': this.gl,
      'activeTextureIndex': 1,
      'enableLight': true
    }).init();
    this.loaders.push(boxLoader);
    // 引入渐变色箱体
    let colorCubeLoader = new ColorObjLoader(cubeRes, {
      'gl': this.gl,
      'enableLight': true
    }).init();
    this.loaders.push(colorCubeLoader);

    // Load objects
    for (let o of ObjectList) {
      let loader;
      // 判断obj，若为bird则加入动画效果
      if (o.objFilePath.indexOf('bird') > 0) {
        loader = new ObjectLoader(o, {'gl': this.gl, 'nextFrame': true}).init();
      }
      else {
        loader = new ObjectLoader(o, {'gl': this.gl, 'nextFrame': false}).init();
      }
      // Add animation to bird
      // if (o.objFilePath.indexOf('bird') > 0) {
      //   continue;
      // }
      this.loaders.push(loader);
    }
  }
}