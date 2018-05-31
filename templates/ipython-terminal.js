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

export class Notebook {
    initialize(token) {
        this.token = token;
        this.cells = null;
        this.sessionModel = null;  // session model
        this.session = null;       // session
        this.kernel = null;   // real kernel
    }

    status() {
        if (!this.kernel) {return "unknown";}
        return this.kernel.status();
    }

    async newUntitled() {
        var settings = iPythonSettings(this.token);
        var contents = new window.Services.ContentsManager({serverSettings: settings});
        var notebook = await contents.newUntitled({path: '.', type: 'notebook', ext: 'ipynb'});
        var sessionModel = await window.Services.Session.findByPath(notebook.path, settings);
        await this.open(sessionModel, notebook);
    }

    async open(sessionModel, optNotebook) {
        var settings = iPythonSettings(this.token);
        var session = await window.Services.Session.connectTo(sessionModel, settings);
        this.session = session;
        this.kernel = session.kernel;

        if (optNotebook && optNotebook.cells) {
            this.cells = optNotebook.cells;
        } else {
            this.cells = [];
        }
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
                    terminal.addInput();
                } else {
                }
            } else if (type === "execute_input") {
            } else if (type === "execute_result") {
                if (reply.content.data && reply.content.data['text/plain'] !== undefined) {
                    terminal.addOutput(reply.content.data['text/plain']);
                }
            } else if (type === "stream") {
                console.log(reply.content.name, reply.content.text);
                terminal.addOutput(reply.content.text);
            } else if (type === "error") {
                terminal.addOutput(reply.content.evalue);
            }
        };
        return future.done;
    }
}

export default class IpythonTerminal extends Morph {
    initialize() {
        this.inputs = [];
        this.outputs = [];
        this.input = null;
        this.windowTitle = "IpythonTerminal";
        this.terminal = this.get("#terminal");
        this.get('#token').value = 'edfe4b7bc3aa7cc79a14864247378b1eb52b5e8fbb1139b4';

        this.setupTokenField();

        this.setupChoices();
        this.addInput();

        this.sessions = null;
    }

    setupTokenField() {
        var field = this.get('#token');
        field.addEventListener("keyup", (event) => {
            if (event.keyCode === 13) {
                this.token = field.value;
                var promise = this.listSessions(this.token);
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

    updateChoices(sessions) {
        var choices = this.get('#modelChoice');
        while (choices.options.length > 0) {
            choices.remove(0);
        }

        var firstModel = null;
        for (var i = 0; i < sessions.length; i++) {
            var sessionModel = sessions[i];
            var kernelModel = sessionModel.kernel;
            var id = sessionModel.id;
            if (!firstModel) {
                firstModel = sessionModel;
            }
            var name = sessionModel.name;
            var option = document.createElement("option");
            option.text = name;
            option.modelId = id;
            choices.add(option);
        }
        if(firstModel) {
            this.sessionSelected(firstModel);
        }
    }
  
    listSessions(token) {
      var sessions;
      window.Services.Session.listRunning(iPythonSettings(token)).then((sess) => {
         sessions = sess;
        this.sessions = {};
        for (var i = 0; i < sessions.length; i++) {
            this.sessions[sessions[i].id] = sessions[i];
        }
        this.updateChoices(sessions);
      });
    }

    newNotebook() {
      debugger;
        this.notebook = new Notebook(this.token, this);
        this.notebook.newUntitled();
        this.listSessions(this.token);
    }

    openNotebook(sessionModel) {
        this.notebook = new Notebook(this.token, this);
        this.notebook.open(sessionModel);
    }
  
    sessionSelected(sessionModel) {
        if (this.notebook) {
            this.notebook.shutdown().then(() => {console.log("session closed")});
            this.notebook == null;
        }
        this.openNotebook(sessionModel);
    }

    setupChoices() {
        var choices = this.get('#modelChoice');

        choices.addEventListener("change", (evt) => {
            var name = evt.target.value;
            this.kernelSelected(this.kernels[name]);
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

  runCommand(text) {
      var that = this;
      if (!this.notebook) {return;}
      var settings = iPythonSettings(this.token);
      if (this.notebook.status) {
          // status should be: Status = 'unknown' | 'starting' | 'reconnecting' | 'idle' | 'busy' | 'restarting' | 'dead' | 'connected';
          // and test it accordingly
          return this.notebook.evaluate(text.value, this);
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
