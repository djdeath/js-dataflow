const Mainloop = imports.mainloop;
const Parser = imports.Parser;
const Utils = imports.Utils;

const DataflowRuntime = imports.JsDataflowRuntime;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

let translate = function(text) {
  let tree = Parser.DataflowParser.matchAll(text, 'top');
  let nodes = Parser.ExtractNodes.match(tree, 'trans');

  log('Nodes: ' + nodes.map(function(e) { return e.name; }));


  let js = Parser.DataflowJsGen.createInstance();
  js.setInput(nodes.map(function(e) { return e.name; }));

  let ret = js.match(nodes, 'program');
  return ret;
};

let toDataflow = function(text) {
  let code = translate(text);
  let params = eval('(function(){return ' + code + ';})()');
  return new DataflowRuntime.Dataflow({ nodes: params });
};

let text = Utils.loadFile(ARGV[0]);
let flow = toDataflow(text);
flow.start();

Mainloop.timeout_add(2000, function() {
  log(JSON.stringify(flow.getValues()));
  flow.stop();
  Mainloop.quit('main');
  return false;
});
Mainloop.run('main');
