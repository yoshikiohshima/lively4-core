"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonPainter extends Morph {
  async initialize() {
    this.windowTitle = "IpythonPainter";
  }
  initCanvas() {
    this.canvas = this.get('#canvas');
    var canvas = this.canvas;
    canvas.width = 224;
    canvas.height = 224;
    this.penDown = false;
    this.strokes = []; // [[[x, y]]]
    this.stroke = null;

    canvas.getContext('2d').fillStyle = 'white';
    canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);

    canvas.addEventListener('mouseup', this.drawEvent.bind(this), true);
    canvas.addEventListener('mousemove', this.drawEvent.bind(this), true);
    canvas.addEventListener('mousedown', this.drawEvent.bind(this), true);
  }
  drawEvent(evt) {
    var canvas = this.canvas;
    if (this.peers['network'].example != "mnist") {return;}
    var rect = this.dom.getBoundingClientRect();
    var left = rect.left;
    var top = rect.top;
    var x = evt.offsetX;
    var y = evt.offsetY;
    var type = evt.type;

    var scale = canvas.width / canvas.offsetWidth;

    x = scale * x;
    y = scale * y;
    
    if (evt.type == "mousedown") {
        this.penDown = true;
        this.stroke = [[x, y]]
        this.strokes.push(this.stroke);
    } else if (evt.type == "mousemove") {
        if (this.penDown) {
            this.sampleUsed = null;
            this.stroke.push([x, y]);
            var ctx = canvas.getContext("2d");

            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();

            this.strokes.forEach((points) => {
                ctx.moveTo(points[0][0], points[0][1]);
                for (var i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i][0], points[i][1]);
                }
                ctx.stroke();
            });
        }
    } else if (evt.type == "mouseup") {
        this.penDown = false;
    }
}

}