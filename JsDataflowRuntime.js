const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Parser = imports.Parser;
const Utils = imports.Utils;

let translate = function(text) {
  try {
    let tree = Parser.DataflowParser.matchAll(text, 'program');
    let nodes = Parser.ExtractNodes.match(tree, 'trans');
    let ret = Parser.DataflowJsGen.match(
      [nodes.map(function(e) { return e.name; }), nodes],
      'Program');
    return ret;
  } catch (e) {
    log('Error : ' + e + ' : ' + e.idx);
  }
};

let _nop = function() {};
let _update = function(from) {
  this.stop();
  return this.start.apply(this, Utils.copyArrayRange(arguments, 1));
};

// Builtin functions.
const _builtins = {
  // Tick at delay ms.
  "timer": {
    start: function(delay) {
      this._timeout = Mainloop.timeout_add(delay, function() {
        this.callback(this, this.value + delay);
        return true;
      }.bind(this));
      return 0;
    },
    stop: function() {
      if (this._timeout) {
        Mainloop.source_remove(this._timeout);
        delete this._timeout;
      }
    },
    update: _update,
  },
  // Listens to a property.
  "property": {
    start: function(object, property) {
      this._signal = object.connect('notify::' + property, function() {
        this.callback(this, object[property]);
      }.bind(this));
      return object[property];
    },
    stop: function() {
      if (this._signal !== undefined) {
        object.disconnect(this._signal);
        delete this._signal;
      }
    },
    update: _update,
  },
  // Listens to a signal
  "signal": {
    start: function(object, signal) {
      this._signal = object.connect(signal, function(obj, arg1) {
        this.callback(this, arg1);
      }.bind(this));
    },
    stop: function() {
      if (this._signal !== undefinied) {
        object.disconnect(this._signal);
        delete this._signal;
      }
    },
    update: _update,
  },
  // Throttles input to the rate of output changes.
  "throttle": {
    start: _nop,
    stop: _nop,
    update: function(from, input, output) {
      let oldTrigger = this._lastTrigger;
      this._last = input;
      this._lastTrigger = from;

      if (oldTrigger !== undefined && from.name === this.inputs[1]) {
        return this._last;
      }
    },
  },
  // Merge n inputs.
  "merge": {
    start: _nop,
    stop: _nop,
    update: function(from) {
      return from.value;
    },
  },
  "startsWith": {
    start: _nop,
    stop: _nop,
    update: function(from, input, initval) {
      if (!this._started) {
        this._started = true;
        return initval;
      }
      if (from) {
        return input;
      }
    },
  },
  // Combines multiples conditions.
  "and": {
    start: _nop,
    stop: _nop,
    update: function(from) {
      if (from) {
        for (let i = 1; i < arguments.length; i++) {
          if (!arguments[i])
            return;
        }
        return true;
      }
      return false;
    },
  },
  // Rate limits an input.
  "calm": {
    start: _nop,
    stop: function() {
      if (this._timeout) {
        Mainloop.source_remove(this._timeout);
        delete this._timeout;
      }
    },
    update: function(from, input, interval) {
      if (this._timeout) {
        this._nextValue = input;
        this._armed = true;
        return;
      }
      this._timeout = Mainloop.timeout_add(interval, function() {
        if (this._armed) {
          this._armed = false;
          this.callback(this, this._nextValue);
          return true;
        } else {
          delete this._timeout;
          return false;
        }
      }.bind(this));
      return input;
    },
  },
  // Counts
  "count": {
    start: function() {
      this.value = 0;
    },
    stop: _nop,
    update: function(from, input) {
      return this.value + 1;
    },
  },
  // If
  "if": {
    start: _nop,
    stop: _nop,
    update: function(from, condition, val1, val2) {
      if (condition)
        return val1;
      else if (arguments.length > 3)
        return val2;
    },
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
        update: node.builtin ? _builtins[node.builtin].update : null,
        callback: node.builtin ? this._updateNodesFromNode.bind(this) : null,
        inputs: node.inputs,
        value: undefined,
      };
    }
    for (let i = 0; i < args.nodes.length; i++) {
      let node = args.nodes[i];
      for (let j = 0; j < node.inputs.length; j++)
        this._nodes[node.inputs[j]].children.push(node.name);
    }
    this._d('Initialized graph:');
    for (let n in this._nodes)
      this._d('\t->' + JSON.stringify(this._nodes[n]));
  },

  // Debug.
  _d: function() {
    if (this._debug) {
      log.apply(window, arguments);
    }
  },

  _visit: function(node, parent) {
    if (!this._toUpdate.nodes[node.name]) {
      this._toUpdate.nodes[node.name] = { order: 0,
                                          visiting: false,
                                          parents: [],
                                          nb: 0 };
    }

    let nodeData = this._toUpdate.nodes[node.name];
    // Protect ourselves from loops in the graph.
    if (nodeData.visiting)
      return;

    nodeData.visiting = true;
    this._visitNode(nodeData, parent);
    this._toUpdate.depth += 1;
    for (let i = 0; i < node.children.length; i++)
      this._visit(this._nodes[node.children[i]], node);
    this._toUpdate.depth -= 1;
    nodeData.visiting = false;
  },

  _visitNodeInc: function(nodeData, parent) {
    nodeData.parents.push(parent);
    nodeData.order = Math.max(nodeData.order,
                              this._toUpdate.depth);
    nodeData.nb += 1;
  },

  _visitNodeDec: function(nodeData, parent) {
    nodeData.parents.splice(parent);
    nodeData.nb -= 1;
  },

  // Figure out what nodes need to be updated and in what order from a given
  // node.
  _computeNodesToUpdate: function(startList) {
    this._toUpdate = {
      nodes: {},
      depth: 0
    };

    for (let i = 0; i < startList.length; i++) {
      let start = startList[i];
      this._visitNode = this._visitNodeInc;
      for (let i = 0; i < start.children.length; i++)
        this._visit(this._nodes[start.children[i]], start);
    }

    this._toUpdate.order = Object.keys(this._toUpdate.nodes);
    this._toUpdate.order.sort(function(a, b) {
      return this._toUpdate.nodes[a].order - this._toUpdate.nodes[b].order;
    }.bind(this));

    this._d('Update order from ' + startList.map(function(e) { return e.name; }) +
            ' : ' + ret + ' / ' + JSON.stringify(this._toUpdate.nodes));

    let ret = this._toUpdate;
    this._toUpdate = null;
    return ret;
  },

  // Updates a single node's value.
  _updateNode: function(node, from) {
    let value = undefined;
    if (node.builtin)
      value = node.update.apply(node, [from].concat(node.eval(this._nodes)));
    else
      value = node.eval(this._nodes);

    if (value === undefined)
      return false;

    this._d('\tupdate ' + node.name + '=' + value +
            ' (from ' + (from ? from.name : '-') + ')');
    node.value = value
    return true;
  },

  // Update the graph using the given list of nodes.
  _updateNodesFromNodes: function(startList) {
    let toUpdate = this._computeNodesToUpdate(startList);

    // Updated all affected nodes in order.
    this._d(toUpdate.order.length + ' to update : ' + toUpdate.order);
    for (let i = 0; i < toUpdate.order.length; i++) {
      let node = this._nodes[toUpdate.order[i]];

      // Nothing left to update on this node.
      if (toUpdate.nodes[node.name].nb < 1)
        continue;

      // Eval the right number of times based on the number of visit from a
      // depth-first algorithm.
      let parents = toUpdate.nodes[node.name].parents;
      let forwardPropagation = true;
      for (let j = 0; j < parents.length; j++)
        forwardPropagation = this._updateNode(node, parents[j]);

      // Stop propagation from this node if its value switched to undefined.
      if (!forwardPropagation) {
        this._toUpdate = toUpdate;
        this._visitNode = this._visitNodeDec;
        this._visit(node, null);
      }
    }
    this._toUpdate = null;
  },

  // Called by builtin nodes who want to update their value.
  _updateNodesFromNode: function(node, value) {
    if (value === undefined)
      return;
    this._d('Builtin node update ' + node.name + ' = ' + value)
    node.value = value;
    this._updateNodesFromNodes([node]);
  },

  //
  // Public API:
  //
  start: function() {
    // Start all nodes without any input.
    let toUpdate = [];
    for (let n in this._nodes) {
      let node = this._nodes[n];
      if (node.inputs.length >= 1)
        continue;
      this._d('start ' + node.name);
      if (this._updateNode(node, null))
        toUpdate.push(node);
    }

    // Update children nodes of all started nodes.
    this._updateNodesFromNodes(toUpdate);
    this._d('started...');
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
