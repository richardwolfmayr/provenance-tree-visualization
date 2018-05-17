import './style.scss';
import * as d3 from 'd3';
import { ProvenanceGraph, ProvenanceTracker, ActionFunctionRegistry } from '@visualstorytelling/provenance-core';

const graph = new ProvenanceGraph(this);
const registry = new ActionFunctionRegistry();
const tracker = new ProvenanceTracker(registry, graph);

