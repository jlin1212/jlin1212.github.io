function init() {
  let cyContainer = document.getElementById('cy');
  cyContainer.style.height = window.innerHeight;
  cyContainer.style.width = window.innerWidth;

  var cy = cytoscape({
    container: document.getElementById('cy'), // container to render in
  
    style: [ // the stylesheet for the graph
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(id)'
        }
      },
  
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],
  
    layout: {
      name: 'grid',
      rows: 1
    }
  });

  cy.zoom(0.75);
  cy.center();
}

window.onload = init;