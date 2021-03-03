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
var clicked = false
var keys = {}
var pKeys = {}
function run() {
    pKeys = keys
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.stroke()
    ctx.fillStyle = "#000000"
}

function end() {
    clicked = false
}
onkeydown = onkeyup = (e) => {
    keys[e.key] = e.type == "keydown"
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
    static ccw(a, b, c) {
        return (c.y - a.y)*(b.x - a.x) > (b.y - a.y)*(c.x - a.x)
    }

    static collinear(a, b, c) {
        return a.x == b.x == c.x || a.y == b.y == c.y
    }

    static arrayToPoint(arr) {
        var newPoint = arr
        if (Array.isArray(arr)) {
            if (arr.length >= 2) {
                newPoint = new Point(arr[0], arr[1])
                if (arr.length > 2) {console.warn("The list you provided was over 2 items long")}
            } else {
                throw "Invalid array. Cannot create a point because it does not contain enough information."
            }
        }
        return newPoint
    }

    constructor(x, y) {
        this.x = x
        this.y = y
    }

    translate(x, y) {
        this.x += x
        this.y += y
    }

    setFromPoint(x1, y1, x2, y2) {
        this.x += x2 - x1
        this.y += y2 - y1
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
    ctx.stroke()
    ctx.fill()
    ctx.strokeStyle = "#000000"
    ctx.fillStyle = "#000000"
}

class MoveTo {
    constructor(x, y, speed) {
        this.point = new Point(x, y)
        this.speed = Math.abs(speed)
    }

    run(point) {
        var line = new Line(point, this.point)
        var xDir = point.x > this.point.x ? -1 : 1
        var yDir = point.y > this.point.y ? -1 : 1
        var slope = Math.abs(line.slope)
        if (typeof slope != "number") {return this.point}
        var newpoint = new Point(point.x + this.speed*xDir, point.y + slope*this.speed*yDir)
        if (!line.hasPoint) {newpoint = this.point}
        return newpoint
    }

    check(point) {
        return point == this.point
    }
}

class Animation {
    constructor(actions) {
        this.actions = actions
        this.cycle = 0
        this.semiCycle = 0
    }

    run(points) {
        if (this.cycle > this.actions.length) {return points}
        var newPoints = []
        points.forEach((e) => {
            newPoints.push(this.actions[this.cycle].run(e))
        })
        this.cycle += Number(this.actions[this.cycle].check(points[0]))
        return newPoints
    }
}

class Rect {

    static allRects = []

    constructor(x, y, width, height, {color, animation}={}) {
        this.point = new Point(x, y)
        this.width = width
        this.height = height
        this.color = color == undefined ? "#000000" : color
        this.animation = animation == undefined ? null : animation

        Rect.allRects.push(this)
    }

    toPoly() {
        return new Poly(this.fourCorners, {color: this.color})
    }

    twoCorners(point1, point2) {
        point1 = Point.arrayToPoint(point1)
        point2 = Point.arrayToPoint(point2)
        this.point.x, this.point.y = point1.x, point1.y
        this.width = point2.x - point1.x
        this.height = point2.y - point1.y
    }

    get fourCorners() {
        return [new Point(this.point.x, this.point.y), new Point(this.point.x + this.width, this.point.y), new Point(this.point.x, this.point.y + this.height), new Point(this.point.x + this.width, this.point.y + this.height)]
    }

    onEdge() {
        if (this.point.x <= 0 || this.point.y <= 0 || this.point.x + this.width >= canvas.offsetWidth || this.point.y + this.height >= canvas.offsetHeight) {
            return true
        } else {
            return false
        }
    }

    whatEdge() {
        if (this.point.x <= 0) {
            return "left"
        } else if (this.point.y <= 0) {
            return "top"
        } else if (this.point.x + this.width >= canvas.offsetWidth) {
            return "right"
        } else if (this.point.y + this.height >= canvas.offsetHeight) {
            return "bottom"
        } else {
            return null
        }
    }

    get center() {
        return new Point(this.point.x + this.width/2, this.point.y + this.height/2)
    }

    scale(x, y, scaleFactor) {
        var width = x - ((x-(this.point.x + this.width))*scaleFactor)
        var height = y - ((y-(this.point.y + this.height))*scaleFactor)
        this.point.scale(x, y, scaleFactor)
        this.width = width - this.point.x
        this.height = height - this.point.y
    }

    setScaleWidth(size) {
        this.scale(...this.center.array, size/this.width)
    }

    setScaleHeight(size) {
        this.scale(...this.center.array, size/this.height)
    }

    setFromPoint(x1, y1, x2, y2) {
        this.point.setFromPoint(x1, y1, x2, y2)
    }

    translate(x, y) {
        this.point.translate(x, y)
    }

    mouseOn() {
        return this.toPoly().mouseOn()
    }

    touchingRects() {
        var listOfRects = []
        Rect.allRects.forEach((e) => {
            if (e.x >= this.point.x && e.point.x + e.width <= this.point.x + this.width && e.point.y >= this.point.y && e.point.y + e.height <= this.point.y + this.height) {
                listOfRects.push(e)
            }
        })
        return listOfRects
    }

    animate() {
        this.setFromPoint(...this.center.array, ...this.animation.run([this.center])[0].array)
    }

    create() {
        ctx.fillStyle = this.color
        ctx.fillRect(this.point.x, this.point.y, this.width, this.height)
        ctx.stroke()
        ctx.fillStyle = "#000000"
    }
}

class RoundRect extends Rect {
    constructor(x, y, width, height, radius, {color}={}) {
        super(x, y, width, height, {color})
        this.radius = radius
    }

    scale(x, y, scaleFactor) {
        super.scale(x, y, scaleFactor)
        this.radius *= scaleFactor
    }

    create() {
        var baseRect = new Rect(this.point.x + this.radius, this.point.y + this.radius, this.width - this.radius*2, this.height - this.radius*2, {color: this.color})
        new Circle(baseRect.point.x, baseRect.point.y, this.radius, {color: this.color}).create()
        new Circle(baseRect.point.x, baseRect.point.y + baseRect.height, this.radius, {color: this.color}).create()
        new Circle(baseRect.point.x + baseRect.width, baseRect.point.y, this.radius, {color: this.color}).create()
        new Circle(baseRect.point.x + baseRect.width, baseRect.point.y + baseRect.height, this.radius, {color: this.color}).create()
        baseRect.create()
        new Rect(baseRect.point.x, this.point.y - 1, baseRect.width, this.height + 2, {color: this.color}).create()
        new Rect(this.point.x - 1, baseRect.point.y, this.width + 2, baseRect.height, {color: this.color}).create()
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

    hasPoint(x, y) {
        var line = new Line([x, y], [Number.MAX_VALUE, y])
        var totalIntersections = 0
        this.sides.forEach((e) => {
            totalIntersections += Number(Line.intersecting(e, line))
        })
        return totalIntersections % 2 != 0
    }

    mouseOn() {
        return this.hasPoint(mousePos.x, mousePos.y)
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

    get sides() {
        var sideList = []
        this.points.forEach((e, i, arr) => {
            if (i == arr.length - 1) {
                if (e != arr[0]) {
                    sideList.push(new Line(e, arr[0]))
                }
            } else {
                sideList.push(new Line(e, arr[i + 1]))
            }
        })
        return sideList
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
    static intersecting(line1, line2) {
        return Point.ccw(line1.startPoint, line2.startPoint, line2.endPoint) != Point.ccw(line1.endPoint, line2.startPoint, line2.endPoint) && Point.ccw(line1.startPoint, line1.endPoint, line2.startPoint) != Point.ccw(line1.startPoint, line1.endPoint, line2.endPoint)
    }

    constructor(startPoint, endPoint, {color}={}) {
        this.startPoint = startPoint
        this.endPoint = endPoint
        if (Array.isArray(startPoint)) {this.startPoint = new Point(startPoint[0], startPoint[1])}
        if (Array.isArray(endPoint)) {this.endPoint = new Point(endPoint[0], endPoint[1])}
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

    hasPoint(x, y) {
        return this.slope*x + b == y && x >= this.startPoint.x && x <= this.endPoint.x
    }

    intersecting(line) {

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

    get intercept() {
        return this.startPoint.y - this.slope*this.startPoint.x
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
        ctx.fillStyle = this.color
        ctx.strokeStyle = this.color
        ctx.beginPath
        ctx.moveTo(this.center.x, this.center.y)
        ctx.arc(this.center.x, this.center.y, this.radius, 0, (Math.PI/180)*360, false)
        ctx.stroke()
        ctx.fill()
        ctx.fillStyle = "#000000"
    }

}

class TextObject {
    constructor(x, y, text, size, {color, font}={}) {
        this.point = new Point(x, y)
        this.text = text
        this.size = size
        this.color = color == undefined ? "#000000" : color
        this.font = font == undefined ? "arial" : font
    }

    translate(x, y) {
        this.point.translate(x, y)
    }

    scale(slope, scaleFactor) {
        var rect = new Rect(this.point.x, this.point.y, this.width, this.height)
        rect.scale(slope, scaleFactor)
        this.point = new Point(rect.x, rect.y)
        this.size = rect.height
    }

    setScaleWidth(size) {
        this.scale(...this.center.array, size/this.width)
    }

    setScaleHeight(size) {
        this.scale(...this.center.array, size/this.height)
    }

    setFromPoint(x1, y1, x2, y2) {
        this.point.x += x2 - x1
        this.point.y += y2 - y1
    }

    get width() {
        ctx.font = `${size}px ${this.font}`
        ctx.fillColor = this.color
        return ctx.measureText(this.text).width
    }

    get height() {
        return this.size
    }

    get center() {
        return new Point(this.point.x + this.width/2, this.point.y + this.height/2)
    }

    create() {
        ctx.font = `${this.size}px ${this.font}`
        ctx.fillStyle = this.color
        ctx.textBaseline = "hanging"
        ctx.fillText(this.text, this.point.x, this.point.y)
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
        this.mirroredV = false
        this.mirroredH = false
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
        this.scale(...this.center.array, size/this.width)
    }

    setScaleHeight(size) {
        this.scale(...this.center.array, size/this.height)
    }

    rotate(deg) {
        this.image.style.transform = `rotate(${deg}deg)`
    }

    mirrorVertical() {
        this.mirroredV = !this.mirroredV
    }

    mirrorHorizontal() {
        this.mirroredH = !this.mirroredH
    }

    get center() {
        return new Point(this.image.width/2+this.point.x, this.image.height/2+this.point.y)
    }

    create() {
        ctx.save()
        ctx.translate(...this.center.array)
        ctx.scale(this.mirroredV ? -1 : 1, this.mirroredH ? -1 : 1)
        var effectX = 0
        var effectY = 0
        if (this.mirroredV) {
            effectX = -this.width
        }
        if (this.mirroredH) {
            effectY = -this.height
        }
        ctx.drawImage(this.image, 0, 0, this.sWidth, this.sHeight, effectX, effectY, this.width, this.height)
        ctx.restore()
    }
}

function events() {

}

rectangle = new Rect(10, 10, 100, 100, {color: "#ff751a"})
polygon = new Poly([[100, 100], [150, 150], [100, 200], [50, 150]], {color: "#32CD32"})
line = new Line([0, 0], [500, 500], {color: "#0000FF"})
line2 = new Line([0, 0], [500, 500], {color: "#0000FF"})
side = new NonPoly([[10, 10], [50, 10], new Ellipse(50, 55, 20, 45, 0, 0, Math.PI*2), [50, 100], [10, 100]], {Color: "#FFFFFF"})
ellipse = new NonPoly([new Ellipse(50, 45, 20, 45, 0, 0, Math.PI*2)])
circle = new Circle(10, 10, 20, {color: "#ff0000"})
text = new TextObject(5, 10, "Ha Ayuj, you could never display text like I can", 70, {color: "#FFFFFF"})
roundRect = new RoundRect(0, 0, 100, 50, 25, {color: "#FF0000"})

raisinHeart = new Image()
raisinHeart.onload = () => {
    raisinHeart = new ImageObject(0, 0, raisinHeart)
    raisinHeart.setScaleWidth(500)
}
raisinHeart.src = "https://cdn.discordapp.com/avatars/418893693106389024/aaed638ebdb3bfe2d4e1d3e7f9da62ef.png?size=256"

function transSprite() {
    return roundRect
}

background = "#FFFFFF"
setInterval(() => {
    run()

    if (keys.w) {
        transSprite().translate(0, -4)
    }
    if (keys.s) {
        transSprite().translate(0, 4)
    }
    if (keys.d) {
        transSprite().translate(4, 0)
    }
    if (keys.a) {
        transSprite().translate(-4, 0)
    }
    if (keys.c) {
        console.log(rectangle.toPoly())
    }
    if (rectangle.mouseOn()) {
        rectangle.setScaleWidth(150)
    } else {
        rectangle.setScaleWidth(100)
    }
    if (clicked) {
        console.log(rectangle.mouseOn())
    }
    line2.endPoint = mousePos

    rectangle.create()
    end()
}, INTERVAL*1000)