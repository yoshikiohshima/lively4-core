"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonTerminal extends Morph {
  initialize() {
    this.windowTitle = "IpythonTerminal";
    this.input = this.get("#terminalIn");
    this.output = this.get("#terminalOut");
    this.inLine = this.get("#inputLine");
    this.terminal = this.get("#terminal");
    this.port = 8888;
    this.Services = window.Services;
    this.token = '8f07046014d87478317d4a4c655877c0dc5d71386c6baacf';
    this.modelId = '350d6e50-af33-4b2e-b5b3-622bfc25fb1c';
    this.model = {id: this.modelId, name: 'python3'};

    lively.html.registerKeys(this); // automatically installs handler for some methods

    this.input.addEventListener("keyup", (event) => {
        if (event.keyCode === 13) {
          this.test();
        }
      });
     this.terminal.addEventListener("click", (event) => {
       this.input.focus();
     });
  }
  
  test() {
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
          console.log("result", reply.content.data);
        }
      };
      return future.done;
    });
  }

  runCommand() {
    this.httpGet("http://localhost:8888/?token=1b0a81b202725810f709f698ef71058d8dc2b8dabddecc0b", (data) => {
      if (data && data === "running terminalserver") {
        console.log("running: " + this.input.value);
        this.output.innerHTML += "> " + this.input.value + "&st;br>";
        this.inLine.style.visibility = "hidden";
        this.httpGet("http://localhost:"+this.port+"/new/" + this.input.value, (processId) => {
          this.runningProcess = processId;
          console.log("starting new process: " + processId);
          this.runLoop();
        });
      } else {
        this.output.innerHTML += "No terminal server running: check https://github.com/LivelyKernel/lively4-app for more information &st;br>";
      }
    })  
  }
    
  /* Lively-specific API */

  livelyPreMigrate() {
    // is called on the old object before the migration
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
  
  
  async livelyExample() {
    // this customizes a default instance to a pretty example
    // this is used by the 
    this.style.backgroundColor = "red"
    this.someJavaScriptProperty = 42
    this.appendChild(<div>This is my content</div>)
  }
  
  
}