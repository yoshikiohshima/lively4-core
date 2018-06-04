"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

function find(tensor, func, unit) {
    if (typeof tensor == "object" && tensor.constructor == Array) {
        var typical = tensor[0];
        if (typeof typical == "object" && typical.constructor == Array) {
            var vals = tensor.map((v) => find.call(null, v, func, unit));
            return func.apply(null, vals);
        } else if (typeof typical == "number") {
            return func.apply(null, tensor);
        }
    } else {
        return unit;
    }
}

function findMax(tensor) {
    return find(tensor, Math.max, -Infinity);
}

function findMin(tensor) {
    return find(tensor, Math.min, Infinity);
}

export default class IpythonTensorview extends Morph {
  async initialize() {
    this.windowTitle = "IpythonTensorview";
    this.canvas = this.get('#canvas');
  }
  
  showTensor() {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var holder = this;
    var rect = holder.getBoundingClientRect();
    if (!this.values) {
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

    var weights = this.values.weights;
    var bias = this.values.bias;
    var params;

    if (params.typeName !== "Dense") {
        return;
    }
    var shape = [params.input_shape[0], params.output_shape[0]];

    var pixelH = 5;
    this.pixelH = pixelH;

    var maybeWidth = rect.width / shape[1];
    var pixelW;
    if (maybeWidth > pixelH * 3) {
        pixelW = pixelH * 3;
    } else if (maybeWidth > pixelH * 2) {
        pixelW = pixelH * 2;
    } else {
        pixelW = pixelH;
    }

    this.pixelW = pixelW;

    var width = (pixelW + 1) * shape[1] + 1;
    var height = (pixelH + 1) * shape[0] + 10 + pixelH + 1;

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
    for (var j = 0; j < shape[0]; j++) {
        for (i = 0; i < shape[1]; i++) {
            v = weights[j][i];
            v = v / amax * 255;
            ctx.fillStyle = `rgb(${Math.floor(Math.max(0, -v))}, ${Math.floor(Math.max(v, 0))}, ${Math.floor(Math.max(v, 0))})`;
            ctx.fillRect(i * (pixelW + 1) , j * (pixelH + 1), pixelW, pixelH);
        }
    }

    for (i = 0; i < shape[1]; i++) {
        v = bias[i];
        v = v / amax * 255;
        ctx.fillStyle = `rgb(${Math.floor(Math.max(0, -v))}, ${Math.floor(Math.max(v, 0))}, ${Math.floor(Math.max(v, 0))})`;
        ctx.fillRect(i * (pixelW + 1) , shape[0] * (pixelH + 1) + 10, pixelW, pixelH);
    }
    this.wmax = wmax;
    this.wmin = wmin;

  }

  /* Lively-specific API */

}