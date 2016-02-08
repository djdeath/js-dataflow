const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Parser = imports.Parser;

let translate = function(text) {
  let tree = Parser.DataflowParser.matchAll(text, 'top');
  let nodes = Parser.ExtractNodes.match(tree, 'trans');

  //log('Nodes: ' + nodes.map(function(e) { return e.name; }));
  let js = Parser.DataflowJsGen.createInstance();
  js.setInput(nodes.map(function(e) { return e.name; }));

  let ret = js.match(nodes, 'program');
  return ret;
};

const Dataflow = new Lang.Class({
  Name: 'Dataflow',

  // Builtin functions.
  _builtins: {
    "timer": {
      start: function(node, delay) {
        node.value = 0;
        node._timeout = Mainloop.timeout_add(delay, function() {
          node.value += delay;
          node.callback(node);
          return true;
        });
        return true;
      },
      stop: function(node) {
        if (node._timeout !== undefined) {
          Mainloop.source_remove(node._timeout);
          delete node._timeout;
        }
      },
    },
    "property": {
      start: function(node, object, property) {
        node.value = object[property];
        node._signal = object.connect('notify::' + property, function() {
          node.value = object[property];
          node.callback(node);
        });
        return true;
      },
      stop: function(node) {
        if (node._signal !== undefined) {
          object.disconnect(node._signal);
          delete node._signal;
        }
      },
    }
  },

  _init: function(args) {
    this._debug = args.debug;
    this._nodes = {};
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      this._nodes[node.name] = {
        name: node.name,
        builtin: node.builtin,
        children: [],
        eval: node.eval,
        start: node.start,
        inputs: node.inputs,
        callback: this._updateNodeChildren.bind(this),
        value: undefined,
      };
    }
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      for (let j = 0; j < node.inputs.length; j++)
        this._nodes[node.inputs[j]].children.push(node.name);
    }
    this._d('->' + JSON.stringify(this._nodes));
  },

  _d: function() {
    if (this._debug) {
      log.apply(window, arguments);
    }
  },

  // Testing type of node.
  _isBuiltin: function(node) {
    return node.start !== undefined;
  },
  _updateNodeChildren: function(node) {
    this._d('updated ' + node.name + '=' + node.value)
    for (let i = 0; i < node.children.length; i++)
      this._updateNode(this._nodes[node.children[i]]);
  },
  _updateNode: function(node) {
    this._d('update ' + node.name + '=' + node.value)
    if (this._isBuiltin(node)) {
      this._builtins[node.builtin].stop(node);
      if (node.start(this._nodes, this._builtins))
        this._updateNodeChildren(node);
    } else {
      node.value = node.eval(this._nodes);
      this._updateNodeChildren(node);
    }
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
