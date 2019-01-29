import * as d3 from 'd3';
import { HierarchyPointNode } from 'd3';
import {
  ProvenanceNode,
  ProvenanceGraphTraverser,
  isStateNode,
} from '@visualstorytelling/provenance-core';
import { Output } from '@angular/core';
import gratzl, { IHierarchyPointNodeWithMaxDepth } from './gratzl';

type D3SVGSelection = d3.Selection<SVGElement, any, null, undefined>;
type ITreeNodes = Array<IHierarchyPointNodeWithMaxDepth<ProvenanceNode>>;
interface ITask {
  taskId: number;
  taskName: string;
  taskNodes: ITreeNodes;
}
export class ProvenanceTreeVisualization {
  public taskId = 1;
  public checkBoxList = [this.taskId];
  public taskList: ITask[] = [
    {
      taskId: this.taskId,
      taskName: 'Task' + this.taskId,
      taskNodes: [],
    },
  ];
  private traverser: ProvenanceGraphTraverser;
  private svg: D3SVGSelection;
  private treeNodes: ITreeNodes = [];

  private currentIndex = 0;

  private checkBoxY = 0;
  constructor(traverser: ProvenanceGraphTraverser, elm: HTMLDivElement) {
    this.traverser = traverser;

    this.svg = (d3.select(elm).append('svg') as D3SVGSelection)
      .attr('viewBox', '-10 -10 130 130')
      .attr('style', 'width: 100%; height: 100%');
    traverser.graph.on('currentChanged', () => this.update());
    this.onChange = this.onChange.bind(this);
    this.update();
  }
  // public addCheckbox() {
  //   this.svg
  //     .append("svg:foreignObject")
  //     .attr("x", 0)
  //     .attr("y", this.checkBoxY)
  //     .attr("cursor", "pointer")
  //     .attr("width", 20)
  //     .attr("height", 20)
  //     .append("xhtml:body")
  //     .html('<input type="checkbox" id=' + this.id + ">")
  //     .on("change", this.onChange);
  //   this.id += 1;
  //   this.checkBoxY += 25;
  // }

  public onChange(event: any) {
    console.log(event.target);
    if (this.checkBoxList.length === 1) {
      this.taskList[0].taskNodes = this.treeNodes;
    } else if (this.checkBoxList.length > 1) {
      const newTaskNodes = Object.assign([], this.treeNodes);
      newTaskNodes.splice(0, this.currentIndex + 1);
      const task = {
        taskId: this.taskId,
        taskName: 'Task' + this.taskId,
        taskNodes: newTaskNodes,
      };
      this.taskList.push(task);
      newTaskNodes.forEach(
        (node: IHierarchyPointNodeWithMaxDepth<ProvenanceNode>) => {
          if (isStateNode(node.data)) {
            if (node.data.action.metadata) {
              node.data.action.metadata.taskId = this.taskId;
            } else {
              node.data.action.metadata = { taskId: this.taskId };
            }
          }
        },
      );

      // this.taskList.push(task);
    }
    this.treeNodes.forEach((node, index) => {
      if (node.data.id === this.traverser.graph.current.id) {
        console.log('Nodes from index', index);
        this.currentIndex = index;
      }
    });

    this.taskId += 1;
    this.checkBoxList.push(this.taskId);
    console.log('TaskList', this.taskList);
  }
  public update() {
    const treeRoot = d3.hierarchy(this.traverser.graph.root);
    const treeLayout = gratzl<ProvenanceNode>().size([100 / 2, 100]);

    let layoutCurrentNode = treeRoot;
    treeRoot.each((node) => {
      if (node.data === this.traverser.graph.current) {
        layoutCurrentNode = node;
      }
    });
    const tree = treeLayout(treeRoot, layoutCurrentNode);

    this.treeNodes = tree.descendants();

    const oldNodes = this.svg
      .selectAll('g.node')
      .data(this.treeNodes, (d: any) => d.data.id as any);

    const newNodes = oldNodes
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`)
      .on('click', (d) => this.traverser.toStateNode(d.data.id));

    newNodes.append('circle').attr('r', 2);

    newNodes
      .append('text')
      .text((d) => (isStateNode(d.data) ? d.data.label : ''))
      .attr('style', 'font-size: 6px')
      .attr('x', 7)
      .attr('y', 3);

    newNodes
      .merge(oldNodes)
      .attr('class', 'node')
      .filter((d: any) => d.xOffset === 0)
      .attr('class', 'node branch-active')
      .filter((d: any) => d.data === this.traverser.graph.current)
      .attr('class', 'node branch-active node-active');

    newNodes
      .merge(oldNodes)
      .transition()
      .duration(500)
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

    const linkPath = ({
      source,
      target,
    }: {
      source: HierarchyPointNode<ProvenanceNode>;
      target: HierarchyPointNode<ProvenanceNode>;
    }) => {
      const [s, t] = [source, target];
      // tslint:disable-next-line
      return `M${s.x},${s.y}C${s.x},${(s.y + t.y) / 2} ${t.x},${(s.y + t.y) /
        2} ${t.x},${t.y}`;
    };

    const oldLinks = this.svg
      .selectAll('path.link')
      .data(tree.links(), (d: any) => d.target.data.id);

    const newLinks = oldLinks
      .enter()
      .insert('path', 'g')
      .attr('d', linkPath);

    oldLinks
      .merge(newLinks)
      .attr('class', 'link')
      .filter((d: any) => d.target.xOffset === 0)
      .attr('class', 'link active');

    oldLinks
      .merge(newLinks)
      .transition()
      .duration(500)
      .attr('d', linkPath);
  }
}
