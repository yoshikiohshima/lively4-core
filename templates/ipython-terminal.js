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

class Notebook {
    initialize() {
        this.session = null;       // session
        this.kernel = null;   // real kernel
    }

    status() {
        if (!this.kernel) {return "unknown";}
        return this.kernel.status();
    }

    newUntitled(then, token, optCallback) {
        var settings = iPythonSettings(token);
        var contents = new window.Services.ContentsManager({serverSettings: settings});

        contents.newUntitled({path: '.', type: 'notebook', ext: 'ipynb'}).then((notebook) => {
          this.open(notebook.path, token, optCallback);
      });
    }
  
    async open(file, token, optCallback) {
        var settings = iPythonSettings(token);
          var options = {kernelName: 'python3',
                        path: file,
                        serverSettings: settings};
          window.Services.Session.startNew(options, settings).then((session) => {
          this.session = session;
          this.kernel = session.kernel;
          this.setupComm();
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
            this.sessionModel = null;
            this.kernel = null;
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

    save(cells, token, optCallback) {
        var settings = iPythonSettings(token);
        var contents = new window.Services.ContentsManager({serverSettings: settings});      
        contents.save(this.session.path, cells);
          if (optCallback) {
            optCallback();
          }
    }
  
  launchWeightsView(weights, weightsShape, bias, biasShape) {
    console.log('launchWeightsView');
    if (window.tensorView) {
      window.tensorView.showTensor(weights, weightsShape, bias, biasShape);
    }
  }
 
  setupComm() {
    var kernel = this.kernel;
    if (!kernel) {return;}
    
    function parseTuple(str) {
    return eval(str.replace('(', '[').replace(')', ']'));
  }
    kernel.registerCommTarget('weights', (comm, commMsg) => {
      comm.onMsg = (msg) => {
      
       if (msg.content.data === 'dense') {
         var weights = new Float32Array(msg.buffers[0].buffer);
         var weightsShape = parseTuple(new TextDecoder('ascii').decode(new Uint8Array(msg.buffers[1].buffer)))
         var bias = new Float32Array(msg.buffers[2].buffer);
         var biasShape = parseTuple(new TextDecoder('ascii').decode(new Uint8Array(msg.buffers[3].buffer)))
       }
      this.launchWeightsView(weights, weightsShape, bias, biasShape);
    };
    comm.onClose = (msg) => {
    };
  });

    kernel.registerCommTarget('layers', (comm, commMsg) => {
      comm.onMsg = (msg) => {
      debugger;
       if (msg.content.data === 'names') {
         var names = msg.buffer.map((b) => new TextDecoder('ascii').decode(new Uint8Array(b.buffer)));
      }
      this.layerNames(names);
    };
    comm.onClose = (msg) => {
    };
  });

 /*     kernel.registerCommTarget('mycomm', (comm, commMsg) => {
        console.log("commMsg", commMsg);
    comm.onOpen= (msg) => {
        console.log("open", msg);
    };
    comm.onMsg= (msg) => {
        console.log("msg", msg);
    };
    comm.onClose = (msg) => {
      console.log(msg);  // 'bye'
    };
  });

 */
  }
  
  send(commName, data, metadata, buffers, then) {
   var kernel = this.kernel;
    if (!kernel) {return;}
    kernel.connectToComm(commName).then(comm => {
        comm.open('ack');
        comm.send(data, metadata, buffers);
        comm.onClose = (msg) => {then()};
    });
  }
  
  ask() {
   var kernel = this.kernel;
    if (!kernel) {return;}
    var ar = new Float32Array([1.5, 2.5 ,3.5, 4.5]);
    var shape = new Uint32Array([2, 2]);
    kernel.connectToComm("mycomm").then(comm => {
        comm.open('ack');
        comm.send("hey", null, [shape, ar]);
        comm.onClose = (msg) => {};
    });
   }
}

export default class IpythonTerminal extends Morph {
    initialize() {
        this.input = null;
        this.windowTitle = "IpythonTerminal";
        this.get('#token').value = '47101fa5a35a38e5a6007ca14ca86051fdc3a8e2bab0406a';

        this.setupTokenField();
        this.setupChoices();
        this.setupNewButton();
        this.setupSaveButton();
       this.setupAskButton();

        this.sessions = null;
      window.terminal = this;
    }

  initTerminal() {
    this.terminal = this.get("#terminal");

    while ( this.terminal .firstChild) {
     this.terminal .removeChild( this.terminal .firstChild);
    }
    this.addInput();
  }
 
    setupTokenField() {
        var field = this.get('#token');
        field.addEventListener("keyup", (event) => {
            if (event.keyCode === 13) {
                this.token = field.value;
                var promise = this.listNotebooks(this.token);
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
        if(firstFile) {
            this.sessionSelected(firstFile);
        }
    }

    listNotebooks(token) {
      var books;
      var settings = new iPythonSettings(token);
      var contents = new window.Services.ContentsManager({serverSettings: settings});
      contents.get(".").then((models) => {
        books = models.content.filter((e) => e.type === "notebook").map((e) => e.name);
        this.updateChoices(books);
      });
    }
  
   newNotebook() {
        this.notebook = new Notebook(this.token, this);
        this.initTerminal();
        this.notebook.newUntitled(() => {this.listNotebooks(this.token)}, this.token, () => {this.updateModel(true)});
    }

    openNotebook(file) {
        this.notebook = new Notebook();
        this.initTerminal();
        this.notebook.open(file, this.token, () => {this.updateModel(true)});
    }
  
    saveNotebook() {
      if (!this.notebook) {return;}
      var cells = this.makeCells();
      this.model.content.cells = cells;
      this.notebook.save(this.model, this.token, () => {this.updateModel(false)});
    }
  
    sessionSelected(file) {
        if (this.notebook) {
            this.notebook.shutdown().then(() => {console.log("session closed")});
            this.notebook == null;
        }
        this.openNotebook(file);
    }

  updateModel(optUpdateCells) {
     if (!this.notebook) {return;}
       var file = this.notebook.session.path;
       var settings = iPythonSettings(this.token);
        var contents = new window.Services.ContentsManager({serverSettings: settings});
        contents.get(file).then((model) => {
          this.model = model;
          if (optUpdateCells) {
            this.parseCells(model.content.cells);
          }
        });
    }
  
    parseCells(cells) {
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        switch (cell.cell_type) {
          case "code":
            this.addInput(cell.source);
            for (var j = 0; j < cell.outputs.length; j++) {
              var output = cell.outputs[j];
              if (output && output.data && output.data['text/plain']) {
                this.addOutput(output.data['text/plain']);
              }
            }
            break;
          }     
      }
    }
  
    makeCells() {
     var childNodes = this.get('#terminal').childNodes;
      var i = 0;
      var cells = [];
      
      while (i < childNodes.length) {
        var child = childNodes[i];
        if (child.classList.contains('terminalIn')) {
          var cell = {cell_type: 'code',
                      execution_count: 1,
                       metadata: {
                         trusted: true,
                       },
                        source: child.value
                     };
          i++;
          var lookOutputs = true;
          var outputs = [];
          while (lookOutputs && i < childNodes.length) {
            var maybe = childNodes[i];
            if (maybe.classList.contains('terminalOut')) {
              i++;
              var output = {
                output_type: "execute_result",
                metadata: {},
                execution_count: 1,
                data: {'text/plain': child.value}
              };
              outputs.push(output);
            } else {
              lookOutputs = false;
            }
          }
          cell.outputs = outputs;
          cells.push(cell);
        }
      }
      return cells;
    }

    addInput(optSource) {
      var that = this;
      (function() {
        var text = document.createElement("textarea");
        if (optSource) {
          text.value = optSource;
          var lines = optSource.split('\n').length;
          text.style.height = (20*lines + 14)+'px';
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
          text.style.height = (20*lines+14)+'px';
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

  runCommand(text) {
      if (!this.notebook) {return;}
      if (this.notebook.status) {
          // status should be: Status = 'unknown' | 'starting' | 'reconnecting' | 'idle' | 'busy' | 'restarting' | 'dead' | 'connected';
          // and test it accordingly
          return this.notebook.evaluate(text, this);
      }
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
    this.someJavaScriptProperty = other.someJavaScriptProperty
  }
  
  livelyInspect(contentNode, inspector) {
    // do nothing
  }
  
  livelyPrepareSave() {
    
  }
  
}
