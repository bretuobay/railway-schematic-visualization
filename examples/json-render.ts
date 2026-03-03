import { JSONParser, SVGRenderer } from '../src';

const parser = new JSONParser();
const renderer = new SVGRenderer();

const input = JSON.stringify({
  nodes: [
    {
      id: 'a',
      name: 'A',
      type: 'station',
      coordinate: { type: 'screen', x: 0, y: 0 },
    },
    {
      id: 'b',
      name: 'B',
      type: 'signal',
      coordinate: { type: 'screen', x: 80, y: 20 },
    },
  ],
  edges: [
    {
      id: 'ab',
      source: 'a',
      target: 'b',
      length: 80,
      geometry: { type: 'straight' },
    },
  ],
  lines: [],
});

const graph = parser.parse(input);

if (graph.ok) {
  console.log(renderer.render(graph.value));
}
