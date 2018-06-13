"enable aexpr";

import Morph from 'src/components/widgets/lively-morph.js';
import d3 from "src/external/d3.v5.js"

export default class IpythonTooltip extends Morph {
  async initialize() {
    this.tip = d3.select(this.get('#tip'))
      .attr("class", "tooltip")
      .style("opacity", 0);
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

  mouseout() {
    this.tip.transition()
        .duration(500)
        .style("opacity", 0);
  }
  
  livelyExample() {
    this.mouseover(100, 100, "<span>abc</span>", 100, 50);
  }
}