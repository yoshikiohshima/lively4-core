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
    this.setupTokenField();
    console.log("init");
    this.addInput();
  }

  setupTokenField() {
    var field = this.get('#token');
    console.log(field);
    field.value = '7e3e6a906468ddc04e71ac9acce9d617c83e64d86f622a4d';

    field.addEventListener("keyup", (event) => {
        if (event.keyCode === 13) {
          console.log("token");
          this.getToken();
        }
      });
     field.addEventListener("click", () => {
       field.focus();
     });
   }
  
  setSettings() {
    var Request = window.Services.ServerConnection.defaultSettings.Request;
    var Headers = window.Services.ServerConnection.defaultSettings.Headers;
    var WebSocket = window.Services.ServerConnection.defaultSettings.WebSocket;
    var fetch = window.Services.ServerConnection.defaultSettings.fetch;
    this.settings = {baseUrl: 'http://localhost:8888', pageUrl:"", wsUrl: "ws://localhost:8888", token: this.token,
               init: {cache: 'no-store', credentials: "same-origin"},
               Request: Request, Headers: Headers, WebSocket: WebSocket, fetch: fetch};
  }

  getToken() {
    this.token = this.get("#token").value;
    this.setSettings();
    this.listRunning(this.setChoices.bind(this));
  }

  setChoices(models) {
    console.log('models', models);
    var choice = this.get('#modelChoice');
     for (var i = 0; i < models.length; i++) {
       var option = document.createElement("option");
        option.text = models[i].id;
         choice.add(option);
     }
    var that = this;
    choice.addEventListener("change", function(evt) {
        var name = evt.target.value;
        console.log("selection: ", name);
        that.modelId = name;
    }.bind(this));

  }

  listRunning(callback) {
     window.Services.Session.listRunning(this.settings).then(callback);
  }
  
  setModel(id) {
    this.model =  {id: this.modelId, name: 'python3'};
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

  runCommand(text) {
    var that = this;
    var Request = this.Services.ServerConnection.defaultSettings.Request;
    var Headers = this.Services.ServerConnection.defaultSettings.Headers;
    var WebSocket = this.Services.ServerConnection.defaultSettings.WebSocket;
    var fetch = this.Services.ServerConnection.defaultSettings.fetch;
    this.settings = {baseUrl: 'http://localhost:8888', pageUrl:"", wsUrl: "ws://localhost:8888", token: this.token,
               init: {cache: 'no-store', credentials: "same-origin"},
               Request: Request, Headers: Headers, WebSocket: WebSocket, fetch: fetch};
 
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