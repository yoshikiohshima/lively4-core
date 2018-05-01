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
    debugger;
    this.serviceManager = new Service.ServiceManager({id: '1b0a81b202725810f709f698ef71058d8dc2b8dabddecc0b', 'foo.ipynb'});
    var options = {kernelName: 'python', path: "foo.ipynb"};
    var session;
    Services.Session.startNew(options).then(s => {
      console.log('session started');
      session = s;
      return session.setPath('bar.ipynb');
    }).then(() => {
      log('session renamed to ' + session.path);
      var future = session.kernel.requestExecute({code: 'a = 1'});
      future.onReply = (reply) => {
        console.log('got execute reply');
      };
      return future.done;
    }).then(() => {
      console.log('future is fulfilled');
      return session.shutdown();
    }).then(() => {
      console.log("session shutdown");
    }).catch(err => {
      console.error(err);
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
  
  runLoop() {
    if (this.runningProcess !== "") {
      this.httpGet("http://localhost:"+this.port+"/stdout/" + this.runningProcess, (output) => {
        this.addToOutput(output);
        this.httpGet("http://localhost:"+this.port+"/stderr/" + this.runningProcess, (error) => {
          this.addToOutput(error);

          this.httpGet("http://localhost:"+this.port+"/end/" + this.runningProcess, (ended) => {
            if (ended === "true") {
              this.endProcess();
              
            } else {
              setTimeout(() => {
                this.runLoop();
              }, 100);
            }
          });
        });
      });
    } 
  }
  
  onDblClick() {
    console.log("foo");
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