"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

function iPythonSettings(token) {
  var Request = window.Services.ServerConnection.defaultSettings.Request;
  var Headers = window.Services.ServerConnection.defaultSettings.Headers;
  var WebSocket = window.Services.ServerConnection.defaultSettings.WebSocket;
  // var fetch = window.Services.ServerConnection.defaultSettings.fetch;
  var fetch = window.originalFetch;
  return {baseUrl: 'http://localhost:8888', pageUrl:"", wsUrl: "ws://localhost:8888", token: token,
           init: {cache: 'no-store', credentials: "same-origin"},
          Request: Request, Headers: Headers, WebSocket: WebSocket, fetch: fetch};
}

class Announcer {
  constructor() {
    this.handlers = {};
  }
  
  addHandler(name, objName, callback) {
    var that = this;
    function has(name, obj, callback) {
      var ary = that.handlers[name];
      if (!ary) {return false;}
      for (var i = 0; i < ary.length; i++) {
        var v = ary[i];
        if (v.handler === obj) {
          return true;
        }
      }
      return false;
    }
    if (has(name, objName, callback)) {
      return;
    }
    if (!this.handlers[name]) {
      this.handlers[name] = [];
    }
    this.handlers[name].push({handler: objName, callback: callback});    
  }

  announce(sender, name, arg) {
    var ary = this.handlers[name];
    if (!ary){return;}
    for (var i = 0; i < ary.length; i++) {
      var p = new Promise(function(resolve, fail) {
        var objName = ary[i].handler;
        var o = document.getElementById(objName);
        var f = ary[i].callback;
        var result;
        try {
          result = f.call(o, arg);
        } catch (e) {
          fail(e);
        }
        resolve(result);
      });
    }
  }

  removeHandler(name, objName) {
    var ary = this.handlers[name];
    if (!ary) {return;}
    for (var i = 0; i < ary.length; i++) {
      var v = ary[i];
      if (v.handler === objName) {
        ary.splice(i, 1);
        return;
      }
    }
  }
}

class Dispatcher {
  constructor() {
    this.handlers = {} // {comm name: [handler: obj, callback: callable]}
    this.kernel = null;
  }
  setKernel(kernel) {
    this.kernel = kernel;
  }
  
  addHandler(name, objName, callback) {
    var that = this;
    function has(name, objName) {
      var ary = that.handlers[name];
      if (!ary) {return false;}
      for (var i = 0; i < ary.length; i++) {
        var v = ary[i];
        if (v.handler === objName) {
          return true;
        }
      }
      return false;
    }
    if (has(name, objName)) {
      return;
    }
    if (!this.handlers[name]) {
      this.handlers[name] = [];
    }
    (function() {
      var n = name;
      var kernel = that.kernel;
      kernel.registerCommTarget(name, (comm, commMsg) => {
        comm.onMsg = (msg) => {
          var ary = that.handlers[n];
          for (var i = 0; i < ary.length; i++) {
            var entry = ary[i];
            var objName = entry.handler;
            var o = document.getElementById(objName);
            var f = entry.callback;
            f(msg);
          }
        }
        comm.onClose = (msg) => {};
      });
    })();
    this.handlers[name].push({handler: objName, callback: callback});    
  }

  removeHandler(name, objName) {
    var ary = this.handlers[name];
    if (!ary) {return;}
    for (var i = 0; i < ary.length; i++) {
      var v = ary[i];
      if (v.handler === objName) {
        ary.splice(i, 1);
        return;
      }
    }
  }

  receive(name, msg) {
    var ary = this.handler[name];
    if (!ary) {return;}
    for (var i = 0; i < ary.length; i++) {
      
    var p = new Promise(function(resolve, fail) {
      var objName = ary[i].handler;
      var o = document.getElementById(objName);
      var f = ary[i].callback;
      var result;
      try {
        result = f(msg);
      } catch (e) {
        fail(e);
      }
        resolve(result);
      });
    }
  }
}

class Notebook {
  async initialize() {
    this.session = null;       // session
    this.kernel = null;   // real kernel
    this.model = null;    // model

    this.dispatcher = null; // Dispatcher
    this.announcer = new Announcer(); // Announcer

    // the view of cells
    this.cells = []; // cells structure
    this.lastInput = -1; // the index of the last input, where new output will go
  }

  status() {
    if (!this.kernel) {return "unknown";}
    return this.kernel.status;
  }

  newUntitled(settings, optCallback) {
    var contents = new window.Services.ContentsManager({serverSettings: settings});

    contents.newUntitled({path: '.', type: 'notebook', ext: 'ipynb'}).then((notebook) => {
      this.open(notebook.path, token, optCallback);
    });
  }
  
  async open(file, settings, optCallback) {
    var options = {kernelName: 'python3',
                   path: file,
                   serverSettings: settings};
    window.Services.Session.startNew(options, settings).then((session) => {
      this.session = session;
      this.kernel = session.kernel;
      this.dispatcher = new Dispatcher();
      this.dispatcher.setKernel(this.kernel);
      var file = session.path;
      var contents = new window.Services.ContentsManager({serverSettings: settings});
      contents.get(file).then((model) => {
        this.model = model;
        this.cells = model.cells;
      });

      if (optCallback) {
        optCallback();
      }
    });
  }

  async shutdown() {
    if (!this.session) {return;}
    this.session.shutdown().then(() => {
      console.log('session closed');
      this.session = null;
      this.kernel = null;
      this.dispatcher = null;
    });
  }

  updateModel(terminal, optUpdateCells) {
    var file = this.session.path;
    var contents = new window.Services.ContentsManager({serverSettings: this.settings});
    contents.get(file).then((model) => {
      this.model = model;
      if (optUpdateCells) {
        this.parseCells(model.content.cells);
      }
    });
  }

  evaluate(code, terminal) {
    console.log('python evaluate', code);
    var future = this.kernel.requestExecute({code: code});
    future.onReply = (reply) => {
      console.log("execution reply", reply);
    };
    future.onIOPub = (reply) => {
      var type = reply.msg_type;
      if (type === "status") {
        if (reply.content.execution_state === "busy") {
          console.log("kernel started working");
        } else if (reply.content.execution_state == "idle") {
          if (terminal) {terminal.addInput();}
        } else {
        }
      } else if (type === "execute_input") {
      } else if (type === "execute_result") {
        console.log("execution result", reply);
        if (reply.content.data && reply.content.data['text/plain'] !== undefined) {
          if (terminal) {terminal.addOutput(reply.content.data['text/plain']);}
        }
      } else if (type === "stream") {
        console.log(reply.content.name, reply.content.text);
        if (terminal) {terminal.addOutput(reply.content.text);}
      } else if (type === "error") {
        if (terminal) {terminal.addOutput(reply.content.evalue);}
      }
    };
    return future.done;
  }

  save(settings, optCallback) {
    var cells = this.cells;
    var contents = new window.Services.ContentsManager({serverSettings: settings});      
    contents.save(this.session.path, cells);
    if (optCallback) {
      optCallback();
    }
  }

  addInput(input) {
    var cell = {cell_type: 'code',
                execution_count: 1,
                metadata: {
                  trusted: true,
                },
                source: input,
                outputs: []
              };
    this.lastInput = this.cells.length;
    this.cells.push(cell);
  }

  addOutputs(outputs) {
    var outputs = this.cells[this.lastInput].outputs;
    outputs.forEach((out) => {
      var output = {
        output_type: "execute_result",
        metadata: {},
        execution_count: 1,
        data: {'text/plain': out}
      };
      outputs.push(output);
    });
  }

  send(commName, data, metadata, buffers, then) {
   var kernel = this.kernel;
    if (!kernel) {return;}
    kernel.connectToComm(commName).then(comm => {
        comm.open('ack');
        comm.send(data, metadata, buffers);
        comm.onClose = (msg) => {
          console.log('comm closed');
          if(then) {then();}
        };
    });
  }

  addHandler(name, widget, callback) {
    if (this.dispatcher) {
      this.dispatcher.addHandler(name, widget, callback);
    }
  }
}

export default class IpythonTerminal extends Morph {
  initialize() {
    this.input = null;
    this.windowTitle = "IpythonTerminal";
    this.get('#token').value = '651dd093e2051a8be3c487301cd589f94b2ebd9d0baed528';
    this.settings = null; // settings object

    this.setupTokenField();
    this.setupChoices();
    this.setupNewButton();
    this.setupSaveButton();

    this.sessions = null;
  }

  initTerminal() {
    this.terminal = this.get("#terminal");

    while (this.terminal.firstChild) {
     this.terminal.removeChild(this.terminal.firstChild);
    }
  }
 
  setupTokenField() {
    var field = this.get('#token');
    field.addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        this.token = field.value;
	this.settings = iPythonSettings(this.token);
        var promise = this.listNotebooks(this.settings);
      }
    });
    field.addEventListener("click", () => {
      field.focus();
    });
    this.token = field.value;
  }
  
  setupNewButton() {
    var button = this.get('#newNotebook');
    button.addEventListener("click", () => {
      this.newNotebook();
    });
  }

  setupSaveButton() {
    var button = this.get('#saveNotebook');
      button.addEventListener("click", () => {
        this.saveNotebook();
    });
  }

  setupAskButton() {
    var button = this.get('#askNotebook');
    button.addEventListener("click", () => {
      this.notebook.ask();
    });
  }

  setupChoices() {
    var choices = this.get('#modelChoice');
    choices.addEventListener("change", (evt) => {
      var name = evt.target.value;
      this.sessionSelected(name);
    });
  }

  updateChoices(files) {
    var choices = this.get('#modelChoice');
    while (choices.options.length > 0) {
      choices.remove(0);
    }

    var firstFile = null;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!firstFile) {
        firstFile = file;
      }
      var option = document.createElement("option");
      option.text = file;
      choices.add(option);
    }
    if (firstFile) {
      this.sessionSelected(firstFile);
    }
  }

  listNotebooks(settings) {
    var books;
    var contents = new window.Services.ContentsManager({serverSettings: settings});
    contents.get(".").then((models) => {
      books = models.content.filter((e) => e.type === "notebook").map((e) => e.name);
      this.updateChoices(books);
    });
  }
  
  newNotebook() {
    this.notebook = new Notebook();
    this.initTerminal();
    this.notebook.newUntitled(this.settings, () => {
      this.updateCells(true);
      this.addInput();
      this.listNotebooks(this.settings);
    });
  }

  openNotebook(file) {
    this.notebook = new Notebook();
    this.initTerminal();
    this.notebook.open(file, this.settings, () => {
      this.updateCells(true)
    });
    window.terminal = this;
  }
  
  saveNotebook() {
    if (!this.notebook) {return;}
    var cells = this.makeCells();
    this.model.content.cells = cells;
    this.notebook.save(this.settings, () => {this.updateCells(false)});
  }
  
  sessionSelected(file) {
    if (this.notebook) {
      this.notebook.shutdown().then(() => {console.log("session closed")});
      this.notebook == null;
    }
    this.openNotebook(file);
  }

  updateCells() {
    debugger;
    var cells = this.notebook.cells;
    this.parseCells(cells);
  }

  parseCells(cells) {
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      switch (cell.cell_type) {
      case "code":
        if (typeof(cell.source) == "string" && cell.source.length > 0) {
          this.addInput(cell.source);
          for (var j = 0; j < cell.outputs.length; j++) {
            var output = cell.outputs[j];
            if (output && output.data && output.data['text/plain']) {
              this.addOutput(output.data['text/plain']);
            }
          }
        }
        break;
      }     
    }
  }
    
  addInput(optSource) {
    var that = this;
    (function() {
      var text = document.createElement("textarea");
      if (optSource) {
        text.value = optSource;
        var lines = optSource.split('\n').length;
        text.style.height = (22*lines + 14)+'px';
      }
      text.classList.add('terminalIn');
      text.setAttribute("type", "text");
      that.terminal.appendChild(text);
      if (that.input) {that.input.blur();}
      that.input = text;
      text.addEventListener("keyup", (event) => {
        if (event.keyCode === 13 && event.shiftKey) {
          that.runCommand(text.value);
          var lines = text.value.split('\n');
          if (lines.length == 2 && lines[1] == "") {
            text.value = lines[0]
          }
        }
      });
      text.addEventListener("click", (event) => {
        text.focus();
      });
    })();
    that.input.focus();
  }

  addOutput(str) {
    var text = document.createElement("textarea");
    text.readOnly = true;

    if (str) {
      var lines = str.split('\n').length;
      text.style.height = (22*lines+14)+'px';
    }
    text.classList.add('terminalOut');
    text.innerHTML = this.escape(str);
    this.terminal.appendChild(text);
  }

  oneStep(str) {
    this.addOutput(str);
    this.addInput();
  }

  escape(str) {
    return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
  }
  
  send(commName, data, metadata, buffers, then) {
    if (!this.notebook) {return;}
    this.notebook.send(commName, data, metadata, buffers, then);
  }

  insertAndRunCommand(text) {
    this.input.value = text;
    this.runCommand(text, true);
  }

  runCommand(text, optHide) {
    if (!this.notebook) {return;}
    var status = this.notebook.status();
    if (status === 'idle' || status === 'busy') {
       // status should be:
       // Status = 'unknown' | 'starting' |
       //    'reconnecting' | 'idle' | 'busy' | 'restarting' | 'dead' | 'connected';
       // and test it accordingly
      return this.notebook.evaluate(text, optHide);
    }
  }
  
  addHandler(name, widget, callback) {
    if (!this.notebook) {return;}
    this.notebook.addHandler(name, widget, callback);
  }

  addBroadcastReceiver(name, obj, callback) {
    this.announcer.addHandler(name, obj, callback)
  }
  
  announce(sender, name, arg) {
    this.announcer.announce(sender, name, arg);
  }
    
  /* Lively-specific API */

  livelyPreMigrate() {
    // is called on the old object before the migration
    if (this.notebook) {
      this.notebook.shutdown();
      this.notebook == null;
    }
  }
  
  livelyMigrate(other) {
    // whenever a component is replaced with a newer version during development
    // this method is called on the new object during migration, but before initialization
    this.notebook = other.notebook;
  }
  
  livelyInspect(contentNode, inspector) {
    // do nothing
  }
  
  livelyPrepareSave() {
    
  }
  
}


