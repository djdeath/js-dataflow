const Lang = imports.lang;

const Dataflow = new Lang.Class({
  Name: 'Dataflow',

  init: function(args) {
    this._nodes = {};
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      this._nodes[node.name] = {
        name: node.name,
        eval: node.eval,
        children: [],
      };
    }
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      for (let j = 0; j < nodes.inputs; j++)
        this._nodes[node.inputs[i]].children.push(node.name);
    }
  },
  start: function() {
  },
  stop: function() {
  },
});
