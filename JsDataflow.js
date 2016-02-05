const Parser = imports.Parser;
const Utils = imports.Utils;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

let tree = Parser.DataflowParser.matchAll(Utils.loadFile(ARGV[0]), 'top');
log(tree);



let js = Parser.JsGen.match(tree, 'trans');
log(js);
