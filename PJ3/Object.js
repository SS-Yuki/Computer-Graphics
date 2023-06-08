

"use strict";
class ObjectLoader {
  constructor(entity, config) {
    this.gl = config.gl;
    this.entity = entity;
    // 判断是否为物体添加动画效果
    if (config.nextFrame) {
      this.nextFrame = config.nextFrame;
      this.angle = 0;
      this.lastTimestamp = Date.now();
    }
  }

  init() {

    this.initShaders();

    this.initPerspective();

    this.g_objDoc = null;      // The information of OBJ file
    this.g_drawingInfo = null; // The information for drawing 3D model


    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    this.initBuffers();
    if (!this.buffers) {
      console.log('Failed to set the vertex information');
      return;
    }

    // Start reading the OBJ file
    this.readOBJFile(`${this.entity.objFilePath}`, this.buffers, 1, true);

    return this;
  }

  initShaders() {
    // Vertex shader program
    let VSHADER_SOURCE = `
        attribute vec4 a_Position;
        attribute vec4 a_Color;
        attribute vec4 a_Normal;
        uniform mat4 u_MvpMatrix;
        uniform mat4 u_ModelMatrix;
        uniform mat4 u_NormalMatrix;
        varying vec4 v_Color;
        uniform vec3 u_Color;
        uniform vec3 u_LightDirection;
        uniform vec3 u_AmbientLight;
        // 点光源位置和颜色
        uniform vec3 u_PointLightPosition;
        uniform vec3 u_PointLightColor;

        //雾化颜色
        uniform vec3 u_FogColor;
        //雾化的起点和终点
        uniform vec2 u_FogDist;

        void main() {
          gl_Position = u_MvpMatrix * a_Position;

          // 平行光
          vec4 normal1 = u_NormalMatrix * a_Normal;
          vec3 normal = normalize(normal1.xyz);
          float nDotL = max(dot(u_LightDirection, normal), 0.0);
          vec3 u_DiffuseLight = vec3(1.0, 1.0, 1.0);
          vec3 diffuse = u_DiffuseLight * u_Color * nDotL;
          
          // 环境光
          vec3 ambient = u_AmbientLight * u_Color;

          //点光源光线向量
          vec4 position = u_ModelMatrix * a_Position;
          vec3 PointLightDir = normalize(u_PointLightPosition - position.xyz);
          float nDotLPoint = max(dot(normal, PointLightDir), 0.0);
          // 点光源的漫反射
          vec3 diffusePoint = vec3(u_Color) * u_PointLightColor * nDotLPoint;
          
          // 平行光、环境光、点光源的组合
          vec3 lightColor = diffuse + ambient + diffusePoint;

          // 计算雾化因子
          float fogFactor = clamp((u_FogDist.y - gl_Position.w) / (u_FogDist.y - u_FogDist.x), 0.0, 1.0);

          // 计算最终颜色
          v_Color = vec4(mix(u_FogColor, lightColor, fogFactor), a_Color.a);
        }`;

    // Fragment shader program
    let FSHADER_SOURCE = `
        #ifdef GL_ES
        precision mediump float;
        #endif
        varying vec4 v_Color;
        void main() {
          gl_FragColor = v_Color;
        }`;

    // Initialize shaders
    this.program = createProgram(this.gl, VSHADER_SOURCE, FSHADER_SOURCE);
    if (!this.program) {
      console.log('Failed to create program');
      return;
    }

    this.gl.enable(this.gl.DEPTH_TEST);

    // Get the storage locations of attribute and uniform variables
    this.a_Position = this.gl.getAttribLocation(this.program, 'a_Position');
    this.a_Color = this.gl.getAttribLocation(this.program, 'a_Color');
    this.a_Normal = this.gl.getAttribLocation(this.program, 'a_Normal');
    this.u_MvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
    this.u_NormalMatrix = this.gl.getUniformLocation(this.program, 'u_NormalMatrix');
    this.u_ModelMatrix = this.gl.getUniformLocation(this.program, 'u_ModelMatrix');

    this.u_LightDirection = this.gl.getUniformLocation(this.program, 'u_LightDirection');
    this.u_AmbientLight = this.gl.getUniformLocation(this.program, 'u_AmbientLight');
    this.u_Color = this.gl.getUniformLocation(this.program, 'u_Color');
    // 点光源
    this.u_PointLightColor = this.gl.getUniformLocation(this.program, 'u_PointLightColor');
    this.u_PointLightPosition = this.gl.getUniformLocation(this.program, 'u_PointLightPosition');
    // 雾化
    this.u_FogColor = this.gl.getUniformLocation(this.program, 'u_FogColor');
    this.u_FogDist = this.gl.getUniformLocation(this.program, 'u_FogDist');
    
    this.gl.useProgram(this.program);
    this.gl.program = this.program;
  }

  initPerspective() {
    this.g_modelMatrix = new Matrix4();
    this.g_normalMatrix = new Matrix4();
    for (let t of this.entity.transform) {
      this.g_modelMatrix[t.type].apply(this.g_modelMatrix, t.content);
    }
  }

  initBuffers() {
    // Create a buffer object, assign it to attribute variables, and enable the assignment
    this.buffers = {
      vertexBuffer: this.gl.createBuffer(),
      normalBuffer: this.gl.createBuffer(),
      colorBuffer: this.gl.createBuffer(),
      indexBuffer: this.gl.createBuffer()
    };
  }

  readOBJFile(fileName, model, scale, reverse) {
    let request = new XMLHttpRequest();

    request.onreadystatechange = () => {
      if (request.readyState === 4 && (request.status == 200 || request.status == 0)) {
        this._onReadOBJFile(request.responseText, fileName, model, scale, reverse);
      }
    };
    request.open('GET', fileName, true);
    request.send();
  }


  _onReadOBJFile(fileString, fileName, o, scale, reverse) {
    let objDoc = new OBJDoc(fileName);  // Create a OBJDoc object
    let result = objDoc.parse(fileString, scale, reverse); // Parse the file
    if (!result) {
      this.g_objDoc = null;
      this.g_drawingInfo = null;
      console.log("OBJ file parsing error.");
      return;
    }
    this.g_objDoc = objDoc;
  }

  render(timestamp, eye, pointLightOpen) {
    this.gl.useProgram(this.program);
    this.gl.program = this.program;

    if (this.g_objDoc != null && this.g_objDoc.isMTLComplete()) {
      this.onReadComplete();
    }
    if (!this.g_drawingInfo) return;

    if (this.hasOwnProperty('nextFrame')) {
      // 实现一个简单的动画，绕着海宝模型不断飞行，高度按照旋转角的正弦值不断变化
      this.initPerspective();
      let elapsed = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      this.angle = (this.angle + (360.0 * elapsed) / 1000.0) % 360;
      // 绕轴飞行
      this.g_modelMatrix.rotate(this.angle, 0, 1, 0);
      // 高度变化
      this.g_modelMatrix.translate(1, Math.sin(this.angle * (2 * Math.PI / 360)) + 1, 1);
    }

    // 配置文件平行光
    let lightDirection = new Vector3(sceneDirectionLight);
    lightDirection.normalize();
    this.gl.uniform3fv(this.u_LightDirection, lightDirection.elements);
    // 配置文件环境光
    this.gl.uniform3fv(this.u_AmbientLight, new Vector3(sceneAmbientLight).elements);
    this.gl.uniform3fv(this.u_Color, new Vector3(this.entity.color).elements);
    // 配置雾化参数
    this.gl.uniform3fv(this.u_FogColor, fogColor);
    this.gl.uniform2fv(this.u_FogDist, fogDist);

    // 根据点光源开关状态决定点光源颜色
    this.gl.uniform3fv(this.u_PointLightPosition, eye.elements);
    if (pointLightOpen) {
      this.gl.uniform3fv(this.u_PointLightColor, scenePointLightColor);
    } else {
      this.gl.uniform3fv(this.u_PointLightColor, [0.0, 0.0, 0.0]);
    }

    this.g_normalMatrix.setInverseOf(this.g_modelMatrix);
    this.g_normalMatrix.transpose();
    this.gl.uniformMatrix4fv(this.u_NormalMatrix, false, this.g_normalMatrix.elements);
    this.gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.g_modelMatrix.elements);

    let g_mvpMatrix = Camera.getMatrix();
    g_mvpMatrix.concat(this.g_modelMatrix);

    this.gl.uniformMatrix4fv(this.u_MvpMatrix, false, g_mvpMatrix.elements);
    // Draw
    this.gl.drawElements(this.gl.TRIANGLES, this.g_drawingInfo.indices.length, this.gl.UNSIGNED_SHORT, 0);
  }

  onReadComplete() {
    // Acquire the vertex coordinates and colors from OBJ file
    this.g_drawingInfo = this.g_objDoc.getDrawingInfo();

    // Write date into the buffer object
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.vertices, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.a_Position);


    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.normals, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.a_Normal, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.a_Normal);


    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.g_drawingInfo.colors, this.gl.STATIC_DRAW);

    this.gl.vertexAttribPointer(this.a_Color, 4, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.a_Color);

    // Write the indices to the buffer object
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.g_drawingInfo.indices, this.gl.STATIC_DRAW);

  }
}
