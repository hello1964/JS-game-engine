const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

const INTERVAL = 0.0001

var width = canvas.offsetWidth
var height = canvas.offsetHeight

function print(val) {
    console.log(val)
}

function onResize() {
    width = canvas.offsetWidth
    height = canvas.offsetHeight
    
    if (window.devicePixelRatio > 1) {
      canvas.width = canvas.clientWidth * 2
      canvas.height = canvas.clientHeight * 2
      ctx.scale(2, 2);
    } else {
      canvas.width = width
      canvas.height = height
    }
}

var background = "#ffffff"
function run() {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.stroke()
    ctx.fillStyle = "#000000"
}

var clicked = false
function end() {
    clicked = false
}

function sigma(start, stop, func) {
    var list = []
    for (var i = start; i!=stop; i++) {
        list.push(func(i))
    }
    list.reduce((a, b) => {
        return a+b
    })
    return list[0]
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function wait(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    translate(x, y) {
        this.x += x
        this.y += y
    }

    reflect(slope, intercept) {
        if (slope == undefined || slope == Infinity) {
            this.x = 2*intercept - this.x
        } else if (slope == 0) {
            this.y = 2*intercept - this.y
        } else {
            slope = -1/slope
            var reciprocal = -1/slope
            var newIntercept = this.y - reciprocal*this.x
            var intersection = [(-newIntercept + intercept)/(-slope + reciprocal), (reciprocal*intercept - slope*newIntercept)/(-slope + reciprocal)]
            this.x, this.y = 2*intersection[0] - this.x, 2*intersection[1] - this.y
        }
    }

    scale(x, y, scaleFactor) {
        this.x = x - (x-this.x)*scaleFactor
        this.y = y - (y-this.y)*scaleFactor
    }

    get array() {
        return [this.x, this.y]
    }

    draw() {
        ctx.lineTo(this.x, this.y)
    }
}

class Arc {
    constructor(x1, y1, x2, y2, radius) {
        this.point1 = new Point(x1, y1)
        this.point2 = new Point(x2, y2)
        this.radius = radius
    }

    translate(x, y) {
        this.point1.translate(x, y)
        this.point2.translate(x, y)
    }

    reflect(slope, intercept) {
        this.point1.reflect(slope, intercept)
        this.point2.reflect(slope, intercept)
    }

    scale(x, y, scaleFactor) {
        this.point1.scale(x, y, scaleFactor)
        this.point2.scale(x, y, scaleFactor)
    }

    draw() {
        ctx.arcTo(this.point1.x, this.point1.y, this.point2.x, this.point2.y, this.radius)
    }
}

class Ellipse {
    constructor(x, y, radiusX, radiusY, rotation, startAngle, endAngle) {
        this.x = x
        this.y = y
        this.radiusX = radiusX
        this.radiusY = radiusY
        this.rotation = rotation
        this.startAngle = startAngle
        this.endAngle = endAngle
    }

    translate(x, y) {
        this.x.translate(x, y)
        this.y.translate(x, y)
    }

    reflect(slope, intercept) {
        this.x.reflect(slope, intercept)
        this.y.reflect(slope, intercept)
    }

    scale(x, y, scaleFactor) {
        this.x.scale(x, y, scaleFactor)
        this.y.scale(x, y, scaleFactor)
    }

    draw() {
        ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, this.rotation, this.startAngle, this.endAngle, false)
    }
}

var mousePos = new Point(0, 0)
function getMousePos(event) {
    var rect = canvas.getBoundingClientRect()
    mousePos = new Point(event.clientX - rect.left, event.clientY - rect.top)
}

function canvasCenter() {
    return new Point(width/2, height/2)
}

function createTemp(color, startPoint, func) {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(startPoint.x, startPoint.y)
    func()
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = "#000000"
    ctx.fillStyle = "#000000"
}

class Rect {

    static allRects = []

    constructor(x, y, width, height, {color, fillColor, outLine}={}) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color == undefined ? "#000000" : color
        this.fillColor = fillColor == undefined ? null : fillColor
        this.outLine = outLine == undefined ? 0 : outLine

        Rect.allRects.push(this)
    }

    toPoly() {
        return new Poly(this.fourCorners, {color: this.color})
    }

    twoCorners(point1, point2) {
        this.x, this.y = point1[0], point1[1]
        this.width = point2[0] - point1[0]
        this.height = point2[1] - point1[1]
    }

    get fourCorners() {
        return [[this.x, this.y], [this.x + this.width, this.y], [this.x, this.y + this.height], [this.x + this.width, this.y + this.height]]
    }

    onEdge() {
        if (this.x <= 0 || this.y <= 0 || this.x + this.width >= canvas.offsetWidth || this.y + this.height >= canvas.offsetHeight) {
            return true
        } else {
            return false
        }
    }

    whatEdge() {
        if (this.x <= 0) {
            return "left"
        } else if (this.y <= 0) {
            return "top"
        } else if (this.x + this.width >= canvas.offsetWidth) {
            return "right"
        } else if (this.y + this.height >= canvas.offsetHeight) {
            return "bottom"
        } else {
            return null
        }
    }

    get center() {
        return [this.x + this.width/2, this.y + this.height/2]
    }

    scale(x, y, scaleFactor) {
        var width = x - ((x-(this.x + this.width))*scaleFactor)
        var height = y - ((y-(this.y + this.height))*scaleFactor)
        this.x = x - ((x-this.x)*scaleFactor)
        this.y = y - ((y-this.y)*scaleFactor)
        this.width = width - this.x
        this.height = height - this.y
    }

    setScaleWidth(size) {
        this.scale(...this.center, size/this.width)
    }

    setScaleHeight(size) {
        this.scale(...this.center, size/this.height)
    }

    setFromPoint(x1, y1, x2, y2) {
        this.x += x2 - x1
        this.y += y2 - y1
    }
    
    reflect(slope, intercept) {
        var newSlope = -slope*(1/slope)
        var points = [[this.x, this.y], [this.x + this.width, this.y], [this.x, this.y + this.height], [this.x + this.width, this.y + this.height]]
        var newPoints = []
        points.forEach((e) => {
            var newIntercept = e[1] / (newSlope*e[0])
            var x = (newIntercept - intercept) / (newSlope - slope)
            var y = newSlope*x + newIntercept
            newPoints.push([2*x - e[0], 2*y-e[1]])
        })
        this.twoCorners(points[0], points[3])
    }

    translate(x, y) {
        this.x += x
        this.y += y
    }

    pos() {
        return new Point(this.x, this.y)
    }

    repos(x, y) {
        this.x = x
        this.y = y
    }

    resize(width, height) {
        this.width = width
        this.height = height
    }

    mouseOn() {
        if (mousePos.x >= this.x && mousePos.x <= this.x + this.width && mousePos.y >= this.y && mousePos.y <= this.y + this.height) {
            return true
        }
        return false
    }

    touchingRects() {
        var listOfRects = []
        Rect.allRects.forEach((e) => {
            if (e.x >= this.x && e.x + e.width <= this.x + this.width && e.y >= this.y && e.y + e.height <= this.y + this.height) {
                listOfRects.push(e)
            }
        })
        return listOfRects
    }

    create() {
        ctx.fillStyle = this.color
        ctx.fillRect(this.x, this.y, this.width, this.height)
        if (this.fillColor == null) {
            ctx.fillStyle = background
        } else {
            ctx.fillStyle = this.fillColor
        }
        if (this.outLine > 0) {
            ctx.fillRect(this.x + this.outLine, this.y + this.outLine, this.width - this.outLine*2, this.height - this.outLine*2)
        }
        ctx.stroke()
        ctx.fillStyle = "#000000"
    }
}

class Poly {
    constructor(points, {color}={}) {
        points.forEach((e, i, arr) => {
            if (Array.isArray(e)) {
                arr[i] = new Point(...e)
            }
        })
        this.points = points
        this.color = color == undefined ? "#000000" : color
    }

    translate(x, y) {
        this.points.forEach((e, i, arr) => {
            e.translate(x, y)
            arr[i] = e
        })
    }

    reflect(slope, intercept) {
        this.points.forEach((e, i, arr) => {
            e.reflect(slope, intercept)
            arr[i] = e
        })
    }

    scale(x, y, scaleFactor) {
        this.points.forEach((e, i, arr) => {
            e.scale(x, y, scaleFactor)
            arr[i] = e
        })
    }

    rotate(originX, originY, degrees) {
        this.points.forEach((e) => {
            e[0] = originX*(originX*e[0]) + Math.cos(degrees)*(e[0]-originY*(originX*e[0])) + Math.sin(degrees)*(originY*e[0])
            e[1] = originY*(originY*e[1]) + Math.cos(degrees)*(e[1]-originY*(originY*e[1])) + Math.sin(degrees)*(originY*e[1])
        })
    }

    get xVals() {
        var newList = []
        this.points.forEach((e) => {
            newList.push(e.x)
        })
        return newList
    }

    get yVals() {
        var newList = []
        this.points.forEach((e) => {
            newList.push(e.y)
        })
        return newList
    }

    get center() {
        var x = Math.min(...this.xVals)
        var y = Math.min(...this.yVals)
        var width = Math.max(...this.xVals) - x
        var height = Math.max(...this.yVals) - y

        return new Rect(x, y, width, height).center
    }

    clone() {
        return new Poly(this.points, {color: this.color})
    }

    create() {
        createTemp(this.color, this.points[0], () => {
            this.points.forEach((e) => {
                e.draw()
            })
        })
    }
}

class NonPoly {
    constructor(points, {color}={}) {
        points.forEach((e, i, arr) => {
            if (Array.isArray(e)) {
                arr[i] = new Point(...e)
            }
        })
        this.points = points
        this.color = color == undefined ? "#FFFFFF" : color
    }

    translate(x, y) {
        this.points.forEach((e, i, arr) => {
            e.translate(x, y)
            arr[i] = e
        })
    }

    reflect(slope, intercept) {
        this.points.forEach((e, i , arr) => {
            e.reflect(slope, intercept)
            arr[i] = e
        })
    }

    scale(x, y, scaleFactor) {
        this.points.forEach((e, i, arr) => {
            e.scale(x, y, scaleFactor)
            arr[i] = e
        })
    }

    create() {
        createTemp(this.color, this.points[0], () => {
            this.points.forEach((e) => {
                e.draw()
            })
        })
    }
}

class Line {
    constructor(startPoint, endPoint, {color}={}) {
        this.startPoint = Array.isArray(startPoint) ? new Point(startPoint[0], startPoint[1]) : startPoint
        this.endPoint = Array.isArray(endPoint) ? new Point(startPoint[0], endPoint[1]) : endPoint
        this.color = color == undefined ? "#000000" : color
    }

    translate(x, y) {
        this.startPoint.translate(x, y)
        this.endPoint.translate(x, y)
    }

    reflect(slope, intercept) {
        this.startPoint.reflect(slope, intercept)
        this.endPoint.reflect(slope, intercept)
    }

    scale(x, y, scaleFactor) {
        this.startPoint.scale(x, y, scaleFactor)
        this.endPoint.scale(x, y, scaleFactor)
    }

    get midPoint() {
        return new Point((startPoint.x + endPoint.x)/2, (startPoint.y + endPoint.y)/2)
    }

    get length() {
        return Math.sqrt((endPoint.x - startPoint.x)**2 + (endPoint.y - startPoint.y)**2)
    }

    get slope() {
        return (this.endPoint.y - this.startPoint.y)/(this.endPoint.x - this.startPoint.x)
    }

    create() {
        createTemp(this.color, this.startPoint, () => {
            this.startPoint.draw()
            this.endPoint.draw()
        })
    }
}

class Circle {
    constructor(x, y, radius, {color}={}) {
        this.center = new Point(x, y)
        this.radius = radius
        this.color = color == undefined ? "#000000" : color
    }

    translate(x, y) {
        this.center.translate(x, y)
    }

    reflect(slope, intercept) {
        this.center.reflect(slope, intercept)
    }

    scale(x, y, scaleFactor) {
        this.center.scale(x, y, scaleFactor)
    }

    get diameter() {
        return this.radius*2
    }

    get circumference() {
        return 2*Math.PI*this.radius
    }

    get area() {
        return Math.PI*r**2
    }

    create() {
        createTemp(this.color, this.center, () => {
            ctx.arc(this.center.x, this.center.y, this.radius, 0, (Math.PI/180)*360, false)
        })
    }

}

class ImageObject {
    constructor(x, y, image) {
        this.point = new Point(x, y)
        this.image = image
        this.sWidth = image.width
        this.sHeight = image.height
        this.width = image.width
        this.height = image.height
    }

    translate(x, y) {
        this.point.translate(x, y)
    }

    setFromPoint(x1, y1, x2, y2) {
        this.point.x += x2 - x1
        this.point.y += y2 - y1
    }

    scale(x, y, scaleFactor) {
        var rect = new Rect(...this.point.array, this.width, this.height)
        rect.scale(x, y, scaleFactor)
        this.point = new Point(rect.x, rect.y)
        this.width = rect.width
        this.height = rect.height
    }

    setScaleWidth(size) {
        console.log(this.width, this.height)
        this.scale(...this.center.array, size/this.width)
        console.log(this.width, this.height)
    }

    setScaleHeight(size) {
        this.scale(...this.center, size/this.height)
    }

    get center() {
        return new Point(this.image.width/2+this.point.x, this.image.height/2+this.point.y)
    }

    create() {
        createTemp("#000000", this.point, () => {
            ctx.drawImage(this.image, 0, 0, this.sWidth, this.sHeight, this.point.x, this.point.y, this.width, this.height)
        })
    }
}

var keys = {}
onkeydown = onkeyup = (e) => {
    keys[e.key] = e.type == "keydown"
}

function events() {

}

rectangle = new Rect(10, 10, 100, 100, {color: "#ff751a", fillColor: "#32CD32", outLine: 20})
polygon = new Poly([[100, 100], [150, 150], [100, 200], [50, 150]], {color: "#32CD32"})
line = new Line([0, 0], [500, 500], {color: "#0000FF"})
side = new NonPoly([[10, 10], [50, 10], new Ellipse(50, 55, 20, 45, 0, 0, Math.PI*2), [50, 100], [10, 100]], {Color: "#FFFFFF"})
ellipse = new NonPoly([new Ellipse(50, 45, 20, 45, 0, 0, Math.PI*2)])
circle = new Circle(10, 10, 20, {color: "#ff0000"})
raisinHeart = new Image()
raisinHeart.onload = () => {
    raisinHeart = new ImageObject(200, 200, raisinHeart)
    raisinHeart.setScaleWidth(500)
}
raisinHeart.src = "https://cdn.discordapp.com/avatars/418893693106389024/aaed638ebdb3bfe2d4e1d3e7f9da62ef.png?size=256"

background = "#000000"
setInterval(() => {
    run()

    if (keys.w) {
        raisinHeart.translate(0, -4)
    }
    if (keys.s) {
        raisinHeart.translate(0, 4)
    }
    if (keys.d) {
        raisinHeart.translate(4, 0)
    }
    if (keys.a) {
        raisinHeart.translate(-4, 0)
    }
    if (keys.c) {
        console.log(polygon.center)
    }
    if (rectangle.mouseOn() && clicked) {
        rectangle.setFromPoint(...rectangle.center, mousePos.x, mousePos.y)
    } else if (rectangle.mouseOn()) {
        rectangle.setScaleWidth(150)
    } else {
        rectangle.setScaleWidth(100)
    }
    if (clicked) {
        line.reflect(Infinity, 250)
    }
    circle.center = mousePos

    raisinHeart.create()
    end()
}, INTERVAL*1000)