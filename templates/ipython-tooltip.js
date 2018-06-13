"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';
import d3 from "src/external/d3.v5.js"

export default class IpythonTooltip extends Morph {
  async initialize() {
    this.windowTitle = "IpythonTooltip";
    this.tip = d3.select("body").append("div");
 }

  mouseover(x, y, html, width, height) {
    this.tip.style.width = width + 'px';
    this.tip.style.height = height + 'px';

    this.tip.transition()
        .duration(200)
        .style("opacity", .9);
    this.tip.html(html)
        .style("left", x + "px")
        .style("top", y + "px");
  }
}