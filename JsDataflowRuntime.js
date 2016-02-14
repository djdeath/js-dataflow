const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Parser = imports.Parser;

let translate = function(text) {
  try {
    let tree = Parser.DataflowParser.matchAll(text, 'program');
    let nodes = Parser.ExtractNodes.match(tree, 'trans');

    //log('Nodes: ' + nodes.map(function(e) { return e.name; }));
    let js = Parser.DataflowJsGen.createInstance();
    js.setInput(nodes.map(function(e) { return e.name; }));

    let ret = js.match(nodes, 'program');
    return ret;
  } catch (e) {
    log('Error : ' + e.idx);
  }
};

// Builtin functions.
const _builtins = {
  // Tick at delay ms.
  "timer": {
    start: function(from, delay) {
      this.value = 0;
      this._timeout = Mainloop.timeout_add(delay, function() {
        this.value += delay;
        this.callback(this);
        return true;
      }.bind(this));
      this.callback(this);
    },
    stop: function() {
      if (this._timeout !== undefined) {
        Mainloop.source_remove(this._timeout);
        delete this._timeout;
      }
    },
  },
  // Listens to a property.
  "property": {
    start: function(from, object, property) {
      this.value = object[property];
      this._signal = object.connect('notify::' + property, function() {
        this.value = object[property];
        this.callback(this);
      }.bind(this));
      this.callback(this);
    },
    stop: function() {
      if (this._signal !== undefined) {
        object.disconnect(this._signal);
        delete this._signal;
      }
    },
  },
  // Throttling
  "throttle": {
    start: function(from, input, output) {
      let oldTrigger = this._lastTrigger;
      this._last = input;
      this._lastTrigger = from;

      if (oldTrigger !== undefined && from.name === this.inputs[1]) {
        this.value = this._last;
        this.callback(this);
      }
    },
    stop: function() {},
  },
};


const Dataflow = new Lang.Class({
  Name: 'Dataflow',

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
        start: node.builtin ? _builtins[node.builtin].start : null,
        stop: node.builtin ? _builtins[node.builtin].stop : null,
        callback: node.builtin ? this._updateNodeChildren.bind(this) : null,
        inputs: node.inputs,
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

  // Debug.
  _d: function() {
    if (this._debug) {
      log.apply(window, arguments);
    }
  },

  // Testing type of node.
  _isBuiltin: function(node) {
    return node.builtin !== undefined;
  },
  _updateNodeChildren: function(node) {
    this._d('updated ' + node.name + '=' + node.value)
    for (let i = 0; i < node.children.length; i++)
      this._updateNode(this._nodes[node.children[i]], node);
  },
  _updateNode: function(node, from) {
    this._d('update ' + node.name + '=' + node.value)
    if (this._isBuiltin(node)) {
      node.stop();
      node.start.apply(node, [from].concat(node.eval(this._nodes)));
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
      if (node.stop)
        node.stop();
    }
  },
  getValues: function() {
    let ret = {};
    for (let n in this._nodes)
      ret[n] = this._nodes[n].value;
    return ret;
  }
});
