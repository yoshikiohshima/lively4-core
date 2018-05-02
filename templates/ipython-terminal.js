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
    this.token = '8f07046014d87478317d4a4c655877c0dc5d71386c6baacf';
    this.modelId = '350d6e50-af33-4b2e-b5b3-622bfc25fb1c';
    this.model = {id: this.modelId, name: 'python3'};

    this.addInput();
  }
  
  addInput() {
    var text = document.createEelement("input");
    text.classList.add('terminalIn');
    text.setAttribute("type", "text");
    this.terminal.appendChild(text);
    this.input = text;
    this.input.addEventListener("keyup", (event) => {
        if (event.keyCode === 13) {
          this.runCommand();
        }
      });
     this.terminal.addEventListener("click", (event) => {
       this.input.focus();
     });
  }

  addOutput(str) {
    var text = document.createEelement("div");
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

  runCommand() {
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
      var future = this.kernel.requestExecute({code: this.input.value});
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
            console.log('kernel ready');
          } else {
            console.log("unknown state");
          }
        } else if (type === "execute_input") {
          console.log('input sent');
        } else if (type === "execute_result") {
          console.log("result", reply);
          if (reply.content.data && reply.content.data['text/plain'] !== undefined) {
            this.output.innerHTML += this.escape(reply.content.data['text/plain']) + '<br>'
          }
        } else if (type === "stream") {
          console.log(reply.content.name, reply.content.text);
          this.output.innerHTML += this.escape(reply.content.text) + '<br>'
        } else if (type === "error") {
        console.log("error", reply);
         this.output.innerHTML += this.escape(reply.content.evalue) + '<br>'
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