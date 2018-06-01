"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';

export default class IpythonTensorview extends Morph {
  async initialize() {
    this.windowTitle = "IpythonTensorview";
    this.canvas = this.get('#canvas');
  } 

  /* Lively-specific API */

}