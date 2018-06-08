"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonList extends Morph {
  async initialize() {
    this.windowTitle = "IpythonList";
    this.list = this.get('#list')
  }

  clear() {
    var list = this.get('#list');
    list.innerHTML = '';
  }

  setNames(names) {
    this.clear();
    var list = this.get('#list');
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var element = document.createElement("li");
      var link = document.createElement("a");

      var icon = '<i class="fa fa-file"></i>';
      link.innerHTML =  icon + name;

      if (this.lastSelection && this.lastSelection.includes(name)) {
        element.classList.add("selected");
      }
      link.onclick = (evt) => { 
        this.onItemClick(link, evt); 
        return false
      };
      link.addEventListener('contextmenu', (evt) => {
        if (!evt.shiftKey) {
          this.onContextMenu(evt, otherUrl)
          evt.stopPropagation();
          evt.preventDefault();
          return true;
        }
      }, false);
      element.appendChild(link);
      list.appendChild(element);
    }
  }

}