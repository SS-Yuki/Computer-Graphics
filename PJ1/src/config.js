//画布的大小
var canvasSize = {"maxX": 1024, "maxY": 768};

//圆形手柄大小
var circleR = 10;

//数组中每个元素表示一个点的坐标[x,y,z]，这里一共有9个点
var vertex_pos = [
    [0, 0, 0],
    [700, 0, 0],
    [1000, 0, 0],
    [100, 400, 0],
    [600, 450, 0],
    [1000, 400, 0],
    [50, 650, 0],
    [700, 700, 0],
    [1000, 700, 0]
];

//顶点颜色数组，保存了上面顶点数组中每个顶点颜色信息[r,g,b]
var vertex_color = [
    [0, 0, 255],
    [0, 255, 0],
    [0, 255, 255],
    [255, 255, 0],
    [0, 255, 255],
    [0, 255, 0],
    [0, 255, 0],
    [0, 200, 100],
    [255, 255, 0]
];

//四边形数组，数组中每个元素表示一个四边形，其中的四个数字是四边形四个顶点的index，例如vertex[polygon[2][1]]表示第三个多边形的第2个顶点的坐标
var polygon = [
    [0, 1, 4, 3],
    [1, 2, 5, 4],
    [3, 4, 7, 6],
    [4, 5, 8, 7]
];

//边
function Edge() {
    this.xi = 0;
    this.dx = 0;
    this.ymax = 0;
    this.id = 0;
}

//该函数在一个canvas上绘制一个点
//其中ctx是从canvas中获得的一个2d上下文context
//    x,y分别是该点的横纵坐标
//    color是表示颜色的整形数组，形如[r,g,b]
//    color在这里会本转化为表示颜色的字符串，其内容也可以是：
//        直接用颜色名称:   "red" "green" "blue"
//        十六进制颜色值:   "#EEEEFF"
//        rgb分量表示形式:  "rgb(0-255,0-255,0-255)"
//        rgba分量表示形式:  "rgba(0-255,1-255,1-255,透明度)"
//由于canvas本身没有绘制单个point的接口，所以我们通过绘制一条短路径替代
function drawPoint(ctx,x,y, color)
{
    //建立一条新的路径
    ctx.beginPath();
    //设置画笔的颜色
    ctx.strokeStyle ="rgb("+color[0] + "," +
                            +color[1] + "," +
                            +color[2] + ")" ;
    //设置路径起始位置
    ctx.moveTo(x,y);
    //在路径中添加一个节点
    ctx.lineTo(x+1,y+1);
    //用画笔颜色绘制路径
    ctx.stroke();
}

//绘制线段的函数绘制一条从(x1,y1)到(x2,y2)的线段，ctx和color两个参数意义与绘制点的函数相同，
function drawLine(ctx,x1,y1,x2,y2,color){
        
    ctx.beginPath();
    ctx.strokeStyle ="rgba("+color[0] + "," +
                           +color[1] + "," +
                           +color[2] + "," +
                           +255 + ")" ;
    //这里线宽取1会有色差，但是类似半透明的效果有利于debug，取2效果较好
    ctx.lineWidth =1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

var pointIndex = -1;

//每一个顶点增加圆形手柄
function drawCircle() {
    for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(vertex_pos[i][0], vertex_pos[i][1], circleR, 0, 2*Math.PI);
        ctx.fillStyle="#f00";
        ctx.fill();
        // ctx.strokeStyle="#000";
        // ctx.stroke();
    }
}

//判断鼠标位置是否在画布内
function isInCanvas(mouseX, mouseY) {
    return (mouseX > 0 && mouseX < canvasSize.maxX && mouseY > 0 && mouseY < canvasSize.maxY);
}

//判断鼠标位置是否在画布内且圆形手柄内，若是则返回圆形手柄下标
function getMouseLocation(mouseX, mouseY) {
    if (!(mouseX > 0 && mouseX < canvasSize.maxX && mouseY > 0 && mouseY < canvasSize.maxY)) {
        return -1;
    }
    for (let i = 0; i < 9; i++) {
        if (Math.pow(mouseX-vertex_pos[i][0], 2) + Math.pow(mouseY-vertex_pos[i][1], 2) < Math.pow(circleR, 2)) {
            return i;
        }
    }
    return -1;
}

//鼠标按下事件
function doMousedown(ev) {
    let x = ev.offsetX;
    let y = ev.offsetY;
    pointIndex = getMouseLocation(x, y);
    //如果鼠标位置在手柄内，则
    if (pointIndex != -1) {
        document.addEventListener("mousemove", doMousemove);
    }
}

//鼠标移动事件
function doMousemove(ev) {
    let x = ev.offsetX;
    let y = ev.offsetY;
    if (isInCanvas(x, y)) {
        vertex_pos[pointIndex][0] = x;
        vertex_pos[pointIndex][1] = y;
        ctx.clearRect(-0.5, -0.5, c.width, c.height);
        drawQuad(pointIndex);
        drawCircle();
    }
}

//鼠标松开事件
function doMouseup(ev) {
    document.removeEventListener("mousemove", doMousemove);
}

//绘制多边形函数
function fillPolygon(points) {
    //初始化
    var ymin = Number.MAX_SAFE_INTEGER;
    var ymax = 0;
    for (let i = 0; i < points.length; i++) {
        if (vertex_pos[points[i]][1] > ymax) {
            ymax = vertex_pos[points[i]][1];
        }
        if (vertex_pos[points[i]][1] < ymin) {
            ymin = vertex_pos[points[i]][1];
        }
    }
    //存放所有边
    var lines = new Array();
    var line_count = 0;

    //实现链表功能
    var next = new Array();
    var head = -1;
    //画线
    var net = new Array(ymax - ymin + 1);
    for (let i = 0; i < net.length; i++) {
        net[i] = []
    }
    initNET();
    scanAndFill();

    function initNET() {
        var point_num = points.length;
        for (let i = 0; i < point_num; i++) {
            var e = new Edge()
            e.id = line_count++;
            
            var line_start = points[i];
            var line_end = points[(i + 1) % point_num];
    
            var line_start_pre = points[(i - 1 + point_num) % point_num];
            var line_end_next = points[(i + 2) % point_num];
    
            if (vertex_pos[line_end][1] != vertex_pos[line_start][1]) {
                e.dx = (vertex_pos[line_end][0]-vertex_pos[line_start][0]) / 
                    (vertex_pos[line_end][1]-vertex_pos[line_start][1]);
                if (vertex_pos[line_end][1] > vertex_pos[line_start][1]) {
                    e.xi = vertex_pos[line_start][0];
                    
                    //共享顶点的两边落在两侧，只算1个
                    if (vertex_pos[line_end_next][1] >= vertex_pos[line_end][1]) {
                        e.ymax = vertex_pos[line_end][1] - 1;
                    }
                    //共享顶点的两边落在同侧，算2个
                    else {
                        e.ymax = vertex_pos[line_end][1];
                    }
                    //填入对应y值的NET中
                    net[vertex_pos[line_start][1] - ymin].push(e);
                }
                else {
                    e.xi = vertex_pos[line_end][0];
                    
                    //共享顶点的两边落在两侧，只算1个
                    if (vertex_pos[line_start_pre][1] >= vertex_pos[line_start][1]) {
                        e.ymax = vertex_pos[line_start][1] - 1;
                    }
                    //共享顶点的两边落在同侧，算2个
                    else {
                        e.ymax = vertex_pos[line_start][1];
                    }
                    //填入对应y值的NET中
                    net[vertex_pos[line_end][1] - ymin].push(e);
                }
            }
            lines.push(e);
        }
    
        var tp = new Edge();
        for (let i = 0; i < net.length; i++) {
            net[i].push(tp);
        }
    }
    
    function scanAndFill(color) {
        head = -1;
        for (let i = 0; i < lines.length; i++) {
            next[i] = -1;
        }
        var color = vertex_color[points[0]];
    
        ctx.strokeStyle = "rgb("+color[0] + "," +
                                +color[1] + "," +
                                +color[2] + ")" ;
        ctx.beginPath();
    
        for (let y = ymin; y <= ymax; y++) {
            //针对目前y值插入新边
            insert(y - ymin);
            //遍历链表
            for (let i = head;i != -1; i = next[next[i]]) {
                if (next[i] != -1) {
                    ctx.moveTo(lines[i].xi, y);
                    ctx.lineTo(lines[next[i]].xi, y);
                }
            }
            //删除非活动边
            remove(y);
            //更新边中xi的值
            update();
        }
        ctx.closePath();
        ctx.stroke();

        function insert(y) {
            for (let i = 0; i < net[y].length; i++) {
                var edge = net[y][i];
        
                if (edge.ymax == 0 && edge.dx == 0) {
                    break;
                }
        
                if (head == -1) {
                    head = edge.id;
                }
                else {
                    if (edge.xi < lines[head].xi) {
                        next[edge.id] = head;
                        head = edge.id;
                    }
                    else {
                        var pre = head;
                        for (let j = next[head]; ;j = next[j]) {
                            if (j == -1 || edge.xi < lines[j].xi) {
                                next[pre] = edge.id;
                                next[edge.id] = j;
                                break;
                            }
                            pre = j;
                        }
                    }
                }
            }
        }
        
        
        function remove(y) {
            var pre = head;
            while (head != -1 && lines[head].ymax == y) {
                head = next[head];
                next[pre] = -1;
                pre = head;
            }
        
            if (head == -1) {
                return;
            }
        
            var nxt = next[head];
            for (let i = nxt; i != -1; i = nxt) {
                nxt = next[i];
                if (lines[i].ymax == y) {
                    next[pre] = next[i];
                    next[i] = -1;
                }
                else {
                    pre = i;
                }
            }
        }
        
        function update() {
            for (let i = head; i != -1; i = next[i]) {
                lines[i].xi += lines[i].dx;
            }
        
            if (head == -1) {
                return;
            }
            if (next[head] == -1) {
                return;
            }
            var pre = head;
            if (lines[head].xi > lines[next[head]].xi) {
                head = next[head];
                next[pre] = next[head];
                next[head] = pre;
                pre = head;
            }
            var nxt = next[head];
            for (var current = nxt; current != -1; current = nxt) {
                nxt = next[current];
                if (nxt == -1) {
                    break;
                }
                if (lines[current].xi > lines[nxt].xi) {
                    next[pre] = next[current];
                    next[current] = next[nxt];
                    next[nxt] = current;
                }
                else {
                    pre = current;
                }
            }
        }
    }
    
}


function drawQuad(moveNum) {
    //有顶点移动
    let quadMove = [];
    let moveCount = 0;
    //无顶点移动
    let quadNotMove = [];
    let notMoveCount = 0;  
    //判断移动
    for (let i = 0; i < 4; i++) {
        let isMove = false;
        for (let j = 0; j < 4; j++) {
            if (polygon[i][j] == moveNum) {
                isMove = true;
                break;
            }
        }
        if (isMove) {
            quadMove[moveCount++] = polygon[i];
        }
        else {
            quadNotMove[notMoveCount++] = polygon[i];
        }
    }
    //填充无顶点移动四边形
    for (let i = 0; i < notMoveCount; i++) {
        fillPolygon(quadNotMove[i]);
    }
    //覆盖填充有顶点移动四边形
    for (let i = 0; i < moveCount; i++) {
        fillPolygon(quadMove[i]);
    }
}





var c = document.getElementById("myCanvas");
//设置画布大小
c.setAttribute("width", canvasSize.maxX);
c.setAttribute("height", canvasSize.maxY);
var ctx = c.getContext("2d");
//将canvas坐标整体偏移0.5，用于解决宽度为1个像素的线段的绘制问题
ctx.translate(0.5, 0.5); 
//画四边形
drawQuad(pointIndex);
//画圆形手柄
drawCircle();
//绑定鼠标事件
document.addEventListener("mousedown", doMousedown);
document.addEventListener("mouseup", doMouseup);





