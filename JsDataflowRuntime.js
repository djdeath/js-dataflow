const Lang = imports.lang;
const Mainloop = imports.mainloop;
//const GLib = imports.gi.GLib;

const Dataflow = new Lang.Class({
  Name: 'Dataflow',

  // Builtin functions.
  _builtins: {
    "@timer": {
      start: function(node, delay) {
        log('start ' + node.name + ' delay='+ delay);
        node.value = 0;
        node._timeout = Mainloop.timeout_add(delay, function() {
          log('kick ' + node.name);
          node.value += delay;
          node.callback(node);
          return true;
        });
      },
      stop: function(node) {
        log('stop ' + node.name);
        if (node._timeout !== undefined) {
          Mainloop.source_remove(node._timeout);
          delete node._timeout;
        }
      },
    },
  },

  _init: function(args) {
    this._nodes = {};
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      this._nodes[node.name] = {
        name: node.name,
        children: [],
        eval: node.eval,
        start: node.start,
        stop: node.stop,
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

  // Testing type of node.
  _isBuiltin: function(node) {
    return node.start !== undefined;
  },
  _updateNodeChildren: function(node) {
    for (let i = 0; i < node.children.length; i++)
      this._updateNode(this._nodes[node.children[i]]);
  },
  _updateNode: function(node) {
    log('update ' + node.name + ' children=' + node.children)
    if (this._isBuiltin(node)) {
      node.callback = this._updateNodeChildren.bind(this);
      node.stop(this._nodes, this._builtins);
      node.start(this._nodes, this._builtins);
    } else
      node.value = node.eval(this._nodes);
    this._updateNodeChildren(node);
  },

  // Graph helpers.
  start: function() {
    // Start all nodes without any input.
    for (let n in this._nodes) {
      let node = this._nodes[n];
      if (node.inputs.length >= 1)
        continue;

      this._updateNode(node);
    }
  },
  stop: function() {
    for (let n in this._nodes) {
      let node = this._nodes[n];
      if (!node.stop)
        continue;
      node.stop(this._nodes, this._builtins);
    }
  },
  getValues: function() {
    let ret = {};
    for (let n in this._nodes)
      ret[n] = this._nodes[n].value;
    return ret;
  }
});
