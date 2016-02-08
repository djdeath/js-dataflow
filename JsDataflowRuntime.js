const Lang = imports.lang;

const Dataflow = new Lang.Class({
  Name: 'Dataflow',

  _init: function(args) {
    this._nodes = {};
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      this._nodes[node.name] = {
        name: node.name,
        children: [],
        eval: node.eval,
        inputs: node.inputs,
        value: undefined,
      };
    }
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      for (let j = 0; j < node.inputs.length; j++)
        this._nodes[node.inputs[j]].children.push(node.name);
    }
    log('->' + JSON.stringify(this._nodes));
  },
  _updateNode: function(node) {
    log('update ' + node.name + ' children=' + node.children)
    node.value = node.eval(this._nodes);
    log('updated ' + node.name + ' value=' + node.value);
    for (let i = 0; i < node.children.length; i++)
      this._updateNode(this._nodes[node.children[i]]);
  },
  start: function() {
    for (let n in this._nodes) {
      let node = this._nodes[n];
      if (node.inputs.length > 1)
        continue;
      this._updateNode(node);
      node.value = node.eval(this._nodes);
    }
  },
  stop: function() {
  },
  getValues: function() {
    let ret = {};
    for (let n in this._nodes)
      ret[n] = this._nodes[n].value;
    return ret;
  }
});
