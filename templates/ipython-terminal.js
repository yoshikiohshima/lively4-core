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
    this.token = '6008f6fb56c8c0c0541000045e0582eb40405b5b26aa72b8';
    this.getList();
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
  
  kernelSelected(name) {
    var options = this.get('#modelChoice').options;
    for (var i = 0; i < options.length; i++){
      var option = options[i];
      if (option.text == name) {
        this.modelId = option.id;
      }
    }
  }
 
  getList() {
    this.modelId = '27e286db-3787-46ad-9fd0-d9fcc35d1486';
    this.model = {id: this.modelId, name: 'python3'};
    
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

    this.Services.Session.listRunning(this.settings).then(function(models) {
      for (var i = 0; i < models.length; i++) {
        var model = models[i];
        var kernelModel = model.kernel;
        var id = kernelModel.id;
        var name = model.name;
      }
      console.log('models', models);
    });

    if (this.kernel && this.kernel.idle && this.kernel.busy) {
      // status should be: Status = 'unknown' | 'starting' | 'reconnecting' | 'idle' | 'busy' | 'restarting' | 'dead' | 'connected';
      return this.runCommand2(text);
    }
    
    this.Services.Kernel.connectTo(this.model, this.settings).then((c) => {
      that.kernel = c;
      console.log("kernel found") 
      console.log(this.input.value);
      var future = this.kernel.requestExecute({code: text.value});
      future.onReply = (reply) => {
        console.log("execution reply", reply);
      };
      future.onIOPub = (reply) => {
        console.log(reply);
        console.log(reply.msg_type);
        var type = reply.msg_type;
        if (type === "status") {
          if (reply.content.execution_state === "busy") {
            console.log("kernel started working");
          } else if (reply.content.execution_state == "idle") {
            this.addInput();
            console.log('kernel ready');
          } else {
            console.log("unknown state");
          }
        } else if (type === "execute_input") {
          console.log('input sent');
        } else if (type === "execute_result") {
          console.log("result", reply);
          if (reply.content.data && reply.content.data['text/plain'] !== undefined) {
            this.addOutput(reply.content.data['text/plain']);
          }
        } else if (type === "stream") {
          console.log(reply.content.name, reply.content.text);
          this.addOutput(reply.content.text);
        } else if (type === "error") {
        console.log("error", reply);
         this.addOutput(reply.content.evalue);
        }
      };
      return future.done;
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