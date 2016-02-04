const Parser = imports.Parser;
const Utils = imports.Utils;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

let tree = Parser.DataflowParser.matchAll(Utils.loadFile(ARGV[0]), 'top');
let nodeList = Parser.ExtractNodesTransform.match(tree, 'trans');
log(JSON.stringify(nodeList));

let nodes = [];
for (let i = 0; i < nodeList.length; i++)
  nodes.push(nodeList[i].name);
log(nodes);

let modified = Parser.SetNodesTransforms.createInstance();
modified.setNodes(nodes);
let ret = modified.match(tree, 'trans');
log(JSON.stringify(ret));
