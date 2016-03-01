const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Parser = imports.Parser;

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
  this.start.apply(this, Utils.copyArrayRange(arguments, 1));
};

// Builtin functions.
const _builtins = {
  // Tick at delay ms.
  "timer": {
    start: function(delay) {
      this.value = 0;
      this._timeout = Mainloop.timeout_add(delay, function() {
        this.value += delay;
        this.callback(this);
        return true;
      }.bind(this));
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
      this.value = object[property];
      this._signal = object.connect('notify::' + property, function() {
        this.value = object[property];
        this.callback(this);
      }.bind(this));
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
        this.value = arg1;
        this.callback(this);
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
        this.value = this._last;
        this.callback(this);
      }
    },
  },
  // Merge n inputs.
  "merge": {
    start: _nop,
    stop: _nop,
    update: function(from) {
      if (from) {
        this.value = from.value;
        this.callback(this);
      }
    },
  },
  "startsWith": {
    start: _nop,
    stop: _nop,
    update: function(from, input, initval) {
      if (!this._started) {
        this._started = true;
        this.value = initval;
        this.callback(this);
      }
      if (from) {
        this.value = input;
        this.callback(this);
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
        this.value = true;
        this.callback(this);
      } else
        this.value = false;
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
          this.value = this._nextValue;
          this.callback(this);
          return true;
        } else {
          delete this._timeout;
          return false;
        }
      }.bind(this));
      this.value = input;
      this.callback(this);
    },
  },
  // Counts
  "count": {
    start: _nop,
    stop: _nop,
    update: function(from, input) {
      if (this.value === undefined)
        this.value = 0;
      else
        this.value += 1;
      this.callback(this);
    },
  },
  // If
  "if": {
    start: _nop,
    stop: _nop,
    update: function(from, value, val1, val2) {
      if (value) {
        this.value = val1;
        this.callback(this);
      } else if (arguments.length > 3) {
        this.value = val2;
        this.callback(this);
      }
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
    for (let n in this._nodes)
      this._d('->' + JSON.stringify(this._nodes[n]));
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
    if (node.builtin) {
      node.update.apply(node, [from].concat(node.eval(this._nodes)));
    } else {
      let value = node.eval(this._nodes);
      if (value !== undefined) {
        node.value = value
        this._updateNodeChildren(node);
      }
    }
  },

  // Graph helpers.
  start: function() {
    // Start all nodes without any input.
    let toUpdate = [];
    for (let n in this._nodes) {
      let node = this._nodes[n];
      if (node.inputs.length >= 1)
        continue;
      this._d('start ' + node.name);
      if (node.builtin)
        node.start.apply(node, node.eval(this._nodes));
      else
        node.value = node.eval(this._nodes);
      toUpdate.push(node);
    }
    // Update children nodes of all started nodes.
    for (let i = 0; i < toUpdate.length; i++) {
      if (toUpdate[i].value !== undefined)
        this._updateNodeChildren(toUpdate[i]);
    }
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
