"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';
import IpythonList from 'src/templates/ipython-list.js';

export default class IpythonTensorlist extends IpythonList {
  async initialize() {    
 }

  register() {
    var terminal = window.terminal;
    if (!terminal) {return;}
var py = `
import loader
layer_names = loader.load('layer_names', '''
from ipykernel.comm import Comm
import numpy as np

my_evaluator = None

def set_evaluator(ev):
  global my_evaluator
  my_evaluator = ev

def send_layer_names(ev):
  if ev is None:
    evaluator = my_evaluator
  else:
    evaluator = ev
  if evaluator is None:
    return
  names = '\n'.join(evaluator.get_layer_names())
  comm = Comm(target_name='layer_names')
  comm.send(data='dense', buffers=[memoryview(bytearray(names), 'ascii')])
  comm.close()

def receive_layer_names_request(msg):
  send_layer_names(None)

def handle_open(comm, msg):
  comm.on_msg(receive_layer_names_request)

get_ipython().kernel.comm_manager.register_target("layer_names", handle_open)
''')`
    terminal.runCommand(py);
    terminal.insertAndRunCommand('layer_names.set_evaluator(evaluator)');
    terminal.addHandler('layer_names', this, this.receive_layer_names.bind(this));
  }

  receive_layer_names(msg) {
    console.log('layer_names', msg);
  }

}