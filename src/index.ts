import './style.scss';
import * as d3 from 'd3';
import { Calculator } from './examples/Calculator';
import { ProvenanceGraph, ProvenanceTracker, ProvenanceGraphTraverser, ReversibleAction, IrreversibleAction, ActionFunctionRegistry, StateNode, RootNode, ProvenanceNode } from '@visualstorytelling/provenance-core';
import { ProvenanceTreeVisualization } from './ProvenanceTreeVisualization';

class Index {
    private graph = new ProvenanceGraph({ name: 'calculator', version: '1.0.0' });
    private registry = new ActionFunctionRegistry();

    private tracker = new ProvenanceTracker(this.registry, this.graph);
    private traverser = new ProvenanceGraphTraverser(this.registry, this.graph);

    private app = new Calculator(this.graph, this.registry, this.tracker, this.traverser);
    private statusDisplay = <HTMLElement>(document.createElement('div'));
    
    constructor() {        
        this.app.setupBasicGraph().then(() => {
            const provenanceTreeVisualization = new ProvenanceTreeVisualization(this.graph, this.traverser, this.graph.root);
        });

        document.body.appendChild(this.statusDisplay);
        
        this.graph.on('currentChanged', (event) => this.displayCurrentState(event, this.app));
    }


    displayCurrentState(event: Event, calculator:Calculator) {        
        this.statusDisplay.innerHTML = `
            <p>${calculator.currentState()}</p>
        `;
    }
}

const index = new Index();




