import './style.scss';
import * as d3 from 'd3';
import { ProvenanceGraph, ProvenanceTracker, ActionFunctionRegistry, StateNode } from '@visualstorytelling/provenance-core';

const graph = new ProvenanceGraph(this);
const registry = new ActionFunctionRegistry();
const tracker = new ProvenanceTracker(registry, graph);


const windowWidth = 960;
const windowHeight = 480;

let mySvg = d3.select('body')
    .append('svg')
    .attr('width', windowWidth)
    .attr('height', windowHeight);

let plotMargins = {
    top: 30,
    bottom: 30,
    left: 150,
    right: 30
};
let plotGroup = mySvg.append('g')
    .classed('plot', true)
    .attr('transform', `translate(${plotMargins.left},${plotMargins.top})`);

let plotWidth = windowWidth - plotMargins.left - plotMargins.right;
let plotHeight = windowHeight - plotMargins.top - plotMargins.bottom;

let xScale = d3.scaleTime()
    .range([0, plotWidth]);
let xAxis = d3.axisBottom(xScale);
let xAxisGroup = plotGroup.append('g')
    .classed('x', true)
    .classed('axis', true)
    .attr('transform', `translate(${0},${plotHeight})`)
    .call(xAxis);

let yScale = d3.scaleLinear()
    .range([plotHeight, 0]);
let yAxis = d3.axisLeft(yScale);
let yAxisGroup = plotGroup.append('g')
    .classed('y', true)
    .classed('axis', true)
    .call(yAxis);

let pointsGroup = plotGroup.append('g')
    .classed('points', true);

async function bla() {
    const data:any = await d3.json('./graph.json');
    let prepared = data.children.map((d: any) => {
        return {
            date: new Date(d.created * 1000),
            score: d.score
        }
    }); 
    console.log(prepared);
};

bla();
