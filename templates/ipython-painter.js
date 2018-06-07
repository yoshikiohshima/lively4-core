"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonPainter extends Morph {
  async initialize() {
    this.windowTitle = "IpythonPainter";
    this.initCanvas();
    this.initScaledCanvas();
    this.setupClearButton();
    this.setupSendButton();
  }

  setupClearButton() {
         var button = this.get('#clear');
        button.addEventListener("click", () => {
            this.clear();
        });
  }

  setupSendButton() {
         var button = this.get('#send');
        button.addEventListener("click", () => {
            this.send();
        });
  }

  clear() {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.strokes = [];
  }

  register() {
    var terminal = window.terminal;
    if (!terminal) {return;}
var py = `
import loader
mnist_image = loader.load('mnist_image', '''
from ipykernel.comm import Comm
import numpy as np

last_image = None
def evaluate_last_image(evaluator):
  if last_image is None:
    return

  prediction, confidence = evaluator.predict(last_image)
  print('prediction', prediction)
  print('confidence', confidence)

def receive_image(msg):
  with open("foo.txt", "w") as file:
     file.write(msg.__dict__.__str__())
  global last_image
  #shape = np.frombuffer(msg['buffers'][0], dtype=np.int32)
  ary = np.frombuffer(msg['buffers'][1], dtype=np.uint8)
  floatData = ary.astype('float32') / 255.0
  floatData = floatData.reshape([-1, 28, 28, 1])
  last_image = floatData

def handle_open(comm, msg):
  comm.on_msg(receive_image)
get_ipython().kernel.comm_manager.register_target("mnist_image", handle_open)
''')`
    terminal.runCommand(py);
    terminal.addHandler('mnist_image', this, this.ready.bind(this));
  }
  
  ready() {
    
  }

  send() {
    var terminal = window.terminal;
    if (!terminal) {return;}

    var m = this.cropAndPosition();
    var scaledCanvas = this.scaledCanvas;
    var canvas = this.canvas;

    var scaledCtx = scaledCanvas.getContext('2d');
    scaledCtx.clearRect(0, 0, 100, 100);
    scaledCtx.drawImage(canvas, m.minX, m.minY, m.width, m.height, 0, 0, scaledCanvas.width, scaledCanvas.height);

    var imageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
    var grayData = new Uint8Array(imageData.data.length/4);
    for (var i = 0; i < grayData.length; i++) {
        var val = 255 - imageData.data[i*4+1];
        grayData[i] = val;
    }

    var shape = new Uint32Array([28, 28]);
    terminal.send('mnist_image', 'mnist_image', null, [shape, grayData]);
    terminal.insertAndRunCommand("mnist_image.evaluate_last_image(evaluator)");
  }
  
 initScaledCanvas() {
    this.scaledCanvas = this.get('#scaledCanvas');
    this.scaledCanvas.width = 28;
    this.scaledCanvas.height = 28;
    var ctx = this.scaledCanvas.getContext('2d');

    ctx.mozImageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = true;
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
    var rect = canvas.getBoundingClientRect();
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
  
  cropAndPosition() {
    var canvas = this.canvas;

    var imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

    var minX = 100;
    var maxX = -100;
    var minY = 100;
    var maxY = -100;

    var totalMassX = 0;
    var totalMassY = 0;

    var totalP = 0;

    for (var j = 0; j < canvas.height; j++) {
        for (var i = 0; i < canvas.width; i++) {
            var p = 255 - imageData.data[(j * canvas.width + i)*4+1];
            if (p > 0) {
                minX = minX < i ? minX : i;
                minY = minY < j ? minY : j;
                maxX = maxX > i ? maxX : i;
                maxY = maxY > j ? maxY : j;
            }
            totalP += p
            totalMassX += (p * i);
            totalMassY += (p * j);
        }
    }

    var centerX = totalMassX / totalP;
    var centerY = totalMassY / totalP;

    var left = centerX - minX;
    var right = maxX - centerX;
    var top = centerY - minY;
    var bottom = maxY - centerY;

    var m = Math.max(left, right, top, bottom);

    m = m * 1.0;

    var realMinX = centerX - m;
    var realMaxX = centerX + m;
    var realMinY = centerY - m;
    var realMaxY = centerY + m;

    return {minX: realMinX, maxX: realMaxX, minY: realMinY, maxY: realMaxY, width: m * 2, height: m * 2}
}



}