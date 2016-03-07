const Lang = imports.lang;
const Parser = imports.Parser;
const Builtins = imports.JsDataflowBuiltins.Builtins;

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
        start: node.builtin ? Builtins[node.builtin].start : null,
        stop: node.builtin ? Builtins[node.builtin].stop : null,
        update: node.builtin ? Builtins[node.builtin].update : null,
        multipleEval: node.builtin ? Builtins[node.builtin].multipleEval : false,
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
    nodeData.order = Math.max(nodeData.order,
                              this._toUpdate.depth);

    if (nodeData.parents.indexOf(parent) == -1) {
      nodeData.parents.push(parent);
      nodeData.nb += 1;
    }
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
            ' : ' + JSON.stringify(this._toUpdate.nodes));

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

    this._d('\tupdate ' + node.name + '=' + value +
            ' old=' + node.value +
            ' (from ' + (from ? from.name : '-') + ')');

    if (value === undefined)
      return false;

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

      let parents = toUpdate.nodes[node.name].parents;
      if (toUpdate.nodes[node.name].nb != parents.length)
        throw new Error('Fuck ' + node.name + ' nb=' + toUpdate.nodes[node.name].nb
                        + parents.map(function(p) { return p.name; }));

      // Eval the right number of times based on the number of visit from a
      // depth-first algorithm.
      let forwardPropagation = true;
      if (node.multipleEval) {
        for (let j = 0; j < parents.length; j++)
          forwardPropagation = this._updateNode(node, parents[j]);
      } else {
        forwardPropagation = this._updateNode(node, parents[0]);
      }

      // Stop propagation from this node if its value switched to undefined.
      if (!forwardPropagation) {
        for (let j = 0; j < node.children.length; j++) {
          let child = this._nodes[node.children[j]];
          let childData = toUpdate.nodes[child.name];
          if (childData) {
            childData.nb -= 1;
            childData.parents.splice(childData.parents.indexOf(node), 1);
          }
        }
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
