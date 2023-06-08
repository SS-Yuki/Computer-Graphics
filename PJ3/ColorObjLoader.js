"use strict";
/**
 * 用于绘制颜色渐变箱体
 * 仿照Texture.js
 * 前者利用纹理，本文件利用配置信息进行着色
 */
class ColorObjLoader {

  constructor(entity, config) {
    this.entity = entity;
    this.gl = config.gl;
    this.enableLight = config.enableLight;
  }

  init() {
    this.initShaders();

    this.initBuffers();

    this.initPerspective();

    return this;
  }

  initShaders() {
    // Vertex shader program
    let VSHADER_SOURCE = `
            attribute vec4 a_Position;
            uniform mat4 u_MvpMatrix;
            attribute vec3 a_Color;
            varying vec3 v_Color;

            void main() {
              gl_Position = u_MvpMatrix * a_Position;
              v_Color = a_Color;
            }`;

    // Fragment shader program
    let FSHADER_SOURCE = `
            #ifdef GL_ES
            precision mediump float;
            #endif
            varying vec3 v_Color;
            void main() {
              gl_FragColor = vec4(v_Color, 1.0);
            }`;

    // Initialize shaders
    this.program = createProgram(this.gl, VSHADER_SOURCE, FSHADER_SOURCE);
    if (!this.program) {
      console.log('Failed to create program');
      return;
    }

    this.gl.useProgram(this.program);
    this.gl.program = this.program;
  }

  initPerspective() {
    this.gl.enable(this.gl.DEPTH_TEST);
    // Get the storage location of u_MvpMatrix
    this.u_MvpMatrix = this.gl.getUniformLocation(this.gl.program, 'u_MvpMatrix');
    if (!this.u_MvpMatrix) {
      console.log('Failed to get the storage location of u_MvpMatrix');
    }


    this.g_normalMatrix = new Matrix4();
    // Assign the buffer object to a_Position and enable the assignment
    this.a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
    // Assign the buffer object to a_TexCoord variable and enable the assignment of the buffer object
    this.a_Color = this.gl.getAttribLocation(this.gl.program, 'a_Color');

    this.u_MvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
    this.g_modelMatrix = new Matrix4();
    this.g_modelMatrix.translate(this.entity.translate[0], this.entity.translate[1], this.entity.translate[2]);
    this.g_modelMatrix.scale(this.entity.scale[0], this.entity.scale[1], this.entity.scale[2]);

  }

  initBuffers() {
    // Write the vertex coordinates to the buffer object
    this.vertexBuffer = this.gl.createBuffer();

    // Write the indices to the buffer object
    this.vertexIndexBuffer = this.gl.createBuffer();
  }

  render() {
    this.gl.useProgram(this.program);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.entity.vertex), this.gl.STATIC_DRAW);

    // 每六个为一组，三个位置信息，三个颜色信息
    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.gl.enableVertexAttribArray(this.a_Position);
    this.gl.vertexAttribPointer(this.a_Color, 3, this.gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    this.gl.enableVertexAttribArray(this.a_Color);


    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.entity.index), this.gl.STATIC_DRAW);


    // Set the eye point and the viewing volume
    this.mvpMatrix = Camera.getMatrix();
    this.mvpMatrix.concat(this.g_modelMatrix);

    // Pass the model view projection matrix to u_MvpMatrix
    this.gl.uniformMatrix4fv(this.u_MvpMatrix, false, this.mvpMatrix.elements);

    this.g_normalMatrix.setInverseOf(this.g_modelMatrix);
    this.g_normalMatrix.transpose();
    this.gl.uniformMatrix4fv(this.u_NormalMatrix, false, this.g_normalMatrix.elements);
    this.gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.g_modelMatrix.elements);

    // Draw
    this.gl.drawElements(this.gl.TRIANGLE_STRIP, this.entity.index.length, this.gl.UNSIGNED_SHORT, 0);
  }
}
