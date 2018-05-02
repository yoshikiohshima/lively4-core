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

    lively.html.registerKeys(this); // automatically installs handler for some methods

  this.input.addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        console.log("hey");
        this.test();
      }
    });
    
     this.terminal.addEventListener("click", (event) => {
       this.input.focus();
     });
  }

  test() {
    var k;
    var Request = Services.ServerConnection.defaultSettings.Request;
    var Headers = Services.ServerConnection.defaultSettings.Headers;
    var WebSocket = Services.ServerConnection.defaultSettings.WebSocket;
    var fetch = Services.ServerConnection.defaultSettings.fetch;
    var obj = {baseUrl: 'http://localhost:8888', pageUrl:"", wsUrl: "ws://localhost:8888", token: '8f07046014d87478317d4a4c655877c0dc5d71386c6baacf', init: {cache: 'no-store', credentials: "same-origin"}, Request: Request, Headers: Headers, WebSocket: WebSocket, fetch: fetch};
  
     console.log(obj);
     var model = {id: '350d6e50-af33-4b2e-b5b3-622bfc25fb1c', name: 'python3'};
    Services.Kernel.connectTo(model, obj).then((c) => {
      k = c;
      console.log(this.input.value);
      var future = k.requestExecute({code: this.input.value});
      future.onReply = (reply) => {
         console.log('got execute reply', reply);
      };
      return future.done;
      }).then((val) => {
        console.log('future is fulfilled', val);
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