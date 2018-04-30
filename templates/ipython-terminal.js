"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonTerminal extends Morph {
  initialize() {
    this.windowTitle = "IpythonTerminal";
    this.input = this.get("#terminalIn");
    this.output = this.get("#terminalOut");
    this.inLine = this.get("#inputLine");
    this.terminal = this.get("#terminal");
    this.port = -1;   
    lively.html.registerKeys(this); // automatically installs handler for some methods
    
    lively.addEventListener("template", this, "dblclick", 
      evt => this.onDblClick(evt))
    // #Note 1
    // ``lively.addEventListener`` automatically registers the listener
    // so that the the handler can be deactivated using:
    // ``lively.removeEventListener("template", this)``
    // #Note 1
    // registering a closure instead of the function allows the class to make 
    // use of a dispatch at runtime. That means the ``onDblClick`` method can be
    // replaced during development

    
  this.input.addEventListener("keyup", (event) => {
      if (event.keyCode === 13) {
        console.log("hey");
        this.runCommand();
      }
    });
    
     this.terminal.addEventListener("click", (event) => {
      if (this.runningProcess !== "") {
        this.httpGet("http://localhost:"+this.port+"/kill/" + this.runningProcess, (data) => {
          console.log("kill process");
        });
        this.endProcess();
      }
      this.input.focus();
    });
    this.input.focus();
  }
  
  runCommand() {
    this.storePort();
    this.httpGet("http://localhost:"+ this.port +"/terminalserver/", (data) => {
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