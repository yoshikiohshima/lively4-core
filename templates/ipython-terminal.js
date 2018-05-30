"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonTerminal extends Morph {
  initialize() {
    this.inputs = [];
    this.outputs = [];
    this.input = null;
    this.windowTitle = "IpythonTerminal";
    this.terminal = this.get("#terminal");
    this.port = 8888;
    this.Services = window.Services;
    this.get('#token').value = 'edfe4b7bc3aa7cc79a14864247378b1eb52b5e8fbb1139b4';
    this.setupTokenField();
    this.setupChoices();
    this.addInput();
  }
  
  setSettings() {
    var Request = this.Services.ServerConnection.defaultSettings.Request;
    var Headers = this.Services.ServerConnection.defaultSettings.Headers;
    var WebSocket = this.Services.ServerConnection.defaultSettings.WebSocket;
    var fetch = this.Services.ServerConnection.defaultSettings.fetch;
    this.settings = {baseUrl: 'http://localhost:8888', pageUrl:"", wsUrl: "ws://localhost:8888", token: this.token,
               init: {cache: 'no-store', credentials: "same-origin"},
               Request: Request, Headers: Headers, WebSocket: WebSocket, fetch: fetch};
    
  }
  
  kernelSelected(id) {
       this.modelId = id;
      this.model = {id: id, name: 'python3'};
     debugger;
    if (this.kernel) {
        this.kernel.shutdown();
        this.kernel == null;
    }
   }

  setupTokenField() {
    var field = this.get('#token');
    field.addEventListener("keyup", (event) => {
        if (event.keyCode === 13) {
          this.token = field.value;
          this.setSettings();
          this.updateChoices();
        }
      });
     field.addEventListener("click", () => {
       field.focus();
     });
    this.token = field.value;
  }
  
  setupChoices() {
    var choices = this.get('#modelChoice');

    choices.addEventListener("change", (evt) => {
        var name = evt.target.value;
        console.log("selection: ", name);
        this.kernelSelected(evt.target.modelId);
      });
  }

  updateChoices() {
    var choices = this.get('#modelChoice');
    while (choices.options.length > 0) {
        choices.remove(0);
    }

    this.Services.Session.listRunning(this.settings).then((models) => {
      debugger;
      for (var i = 0; i < models.length; i++) {
        var model = models[i];
        var kernelModel = model.kernel;
        var id = kernelModel.id;
        var name = model.name;
        var option = document.createElement("option");
        option.text = name;
        option.modelId = id;
        choices.add(option);
        this.kernelSelected(id);
     }
      console.log('models', models);
    });   
  }
  
  addInput() {
    var text = document.createElement("input");
    text.classList.add('terminalIn');
    text.setAttribute("type", "text");
    this.terminal.appendChild(text);
    if (this.input) {this.input.blur();}
    this.input = text;
    text.addEventListener("keyup", (event) => {
        if (event.keyCode === 13 && event.shiftKey) {
          this.runCommand(text);
        }
      });
     this.terminal.addEventListener("click", (event) => {
       text.focus();
     });
    this.input.focus();
   }

  addOutput(str) {
    var text = document.createElement("div");
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

  runCommand2(text) {
      console.log('runCommand2', this.input.value);
      var future = this.kernel.requestExecute({code: text.value});
      future.onReply = (reply) => {
        console.log("execution reply", reply);
      };
      future.onIOPub = (reply) => {
        var type = reply.msg_type;
        if (type === "status") {
          if (reply.content.execution_state === "busy") {
            console.log("kernel started working");
          } else if (reply.content.execution_state == "idle") {
            this.addInput();
          } else {
          }
        } else if (type === "execute_input") {
        } else if (type === "execute_result") {
          if (reply.content.data && reply.content.data['text/plain'] !== undefined) {
            this.addOutput(reply.content.data['text/plain']);
          }
        } else if (type === "stream") {
          console.log(reply.content.name, reply.content.text);
          this.addOutput(reply.content.text);
        } else if (type === "error") {
         this.addOutput(reply.content.evalue);
        }
      };
      return future.done;
  }

  runCommand(text) {
    var that = this;
    this.setSettings(); 

    if (this.kernel && this.kernel.idle && this.kernel.busy) {
      // status should be: Status = 'unknown' | 'starting' | 'reconnecting' | 'idle' | 'busy' | 'restarting' | 'dead' | 'connected';
      return this.runCommand2(text);
    }
    
    this.Services.Kernel.connectTo(this.model, this.settings).then((c) => {
      that.kernel = c;
      console.log("kernel found") 
      console.log(this.input.value);
      this.runCommand2(text);
    });
  }
    
  /* Lively-specific API */

  livelyPreMigrate() {
    // is called on the old object before the migration
    if (this.kernel) {
      this.kernel.shutdown();
      this.kernel == null;
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