const Lang = imports.lang;
const JsParser = imports.JsParser;
const Utils = imports.Utils;

let translate = function(text) {
  try {
    let tree = JsParser.JSDataflowParser.matchAll(text, 'grammar');
    let result = JsParser.JSDataflowTranslator.match(tree, 'trans');
    return result
  } catch (e) {
    log('Error : ' + e + ' : ' + e.idx);
    log(text.slice(e.idx, e.idx + 10));
  }
};

let text = Utils.loadFile(ARGV[0]);
log(translate(text));
