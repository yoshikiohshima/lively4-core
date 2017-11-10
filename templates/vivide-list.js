import Morph from './Morph.js';

export default class VivideList extends Morph {
  async initialize() {
    this.windowTitle = "VivideList";
    this.transformation = list => list;
    this.depiction = list => list;
    this.predecessor = null;
    this.successors = [];
    
    this.addEventListener("widget-changed", (evt) => {
      if(this.predecessor) {
        this.show(this.predecessor.output());
      }
    }, false);
  }
  
  register(anotherWidget) {
    this.successors.push(anotherWidget);
    anotherWidget.setPredecessor(this);
  }
  
  setPredecessor(anotherWidget) {
    this.predecessor = anotherWidget;
  }
  
  setTransformation(transformationFunction) {
    this.transformation = transformationFunction;
  }
  
  setDepiction(depictionFunction) {
    this.depiction = depictionFunction;
  }
  
  elementSelect(index) {
    return () => {
      this.selection[index] = this.selection[index] ? false : true;
      this.display()
      for(let i in this.successors) {
        let evt = new Event("widget-changed");
        this.successors[i].dispatchEvent(evt);
      }
    }
  }
  
  display() {
    this.innerHTML = "";
    for(let i in this.model) {
      let listentry = document.createElement("div");
      if(this.selection[i]) { listentry.style.background = "orange"; }
      listentry.addEventListener("click", this.elementSelect(i));
      listentry.className = "listentry";
      listentry.id = "listentry" + i;
      listentry.innerHTML = this.depiction(this.model[i]);
      this.appendChild(listentry);
    }
  }
  
  output() {
    return this.model.filter((elem, index) => { return this.selection[index]; });
  }
  
  setModel(model) {
    this.model = this.transformation(model);
    this.selection = this.model.map(elem => false);
  }
  
  show(model) {
    this.setModel(model);
    this.display();
  }
  
  livelyExample() {
    this.setTransformation((list) => {
      return list.filter(elem => elem.age < 100);
    });
    this.setDepiction(elem => elem.name);
    this.show([
      {name: "John Doe", age: 25},
      {name: "Jane Doe", age: 24},
      {name: "Manfred Mustermann", age: 50},
      {name: "John Wayne", age: 110},
    ]);
  }
}