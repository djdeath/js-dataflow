const Parser = imports.Parser;
const Utils = imports.Utils;

const DataflowRuntime = imports.JsDataflowRuntime;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

let translate = function(text) {
  let tree = Parser.DataflowParser.matchAll(text, 'top');
  let nodes = Parser.ExtractNodes.match(tree, 'trans');

  let js = Parser.JsGen.createInstance();
  js.setInput(nodes.map(function(e) { return e.name; }));

  let ret = js.match(nodes, 'program');
  return ret;
};

let toDataflow = function(text) {
  let params = eval('(function(){return ' + translate(text) + ';})()');
  return new DataflowRuntime.Dataflow({ nodes: params });
};

let text = Utils.loadFile(ARGV[0]);
let flow = toDataflow(text);
flow.start();
log(JSON.stringify(flow.getValues()));
