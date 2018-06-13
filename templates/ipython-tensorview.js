"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

function findMax(tensor) {
    var v = -Infinity;
    for (var i = 0; i < tensor.length; i++) {
      v = Math.max(v, tensor[i]);
    }
    return v;
}

function findMin(tensor) {
    var v = Infinity;
    for (var i = 0; i < tensor.length; i++) {
      v = Math.min(v, tensor[i]);
    }
    return v;
}

export default class IpythonTensorview extends Morph {
  async initialize() {
    this.windowTitle = "IpythonTensorview";
    this.canvas = this.get('#canvas');
    this.canvas.getContext('2d').fillRect(0, 0, 100, 100);

    this.canvas.addEventListener("mouseover", this.weightEvent.bind(this));
    this.canvas.addEventListener("mousemove", this.weightEvent.bind(this));
    this.canvas.addEventListener("mouseout", this.weightEvent.bind(this));

    window.tensorView = this;
  }

  register() {
    var terminal = window.terminal;
    if (!terminal) {return;}
    var py = `
import loader
weight_tensor = loader.load('weight_tensor', '''
from ipykernel.comm import Comm
import numpy as np

my_evaluator = None

def set_evaluator(ev):
  global my_evaluator
  my_evaluator = ev

def send_tensor(ev, name):
  if ev is None:
    evaluator = my_evaluator
  else:
    evaluator = ev
  with open('bar.txt', 'w') as file:
    file.write(name)
  if evaluator is None:
    return
  weights = evaluator.get_weights(name)
  typeName = weights[0]
  with open('baz.txt', 'w') as file:
    file.write('t')
    file.write(typeName)
  if typeName == "Dense":
    data = weights[1]
    weightPair = data[0]
    biasPair = data[1]
    ws = weightPair[0]
    weightShape = weightPair[1]
    bs = biasPair[0]
    biasShape = biasPair[1]

    comm = Comm(target_name='weight_tensor')
    comm.send(data='dense', buffers=[memoryview(ws),
                                      memoryview(bytearray(str(weightShape), 'ascii')),
                                      memoryview(bs),
                                      memoryview(bytearray(str(biasShape), 'ascii'))])
    comm.close()

def receive_weight_request(msg):
  s = msg['buffers'][0].tobytes()
  d = s.decode('ascii')
  with open('foo.txt', 'w') as file:
    file.write(d)
  send_tensor(None, d)

def handle_open(comm, msg):
  comm.on_msg(receive_weight_request)
get_ipython().kernel.comm_manager.register_target("weight_tensor", handle_open)
''')`
    terminal.runCommand(py);
    terminal.insertAndRunCommand('weight_tensor.set_evaluator(evaluator)');
    terminal.addHandler('weight_tensor', this, this.receive_tensor.bind(this));
  }

  receive_tensor(msg) {
    function parseTuple(str) {
      return eval(str.replace('(', '[').replace(')', ']'));
    }

    if (msg.content.data === 'dense') {
      var weights = new Float32Array(msg.buffers[0].buffer);
      var weightsShape = parseTuple(new TextDecoder('ascii').decode(new Uint8Array(msg.buffers[1].buffer)))
      var bias = new Float32Array(msg.buffers[2].buffer);
      var biasShape = parseTuple(new TextDecoder('ascii').decode(new Uint8Array(msg.buffers[3].buffer)))
    }
    this.showTensor(weights, weightsShape, bias, biasShape);
  }
  
  ask(name) {
    var terminal = window.terminal;
    if (!terminal) {return;}
    var enc = new TextEncoder('ascii');
    var encoded = enc.encode(name);
    console.log(encoded);
    terminal.send('weight_tensor', 'weight_tensor', null, [encoded])
  }
  
  showTensor(weights, weightsShape, bias, biasShape) {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var holder = this;
    var rect = holder.getBoundingClientRect();
    if (!weights) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'black';
        ctx.font="15px Georgia";
        ctx.fillText("(Too Large to Show)", 72, 200);
        return;
    }

    var pixelH = 5;
    this.pixelH = pixelH;

    var maybeWidth = rect.width / weightsShape[1];
    var pixelW;
    if (maybeWidth > pixelH * 3) {
        pixelW = pixelH * 3;
    } else if (maybeWidth > pixelH * 2) {
        pixelW = pixelH * 2;
    } else {
        pixelW = pixelH;
    }

    this.pixelW = pixelW;

    var width = (pixelW + 1) * weightsShape[1] + 1;
    var height = (pixelH + 1) * weightsShape[0] + 10 + pixelH + 1;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var wmax = findMax(weights);
    var wmin = findMin(weights);

    var amax = Math.max(Math.abs(wmax), Math.abs(wmin));

    var i, v;
    for (var j = 0; j < weightsShape[0]; j++) {
        for (i = 0; i < weightsShape[1]; i++) {
            v = weights[j * weightsShape[1] + i];
            v = v / amax * 255;
            ctx.fillStyle = `rgb(${Math.floor(Math.max(0, -v))}, ${Math.floor(Math.max(v, 0))}, ${Math.floor(Math.max(v, 0))})`;
            ctx.fillRect(i * (pixelW + 1) , j * (pixelH + 1), pixelW, pixelH);
        }
    }

    for (i = 0; i < biasShape[0]; i++) {
        v = bias[i];
        v = v / amax * 255;
        ctx.fillStyle = `rgb(${Math.floor(Math.max(0, -v))}, ${Math.floor(Math.max(v, 0))}, ${Math.floor(Math.max(v, 0))})`;
        ctx.fillRect(i * (pixelW + 1) , weightsShape[0] * (pixelH + 1) + 10, pixelW, pixelH);
    }
    this.wmax = wmax;
    this.wmin = wmin;

  }

  message(value, i, j) {
    var message;
    var direction;
    var scaled;
    if (value >= 0) {
        scaled = value  / this.wmax;
        direction = "promotes";
    } else {
        scaled = value  / this.wmin;
        direction = "inhibits";
    }
    if (scaled > 0.6) {
        message = 'strongly';
    } else if (scaled > 0.2) {
        message = 'moderately';
    } else {
        message = 'slightly';
    }
    var suffix;
    if (i === 1) {
        suffix = 'st';
    } else if (i === 2) {
        suffix = 'nd';
    } else if (i === 3) {
        suffix = 'rd';
    } else {
        suffix = 'th';
    }
    return `node #${j}: ${direction} the ${i}${suffix} output ${message} (${value.toFixed(6)}) `;
  }

  weightEvent(evt) {
    var x = evt.offsetX;
    var y = evt.offsetY;

    var pixelW = this.pixelW;
    var pixelH = this.pixelH;
    var shape = this.shape;
    
    var tip = window.tooptip;
    console.log(tip);
    if (!tip) {
      tip = this.get('#tip');
    }
    if (!tip) {
      return;
    }

    if (evt.type == "mouseover" || evt.type == "mousemove") {
        var i = Math.floor(x / (pixelW + 1));
        var j = Math.floor(y / (pixelH + 1));

        if (0 <= i && i < shape[1] &&
            0 <= j && j < shape[0]) {
            var value = this.values.weights[j][i];
            tip.mouseover(evt.pageX + 10, evt.pageY, this.message(value, i, j), 200, 30);
        } else {
            tip.mouseover(evt.pageX + 10, evt.pageY, "<span>unknown</span>", 200, 30);
        }
    } else if (evt.type == "mouseout") {
        tip.mouseout(x, y);
    }
  }
}