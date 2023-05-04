// Vertex shader program
var VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'void main() {\n' +
    '    gl_Position = u_ModelMatrix * a_Position;\n' +
    '    v_Color = a_Color;\n' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform bool u_RedColor;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '    if(u_RedColor) gl_FragColor = vec4(1.0,0.0,0.0,1.0);\n' +
    '    else gl_FragColor = v_Color;\n' +
    '}\n';

var gl;

// uniform变量
var u_ModelMatrix, u_RedColor;

// 是否有边框   'B'
var hasFrame = true;
// 是否旋转     'T'
var isRotating = false;
// 是否可编辑   'E'
var isEdit = true;

// 当前旋转角度
var currentAngle = 0.0;
// 当前缩放比例
var currentScale = 1.0;

// 图形绘制函数
function draw(gl, currentAngle, currentScale) {
    // 设置旋转缩放矩阵
    var modelMatrix = new Matrix4();
    modelMatrix.setRotate(currentAngle, 0, 0, 1);
    modelMatrix.scale(currentScale, currentScale, currentScale);

    // Pass the rotation matrix to the vertex shader
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // 清空界面
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (let i = 0; i < quadNums; i++) {
        // 绘制图案
        gl.uniform1f(u_RedColor, false);
        gl.drawArrays(gl.TRIANGLE_STRIP, i * quadVertexNums, quadVertexNums);
        if (hasFrame) {
            // 绘制边框
            gl.uniform1f(u_RedColor, true);
            gl.drawArrays(gl.LINE_LOOP, i * quadVertexNums, triVertexNums);
            gl.drawArrays(gl.LINE_LOOP, i * quadVertexNums + 1, triVertexNums);
        }
    }
}

// 初始化顶点缓冲区
const halfMaxX = canvasSize.maxX / 2.0;
const halfMaxY = canvasSize.maxY / 2.0;
function initVertexBuffers(gl) {
    var verticesArray = [];
    var n = 4;
    var index = 0;
    // 遍历各个四边形的各个顶点，依次记录顶点的位置和颜色
    for (let i = 0; i < quadNums; i++) {
        for (let j = 0; j < quadVertexNums; j++) {
            let point = polygon[i][j];
            verticesArray[index++] = (vertex_pos[point][0] - halfMaxX) / halfMaxX;
            verticesArray[index++] = (halfMaxY - vertex_pos[point][1]) / halfMaxY;
            verticesArray[index++] = vertex_color[point][0] / 255.0;
            verticesArray[index++] = vertex_color[point][1] / 255.0;
            verticesArray[index++] = vertex_color[point][2] / 255.0;
        }
    }
    // 将各顶点的信息存储为Float32Array
    var verticesColors = new Float32Array(verticesArray);

    // Create a buffer object
    var vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

    var FSIZE = verticesColors.BYTES_PER_ELEMENT;

    //Get the storage location of a_Position, assign and enable buffer
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

    // Get the storage location of a_Position, assign buffer and enable
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

    return n;
}

// Last time that this function was called
// 设置时间
var g_last = Date.now();
// 每秒旋转角度
const ANGLE_STEP = 45.0;//每秒旋转角度

// 根据时间更新旋转角度与缩放比例 
function animate() {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    /*
    以每秒钟45度的速度逆时针，
    并且在旋转的过程中逐渐变小直到变为原来的百分之20，
    然后逐渐变大到原本的百分之100，
    然后再变小如此交替，
    变换的比例为每秒钟0.2。
    */
    if (isRotating) {
        var newAngle = currentAngle + (ANGLE_STEP * elapsed) / 1000.0;
        currentAngle = newAngle % 360;
        // 依据旋转角度计算当前缩放比例
        if (currentAngle < 180) {
            currentScale = 1.0 - 0.8 * (currentAngle) / 180.0;
        }
        else {
            currentScale = 0.2 + 0.8 * (currentAngle - 180.0) / 180.0;
        }
    }
}

// 键盘按下事件处理函数
function doKeydown(ev) {
    switch (ev.keyCode) {
        case 'B'.codePointAt(0):
            // 显示/隐藏网格边框
            hasFrame = !hasFrame;
            draw(gl, currentAngle, currentScale);
            break;
        case 'T'.codePointAt(0):
            // 播放暂停动画
            if (isRotating) {
                isRotating = false;
            } else {
                isRotating = true;
                g_last = Date.now();
                // 播放动画时关闭编辑功能
                isEdit = false;
            }
            break;
        case 'E'.codePointAt(0):
            if (isRotating) {
                // 当播放动画时先关闭
                isRotating = false;
            }
            isEdit = true;
            currentAngle = 0.0;
            currentScale = 1.0;
            draw(gl, currentAngle, currentScale);
            break;
        default:
            break;
    }
}

var pointIndex = -1;
//判断鼠标位置是否在画布内且圆形手柄内，若是则返回圆形手柄下标
function getMouseLocation(mouseX, mouseY) {
    if (!(mouseX > 0 && mouseX < canvasSize.maxX && mouseY > 0 && mouseY < canvasSize.maxY)) {
        return -1;
    }
    for (let i = 0; i < vertex_pos.length; i++) {
        if (Math.pow(mouseX - vertex_pos[i][0], 2) + Math.pow(mouseY - vertex_pos[i][1], 2) < Math.pow(circleR, 2)) {
            return i;
        }
    }
    return -1;
}

//鼠标按下事件
function doMousedown(ev) {
    if (!isEdit) {
        return;
    }
    var x = ev.offsetX;
    var y = ev.offsetY;
    pointIndex = getMouseLocation(x, y);
    //如果鼠标位置在手柄内，则
    if (pointIndex != -1) {
        document.addEventListener("mousemove", doMousemove);
    }
}

//鼠标移动事件
function doMousemove(ev) {
    if (!isEdit) {
        return;
    }
    var x = ev.offsetX;
    var y = ev.offsetY;
    if (!(x > 0 && x < canvasSize.maxX && y > 0 && y < canvasSize.maxY)) {
        return;
    }
    if (pointIndex == -1) {
        return;
    }
    // 更新拖动点的位置
    vertex_pos[pointIndex][0] = x;
    vertex_pos[pointIndex][1] = y;
    var size = Float32Array.BYTES_PER_ELEMENT;
    var tmpBuff = new Float32Array([(x - halfMaxX) / halfMaxX, (halfMaxY - y) / halfMaxY]);
    // 更新缓冲区
    for (let i = 0; i < quadNums; i++) {
        for (let j = 0; j < quadVertexNums; j++) {
            if (polygon[i][j] == pointIndex) {
                gl.bufferSubData(gl.ARRAY_BUFFER, (i * quadVertexNums + j) * 5 * size, tmpBuff);
            }
        }
    }
    // 重新绘制
    draw(gl, currentAngle, currentScale);
}

//鼠标松开事件
function doMouseup(ev) {
    if (!isEdit) {
        return;
    }
    document.removeEventListener("mousemove", doMousemove);
}

function main() {
    var canvas = document.getElementById("webgl");
    // 设置画布大小
    canvas.setAttribute("width", canvasSize.maxX);
    canvas.setAttribute("height", canvasSize.maxY);

    // 将每个四边形前两个点互换，使得拆分三角形的边框易于绘制。
    for (let i = 0; i < 4; i++) {
        let tmp = polygon[i][0];
        polygon[i][0] = polygon[i][1];
        polygon[i][1] = tmp;
    }

    // Get the rendering context for WebGL
    gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Write the positions of vertices to a vertex shader
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // 获取变换矩阵
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    // 获取红色布尔值
    u_RedColor = gl.getUniformLocation(gl.program, 'u_RedColor');

    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }

    // 实现动画效果
    var tick = function () {
        animate();
        draw(gl, currentAngle, currentScale);
        requestAnimationFrame(tick);
    };
    tick();

    // 进行事件绑定
    document.addEventListener("keydown", doKeydown);
    document.addEventListener("mousedown", doMousedown);
    document.addEventListener("mouseup", doMouseup);
}