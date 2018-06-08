import * as d3 from 'd3';

import { HierarchyLink, HierarchyNode, HierarchyPointNode, TreeLayout } from 'd3';
import {
  ProvenanceNode,
  ProvenanceGraphTraverser, isStateNode
} from '@visualstorytelling/provenance-core';

type D3SVGSelection = d3.Selection<SVGElement, any, null, undefined>;

export class ProvenanceTreeVisualization {
  private traverser: ProvenanceGraphTraverser;
  private svg: D3SVGSelection;

  public update() {
    const treeRoot = d3.hierarchy(this.traverser.graph.root);
    const treeLayout = d3.tree<ProvenanceNode>().size([500, 500]);
    const tree = treeLayout(treeRoot);
    const treeNodes = tree.descendants();

    const nodes = this.svg
      .selectAll('g.node')
      .data(treeNodes, (d: HierarchyNode<ProvenanceNode>) => d.data.id);

    const newNodes = nodes.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .on('click', (d) => this.traverser.toStateNode(d.data.id))

    newNodes
      .append('circle')
      .attr('r', 5)
    ;

    newNodes
      .append('text')
      .text((d) => isStateNode(d.data)
        ? d.data.label
        : '')
    ;

    nodes
      .transition()
      .duration(100)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
    ;

    const links = this.svg
      .selectAll('path.link')
      .data(tree.links(), (d: HierarchyLink<ProvenanceNode>) => d.target.data.id);

    const linkPath = (
      { source, target }: {source: HierarchyPointNode<ProvenanceNode>, target: HierarchyPointNode<ProvenanceNode>},
    ) => {
      const [s, t] = [source, target];
      return `M${s.x},${s.y}C${s.x},${(s.y + t.y) / 2} ${t.x},${(s.y + t.y) / 2} ${t.x},${t.y}`;
    };

    links
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', linkPath);

    links
      .transition()
      .duration(100)
      .attr('d', linkPath);

  }

  constructor(
    traverser: ProvenanceGraphTraverser,
    elm: HTMLDivElement,
  ) {
    this.traverser = traverser;
    this.svg = (d3.select(elm)
      .append('svg') as D3SVGSelection)
      .attr('width', 1000)
      .attr('height', 700)
    ;
    traverser.graph.on('currentChanged', () => this.update());
    this.update();
  }
}
