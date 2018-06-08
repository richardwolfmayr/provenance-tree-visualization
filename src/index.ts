import './style.scss';
import * as d3 from 'd3';
import { Calculator } from './examples/Calculator';
import {
  ProvenanceGraph,
  ProvenanceTracker,
  ProvenanceGraphTraverser,
  ReversibleAction,
  IrreversibleAction,
  ActionFunctionRegistry,
  StateNode,
  RootNode,
  ProvenanceNode,
} from '@visualstorytelling/provenance-core';
import { ProvenanceTreeVisualization } from './ProvenanceTreeVisualization';

const makeButton = ({text, onClick}: {text: string, onClick: () => any}): HTMLButtonElement => {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.addEventListener('click', onClick);
  return button;
};

class Index {
  private graph = new ProvenanceGraph({ name: 'calculator', version: '1.0.0' });
  private registry = new ActionFunctionRegistry();

  private tracker = new ProvenanceTracker(this.registry, this.graph);
  private traverser = new ProvenanceGraphTraverser(this.registry, this.graph);

  private provenanceTreeVisualization: ProvenanceTreeVisualization;

  private app = new Calculator(
    this.graph,
    this.registry,
    this.tracker,
    this.traverser,
  );

  private statusDisplay = document.createElement('div');
  private visContainer = document.createElement('div');

  constructor() {
    document.body.appendChild(this.statusDisplay);
    document.body.appendChild(this.visContainer);
    document.body.appendChild(makeButton({text: 'test', onClick: () => {
        this.tracker.applyAction({
          do: 'add',
          doArguments: [5],
          undo: 'subtract',
          undoArguments: [5],
          metadata: {
            createdBy: 'me',
            createdOn: 'now',
            tags: [],
            userIntent: 'Because I want to',
          },
        });
      }}));

    this.app.setupBasicGraph().then(() => {
      this.provenanceTreeVisualization = new ProvenanceTreeVisualization(
        this.traverser,
        this.visContainer,
      );
    });

    this.graph.on('currentChanged', (event) => {
      this.displayCurrentState(event, this.app);
    });
  }

  public displayCurrentState(event: Event, calculator: Calculator) {
    this.statusDisplay.innerHTML = `
      <p>${calculator.currentState()}</p>
    `;
  }
}

const index = new Index();
