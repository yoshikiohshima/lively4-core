"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonList extends Morph {
  async initialize() {
    this.windowTitle = "IpythonList";
    this.list = this.get('#list')
  }

}