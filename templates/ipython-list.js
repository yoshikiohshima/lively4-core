"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonList extends Morph {
  async initialize() {
    this.windowTitle = "IpythonList";
    this.lastSelection = this.lastSelection;
    if (!this.names) {
      this.names = [];
    }
  }
  
  listener(arg)  {
    this.console.log('select', arg);
    var terminal = window.terminal;
    if (!terminal) {return;}
    debugger;
    terminal.announce('layer_selected', arg);
  }

  clear() {
    var list = this.get('#list');
    list.innerHTML = '';
    this.names = [];
    this.lastSelection = null;
  }
  
  getList() {
    return this.names;
  }

  setList(names) {
    this.clear();
    this.names = names;
    var origin = window.location.origin;
    var list = this.get('#list');
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var element = document.createElement("li");
      var link = document.createElement("a");

      var icon = '<i class="fa fa-file"></i>';
      link.innerHTML =  icon + name;
      link.href=origin + '/' + name;

      link.onclick = (evt) => {
        for (var i = 0; i < list.childNodes.length; i++) {
          var e = list.childNodes[i];
          e.classList.remove("selected");
        }
        evt.target.parentNode.classList.add("selected");
        this.onItemClick(evt); 
        return false
      };
      link.addEventListener('contextmenu', (evt) => {
        if (!evt.shiftKey) {
          this.onContextMenu(evt, name)
          evt.stopPropagation();
          evt.preventDefault();
          return true;
        }
      }, false);
      element.appendChild(link);
      list.appendChild(element);
    }
  }

  onContextMenu(evt) {
/*    if (this.targetObject && !evt.shiftKey) { 
      evt.preventDefault();
      evt.stopPropagation();
      if (this.targetObject instanceof Array) {
        var menu = new ContextMenu(this, [
              ["inspect as table", () => Inspector.inspectArrayAsTable(this.targetObject)],
            ]);
        menu.openIn(document.body, evt, this);
      } else if (this.targetObject.tagName) {
        // for all html elements
        lively.openContextMenu(document.body, evt, this.selection || this.targetObject);
        return true
      }
	    return false;
    } 
    */
  }

  itemSelected(a) {
    var len = window.location.origin.length + 1;
    console.log('sss', a.href.slice(len));
    if (this.listener) {
     this.listener(a.href.slice(len));
    }
  }

  onItemClick(evt) {
    this.lastSelection = [];
    console.log(evt.target);
    this.itemSelected(evt.target);
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
  names = "\\\\n".join(evaluator.layer_names())
  comm = Comm(target_name="layer_names")
  comm.send(data="dense", buffers=[memoryview(bytearray(names, "ascii"))])
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
    var list = new TextDecoder("utf-8").decode(new Uint8Array(msg.buffers[0].buffer));
    list = list.split('\n');
    this.setList(list);
  } 
  
 livelyMigrate(other) {
    // whenever a component is replaced with a newer version during development
    // this method is called on the new object during migration, but before initialization
    this.setList(other.getList());
  }
  
  async livelyExample() {
    this.setList(["abc", "def"]);
  }
}