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

var mousePos = {"x": 0, "y": 0}
function getMousePos(event) {
    var rect = canvas.getBoundingClientRect()
    mousePos = {
        "x": event.clientX - rect.left,
        "y": event.clientY - rect.top,
    }
}

function canvasCenter() {
    return [width/2, height/2]
}

class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
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
            arr[i] = new Point(e.x + x, e.y + y)
        })
    }

    reflect(slope, intercept) {
        if (slope == undefined || slope == Infinity) {
            this.points.forEach((e) => {
                e.x = 2*intercept - e.x
            })
        } else if (slope == 0) {
            this.points.forEach((e) => {
                e.y = 2*intercept - e.y
            })
        } else {
            slope = -1/slope
            var reciprocal = -1/slope
            this.points.forEach((e, i, arr) => {
                var newIntercept = e.y - reciprocal*e.x
                var intersection = [(-newIntercept + intercept)/(-slope + reciprocal), (reciprocal*intercept - slope*newIntercept)/(-slope + reciprocal)]
                var newPoint = [2*intersection[0] - e.x, 2*intersection[1] - e.y]
                arr[i] = new Point(newPoint[0], newPoint[1])
            })
        }
    }

    rotate(originX, originY, degrees) {
        this.points.forEach((e) => {
            e[0] = originX*(originX*e[0]) + Math.cos(degrees)*(e[0]-originY*(originX*e[0])) + Math.sin(degrees)*(originY*e[0])
            e[1] = originY*(originY*e[1]) + Math.cos(degrees)*(e[1]-originY*(originY*e[1])) + Math.sin(degrees)*(originY*e[1])
        })
    }

    clone() {
        return new Poly(this.points, {color: this.color})
    }

    create() {
        ctx.strokeStyle = this.color
        ctx.fillStyle = this.color
        ctx.beginPath()
        this.points.forEach((e) => {
            ctx.lineTo(e.x, e.y)
        })
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = "#000000"
        ctx.fillStyle = "#000000"
    }
}

class Line extends Poly {
    constructor(startPoint, endPoint, {color}={}) {
        super([startPoint, endPoint], {color: color})
    }

    create() {
        //console.log(this.points[0], this.points[1])
        this.points = [this.points[0], this.points[1]]
        super.create()
    }
}

var keys = {}
onkeydown = onkeyup = (e) => {
    keys[e.key] = e.type == "keydown"
}

function events() {

}

rectangle = new Rect(10, 10, 100, 100, {color: "#ff751a", fillColor: "#32CD32", outLine: 0})
//polygon = new Poly([[100, 100], [150, 150], [100, 200]], {color: "#32CD32"})
line = new Line([10, 10], [70, 80], {color: "#0000FF"})

background = "#000000"
setInterval(() => {
    run()

    if (keys.w) {
        rectangle.translate(0, -4)
    }
    if (keys.s) {
        rectangle.translate(0, 4)
    }
    if (keys.d) {
        rectangle.translate(4, 0)
    }
    if (keys.a) {
        rectangle.translate(-4, 0)
    }
    if (rectangle.mouseOn() && clicked) {
        rectangle.setFromPoint(...rectangle.center, mousePos.x, mousePos.y)
    } else if (rectangle.mouseOn()) {
        rectangle.setScaleWidth(150)
    } else {
        rectangle.setScaleWidth(100)
    }
    if (clicked) {
        line.reflect(undefined, 250)
    }

    rectangle.create()
    line.create()
    end()
}, INTERVAL*1000)