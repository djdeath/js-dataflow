const Mainloop = imports.mainloop;
const Utils = imports.Utils;

let _nop = function() {};
let _update = function(from) {
  this.stop();
  return this.start.apply(this, Utils.copyArrayRange(arguments, 1));
};

// Builtin functions.
const Builtins = {
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
