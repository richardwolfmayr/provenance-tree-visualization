import * as d3 from 'd3';

/// <reference path="./customtree/customtree.d.ts" />
import customtree from './customtree/customtree';


import { SimulationNodeDatum, HierarchyNode, linkVertical } from 'd3';
import { 
    ProvenanceNode, 
    NodeIdentifier, 
    StateNode, 
    RootNode, 
    Artifacts, 
    ProvenanceGraphTraverser, 
    ProvenanceGraph,
    isStateNode
} from '@visualstorytelling/provenance-core'; 

type ExtendedProvenanceNode = ProvenanceNode & {
    x0: number; 
    y0: number; 
    newchildren: ExtendedProvenanceNode[]; 
}

type Position = {
    x:number,
    y:number
}

export class ProvenanceTreeVisualization {
    private graph : ProvenanceGraph;
    private traverser: ProvenanceGraphTraverser;
    private rootNode: ExtendedProvenanceNode;

    private margin = { top: 20, right: 10, bottom: 20, left: 10 };
    private chartWidth: number;
    private chartHeight: number;
    private tree: d3.TreeLayout<ExtendedProvenanceNode>;
    private root: d3.HierarchyNode<ExtendedProvenanceNode>;
    private i: number = 0;
    private duration: number = 750;
    private separation: number = 10;
    private svg: d3.Selection<d3.BaseType, ExtendedProvenanceNode, HTMLElement, any>;

    constructor(graph : ProvenanceGraph, traverser: ProvenanceGraphTraverser, rootNode: ProvenanceNode) {
        this.graph = graph;
        this.traverser = traverser;
        this.rootNode = this.convertToExtendedNode(rootNode);

        this.chartWidth = 300 - this.margin.right - this.margin.left;
        this.chartHeight = 800 - this.margin.top - this.margin.bottom;

        this.svg = d3.select<d3.BaseType, ExtendedProvenanceNode>('body')
            .append('svg')
            .attr('width', this.chartWidth)
            .attr('height', this.chartHeight);

        this.tree = customtree<ExtendedProvenanceNode>()
            //.size([this.chartHeight, this.chartWidth])
            .nodeSize([20, 20]);
        this.root = d3.hierarchy<ExtendedProvenanceNode>(this.rootNode, (d: ExtendedProvenanceNode) => {
            return d.newchildren;
        });

        const treeData: d3.HierarchyPointNode<ExtendedProvenanceNode> = this.tree(this.root);
        this.update(treeData);
    }

    static nodeSize(node: ProvenanceNode): number {
        return 1;
    }

    static nodePosition(node: d3.HierarchyPointNode<ExtendedProvenanceNode>): Position {
        return {
            x:0, 
            y:0
        };
    }

    convertToExtendedNode(provenanceNode: ProvenanceNode): ExtendedProvenanceNode {
        const result: ExtendedProvenanceNode = {
            id: provenanceNode.id,
            label: provenanceNode.label,
            metadata: provenanceNode.metadata,
            parent: isStateNode(provenanceNode)? provenanceNode.parent : null,            
            action: isStateNode(provenanceNode)? provenanceNode.action : null,
            actionResult: isStateNode(provenanceNode)? provenanceNode.actionResult : null,
            children: provenanceNode.children,
            newchildren: provenanceNode.children.map(
                (d: ProvenanceNode): ExtendedProvenanceNode => { 
                    return this.convertToExtendedNode(d) 
            }) as ExtendedProvenanceNode[],
            artifacts: provenanceNode.artifacts,            
            x0: 0,
            y0: 0
        };

        return result;
    }

    update(rootNode: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
        // Assigns the x and y position for the nodes
        const treeData: d3.HierarchyPointNode<ExtendedProvenanceNode> = this.tree(this.root);

        // Compute the new tree layout.
        const nodes: d3.HierarchyPointNode<ExtendedProvenanceNode>[] = treeData.descendants();
        const links: d3.HierarchyPointLink<ExtendedProvenanceNode>[] = treeData.links();

        // Normalize for fixed-depth.
        nodes.forEach((d: d3.HierarchyPointNode<ExtendedProvenanceNode>) => {
            d.y = this.margin.top + d.depth * 20;
            d.x = this.chartWidth / 2 + d.x;
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const allExistingNodes = this.svg.selectAll<d3.BaseType, ExtendedProvenanceNode>('g.node')
            .data<d3.HierarchyPointNode<ExtendedProvenanceNode>>(
                nodes,
                (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) => {
                    return d.data.id;
                });

        // Enter any new modes at the parent's previous position.
        const allNewNodes = allExistingNodes.enter().append('g')
            .classed('node', true)
            .classed('selected', ((d) => {
                return d.data.id === this.graph.current.id;
            }))
            .attr("transform", function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
                return "translate(" + rootNode.y + "," + rootNode.x + ")";
            })
            .on('click', click.bind(this));

        // Add Circle for the nodes
        allNewNodes.append('circle')
            .attr('r', 1);

        // Add labels for the nodes
        allNewNodes.append('text')
            .attr("dy", ".35em")
            .attr("x", function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
                return d.children ? -13 : 13;
            })
            .attr("text-anchor", function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
                return d.children ? "end" : "start";
            })
            .text(function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) { return d.data.label; });

        // UPDATE
        var allNodes = allNewNodes.merge(allExistingNodes);

        // Transition to the proper position for the node
        allNodes.transition()
            .duration(this.duration)
            .attr("transform", function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
                return "translate(" + d.x + "," + d.y + ")";
            }.bind(this));

        // Update the selected class on the current node in the provenance graph.
        allNodes
            .classed('selected', ((d: d3.HierarchyPointNode<ExtendedProvenanceNode>) => {
                return d.data.id === this.graph.current.id;
            }))

        // Update the node attributes and style
        allNodes.select('circle')
            .attr('r', function(d: d3.HierarchyPointNode<ExtendedProvenanceNode>) { 
                return ProvenanceTreeVisualization.nodeSize(d.data);
            })
            .attr('cursor', 'pointer');

        // Remove any exiting nodes
        var toBeRemovedNodes = allExistingNodes.exit().transition()
            .duration(this.duration)
            .attr("transform", function (d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
                return "translate(" + rootNode.y + "," + rootNode.x + ")";
            })
            .remove();

        // On exit reduce the node circles size to 0
        toBeRemovedNodes.select('circle')
            .attr('r', 1e-6);

        // On exit reduce the opacity of text labels
        toBeRemovedNodes.select('text')
            .style('fill-opacity', 1e-6);

        // ****************** links section ***************************
            
        // Update the links...
        var link = this.svg.selectAll('path.link')
            .data<d3.HierarchyPointLink<ExtendedProvenanceNode>>(
                links,
                (d: d3.HierarchyPointLink<ExtendedProvenanceNode>) => {
                    return d.source.data.id + d.target.data.id;
                });

        // Enter any new links at the parent's previous position.
        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', function(d: d3.HierarchyPointLink<ExtendedProvenanceNode>){                
                return diagonal(d.source, d.target);
            });

        // UPDATE
        var linkUpdate = linkEnter.merge(link);        

        // Remove any exiting links
        var linkExit = link.exit().transition()
            .duration(this.duration)
            .attr('d', function(d: d3.HierarchyPointLink<ExtendedProvenanceNode>){                
                return diagonal(d.source, d.target);
            })
            .remove();

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s: d3.HierarchyPointNode<ExtendedProvenanceNode>, t: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
            const path = 
                  'M' + s.x + ',' + s.y
                + 'C' + s.x + ',' + (s.y + t.y) / 2
                + ' ' + t.x + ',' + (s.y + t.y) / 2
                + ' ' + t.x + ',' + t.y;
            return path;
        }

        // Toggle children on click.
        function click(d: d3.HierarchyPointNode<ExtendedProvenanceNode>) {
            this.traverser.toStateNode(d.data.id).then(() => {
                this.update(rootNode);
            });            
        }
    }
}