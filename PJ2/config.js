//画布的大小
var canvasSize = {"maxX": 700, "maxY": 700};

const quadNums = 4;
const quadVertexNums = 4;
const triVertexNums = 3;

const circleR = 20;

//数组中每个元素表示一个点的坐标[x,y,z]，这里一共有9个点
var vertex_pos = [
    [350, 100, 0],
    [420, 280, 0],
    [600, 350, 0],
    [280, 280, 0],
    [350, 350, 0],
    [420, 420, 0],
    [100, 350, 0],
    [280, 420, 0],
    [350, 600, 0]
];

//顶点颜色数组，保存了上面顶点数组中每个顶点颜色信息[r,g,b]
var vertex_color = [
    [165, 0, 165],
    [255, 0, 0],
    [255, 145, 0],
    [56, 20, 175],
    [255, 255, 255],
    [255, 211, 0],
    [17, 63, 170],
    [0, 204, 0],
    [204, 244, 0]
];

//四边形数组，数组中每个元素表示一个四边形，其中的四个数字是四边形四个顶点的index，例如vertex[polygon[2][1]]表示第三个多边形的第2个顶点的坐标
var polygon = [
    [4, 5, 8, 7],
    [0, 1, 4, 3],
    [1, 2, 5, 4],
    [3, 4, 7, 6]
];
