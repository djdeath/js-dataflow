// This file was generated using Gnometa
// https://github.com/djdeath/gnometa
/*
  new syntax:
    #foo and `foo	match the string object 'foo' (it's also accepted in my JS)
    'abc'		match the string object 'abc'
    'c'			match the string object 'c'
    ``abc''		match the sequence of string objects 'a', 'b', 'c'
    "abc"		token('abc')
    [1 2 3]		match the array object [1, 2, 3]
    foo(bar)		apply rule foo with argument bar
    -> ...		semantic actions written in JS (see OMetaParser's atomicHostExpr rule)
*/

/*
var M = ometa {
  number = number:n digit:d -> { n * 10 + d.digitValue() }
         | digit:d          -> { d.digitValue() }
};

translates to...

var M = objectThatDelegatesTo(OMeta, {
  number: function() {
            return this._or(function() {
                              var n = this._apply("number"),
                                  d = this._apply("digit");
                              return n * 10 + d.digitValue();
                            },
                            function() {
                              var d = this._apply("digit");
                              return d.digitValue();
                            }
                           );
          }
});
M.matchAll("123456789", "number");
*/

// try to use StringBuffer instead of string concatenation to improve performance

let StringBuffer = function() {
  this.strings = [];
  for (var idx = 0; idx < arguments.length; idx++)
    this.nextPutAll(arguments[idx]);
};
StringBuffer.prototype.nextPutAll = function(s) { this.strings.push(s); };
StringBuffer.prototype.contents   = function()  { return this.strings.join(""); };
String.prototype.writeStream      = function() { return new StringBuffer(this); };

// make Arrays print themselves sensibly

let printOn = function(x, ws) {
  if (x === undefined || x === null)
    ws.nextPutAll("" + x);
  else if (x.constructor === Array) {
    ws.nextPutAll("[");
    for (var idx = 0; idx < x.length; idx++) {
      if (idx > 0)
        ws.nextPutAll(", ");
      printOn(x[idx], ws);
    }
    ws.nextPutAll("]");
  } else
    ws.nextPutAll(x.toString());
};

Array.prototype.toString = function() {
  var ws = "".writeStream();
  printOn(this, ws);
  return ws.contents();
};

// delegation

let objectThatDelegatesTo = function(x, props) {
  var f = function() { };
  f.prototype = x;
  var r = new f();
  for (var p in props)
    if (props.hasOwnProperty(p))
      r[p] = props[p];
  return r;
};

// some reflective stuff

let ownPropertyNames = function(x) {
  var r = [];
  for (var name in x)
    if (x.hasOwnProperty(name))
      r.push(name);
  return r;
};

let isImmutable = function(x) {
   return (x === null ||
           x === undefined ||
           typeof x === "boolean" ||
           typeof x === "number" ||
           typeof x === "string");
};

String.prototype.digitValue  = function() {
  return this.charCodeAt(0) - "0".charCodeAt(0);
};

let isSequenceable = function(x) {
  return (typeof x == "string" || x.constructor === Array);
};

// some functional programming stuff

Array.prototype.delimWith = function(d) {
  return this.reduce(
    function(xs, x) {
      if (xs.length > 0)
        xs.push(d);
      xs.push(x);
      return xs;
    },
    []);
};

// escape characters

String.prototype.pad = function(s, len) {
  var r = this;
  while (r.length < len)
    r = s + r;
  return r;
};

let escapeStringFor = {};
for (var c = 0; c < 128; c++)
  escapeStringFor[c] = String.fromCharCode(c);
escapeStringFor["'".charCodeAt(0)]  = "\\'";
escapeStringFor['"'.charCodeAt(0)]  = '\\"';
escapeStringFor["\\".charCodeAt(0)] = "\\\\";
escapeStringFor["\b".charCodeAt(0)] = "\\b";
escapeStringFor["\f".charCodeAt(0)] = "\\f";
escapeStringFor["\n".charCodeAt(0)] = "\\n";
escapeStringFor["\r".charCodeAt(0)] = "\\r";
escapeStringFor["\t".charCodeAt(0)] = "\\t";
escapeStringFor["\v".charCodeAt(0)] = "\\v";
let escapeChar = function(c) {
  var charCode = c.charCodeAt(0);
  if (charCode < 128)
    return escapeStringFor[charCode];
  else if (128 <= charCode && charCode < 256)
    return "\\x" + charCode.toString(16).pad("0", 2);
  else
    return "\\u" + charCode.toString(16).pad("0", 4);
};

let unescape = function(s) {
  if (s.charAt(0) == '\\')
    switch (s.charAt(1)) {
    case "'":  return "'";
    case '"':  return '"';
    case '\\': return '\\';
    case 'b':  return '\b';
    case 'f':  return '\f';
    case 'n':  return '\n';
    case 'r':  return '\r';
    case 't':  return '\t';
    case 'v':  return '\v';
    case 'x':  return String.fromCharCode(parseInt(s.substring(2, 4), 16));
    case 'u':  return String.fromCharCode(parseInt(s.substring(2, 6), 16));
    default:   return s.charAt(1);
    }
  else
    return s;
};

String.prototype.toProgramString = function() {
  var ws = '"'.writeStream();
  for (var idx = 0; idx < this.length; idx++)
    ws.nextPutAll(escapeChar(this.charAt(idx)));
  ws.nextPutAll('"');
  return ws.contents();
};

// unique tags for objects (useful for making "hash tables")

let getTag = (function() {
  var numIdx = 0;
  return function(x) {
    if (x === null || x === undefined)
      return x;
    switch (typeof x) {
    case "boolean": return x == true ? "Btrue" : "Bfalse";
    case "string":  return "S" + x;
    case "number":  return "N" + x;
    default:        return x.hasOwnProperty("_id_") ? x._id_ : x._id_ = "R" + numIdx++;
    }
  };
})();


// the failure exception
if (!window._OMetafail) {
  window._OMetafail = new Error('match failed');
  window._OMetafail.toString = function() { return "match failed"; };
}
let fail = window._OMetafail;

// streams and memoization

let OMInputStream = function(hd, tl) {
  this.memo = { };
  this.lst  = tl.lst;
  this.idx  = tl.idx;
  this.hd   = hd;
  this.tl   = tl;
};
OMInputStream.prototype.head = function() { return this.hd; };
OMInputStream.prototype.tail = function() { return this.tl; };
OMInputStream.prototype.type = function() { return this.lst.constructor; };
OMInputStream.prototype.upTo = function(that) {
  var r = [], curr = this;
  while (curr != that) {
    r.push(curr.head());
    curr = curr.tail();
  }
  return this.type() == String ? r.join('') : r;
};

let OMInputStreamEnd = function(lst, idx) {
  this.memo = { };
  this.lst = lst;
  this.idx = idx;
};
OMInputStreamEnd.prototype = objectThatDelegatesTo(OMInputStream.prototype);
OMInputStreamEnd.prototype.head = function() { throw fail; };
OMInputStreamEnd.prototype.tail = function() { throw fail; };

// This is necessary b/c in IE, you can't say "foo"[idx]
Array.prototype.at  = function(idx) { return this[idx]; };
String.prototype.at = String.prototype.charAt;

let ListOMInputStream = function(lst, idx) {
  this.memo = { };
  this.lst  = lst;
  this.idx  = idx;
  this.hd   = lst.at(idx);
};
ListOMInputStream.prototype = objectThatDelegatesTo(OMInputStream.prototype);
ListOMInputStream.prototype.head = function() { return this.hd; };
ListOMInputStream.prototype.tail = function() {
  return this.tl || (this.tl = makeListOMInputStream(this.lst, this.idx + 1));
};

let makeListOMInputStream = function(lst, idx) {
  return new (idx < lst.length ? ListOMInputStream : OMInputStreamEnd)(lst, idx);
};

Array.prototype.toOMInputStream  = function() {
  return makeListOMInputStream(this, 0);
}
String.prototype.toOMInputStream = function() {
  return makeListOMInputStream(this, 0);
}

let makeOMInputStreamProxy = function(target) {
  return objectThatDelegatesTo(target, {
    memo:   { },
    target: target,
    tl: undefined,
    tail:   function() {
      return this.tl || (this.tl = makeOMInputStreamProxy(target.tail()));
    }
  });
}

// Failer (i.e., that which makes things fail) is used to detect (direct) left recursion and memoize failures

let Failer = function() { }
Failer.prototype.used = false;

// Source map helpers

let _sourceMap;
let resetSourceMap = function() { _sourceMap = { filenames: [], map: [], }; };
let startFileSourceMap = function(filename) { _sourceMap.filenames.push(filename); };
let addToSourseMap = function(id, start, stop) {
  _sourceMap.map[id] = [ _sourceMap.filenames.length - 1, start, stop ];
};
let createSourceMapId = function() { return _sourceMap.map.length; };
let getSourceMap = function() { return _sourceMap; };
resetSourceMap();

// the OMeta "class" and basic functionality

let OMeta = {
  _extractLocation: function(retVal) {
    return { start: retVal.start,
             stop: this.input.idx, };
  },
  _startStructure: function(id, rule) {
    return {
      rule: rule,
      id: id,
      start: this.input.idx,
      stop: null,
      children: [],
      value: null,
    };
  },
  _appendStructure: function(structure, child, id) {
    if (!child.call)
      child.call = id;
    structure.children.push(child);
    return (structure.value = child.value);
  },
  _getStructureValue: function(structure) {
    return structure.value;
  },
  _endStructure: function(structure) {
    structure.stop = this.input.idx;
    return structure;
  },
  _forwardStructure: function(structure, id) {
    structure.call = id;
    return structure;
  },

  _apply: function(rule) {
    var memoRec = this.input.memo[rule];
    if (memoRec == undefined) {
      var origInput = this.input,
          failer    = new Failer();
      if (this[rule] === undefined)
        throw new Error('tried to apply undefined rule "' + rule + '"');
      this.input.memo[rule] = failer;
      this.input.memo[rule] = memoRec = {ans: this[rule].call(this),
                                         nextInput: this.input };
      if (failer.used) {
        var sentinel = this.input;
        while (true) {
          try {
            this.input = origInput;
            var ans = this[rule].call(this);
            if (this.input == sentinel)
              throw fail;
            memoRec.ans       = ans;
            memoRec.nextInput = this.input;
          } catch (f) {
            if (f != fail)
              throw f;
            break;
          }
        }
      }
    } else if (memoRec instanceof Failer) {
      memoRec.used = true;
      throw fail;
    }

    this.input = memoRec.nextInput;
    return memoRec.ans;
  },

  // note: _applyWithArgs and _superApplyWithArgs are not memoized, so they can't be left-recursive
  _applyWithArgs: function(rule) {
    var ruleFn = this[rule];
    var ruleFnArity = ruleFn.length;
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
      this._prependInput(arguments[idx]);
    return ruleFnArity == 0 ?
      ruleFn.call(this) :
      ruleFn.apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1));
  },
  _superApplyWithArgs: function(recv, rule) {
    var ruleFn = this[rule];
    var ruleFnArity = ruleFn.length;
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 2; idx--) // prepend "extra" arguments in reverse order
      recv._prependInput(arguments[idx]);
    return ruleFnArity == 0 ?
      ruleFn.call(recv) :
      ruleFn.apply(recv, Array.prototype.slice.call(arguments, 2, ruleFnArity + 2));
  },
  _prependInput: function(v) {
    this.input = new OMInputStream(v, this.input);
  },

  // if you want your grammar (and its subgrammars) to memoize parameterized rules, invoke this method on it:
  memoizeParameterizedRules: function() {
    this._prependInput = function(v) {
      var newInput;
      if (isImmutable(v)) {
        newInput = this.input[getTag(v)];
        if (!newInput) {
          newInput = new OMInputStream(v, this.input);
          this.input[getTag(v)] = newInput;
        }
      } else
        newInput = new OMInputStream(v, this.input);
      this.input = newInput;
    };
    this._applyWithArgs = function(rule) {
      var ruleFnArity = this[rule].length;
      for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
        this._prependInput(arguments[idx]);
      return ruleFnArity == 0 ?
        this._apply(rule) :
        this[rule].apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1));
    };
  },

  _pred: function(b) {
    if (b)
      return true;
    throw fail;
  },
  _not: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    try {
      this._appendStructure(r, x.call(this));
    } catch (f) {
      if (f != fail)
        throw f;
      this.input = origInput;
      r.value = true;
      return this._endStructure(r);
    }
    throw fail;
  },
  _lookahead: function(x) {
    var origInput = this.input,
        r = x.call(this);
    this.input = origInput;
    return r;
  },
  _or: function() {
    var origInput = this.input;
    for (var idx = 0; idx < arguments.length; idx++) {
      try {
        this.input = origInput;
        return arguments[idx].call(this);
      } catch (f) {
        if (f != fail)
          throw f;
      }
    }
    throw fail;
  },
  _xor: function(ruleName) {
    var idx = 1, newInput, origInput = this.input, r;
    while (idx < arguments.length) {
      try {
        this.input = origInput;
        r = arguments[idx].call(this);
        if (newInput)
          throw new Error('more than one choice matched by "exclusive-OR" in ' + ruleName);
        newInput = this.input;
      } catch (f) {
        if (f != fail)
          throw f;
      }
      idx++;
    }
    if (newInput) {
      this.input = newInput;
      return r;
    }
    throw fail;
  },
  disableXORs: function() {
    this._xor = this._or;
  },
  _opt: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    try {
      r = x.call(this);
    } catch (f) {
      if (f != fail)
        throw f;
      this.input = origInput;
    }
    return this._endStructure(r);
  },
  _many: function(x) {
    var r = this._startStructure(-1), ans = [];
    if (arguments.length > 1) { this._appendStructure(r, x.call(this)); ans.push(r.value); }
    while (true) {
      var origInput = this.input;
      try {
        this._appendStructure(r, x.call(this));
        ans.push(r.value);
      } catch (f) {
        if (f != fail)
          throw f;
        this.input = origInput;
        break;
      }
    }
    r.value = ans
    return this._endStructure(r);
  },
  _many1: function(x) { return this._many(x, true); },
  _form: function(x) {
    var r = this._startStructure(-1);
    r.form = true;
    this._appendStructure(r, this._apply("anything"));
    var v = r.value;
    if (!isSequenceable(v))
      throw fail;
    var origInput = this.input;
    this.input = v.toOMInputStream();
    // TODO: probably append as a child
    this._appendStructure(r, x.call(this));
    this._appendStructure(r, this._apply("end"));
    r.value = v;
    this.input = origInput;
    return this._endStructure(r);
  },
  _consumedBy: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    this._appendStructure(r, x.call(this));
    r.value = origInput.upTo(this.input);
    return this._endStructure(r);
  },
  _idxConsumedBy: function(x) {
    var origInput = this.input,
        r = this._startStructure(-1);
    this._appendStructure(r, x.call(this));
    r.value = {fromIdx: origInput.idx, toIdx: this.input.idx};
    return this._endStructure(r);
  },
  _interleave: function(mode1, part1, mode2, part2 /* ..., moden, partn */) {
    var currInput = this.input, ans = [], r = this._startStructure(-1);
    for (var idx = 0; idx < arguments.length; idx += 2)
      ans[idx / 2] = (arguments[idx] == "*" || arguments[idx] == "+") ? [] : undefined;
    while (true) {
      var idx = 0, allDone = true;
      while (idx < arguments.length) {
        if (arguments[idx] != "0")
          try {
            this.input = currInput;
            switch (arguments[idx]) {
            case "*":
              ans[idx / 2].push(this._appendStructure(r, arguments[idx + 1].call(this)));
              break;
            case "+":
              ans[idx / 2].push(this._appendStructure(r, arguments[idx + 1].call(this)));
              arguments[idx] = "*";
              break;
            case "?":
              ans[idx / 2] = this._appendStructure(r, arguments[idx + 1].call(this));
              arguments[idx] = "0";
              break;
            case "1":
              ans[idx / 2] = this._appendStructure(r, arguments[idx + 1].call(this));
              arguments[idx] = "0";
              break;
            default:
              throw new Error("invalid mode '" + arguments[idx] + "' in OMeta._interleave");
            }
            currInput = this.input;
            break;
          } catch (f) {
            if (f != fail)
              throw f;
            // if this (failed) part's mode is "1" or "+", we're not done yet
            allDone = allDone && (arguments[idx] == "*" || arguments[idx] == "?");
          }
        idx += 2;
      }
      if (idx == arguments.length) {
        if (allDone) {
          r.value = ans;
          return this._endStructure(r);
        } else
          throw fail;
      }
    }
  },

  // some basic rules
  anything: function() {
    var r = this._startStructure(-1);
    r.value = this.input.head();
    this.input = this.input.tail();
    return this._endStructure(r);
  },
  end: function() {
    return this._not(function() { return this._apply("anything"); });
  },
  pos: function() {
    return this.input.idx;
  },
  empty: function() {
    var r = this._startStructure(-1);
    r.value = true;
    return this._endStructure(r);
  },
  apply: function(r) {
    return this._apply(r);
  },
  foreign: function(g, r) {
    var gi = objectThatDelegatesTo(g, {input: makeOMInputStreamProxy(this.input)});
    gi.initialize();
    var ans = gi._apply(r);
    this.input = gi.input.target;
    return ans;
  },

  //  some useful "derived" rules
  exactly: function(wanted) {
    var r = this._startStructure(-1);
    this._appendStructure(r, this._apply("anything"));
    if (wanted === r.value)
      return this._endStructure(r);
    throw fail;
  },
  seq: function(xs) {
    var r = this._startStructure(-1);
    for (var idx = 0; idx < xs.length; idx++)
      this._applyWithArgs("exactly", xs.at(idx));
    r.value = xs;
    return this._endStructure(r);
  },

  initialize: function() {},
  // match and matchAll are a grammar's "public interface"
  _genericMatch: function(input, rule, args, callback) {
    if (args == undefined)
      args = [];
    var realArgs = [rule];
    for (var idx = 0; idx < args.length; idx++)
      realArgs.push(args[idx]);
    var m = objectThatDelegatesTo(this, {input: input});
    m.initialize();
    try {
      let ret = realArgs.length == 1 ? m._apply.call(m, realArgs[0]) : m._applyWithArgs.apply(m, realArgs);
      if (callback)
        callback(null, ret, ret.value);
      return ret;
    } catch (f) {
      if (f != fail)
        throw f;

      var einput = m.input;
      if (einput.idx != undefined) {
        while (einput.tl != undefined && einput.tl.idx != undefined)
          einput = einput.tl;
        einput.idx--;
      }
      var err = new Error();

      err.idx = einput.idx;
      if (callback)
        callback(err);
      else
        throw err;
    }
    return { value: null };
  },
  matchStructure: function(obj, rule, args, callback) {
    return this._genericMatch([obj].toOMInputStream(), rule, args, callback);
  },
  matchAllStructure: function(listyObj, rule, args, matchFailed) {
    return this._genericMatch(listyObj.toOMInputStream(), rule, args, matchFailed);
  },
  match: function(obj, rule, args, callback) {
    return this.matchStructure(obj, rule, args, callback).value;
  },
  matchAll: function(listyObj, rule, args, matchFailed) {
    return this.matchAllStructure(listyObj, rule, args, matchFailed).value;
  },
  createInstance: function() {
    var m = objectThatDelegatesTo(this, {});
    m.initialize();
    m.matchAll = function(listyObj, aRule) {
      this.input = listyObj.toOMInputStream();
      return this._apply(aRule);
    };
    return m;
  }
};

let evalCompiler = function(str) {
  return eval(str);
};

let GenericMatcher=objectThatDelegatesTo(OMeta,{
"notLast":function(){var $elf=this,$vars={},$r0=this._startStructure(1, true);$vars.rule=this._getStructureValue(this.anything());$vars.r=this._appendStructure($r0,this._apply($vars.rule),5);this._appendStructure($r0,this._lookahead(function(){return this._forwardStructure(this._apply($vars.rule),10);}),8);$r0.value=$vars.r;return this._endStructure($r0);}});let BaseStrParser=objectThatDelegatesTo(OMeta,{
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(15, true);$vars.r=this._appendStructure($r0,this.anything(),18);this._pred(((typeof $vars.r) === "string"));$r0.value=$vars.r;return this._endStructure($r0);},
"char":function(){var $elf=this,$vars={},$r0=this._startStructure(23, true);$vars.r=this._appendStructure($r0,this.anything(),26);this._pred((((typeof $vars.r) === "string") && ($vars.r["length"] == (1))));$r0.value=$vars.r;return this._endStructure($r0);},
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(31, true);$vars.r=this._appendStructure($r0,this._apply("char"),34);this._pred(($vars.r.charCodeAt((0)) <= (32)));$r0.value=$vars.r;return this._endStructure($r0);},
"spaces":function(){var $elf=this,$vars={},$r0=this._startStructure(39, true);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("space"),42);}),40);return this._endStructure($r0);},
"digit":function(){var $elf=this,$vars={},$r0=this._startStructure(44, true);$vars.r=this._appendStructure($r0,this._apply("char"),47);this._pred((($vars.r >= "0") && ($vars.r <= "9")));$r0.value=$vars.r;return this._endStructure($r0);},
"lower":function(){var $elf=this,$vars={},$r0=this._startStructure(52, true);$vars.r=this._appendStructure($r0,this._apply("char"),55);this._pred((($vars.r >= "a") && ($vars.r <= "z")));$r0.value=$vars.r;return this._endStructure($r0);},
"upper":function(){var $elf=this,$vars={},$r0=this._startStructure(60, true);$vars.r=this._appendStructure($r0,this._apply("char"),63);this._pred((($vars.r >= "A") && ($vars.r <= "Z")));$r0.value=$vars.r;return this._endStructure($r0);},
"letter":function(){var $elf=this,$vars={},$r0=this._startStructure(68, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("lower"),71);},function(){return this._forwardStructure(this._apply("upper"),73);}),69);return this._endStructure($r0);},
"letterOrDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(75, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),78);},function(){return this._forwardStructure(this._apply("digit"),80);}),76);return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(82, true);$vars.tok=this._getStructureValue(this.anything());this._appendStructure($r0,this._apply("spaces"),85);$r0.value=this._appendStructure($r0,this.seq($vars.tok),87);return this._endStructure($r0);},
"listOf":function(){var $elf=this,$vars={},$r0=this._startStructure(90, true);$vars.rule=this._getStructureValue(this.anything());$vars.delim=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(96);$vars.f=this._appendStructure($r1,this._apply($vars.rule),99);$vars.rs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(105);this._appendStructure($r2,this._applyWithArgs("token",$vars.delim),107);$r2.value=this._appendStructure($r2,this._apply($vars.rule),110);return this._endStructure($r2);}),103);$r1.value=[$vars.f].concat($vars.rs);return this._endStructure($r1);},function(){var $r1=this._startStructure(95);$r1.value=[];return this._endStructure($r1);}),94);return this._endStructure($r0);},
"enum":function(){var $elf=this,$vars={},$r0=this._startStructure(115, true);$vars.rule=this._getStructureValue(this.anything());$vars.delim=this._getStructureValue(this.anything());$vars.v=this._appendStructure($r0,this._applyWithArgs("listOf",$vars.rule,$vars.delim),120);this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token",$vars.delim),126);},function(){return this._forwardStructure(this._apply("empty"),129);}),124);$r0.value=$vars.v;return this._endStructure($r0);},
"fromTo":function(){var $elf=this,$vars={},$r0=this._startStructure(132, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(138);this._appendStructure($r1,this.seq($vars.x),140);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(145);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.seq($vars.y),149);}),147);$r2.value=this._appendStructure($r2,this._apply("char"),152);return this._endStructure($r2);}),143);$r1.value=this._appendStructure($r1,this.seq($vars.y),154);return this._endStructure($r1);}),136);return this._endStructure($r0);},
"fromToOrEnd":function(){var $elf=this,$vars={},$r0=this._startStructure(157, true);$vars.x=this._getStructureValue(this.anything());$vars.y=this._getStructureValue(this.anything());$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(163);this._appendStructure($r1,this.seq($vars.x),165);this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(170);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.seq($vars.y),176);},function(){return this._forwardStructure(this.end(),179);}),174);}),172);$r2.value=this._appendStructure($r2,this._apply("char"),181);return this._endStructure($r2);}),168);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.seq($vars.y),185);},function(){return this._forwardStructure(this.end(),188);}),183);return this._endStructure($r1);}),161);return this._endStructure($r0);}})
let DataflowJsGen=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(191, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(195);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),200));return this._endStructure($r1);}),193);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(204, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(208, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(212, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(216, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),221);}),219);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(224, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),228);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(231, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),234);$vars.x=this._appendStructure($r0,this._apply("trans"),237);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(240, true);$vars.x=this._getStructureValue(this.anything());$r0.value=(this._isInput($vars.x)?(("nodes[" + $vars.x.toProgramString()) + "].value"):$vars.x);return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(244, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),248);$vars.y=this._appendStructure($r0,this._apply("trans"),251);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(254, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),257);$vars.t=this._appendStructure($r0,this._apply("trans"),260);$vars.e=this._appendStructure($r0,this._apply("trans"),263);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(266, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),269);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),274);}),272);$r0.value=((($vars.fn + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(277, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),281);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),286);}),284);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(289, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),294);}),292);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(297, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),301);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(304, true);$vars.c=this._appendStructure($r0,this._apply("trans"),307);$vars.e=this._appendStructure($r0,this._apply("trans"),310);$r0.value=["if(",$vars.c,")return ",$vars.e,";"].join("");return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(313, true);$vars.e=this._appendStructure($r0,this._apply("trans"),316);$r0.value=(("return " + $vars.e) + ";");return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(319, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),324);}),322);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"nodeExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(327, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(331);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(338);this._pred(($vars.t == "switch"));$vars.a=this._appendStructure($r2,this._apply($vars.t),343);$r2.value=$vars.a;return this._endStructure($r2);},function(){var $r2=this._startStructure(347);$vars.a=this._appendStructure($r2,this._apply($vars.t),350);$r2.value=(("return " + $vars.a) + ";");return this._endStructure($r2);}),336));return this._endStructure($r1);}),329);$r0.value=$vars.ans;return this._endStructure($r0);},
"node":function(){var $elf=this,$vars={},$r0=this._startStructure(355, true);$vars.e=this._getStructureValue(this.anything());this._pred((! $vars.e["builtin"]));$vars.c=this._appendStructure($r0,this._applyWithArgs("nodeExpr",$vars.e["expr"]),361);$r0.value=["{name:",$vars.e["name"].toProgramString(),",eval:function(nodes){",$vars.c,"}",",inputs:",this._toItemString($vars.e["inputs"]),"}"].join("");return this._endStructure($r0);},
"builtinArgs":function(){var $elf=this,$vars={},$r0=this._startStructure(365, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(368);$r1.value=($vars.xs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("trans"),373);}),371));return this._endStructure($r1);}),367);$r0.value=$vars.xs.join(",");return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(376, true);$vars.e=this._getStructureValue(this.anything());this._pred($vars.e["builtin"]);$vars.args=this._appendStructure($r0,this._applyWithArgs("builtinArgs",$vars.e["expr"]),382);$r0.value=["{name:",$vars.e["name"].toProgramString(),",builtin:",$vars.e["builtin"].toProgramString(),",eval:function(nodes){return [",$vars.args,"];}",",inputs:",this._toItemString($vars.e["inputs"]),"}"].join("");return this._endStructure($r0);},
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(386, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(389);$r1.value=($vars.ns=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("node"),396);},function(){return this._forwardStructure(this._apply("builtin"),398);}),394);}),392));return this._endStructure($r1);}),388);$r0.value=(("[" + $vars.ns.join(",\n")) + "]");return this._endStructure($r0);},
"Dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(401, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(405);$vars.nodes=this._getStructureValue(this.anything());this.setInput($vars.nodes);$r1.value=($vars.p=this._appendStructure($r1,this._apply("dataflow"),411));return this._endStructure($r1);}),403);$r0.value=$vars.p;return this._endStructure($r0);}});(DataflowJsGen["_toItemString"]=(function (inputs){let items=({});for(let i=(0);(i < inputs["length"]);i++){if(this._isInput(inputs[i])){(items[inputs[i]]=true);}else{undefined;};}let s="[";for(let i in items){(s+=(i.toProgramString() + ","));}(s+="]");return s;}));(DataflowJsGen["_isInput"]=(function (name){return (this["_inputs"] && (this["_inputs"][name] === true));}));(DataflowJsGen["setInput"]=(function (inputs){(this["_inputs"]=({}));for(let i=(0);(i < inputs["length"]);i++){(this["_inputs"][inputs[i]]=true);};}))
let DataflowParser=objectThatDelegatesTo(BaseStrParser,{
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(415, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),418);},function(){return this._forwardStructure(this._applyWithArgs("fromToOrEnd","//","\n"),420);}),416);return this._endStructure($r0);},
"nonEmptyListOf":function(){var $elf=this,$vars={},$r0=this._startStructure(424, true);$vars.r=this._getStructureValue(this.anything());$vars.d=this._getStructureValue(this.anything());$vars.f=this._appendStructure($r0,this._apply($vars.r),429);$vars.rs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(435);this._appendStructure($r1,this._apply($vars.d),437);$r1.value=this._appendStructure($r1,this._apply($vars.r),440);return this._endStructure($r1);}),433);$r0.value=[$vars.f].concat($vars.rs);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(444, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(447);this._appendStructure($r1,this._apply("spaces"),449);this._appendStructure($r1,this.exactly("\'"),451);$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(456);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.exactly("\'"),460);}),458);$r2.value=this._appendStructure($r2,this._apply("char"),462);return this._endStructure($r2);}),454);this._appendStructure($r1,this.exactly("\'"),464);$r1.value=$vars.cs.join("");return this._endStructure($r1);},function(){var $r1=this._startStructure(467);this._appendStructure($r1,this._apply("spaces"),469);this._appendStructure($r1,this.exactly("\""),471);$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(476);this._appendStructure($r2,this._not(function(){return this._forwardStructure(this.exactly("\""),480);}),478);$r2.value=this._appendStructure($r2,this._apply("char"),482);return this._endStructure($r2);}),474);this._appendStructure($r1,this.exactly("\""),484);$r1.value=$vars.cs.join("");return this._endStructure($r1);}),445);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(487, true);this._appendStructure($r0,this._apply("spaces"),489);$vars.f=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(494);this._appendStructure($r1,this._many1(function(){return this._forwardStructure(this._apply("digit"),498);}),496);$r1.value=this._appendStructure($r1,this._opt(function(){var $r2=this._startStructure(502);this._appendStructure($r2,this.exactly("."),504);$r2.value=this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),508);}),506);return this._endStructure($r2);}),500);return this._endStructure($r1);}),492);$r0.value=parseFloat($vars.f);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(511, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),514);},function(){return this._forwardStructure(this.exactly("$"),516);},function(){return this._forwardStructure(this.exactly("_"),518);}),512);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(520, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),523);},function(){return this._forwardStructure(this._apply("digit"),525);}),521);return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(527, true);this._appendStructure($r0,this._apply("spaces"),529);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(533);this._appendStructure($r1,this._apply("nameFirst"),535);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),539);}),537);return this._endStructure($r1);}),531);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(541, true);this._appendStructure($r0,this._applyWithArgs("token","@"),543);$r0.value=this._appendStructure($r0,this._apply("name"),545);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(547, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(550);$vars.x=this._appendStructure($r1,this._apply("expr"),553);this._appendStructure($r1,this._applyWithArgs("token","||"),555);$vars.y=this._appendStructure($r1,this._apply("andExpr"),558);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),561);}),548);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(563, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(566);$vars.x=this._appendStructure($r1,this._apply("andExpr"),569);this._appendStructure($r1,this._applyWithArgs("token","&&"),571);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),574);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),577);}),564);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(579, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(582);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),585);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(589);this._appendStructure($r2,this._applyWithArgs("token","=="),591);$vars.y=this._appendStructure($r2,this._apply("relExpr"),594);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(597);this._appendStructure($r2,this._applyWithArgs("token","!="),599);$vars.y=this._appendStructure($r2,this._apply("relExpr"),602);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(605);this._appendStructure($r2,this._applyWithArgs("token","==="),607);$vars.y=this._appendStructure($r2,this._apply("relExpr"),610);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(613);this._appendStructure($r2,this._applyWithArgs("token","!=="),615);$vars.y=this._appendStructure($r2,this._apply("relExpr"),618);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),587);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),621);}),580);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(623, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(626);$vars.x=this._appendStructure($r1,this._apply("relExpr"),629);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(633);this._appendStructure($r2,this._applyWithArgs("token",">"),635);$vars.y=this._appendStructure($r2,this._apply("addExpr"),638);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(641);this._appendStructure($r2,this._applyWithArgs("token",">="),643);$vars.y=this._appendStructure($r2,this._apply("addExpr"),646);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(649);this._appendStructure($r2,this._applyWithArgs("token","<"),651);$vars.y=this._appendStructure($r2,this._apply("addExpr"),654);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(657);this._appendStructure($r2,this._applyWithArgs("token","<="),659);$vars.y=this._appendStructure($r2,this._apply("addExpr"),662);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);}),631);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),665);}),624);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(667, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(670);$vars.x=this._appendStructure($r1,this._apply("addExpr"),673);this._appendStructure($r1,this._applyWithArgs("token","+"),675);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),678);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(681);$vars.x=this._appendStructure($r1,this._apply("addExpr"),684);this._appendStructure($r1,this._applyWithArgs("token","-"),686);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),689);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),692);}),668);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(694, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(697);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),700);this._appendStructure($r1,this._applyWithArgs("token","*"),702);$vars.y=this._appendStructure($r1,this._apply("unary"),705);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(708);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),711);this._appendStructure($r1,this._applyWithArgs("token","/"),713);$vars.y=this._appendStructure($r1,this._apply("unary"),716);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(719);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),722);this._appendStructure($r1,this._applyWithArgs("token","%"),724);$vars.y=this._appendStructure($r1,this._apply("unary"),727);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),730);}),695);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(732, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(735);this._appendStructure($r1,this._applyWithArgs("token","-"),737);$vars.p=this._appendStructure($r1,this._apply("primExpr"),740);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(743);this._appendStructure($r1,this._applyWithArgs("token","+"),745);$vars.p=this._appendStructure($r1,this._apply("primExpr"),748);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExpr"),751);}),733);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(753, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(756);$vars.p=this._appendStructure($r1,this._apply("primExpr"),759);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(763);this._appendStructure($r2,this._applyWithArgs("token","["),765);$vars.i=this._appendStructure($r2,this._apply("expr"),768);this._appendStructure($r2,this._applyWithArgs("token","]"),770);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(773);this._appendStructure($r2,this._applyWithArgs("token","."),775);$vars.m=this._appendStructure($r2,this._apply("name"),778);this._appendStructure($r2,this._applyWithArgs("token","("),780);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),783);this._appendStructure($r2,this._applyWithArgs("token",")"),787);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(790);this._appendStructure($r2,this._applyWithArgs("token","."),792);$vars.f=this._appendStructure($r2,this._apply("name"),795);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(798);this._appendStructure($r2,this._applyWithArgs("token","("),800);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),803);this._appendStructure($r2,this._applyWithArgs("token",")"),807);$r2.value=["call",$vars.p].concat($vars.as);return this._endStructure($r2);}),761);return this._endStructure($r1);},function(){var $r1=this._startStructure(810);$vars.b=this._appendStructure($r1,this._apply("builtin"),813);this._appendStructure($r1,this._applyWithArgs("token","("),815);$vars.as=this._appendStructure($r1,this._applyWithArgs("listOf","expr",","),818);this._appendStructure($r1,this._applyWithArgs("token",")"),822);$r1.value=["builtin",$vars.b,this._uniqueId($vars.b)].concat($vars.as);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),825);}),754);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(827, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(830);this._appendStructure($r1,this._applyWithArgs("token","("),832);$vars.e=this._appendStructure($r1,this._apply("expr"),835);this._appendStructure($r1,this._applyWithArgs("token",")"),837);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(840);$vars.n=this._appendStructure($r1,this._apply("name"),843);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(846);$vars.n=this._appendStructure($r1,this._apply("number"),849);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(852);$vars.s=this._appendStructure($r1,this._apply("str"),855);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(858);this._appendStructure($r1,this._applyWithArgs("token","["),860);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),863);this._appendStructure($r1,this._applyWithArgs("token","]"),867);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);}),828);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(870, true);this._appendStructure($r0,this._applyWithArgs("token","when"),872);$vars.c=this._appendStructure($r0,this._apply("expr"),875);this._appendStructure($r0,this._applyWithArgs("token","->"),877);$vars.e=this._appendStructure($r0,this._apply("expr"),880);$r0.value=["when",$vars.c,$vars.e];return this._endStructure($r0);},
"condExprs":function(){var $elf=this,$vars={},$r0=this._startStructure(883, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(886);$vars.cs=this._appendStructure($r1,this._applyWithArgs("nonEmptyListOf","condExpr","space"),889);this._appendStructure($r1,this._applyWithArgs("token","else"),893);$vars.e=this._appendStructure($r1,this._apply("expr"),896);$r1.value=["switch"].concat($vars.cs).concat([["else",$vars.e]]);return this._endStructure($r1);},function(){var $r1=this._startStructure(899);$vars.cs=this._appendStructure($r1,this._applyWithArgs("nonEmptyListOf","condExpr","space"),902);$r1.value=["switch"].concat($vars.cs);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("expr"),907);}),884);return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(909, true);$vars.n=this._appendStructure($r0,this._apply("name"),912);this._appendStructure($r0,this._applyWithArgs("token","<-"),914);$vars.e=this._appendStructure($r0,this._apply("condExprs"),917);$r0.value=["propagate",$vars.n,$vars.e,this._extractLocation($r0)];return this._endStructure($r0);},
"grammar":function(){var $elf=this,$vars={},$r0=this._startStructure(920, true);this._appendStructure($r0,this._apply("spaces"),922);$vars.pp=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(927);$vars.p=this._appendStructure($r1,this._apply("propagate"),930);this._appendStructure($r1,this._apply("spaces"),932);$r1.value=$vars.p;return this._endStructure($r1);}),925);$r0.value=["dataflow"].concat($vars.pp);return this._endStructure($r0);}});(DataflowParser["_uniqueId"]=(function (base){if((this["_id"] === undefined)){(this["_id"]=(0));}else{undefined;}(this["_id"]+=(1));return ((base + ":") + this["_id"]);}))
let flatten1=(function (array){if((array["length"] < (1))){return array;}else{undefined;}return array.reduce((function (a,b){return a.concat(b);}));});let _e=(function (node){return node["expr"];});let _n=(function (node){return node["nodes"];});let _i=(function (node){return node["inputs"];});let ExtractExpr=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(937, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(941);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),946));return this._endStructure($r1);}),939);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(950, true);$vars.n=this._getStructureValue(this.anything());$r0.value=["number",$vars.n];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(954, true);$vars.s=this._getStructureValue(this.anything());$r0.value=["string",$vars.s];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(958, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(962, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),967);}),965);$r0.value=["arr"].concat($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(970, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),974);$r0.value=["unop",$vars.op,$vars.x];return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(977, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),980);$vars.x=this._appendStructure($r0,this._apply("trans"),983);$r0.value=["getp",$vars.fd,$vars.x];return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(986, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["get",$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(990, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),994);$vars.y=this._appendStructure($r0,this._apply("trans"),997);$r0.value=["binop",$vars.op,$vars.x,$vars.y];return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1000, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1003);$vars.t=this._appendStructure($r0,this._apply("trans"),1006);$vars.e=this._appendStructure($r0,this._apply("trans"),1009);$r0.value=["condExpr",$vars.cond,$vars.t,$vars.e];return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1012, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1015);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1020);}),1018);$r0.value=["call",$vars.fn].concat($vars.args);return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1023, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1027);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1032);}),1030);$r0.value=["send",$vars.msg,$vars.recv].concat($vars.args);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1035, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1040);}),1038);$r0.value=["json"].concat($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1043, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1047);$r0.value=["binding",$vars.name,$vars.val];return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1050, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1053);$vars.e=this._appendStructure($r0,this._apply("trans"),1056);$r0.value=["when",$vars.c,$vars.e];return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1059, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1062);$r0.value=["else",$vars.e];return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1065, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1070);}),1068);$r0.value=["switch"].concat($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1073, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1080);}),1078);$r0.value=["get",("@" + $vars.id)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1083, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1087);$vars.l=this._getStructureValue(this.anything());$r0.value=["propagate",$vars.name,$vars.x,$vars.l];return this._endStructure($r0);},
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1091, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1096);}),1094);$r0.value=["dataflow"].concat($vars.xs);return this._endStructure($r0);}});let ExtractInputs=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1100, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1104);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1109));return this._endStructure($r1);}),1102);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1113, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1117, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1121, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1125, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1130);}),1128);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1133, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1137);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1140, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1143);$vars.x=this._appendStructure($r0,this._apply("trans"),1146);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1149, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1153, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1157);$vars.y=this._appendStructure($r0,this._apply("trans"),1160);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1163, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1166);$vars.t=this._appendStructure($r0,this._apply("trans"),1169);$vars.e=this._appendStructure($r0,this._apply("trans"),1172);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1175, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1178);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1183);}),1181);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1186, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1190);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1195);}),1193);$r0.value=$vars.recv.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1198, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1203);}),1201);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1206, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1210);$r0.value=$vars.val;return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1213, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1216);$vars.e=this._appendStructure($r0,this._apply("trans"),1219);$r0.value=$vars.c.concat($vars.e);return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1222, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1225);$r0.value=$vars.e;return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1228, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1233);}),1231);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1236, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1243);}),1241);$r0.value=[("@" + $vars.id)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1246, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1250);$vars.l=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1254, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1259);}),1257);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}});let DataflowExtractNodes=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1263, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1267);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1272));return this._endStructure($r1);}),1265);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1276, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1280, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1284, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1288, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1293);}),1291);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1296, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1300);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1303, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1306);$vars.x=this._appendStructure($r0,this._apply("trans"),1309);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1312, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1316, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1320);$vars.y=this._appendStructure($r0,this._apply("trans"),1323);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1326, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1329);$vars.t=this._appendStructure($r0,this._apply("trans"),1332);$vars.e=this._appendStructure($r0,this._apply("trans"),1335);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1338, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1341);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1346);}),1344);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1349, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1353);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1358);}),1356);$r0.value=$vars.recv.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1361, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1366);}),1364);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1369, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1373);$r0.value=$vars.val;return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1376, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1379);$vars.e=this._appendStructure($r0,this._apply("trans"),1382);$r0.value=$vars.c.concat($vars.e);return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1385, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1388);$r0.value=$vars.e;return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1391, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1396);}),1394);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1399, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1406);$vars.a=this._appendStructure($r1,this.anything(),1409);$vars.e=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1412);$vars.n=this._appendStructure($r1,this._applyWithArgs("trans",$vars.a),1417);$vars.i=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1421);$r1.value=({"expr": $vars.e,"nodes": $vars.n,"inputs": $vars.i});return this._endStructure($r1);}),1404);$r0.value=[({"name": ("@" + $vars.id),"expr": $vars.args.map(_e),"inputs": flatten1($vars.args.map(_i)),"builtin": $vars.name})].concat(flatten1($vars.args.map(_n)));return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1427, true);$vars.name=this._getStructureValue(this.anything());$vars.a=this._getStructureValue(this.anything());$vars.i=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1432);$vars.e=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1437);$vars.nodes=this._appendStructure($r0,this._applyWithArgs("trans",$vars.a),1442);$vars.l=this._getStructureValue(this.anything());$r0.value=[({"name": $vars.name,"expr": $vars.e,"inputs": $vars.i})].concat($vars.nodes);return this._endStructure($r0);},
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1447, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1452);}),1450);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}})
let JSParser=objectThatDelegatesTo(BaseStrParser,{
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(1456, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),1459);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","//","\n"),1461);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","/*","*/"),1465);}),1457);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(1469, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),1472);},function(){return this._forwardStructure(this.exactly("$"),1474);},function(){return this._forwardStructure(this.exactly("_"),1476);}),1470);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1478, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),1481);},function(){return this._forwardStructure(this._apply("digit"),1483);}),1479);return this._endStructure($r0);},
"iName":function(){var $elf=this,$vars={},$r0=this._startStructure(1485, true);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1488);this._appendStructure($r1,this._apply("nameFirst"),1490);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),1494);}),1492);return this._endStructure($r1);}),1486);return this._endStructure($r0);},
"isKeyword":function(){var $elf=this,$vars={},$r0=this._startStructure(1496, true);$vars.x=this._getStructureValue(this.anything());$r0.value=this._pred(JSParser._isKeyword($vars.x));return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1501, true);$vars.n=this._appendStructure($r0,this._apply("iName"),1504);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),1508);}),1506);$r0.value=["name",(($vars.n == "self")?"$elf":$vars.n)];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(1512, true);$vars.k=this._appendStructure($r0,this._apply("iName"),1515);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),1517);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(1521, true);$vars.x=this._appendStructure($r0,this._apply("char"),1524);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(1531, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1534);$vars.n=this._appendStructure($r1,this._apply("hexLit"),1537);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),1540);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),1543);}),1532);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1545, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1548);this._appendStructure($r1,this.exactly("0"),1549);this._appendStructure($r1,this.exactly("x"),1549);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),1551);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1554);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(1559);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),1563);}),1561);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(1567);this._appendStructure($r3,this.exactly("."),1569);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),1573);}),1571);return this._endStructure($r3);}),1565);return this._endStructure($r2);}),1557);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),1546);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1576, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1581);this._appendStructure($r1,this.exactly("\\"),1583);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1587);this._appendStructure($r2,this.exactly("u"),1589);this._appendStructure($r2,this._apply("hexDigit"),1591);this._appendStructure($r2,this._apply("hexDigit"),1593);this._appendStructure($r2,this._apply("hexDigit"),1595);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),1597);return this._endStructure($r2);},function(){var $r2=this._startStructure(1599);this._appendStructure($r2,this.exactly("x"),1601);this._appendStructure($r2,this._apply("hexDigit"),1603);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),1605);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),1607);}),1585);return this._endStructure($r1);}),1579);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(1610, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1613);this._appendStructure($r1,this.exactly("\""),1614);this._appendStructure($r1,this.exactly("\""),1614);this._appendStructure($r1,this.exactly("\""),1614);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1618);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(1622);this._appendStructure($r3,this.exactly("\""),1623);this._appendStructure($r3,this.exactly("\""),1623);this._appendStructure($r3,this.exactly("\""),1623);$r3.value="\"\"\"";return this._endStructure($r3);}),1620);$r2.value=this._appendStructure($r2,this._apply("char"),1624);return this._endStructure($r2);}),1616);this._appendStructure($r1,this.exactly("\""),1614);this._appendStructure($r1,this.exactly("\""),1614);this._appendStructure($r1,this.exactly("\""),1614);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1627);this._appendStructure($r1,this.exactly("\'"),1629);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),1636);},function(){var $r3=this._startStructure(1638);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),1642);}),1640);$r3.value=this._appendStructure($r3,this._apply("char"),1644);return this._endStructure($r3);}),1634);}),1632);this._appendStructure($r1,this.exactly("\'"),1646);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1649);this._appendStructure($r1,this.exactly("\""),1651);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),1658);},function(){var $r3=this._startStructure(1660);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),1664);}),1662);$r3.value=this._appendStructure($r3,this._apply("char"),1666);return this._endStructure($r3);}),1656);}),1654);this._appendStructure($r1,this.exactly("\""),1668);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1671);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),1675);},function(){return this._forwardStructure(this.exactly("`"),1677);}),1673);$vars.n=this._appendStructure($r1,this._apply("iName"),1680);$r1.value=["string",$vars.n];return this._endStructure($r1);}),1611);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(1683, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),1688);},function(){return this._forwardStructure(this.exactly(")"),1690);},function(){return this._forwardStructure(this.exactly("{"),1692);},function(){return this._forwardStructure(this.exactly("}"),1694);},function(){return this._forwardStructure(this.exactly("["),1696);},function(){return this._forwardStructure(this.exactly("]"),1698);},function(){return this._forwardStructure(this.exactly(","),1700);},function(){return this._forwardStructure(this.exactly(";"),1702);},function(){return this._forwardStructure(this.exactly("?"),1704);},function(){return this._forwardStructure(this.exactly(":"),1706);},function(){var $r1=this._startStructure(1708);this._appendStructure($r1,this.exactly("!"),1709);this._appendStructure($r1,this.exactly("="),1709);this._appendStructure($r1,this.exactly("="),1709);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(1710);this._appendStructure($r1,this.exactly("!"),1711);this._appendStructure($r1,this.exactly("="),1711);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1712);this._appendStructure($r1,this.exactly("="),1713);this._appendStructure($r1,this.exactly("="),1713);this._appendStructure($r1,this.exactly("="),1713);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(1714);this._appendStructure($r1,this.exactly("="),1715);this._appendStructure($r1,this.exactly("="),1715);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(1716);this._appendStructure($r1,this.exactly("="),1717);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1718);this._appendStructure($r1,this.exactly(">"),1719);this._appendStructure($r1,this.exactly("="),1719);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),1720);},function(){var $r1=this._startStructure(1722);this._appendStructure($r1,this.exactly("<"),1723);this._appendStructure($r1,this.exactly("="),1723);$r1.value="<=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),1724);},function(){var $r1=this._startStructure(1726);this._appendStructure($r1,this.exactly("+"),1727);this._appendStructure($r1,this.exactly("+"),1727);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(1728);this._appendStructure($r1,this.exactly("+"),1729);this._appendStructure($r1,this.exactly("="),1729);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),1730);},function(){var $r1=this._startStructure(1732);this._appendStructure($r1,this.exactly("-"),1733);this._appendStructure($r1,this.exactly("-"),1733);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(1734);this._appendStructure($r1,this.exactly("-"),1735);this._appendStructure($r1,this.exactly("="),1735);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),1736);},function(){var $r1=this._startStructure(1738);this._appendStructure($r1,this.exactly("*"),1739);this._appendStructure($r1,this.exactly("="),1739);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),1740);},function(){var $r1=this._startStructure(1742);this._appendStructure($r1,this.exactly("/"),1743);this._appendStructure($r1,this.exactly("="),1743);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),1744);},function(){var $r1=this._startStructure(1746);this._appendStructure($r1,this.exactly("%"),1747);this._appendStructure($r1,this.exactly("="),1747);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),1748);},function(){var $r1=this._startStructure(1750);this._appendStructure($r1,this.exactly("&"),1751);this._appendStructure($r1,this.exactly("&"),1751);this._appendStructure($r1,this.exactly("="),1751);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1752);this._appendStructure($r1,this.exactly("&"),1753);this._appendStructure($r1,this.exactly("&"),1753);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(1754);this._appendStructure($r1,this.exactly("|"),1755);this._appendStructure($r1,this.exactly("|"),1755);this._appendStructure($r1,this.exactly("="),1755);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1756);this._appendStructure($r1,this.exactly("|"),1757);this._appendStructure($r1,this.exactly("|"),1757);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),1758);},function(){return this._forwardStructure(this.exactly("!"),1760);}),1686);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(1763, true);this._appendStructure($r0,this._apply("spaces"),1765);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),1769);},function(){return this._forwardStructure(this._apply("keyword"),1771);},function(){return this._forwardStructure(this._apply("number"),1773);},function(){return this._forwardStructure(this._apply("str"),1775);},function(){return this._forwardStructure(this._apply("special"),1777);}),1767);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(1779, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),1784);}),1782);this._appendStructure($r0,this._apply("spaces"),1786);this._appendStructure($r0,this.end(),1788);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(1791, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),1795);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(1800, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1803);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),1807);}),1805);$r1.value=this._appendStructure($r1,this._apply("space"),1809);return this._endStructure($r1);}),1801);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(1811, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),1814);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1818);this._appendStructure($r1,this._applyWithArgs("token","?"),1820);$vars.t=this._appendStructure($r1,this._apply("expr"),1823);this._appendStructure($r1,this._applyWithArgs("token",":"),1825);$vars.f=this._appendStructure($r1,this._apply("expr"),1828);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1831);this._appendStructure($r1,this._applyWithArgs("token","="),1833);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1836);$r1.value=["set",$vars.e,$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1839);this._appendStructure($r1,this._applyWithArgs("token","+="),1841);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1844);$r1.value=["mset",$vars.e,"+",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1847);this._appendStructure($r1,this._applyWithArgs("token","-="),1849);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1852);$r1.value=["mset",$vars.e,"-",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1855);this._appendStructure($r1,this._applyWithArgs("token","*="),1857);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1860);$r1.value=["mset",$vars.e,"*",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1863);this._appendStructure($r1,this._applyWithArgs("token","/="),1865);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1868);$r1.value=["mset",$vars.e,"/",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1871);this._appendStructure($r1,this._applyWithArgs("token","%="),1873);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1876);$r1.value=["mset",$vars.e,"%",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1879);this._appendStructure($r1,this._applyWithArgs("token","&&="),1881);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1884);$r1.value=["mset",$vars.e,"&&",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1887);this._appendStructure($r1,this._applyWithArgs("token","||="),1889);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1892);$r1.value=["mset",$vars.e,"||",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1895);this._appendStructure($r1,this._apply("empty"),1897);$r1.value=$vars.e;return this._endStructure($r1);}),1816);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1900, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1903);$vars.x=this._appendStructure($r1,this._apply("orExpr"),1906);this._appendStructure($r1,this._applyWithArgs("token","||"),1908);$vars.y=this._appendStructure($r1,this._apply("andExpr"),1911);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),1914);}),1901);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1916, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1919);$vars.x=this._appendStructure($r1,this._apply("andExpr"),1922);this._appendStructure($r1,this._applyWithArgs("token","&&"),1924);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),1927);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),1930);}),1917);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1932, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1935);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),1938);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1942);this._appendStructure($r2,this._applyWithArgs("token","=="),1944);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1947);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1950);this._appendStructure($r2,this._applyWithArgs("token","!="),1952);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1955);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1958);this._appendStructure($r2,this._applyWithArgs("token","==="),1960);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1963);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1966);this._appendStructure($r2,this._applyWithArgs("token","!=="),1968);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1971);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),1940);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),1974);}),1933);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1976, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1979);$vars.x=this._appendStructure($r1,this._apply("relExpr"),1982);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1986);this._appendStructure($r2,this._applyWithArgs("token",">"),1988);$vars.y=this._appendStructure($r2,this._apply("addExpr"),1991);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1994);this._appendStructure($r2,this._applyWithArgs("token",">="),1996);$vars.y=this._appendStructure($r2,this._apply("addExpr"),1999);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2002);this._appendStructure($r2,this._applyWithArgs("token","<"),2004);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2007);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2010);this._appendStructure($r2,this._applyWithArgs("token","<="),2012);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2015);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2018);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),2020);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2023);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),1984);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),2026);}),1977);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2028, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2031);$vars.x=this._appendStructure($r1,this._apply("addExpr"),2034);this._appendStructure($r1,this._applyWithArgs("token","+"),2036);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),2039);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2042);$vars.x=this._appendStructure($r1,this._apply("addExpr"),2045);this._appendStructure($r1,this._applyWithArgs("token","-"),2047);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),2050);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),2053);}),2029);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2055, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2058);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2061);this._appendStructure($r1,this._applyWithArgs("token","*"),2063);$vars.y=this._appendStructure($r1,this._apply("unary"),2066);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2069);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2072);this._appendStructure($r1,this._applyWithArgs("token","/"),2074);$vars.y=this._appendStructure($r1,this._apply("unary"),2077);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2080);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2083);this._appendStructure($r1,this._applyWithArgs("token","%"),2085);$vars.y=this._appendStructure($r1,this._apply("unary"),2088);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),2091);}),2056);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(2093, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2096);this._appendStructure($r1,this._applyWithArgs("token","-"),2098);$vars.p=this._appendStructure($r1,this._apply("postfix"),2101);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2104);this._appendStructure($r1,this._applyWithArgs("token","+"),2106);$vars.p=this._appendStructure($r1,this._apply("postfix"),2109);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2112);this._appendStructure($r1,this._applyWithArgs("token","++"),2114);$vars.p=this._appendStructure($r1,this._apply("postfix"),2117);$r1.value=["preop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2120);this._appendStructure($r1,this._applyWithArgs("token","--"),2122);$vars.p=this._appendStructure($r1,this._apply("postfix"),2125);$r1.value=["preop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2128);this._appendStructure($r1,this._applyWithArgs("token","!"),2130);$vars.p=this._appendStructure($r1,this._apply("unary"),2133);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2136);this._appendStructure($r1,this._applyWithArgs("token","void"),2138);$vars.p=this._appendStructure($r1,this._apply("unary"),2141);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2144);this._appendStructure($r1,this._applyWithArgs("token","delete"),2146);$vars.p=this._appendStructure($r1,this._apply("unary"),2149);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2152);this._appendStructure($r1,this._applyWithArgs("token","typeof"),2154);$vars.p=this._appendStructure($r1,this._apply("unary"),2157);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),2160);}),2094);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(2162, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),2165);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2169);this._appendStructure($r1,this._apply("spacesNoNl"),2171);this._appendStructure($r1,this._applyWithArgs("token","++"),2173);$r1.value=["postop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2176);this._appendStructure($r1,this._apply("spacesNoNl"),2178);this._appendStructure($r1,this._applyWithArgs("token","--"),2180);$r1.value=["postop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2183);this._appendStructure($r1,this._apply("empty"),2185);$r1.value=$vars.p;return this._endStructure($r1);}),2167);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2188, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2191);$vars.p=this._appendStructure($r1,this._apply("primExpr"),2194);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2198);this._appendStructure($r2,this._applyWithArgs("token","["),2200);$vars.i=this._appendStructure($r2,this._apply("expr"),2203);this._appendStructure($r2,this._applyWithArgs("token","]"),2205);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(2208);this._appendStructure($r2,this._applyWithArgs("token","."),2210);$vars.m=this._appendStructure($r2,this._applyWithArgs("token","name"),2213);this._appendStructure($r2,this._applyWithArgs("token","("),2215);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),2218);this._appendStructure($r2,this._applyWithArgs("token",")"),2222);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(2225);this._appendStructure($r2,this._applyWithArgs("token","."),2227);$vars.f=this._appendStructure($r2,this._applyWithArgs("token","name"),2230);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(2233);this._appendStructure($r2,this._applyWithArgs("token","("),2235);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),2238);this._appendStructure($r2,this._applyWithArgs("token",")"),2242);$r2.value=["call",$vars.p].concat($vars.as);return this._endStructure($r2);}),2196);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),2245);}),2189);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(2247, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2250);this._appendStructure($r1,this._applyWithArgs("token","("),2252);$vars.e=this._appendStructure($r1,this._apply("expr"),2255);this._appendStructure($r1,this._applyWithArgs("token",")"),2257);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2260);this._appendStructure($r1,this._applyWithArgs("token","this"),2262);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2265);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2268);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2271);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),2274);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2277);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),2280);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2283);this._appendStructure($r1,this._applyWithArgs("token","function"),2285);$r1.value=this._appendStructure($r1,this._apply("funcRest"),2287);return this._endStructure($r1);},function(){var $r1=this._startStructure(2289);this._appendStructure($r1,this._applyWithArgs("token","new"),2291);$vars.e=this._appendStructure($r1,this._apply("primExpr"),2294);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2297);this._appendStructure($r1,this._applyWithArgs("token","["),2299);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),2302);this._appendStructure($r1,this._applyWithArgs("token","]"),2306);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),2309);},function(){return this._forwardStructure(this._apply("re"),2311);}),2248);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(2313, true);this._appendStructure($r0,this._applyWithArgs("token","{"),2315);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),2318);this._appendStructure($r0,this._applyWithArgs("token","}"),2322);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(2325, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),2328);this._appendStructure($r0,this._applyWithArgs("token",":"),2330);$vars.v=this._appendStructure($r0,this._apply("expr"),2333);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(2336, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),2339);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),2341);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),2343);}),2337);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(2345, true);this._appendStructure($r0,this._apply("spaces"),2347);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(2352);this._appendStructure($r1,this.exactly("/"),2354);this._appendStructure($r1,this._apply("reBody"),2356);this._appendStructure($r1,this.exactly("/"),2358);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),2362);}),2360);return this._endStructure($r1);}),2350);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(2365, true);this._appendStructure($r0,this._apply("re1stChar"),2367);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),2371);}),2369);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2373, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2376);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),2382);},function(){return this._forwardStructure(this.exactly("\\"),2384);},function(){return this._forwardStructure(this.exactly("/"),2386);},function(){return this._forwardStructure(this.exactly("["),2388);}),2380);}),2378);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),2390);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),2392);},function(){return this._forwardStructure(this._apply("reClass"),2394);}),2374);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2396, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),2399);},function(){return this._forwardStructure(this.exactly("*"),2401);}),2397);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(2403, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),2409);},function(){return this._forwardStructure(this.exactly("\r"),2411);}),2407);}),2405);$r0.value=this._appendStructure($r0,this._apply("char"),2413);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(2415, true);this._appendStructure($r0,this.exactly("["),2417);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),2421);}),2419);$r0.value=this._appendStructure($r0,this.exactly("]"),2423);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2425, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),2431);},function(){return this._forwardStructure(this.exactly("]"),2433);}),2429);}),2427);$r0.value=this._appendStructure($r0,this._apply("reChar"),2435);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(2437, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),2438);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(2440, true);this._appendStructure($r0,this._apply("spaces"),2442);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),2444);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(2446, true);this._appendStructure($r0,this._applyWithArgs("token","("),2448);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),2451);this._appendStructure($r0,this._applyWithArgs("token",")"),2455);this._appendStructure($r0,this._applyWithArgs("token","{"),2457);$vars.body=this._appendStructure($r0,this._apply("srcElems"),2460);this._appendStructure($r0,this._applyWithArgs("token","}"),2462);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(2465, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2468);this._appendStructure($r1,this._apply("spacesNoNl"),2470);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),2474);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),2478);}),2476);},function(){return this._forwardStructure(this.end(),2480);}),2472);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),2482);}),2466);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(2484, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),2487);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),2489);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),2491);}),2485);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(2493, true);$vars.assign=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2498);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2501);$r1.value=["assignVar",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2504);this._appendStructure($r1,this._applyWithArgs("token","["),2506);$vars.ns=this._appendStructure($r1,this._applyWithArgs("enum","formal",","),2509);this._appendStructure($r1,this._applyWithArgs("token","]"),2513);$r1.value=["assignDesctruct",$vars.ns];return this._endStructure($r1);}),2496);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2519);this._appendStructure($r1,this._applyWithArgs("token","="),2521);$vars.e=this._appendStructure($r1,this._apply("expr"),2524);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2527);this._appendStructure($r1,this._apply("empty"),2529);$r1.value=["get","undefined"];return this._endStructure($r1);}),2517);$r0.value=$vars.assign.concat([$vars.v]);return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(2533, true);this._appendStructure($r0,this._applyWithArgs("token","{"),2535);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),2538);this._appendStructure($r0,this._applyWithArgs("token","}"),2540);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(2543, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),2546);},function(){var $r1=this._startStructure(2548);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),2551);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),2554);this._appendStructure($r1,this._apply("sc"),2558);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(2561);this._appendStructure($r1,this._applyWithArgs("token","if"),2563);this._appendStructure($r1,this._applyWithArgs("token","("),2565);$vars.c=this._appendStructure($r1,this._apply("expr"),2568);this._appendStructure($r1,this._applyWithArgs("token",")"),2570);$vars.t=this._appendStructure($r1,this._apply("stmt"),2573);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2578);this._appendStructure($r2,this._applyWithArgs("token","else"),2580);$r2.value=this._appendStructure($r2,this._apply("stmt"),2582);return this._endStructure($r2);},function(){var $r2=this._startStructure(2584);this._appendStructure($r2,this._apply("empty"),2586);$r2.value=["get","undefined"];return this._endStructure($r2);}),2576);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(2590);this._appendStructure($r1,this._applyWithArgs("token","while"),2592);this._appendStructure($r1,this._applyWithArgs("token","("),2594);$vars.c=this._appendStructure($r1,this._apply("expr"),2597);this._appendStructure($r1,this._applyWithArgs("token",")"),2599);$vars.s=this._appendStructure($r1,this._apply("stmt"),2602);$r1.value=["while",$vars.c,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2605);this._appendStructure($r1,this._applyWithArgs("token","do"),2607);$vars.s=this._appendStructure($r1,this._apply("stmt"),2610);this._appendStructure($r1,this._applyWithArgs("token","while"),2612);this._appendStructure($r1,this._applyWithArgs("token","("),2614);$vars.c=this._appendStructure($r1,this._apply("expr"),2617);this._appendStructure($r1,this._applyWithArgs("token",")"),2619);this._appendStructure($r1,this._apply("sc"),2621);$r1.value=["doWhile",$vars.s,$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(2624);this._appendStructure($r1,this._applyWithArgs("token","for"),2626);this._appendStructure($r1,this._applyWithArgs("token","("),2628);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2633);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),2636);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),2639);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),2644);},function(){var $r2=this._startStructure(2646);this._appendStructure($r2,this._apply("empty"),2648);$r2.value=["get","undefined"];return this._endStructure($r2);}),2631);this._appendStructure($r1,this._applyWithArgs("token",";"),2651);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2656);},function(){var $r2=this._startStructure(2658);this._appendStructure($r2,this._apply("empty"),2660);$r2.value=["get","true"];return this._endStructure($r2);}),2654);this._appendStructure($r1,this._applyWithArgs("token",";"),2663);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2668);},function(){var $r2=this._startStructure(2670);this._appendStructure($r2,this._apply("empty"),2672);$r2.value=["get","undefined"];return this._endStructure($r2);}),2666);this._appendStructure($r1,this._applyWithArgs("token",")"),2675);$vars.s=this._appendStructure($r1,this._apply("stmt"),2678);$r1.value=["for",$vars.i,$vars.c,$vars.u,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2681);this._appendStructure($r1,this._applyWithArgs("token","for"),2683);this._appendStructure($r1,this._applyWithArgs("token","("),2685);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2690);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),2693);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),2696);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),2699);}),2688);this._appendStructure($r1,this._applyWithArgs("token","in"),2701);$vars.e=this._appendStructure($r1,this._apply("expr"),2704);this._appendStructure($r1,this._applyWithArgs("token",")"),2706);$vars.s=this._appendStructure($r1,this._apply("stmt"),2709);$r1.value=["forIn",$vars.v,$vars.e,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2712);this._appendStructure($r1,this._applyWithArgs("token","switch"),2714);this._appendStructure($r1,this._applyWithArgs("token","("),2716);$vars.e=this._appendStructure($r1,this._apply("expr"),2719);this._appendStructure($r1,this._applyWithArgs("token",")"),2721);this._appendStructure($r1,this._applyWithArgs("token","{"),2723);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(2730);this._appendStructure($r3,this._applyWithArgs("token","case"),2732);$vars.c=this._appendStructure($r3,this._apply("expr"),2735);this._appendStructure($r3,this._applyWithArgs("token",":"),2737);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),2740);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(2743);this._appendStructure($r3,this._applyWithArgs("token","default"),2745);this._appendStructure($r3,this._applyWithArgs("token",":"),2747);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),2750);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),2728);}),2726);this._appendStructure($r1,this._applyWithArgs("token","}"),2753);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(2756);this._appendStructure($r1,this._applyWithArgs("token","break"),2758);this._appendStructure($r1,this._apply("sc"),2760);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2763);this._appendStructure($r1,this._applyWithArgs("token","continue"),2765);this._appendStructure($r1,this._apply("sc"),2767);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2770);this._appendStructure($r1,this._applyWithArgs("token","throw"),2772);this._appendStructure($r1,this._apply("spacesNoNl"),2774);$vars.e=this._appendStructure($r1,this._apply("expr"),2777);this._appendStructure($r1,this._apply("sc"),2779);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2782);this._appendStructure($r1,this._applyWithArgs("token","try"),2784);$vars.t=this._appendStructure($r1,this._apply("block"),2787);this._appendStructure($r1,this._applyWithArgs("token","catch"),2789);this._appendStructure($r1,this._applyWithArgs("token","("),2791);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),2794);this._appendStructure($r1,this._applyWithArgs("token",")"),2796);$vars.c=this._appendStructure($r1,this._apply("block"),2799);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2804);this._appendStructure($r2,this._applyWithArgs("token","finally"),2806);$r2.value=this._appendStructure($r2,this._apply("block"),2808);return this._endStructure($r2);},function(){var $r2=this._startStructure(2810);this._appendStructure($r2,this._apply("empty"),2812);$r2.value=["get","undefined"];return this._endStructure($r2);}),2802);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(2816);this._appendStructure($r1,this._applyWithArgs("token","return"),2818);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2823);},function(){var $r2=this._startStructure(2825);this._appendStructure($r2,this._apply("empty"),2827);$r2.value=["get","undefined"];return this._endStructure($r2);}),2821);this._appendStructure($r1,this._apply("sc"),2830);$r1.value=["return",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2833);this._appendStructure($r1,this._applyWithArgs("token","with"),2835);this._appendStructure($r1,this._applyWithArgs("token","("),2837);$vars.x=this._appendStructure($r1,this._apply("expr"),2840);this._appendStructure($r1,this._applyWithArgs("token",")"),2842);$vars.s=this._appendStructure($r1,this._apply("stmt"),2845);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2848);$vars.e=this._appendStructure($r1,this._apply("expr"),2851);this._appendStructure($r1,this._apply("sc"),2853);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2856);this._appendStructure($r1,this._applyWithArgs("token",";"),2858);$r1.value=["get","undefined"];return this._endStructure($r1);}),2544);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(2861, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2864);this._appendStructure($r1,this._applyWithArgs("token","function"),2866);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2869);$vars.f=this._appendStructure($r1,this._apply("funcRest"),2872);$r1.value=["assignVar",$vars.n,$vars.f];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),2875);}),2862);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(2877, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),2882);}),2880);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"grammar":function(){var $elf=this,$vars={},$r0=this._startStructure(2885, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),2888);this._appendStructure($r0,this._apply("spaces"),2890);this._appendStructure($r0,this.end(),2892);$r0.value=$vars.r;return this._endStructure($r0);}});(JSParser["hexDigits"]="0123456789abcdef");(JSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","dataflow","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(JSParser["keywords"][keywords[idx]]=true);}(JSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}));let JSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(2896, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(2900);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),2905));return this._endStructure($r1);}),2898);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(2909, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2912);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(2916);this._appendStructure($r2,this.exactly("begin"),2918);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),2922));return this._endStructure($r2);}),2914);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(2925);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(2929);this._appendStructure($r2,this.exactly("begin"),2931);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),2937);}),2935));return this._endStructure($r2);}),2927);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(2940);$vars.r=this._appendStructure($r1,this._apply("trans"),2943);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),2910);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(2946, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(2948, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(2950, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(2952, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(2956, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(2960, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2964, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(2968, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2973);}),2971);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(2976, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),2980);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(2983, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),2986);$vars.x=this._appendStructure($r0,this._apply("trans"),2989);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(2992, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(2996, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),2999);$vars.rhs=this._appendStructure($r0,this._apply("trans"),3002);$r0.value=(((("(" + $vars.lhs) + "=") + $vars.rhs) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(3005, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),3008);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),3012);$r0.value=((((("(" + $vars.lhs) + $vars.op) + "=") + $vars.rhs) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(3015, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3019);$vars.y=this._appendStructure($r0,this._apply("trans"),3022);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(3025, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3029);$r0.value=($vars.op + $vars.x);return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(3032, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3036);$r0.value=($vars.x + $vars.op);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(3039, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3042);$r0.value=("return " + $vars.x);return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(3045, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3048);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),3051);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(3054, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3057);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),3060);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),3063);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(3066, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3069);$vars.t=this._appendStructure($r0,this._apply("trans"),3072);$vars.e=this._appendStructure($r0,this._apply("trans"),3075);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(3078, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3081);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3084);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(3087, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3090);$vars.cond=this._appendStructure($r0,this._apply("trans"),3093);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(3096, true);$vars.init=this._appendStructure($r0,this._apply("trans"),3099);$vars.cond=this._appendStructure($r0,this._apply("trans"),3102);$vars.upd=this._appendStructure($r0,this._apply("trans"),3105);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3108);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(3111, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3114);$vars.arr=this._appendStructure($r0,this._apply("trans"),3117);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3120);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(3123, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(3128);$vars.x=this._appendStructure($r1,this._apply("trans"),3131);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(3135);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(3138);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),3141);}),3137);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(3144);this._appendStructure($r2,this._apply("empty"),3146);$r2.value=($vars.x + ";");return this._endStructure($r2);}),3133);return this._endStructure($r1);}),3126);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(3150, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(3153);$vars.x=this._appendStructure($r1,this._apply("trans"),3156);this._appendStructure($r1,this.end(),3158);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(3161);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(3166);$vars.x=this._appendStructure($r2,this._apply("trans"),3169);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(3173);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(3176);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),3179);}),3175);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(3182);this._appendStructure($r3,this._apply("empty"),3184);$r3.value=($vars.x + ";");return this._endStructure($r3);}),3171);return this._endStructure($r2);}),3164);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),3151);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(3188, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(3191);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),3195);this._appendStructure($r1,this.end(),3197);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(3200);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(3205);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),3208));return this._endStructure($r2);}),3204);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),3189);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(3211, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3215);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(3218, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),3221);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3226);}),3224);$r0.value=((($vars.fn + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(3229, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),3233);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3238);}),3236);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(3241, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3244);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignDesctruct":function(){var $elf=this,$vars={},$r0=this._startStructure(3247, true);$vars.names=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3251);$r0.value=this.genDescructAssign($vars.names,$vars.val);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(3254, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3258);$r0.value=(($vars.name + "=") + $vars.val);return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(3261, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(3265, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3268);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(3271, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),3274);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),3278);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),3281);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(3284, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3289);}),3287);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(3292, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3296);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(3299, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3302);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3307);}),3305);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(3310, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3313);$vars.y=this._appendStructure($r0,this._apply("trans"),3316);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(3319, true);$vars.y=this._appendStructure($r0,this._apply("trans"),3322);$r0.value=("default: " + $vars.y);return this._endStructure($r0);}});(JSTranslator["genDestructId"]=(function (){if((this["_desctructId"] === undefined)){(this["_desctructId"]=(0));}else{undefined;}return this["_desctructId"]++;}));(JSTranslator["genDescructAssign"]=(function (names,value){let tmpName=("$_desc" + this.genDestructId());let ret=((tmpName + "=") + value);for(let i=(0);(i < names["length"]);i++){(ret+=(((((("," + names[i]) + "=") + tmpName) + "[") + i) + "]"));}return ret;}))
let JSDataflowParser=objectThatDelegatesTo(JSParser,{
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(3326, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(3329);this._appendStructure($r1,this._applyWithArgs("token","dataflow"),3331);this._appendStructure($r1,this._applyWithArgs("token","{"),3333);$vars.r=this._appendStructure($r1,this._applyWithArgs("foreign",DataflowParser,"grammar"),3336);this._appendStructure($r1,this._applyWithArgs("token","}"),3339);$r1.value=["jsdataflow",$vars.r];return this._endStructure($r1);},function(){return this._forwardStructure(JSParser._superApplyWithArgs(this,"primExprHd"),3342);}),3327);return this._endStructure($r0);}});let JSDataflowTranslator=objectThatDelegatesTo(JSTranslator,{
"jsdataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(3345, true);$vars.d=this._getStructureValue(this.anything());$vars.ns=this._appendStructure($r0,this._applyWithArgs("foreign",DataflowExtractNodes,"trans",$vars.d),3349);$vars.t=this._appendStructure($r0,this._applyWithArgs("foreign",DataflowJsGen,"Dataflow",[$vars.ns.map((function (e){return e["name"];})),$vars.ns]),3354);$r0.value=["new imports.JsDataflowRuntime.Dataflow({ input:",$vars.t,", debug: false",", eval: function(code) { return eval(code); } })"].join("");return this._endStructure($r0);}})

