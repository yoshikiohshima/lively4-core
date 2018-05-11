// System imports
import Morph from 'src/components/widgets/lively-morph.js';
import { babel } from 'systemjs-babel-build';
const { traverse } = babel;

// Custom imports
import ASTWorkerWrapper from "./worker/ast-worker-wrapper.js";
import Timer from "./utils/timer.js";
import LocationConverter from "./utils/location-converter.js";
import {
  Annotation,
  Input,
  Form,
  addMarker
} from "./utils/ui.js";
import {
  generateLocationMap,
  canBeProbed,
  canBeExample,
  canBeReplaced,
  replacementNodeForCode,
  parameterNamesForFunctionIdentifier
} from "./utils/ast.js";
import { patchEditor } from "./utils/load-save.js";

import Probe from "./annotations/probe.js";
import Slider from "./annotations/slider.js";
import Example from "./annotations/example.js";
import Replacement from "./annotations/replacement.js";

// Constants
const COMPONENT_URL = "https://lively-kernel.org/lively4/lively4-babylonian-programming/src/components/babylonian-programming-editor";
const USER_MARKER_KINDS = ["example", "replacement", "probe"];

/**
 * An editor for Babylonian (Example-Based) Programming
 */
export default class BabylonianProgrammingEditor extends Morph {
 
  initialize() {
    this.windowTitle = "Babylonian Programming Editor";
    
    // Lock evaluation until we are fully loaded
    this._evaluationLocked = false;
    
    // Set up the WebWorker for parsing
    this.worker = new ASTWorkerWrapper();
    
    // Set up AST
    this._ast = null; // Node
    this._selectedPath = null; // NodePath

    // Set up markers
    this._deadMarkers = []; // [TextMarker]
    
    // Set up Annotations
    this._annotations = {
      probes: [], // [Probe]
      sliders: [], // [Slider]
      examples: [], // [Example]
      replacements: [], // [Replacement]
    };

    // Set up timer
    this.evaluateTimer = new Timer(300, this.evaluate.bind(this));
    
    // Set up CodeMirror
    this.editorComp().addEventListener("editor-loaded", () => {
      // Patch editor to load/save comments
      /*patchEditor(
        this.get("#source"),
        () => this.markers,
        this.setMarkers.bind(this)
      );*/
      
      // Test file
      this.get("#source").setURL(`${COMPONENT_URL}/demos/1_script.js`);
      this.get("#source").loadFile();
      
      // Event listeners
      this.editor().on("change", () => {
        this.syncIndentations();
        this.evaluateTimer.start();
      });
      this.editor().on("beforeSelectionChange", this.onSelectionChanged.bind(this));
      this.editor().setOption("extraKeys", {
        "Ctrl-1": () => { this.addAnnotationAtSelection("probe") },
        "Ctrl-2": () => { this.addAnnotationAtSelection("replacement") },
        "Ctrl-3": () => { this.addAnnotationAtSelection("example") },
        "Tab": (cm) => { cm.replaceSelection("  ") },
      });
      
      // Inject styling into CodeMirror
      // This is dirty, but currently necessary
      fetch(`${COMPONENT_URL}/codemirror-inject-styles.css`).then(result => {
        result.text().then(styles => {
          const node = document.createElement('style');
          node.innerHTML = styles;
          this.editorComp().shadowRoot.appendChild(node);
        });
      });
    });
  }
  
  
  async setMarkers(markers) {
    // Unlock evaluation after two seconds
    this._evaluationLocked = true;
    setTimeout(() => {
      this._evaluationLocked = false;
    }, 2000);
    
    // Remove all existing markers
    for(let kind of USER_MARKER_KINDS) {
      this.markers[kind].forEach((w,m) => {
        this.markers[kind].get(m).clear(true);
        this.markers[kind].delete(m);
        m.clear();
      });
    }
    
    // Make sure we have a locationMap
    await this.parse();
    
    // Add new markers
    if(markers) {
      markers.probe.forEach(m => {
        const path = this.ast._locationMap[m.loc];
        this.addProbeAtPath(path);
      });
      markers.replacement.forEach(m => {
        const path = this.ast._locationMap[m.loc];
        this.addReplacementAtPath(path, m.value);
      });
      markers.example.forEach(m => {
        const path = this.ast._locationMap[m.loc];
        this.addExampleAtPath(path, m.value);
      });
    }
    
    // Evaluate
    this.evaluate(true);
  }

  // Event handlers
  
  onSelectionChanged(instance, data) {
    // This needs an AST
    if(!this.hasWorkingAst()) {
      this._selectedPath = null;
      return;
    }
    
    // Get selected path
    const selectedLocation = LocationConverter.selectionToKey(data.ranges[0]);

    // Check if we selected a node
    if(selectedLocation in this._ast._locationMap) {
      this._selectedPath = this._ast._locationMap[selectedLocation];
    } else {
      this._selectedPath = null;
    }
  }

  onSliderChanged(slider, exampleId, value) {
    // Get the location for the body
    const node = this._nodeForAnnotation(slider);
    const bodyLocation = LocationConverter.astToKey({
      start: node.loc.start,
      end: node.body.loc.end
    });

    // Get all probes in the body
    const includedProbes = this._annotations.probes.filter((probe) => {
      const probeLocation = probe.locationAsKey;
      const beginsAfter = probeLocation[0] > bodyLocation[0]
                          || (probeLocation[0] === bodyLocation[0]
                              && probeLocation[1] >= bodyLocation[1]);
      const endsBefore = probeLocation[2] < bodyLocation[2]
                         || (probeLocation[2] === bodyLocation[2]
                             && probeLocation[3] <= bodyLocation[3]);
      return beginsAfter && endsBefore;
    });
    
    // Tell all probes about the selected run
    for(let probe of includedProbes) {
      probe.setActiveRunForExampleId(exampleId, value);
    }
  }
  
  onEvaluationNeeded() {
    this.evaluate();
  }
  
  
  // Adding new Annotations
  
  /**
   * Adds a new annotation at the selected element
   */
  addAnnotationAtSelection(kind) {
    // Get selected path
    const path = this._selectedPath;
    if(!path) {
      throw new Error("The selection is not valid");
    }
    
    // Add annotation
    switch(kind) {
      case "probe":
        // Decide if we mean a probe or a slider
        if(path.isLoop()) {
          this.addSliderAtPath(path);
        } else {
          this.addProbeAtPath(path);
        }
        break;
      case "example":
        this.addExampleAtPath(path);
        break;
      case "replacement":
        this.addReplacementAtPath(path);
        break;
      default:
        throw new Error("Unknown annotation kind");
    }
  }
  
  addProbeAtPath(path) {
    // Make sure we can probe this path
    if(!canBeProbed(path)) {
      return;
    }
    
    // Add the probe
    this._annotations.probes.push(
      new Probe(
        this.editor(),
        LocationConverter.astToMarker(path.node.loc),
        this._annotations.examples
      )
    );
    
    this.enforceAllSliders();
    this.evaluate();
  }

  addSliderAtPath(path) {
    // Make sure we can probe this path
    if(!canBeProbed(path)) {
      return;
    }
    
    // Add the slider
    this._annotations.sliders.push(
      new Slider(
        this.editor(),
        LocationConverter.astToMarker(path.node.loc),
        this.onSliderChanged.bind(this),
        this._annotations.examples
      )
    );
    
    this.evaluate();
  }

  addExampleAtPath(path) {
    // Make sure we can probe this path
    if(!canBeExample(path)) {
      return;
    }
    
    // Add the example
    this._annotations.examples.push(
      new Example(
        this.editor(),
        LocationConverter.astToMarker(path.node.loc),
        this.onEvaluationNeeded.bind(this)
      )
    );
    
    this.evaluate();
  }
  
  addReplacementAtPath(path) {
    // Make sure we can replace this path
    if(!canBeReplaced(path)) {
      return;
    }
    
    // Add the replacement
    this._annotations.replacements.push(
      new Replacement(
        this.editor(),
        LocationConverter.astToMarker(path.node.loc),
        this.onEvaluationNeeded.bind(this)
      )
    );
    
    this.evaluate();
  }
  
  // Evaluating and running code
  
  /**
   * Parses the current code
   */
  async parse() {
    /*
    // Convert the markers
    const convertMarker = m => ({
      loc: LocationConverter.markerToKey(m.find()),
      replacementNode: m._replacementNode
    });
    
    const markers = {};
    for(const markerKey of USER_MARKER_KINDS) {
      // Remove invalid markers
      this.markers[markerKey].forEach((annotation, marker) => {
        if(!marker.find()) {
          this.removeMarker(marker);
        }
      })
      
      // Convert marker
      markers[markerKey] = Array.from(this.markers[markerKey].keys())
                                .map(convertMarker);
    }*/
    
    // TODO: Remove unused
    
    // Serialize annotations
    let serializedAnnotations = {};
    for(let key in this._annotations) {
      serializedAnnotations[key] = this._annotations[key].map((a) => a.serializeForWorker());
    }
    console.log(serializedAnnotations);

    // Call the worker
    const { ast, code } = await this.worker.process(
      this.editor().getValue(),
      serializedAnnotations
    );
    if(!ast) {
      return;
    }

    this._ast = ast;

    // Post-process AST
    // (we can't do this in the worker because it create a cyclical structure)
    generateLocationMap(ast);
    
    return code;
  }
  
  /**
   * Evaluates the current editor content and updates the results
   */
  async evaluate(ignoreLock = false) {
    if(this._evaluationLocked && !ignoreLock) {
      return;
    }
    
    // Parse the code
    const code = await this.parse()

    // Execute the code
    console.log("Executing", code);
    this.execute(code);

    // Show the results
    this.updateAnnotations();
    this.updateDeadMarkers();
  }
  
  /**
   * Executes the given code
   */
  execute(code) {
    // Prepare result container
    window.__tracker = {
      // Properties
      ids: new Map(), // Map(id, Map(exampleId, Map(runId, {type, value}))) 
      blocks: new Map(), // Map(id, Map(exampleId, runCounter))
      executedBlocks: new Set(), // Set(id)

      // Functions
      id: function(exampleId, id, value, runId) {
        if(!this.ids.has(id)) {
          this.ids.set(id, new Map());
        }
        if(!this.ids.get(id).has(exampleId)) {
          this.ids.get(id).set(exampleId, new Map());
        }
        this.ids.get(id).get(exampleId).set(runId, {type: typeof(value), value: value});
        return value;
      },
      block: function(exampleId, id) {
        this.executedBlocks.add(id);
        if(!this.blocks.has(id)) {
          this.blocks.set(id, new Map());
        }
        const blockCount = this.blocks.get(id).has(exampleId)
                           ? this.blocks.get(id).get(exampleId)
                           : 0;
        this.blocks.get(id).set(exampleId, blockCount + 1);
        return blockCount;
      }
    };

    // Execute the code
    try {
      eval(code);
    } catch (e) {
      console.warn("Could not execute code");
      console.error(e);
    }
  }
  
  
  // UI
  
  /**
   * Removes a marker from the editor
   */
  removeMarker(marker) {
    // Remove the associated widget
    USER_MARKER_KINDS.map(m => {
      if(this.markers[m].has(marker)) {
        this.markers[m].get(marker).clear();
        this.markers[m].delete(marker);
      }
    });
    // Remove the marker itself
    marker.clear();
  }
  
  /**
   * Syncs the indentations of all annotations
   */
  syncIndentations() {
    for(let key in this._annotations) {
      for(let annotation of this._annotations[key]) {
        annotation.syncIndentation();
      }
    }
  }
  
  /**
   * Updates the values of all annotations
   */
  updateAnnotations() {
    // Update sliders
    for(let slider of this._annotations.sliders) {
      const node = this._nodeForAnnotation(slider).body;
      if(window.__tracker.blocks.has(node._id)) {
        slider.maxValues = window.__tracker.blocks.get(node._id);
      } else {
        slider.empty();
      }
    }
    
    // Update probes
    for(let probe of this._annotations.probes) {
      const node = this._nodeForAnnotation(probe);
      if(window.__tracker.ids.has(node._id)) {
        probe.values = window.__tracker.ids.get(node._id);
      } else {
        probe.empty();
      }
    }
    
    // Update examples
    for(let example of this._annotations.examples) {
      if(example.default) {
        continue;
      }
      const path = this._pathForAnnotation(example);
      example.keys = parameterNamesForFunctionIdentifier(path);
    }
  }
  
  /**
   * Updates the values of all widgets
   */
  updateWidgets() {
    // Enforce all sliders
    this.enforceSliders();
    
    // Update widgets for replacements
    this.markers.replacement.forEach((widget, marker) => {
      const markerLoc = marker.find();
      widget.update(markerLoc.from.ch);
    });
    
    // Update widgets for probes
    this.markers.probe.forEach((widget, marker) => {
      const markerLoc = marker.find();
      const probedNode = this.ast._locationMap[LocationConverter.markerToKey(marker.find())].node;
      
      // Distinguish between Annotations and Sliders
      if(widget instanceof Annotation) {
        let values = null;
        if(window.__tracker.ids.has(probedNode._id)) {
          values = window.__tracker.ids.get(probedNode._id);
        }
        widget.update(values, markerLoc.from.ch);
      } else if(widget instanceof Slider) {
        let maxValue = 0;
        if(window.__tracker.blocks.has(probedNode.body._id)) {
          maxValue = window.__tracker.blocks.get(probedNode.body._id) - 1;
        }
        widget.update(maxValue, markerLoc.from.ch);
      }
    });
    
    // Update widgets for examples
    this.markers.example.forEach((widget, marker) => {
      const markerLoc = marker.find();
      const exampleNode = this.ast._locationMap[LocationConverter.markerToKey(marker.find())];
      if(widget instanceof Form) {
        widget.update(
          parameterNamesForFunctionIdentifier(exampleNode),
          markerLoc.from.ch
        );
      } else if (widget instanceof Input) {
        widget.update(
          markerLoc.from.ch
        );
      }
    });
  }

  /**
   * Marks all dead code
   */
  updateDeadMarkers() {
    // Remove old dead markers
    this._deadMarkers.map(m => m.clear());

    // Add new markers
    const that = this;
    traverse(this._ast, {
      BlockStatement(path) {
        if(!window.__tracker.executedBlocks.has(path.node._id)) {
          const markerLocation = LocationConverter.astToMarker(path.node.loc);
          that._deadMarkers.push(
            that.editor().markText(
              markerLocation.from,
              markerLocation.to,
              {
                className: "marker dead"
              }
            )
          );
        }
      }
    });
  }
  
  /**
   * Enforces all sliders
   */
  enforceAllSliders() {
    for(let slider of this._annotations.sliders) {
      slider.fire();
    }
  }
  
  /**
   * Checks whether we currently have a working AST
   */
  hasWorkingAst() {
    return (this._ast && this._ast._locationMap);
  }
  
  /**
   * Returns the node for a given annotation
   */
  _nodeForAnnotation(annotation) {
    const path = this._pathForAnnotation(annotation);
    if(path) {
      return path.node;
    }
    return null;
  }
  
  /**
   * Returns the path for a given annotation
   */
  _pathForAnnotation(annotation) {
    if(this.hasWorkingAst()) {
      return this._ast._locationMap[annotation.locationAsKey];
    }
    return null;
  }
  
  
  // UI Acessors
  
  editorComp() {
    return this.get("#source").get("lively-code-mirror");
  }
  
  editor() {
    return this.editorComp().editor
  }
  
}