const Parser = imports.Parser;
const Utils = imports.Utils;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

let tree = Parser.DataflowParser.matchAll(Utils.loadFile(ARGV[0]), 'top');
let nodes = Parser.ExtractNodes.match(tree, 'trans');

let js = Parser.JsGen.createInstance();
js.setInput(nodes.map(function(e) { return e.name; }));
log(js.match(nodes, 'program'));
