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
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(386, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(389);$r1.value=($vars.ns=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("node"),396);},function(){return this._forwardStructure(this._apply("builtin"),398);}),394);}),392));return this._endStructure($r1);}),388);$r0.value=(("[" + $vars.ns.join(",\n")) + "]");return this._endStructure($r0);},
"Program":function(){var $elf=this,$vars={},$r0=this._startStructure(401, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(405);$vars.nodes=this._getStructureValue(this.anything());this.setInput($vars.nodes);$r1.value=($vars.p=this._appendStructure($r1,this._apply("program"),411));return this._endStructure($r1);}),403);$r0.value=$vars.p;return this._endStructure($r0);}});(DataflowJsGen["_toItemString"]=(function (inputs){let items=({});for(let i=(0);(i < inputs["length"]);i++){if(this._isInput(inputs[i])){(items[inputs[i]]=true);}else{undefined;};}let s="[";for(let i in items){(s+=(i.toProgramString() + ","));}(s+="]");return s;}));(DataflowJsGen["_isInput"]=(function (name){return (this["_inputs"] && (this["_inputs"][name] === true));}));(DataflowJsGen["setInput"]=(function (inputs){(this["_inputs"]=({}));for(let i=(0);(i < inputs["length"]);i++){(this["_inputs"][inputs[i]]=true);};}))
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
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(920, true);this._appendStructure($r0,this._apply("spaces"),922);$vars.pp=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(927);$vars.p=this._appendStructure($r1,this._apply("propagate"),930);this._appendStructure($r1,this._apply("spaces"),932);$r1.value=$vars.p;return this._endStructure($r1);}),925);this._appendStructure($r0,this.end(),935);$r0.value=["program"].concat($vars.pp);return this._endStructure($r0);}});(DataflowParser["_uniqueId"]=(function (base){if((this["_id"] === undefined)){(this["_id"]=(0));}else{undefined;}(this["_id"]+=(1));return ((base + ":") + this["_id"]);}))
let flatten1=(function (array){if((array["length"] < (1))){return array;}else{undefined;}return array.reduce((function (a,b){return a.concat(b);}));});let _e=(function (node){return node["expr"];});let _n=(function (node){return node["nodes"];});let _i=(function (node){return node["inputs"];});let ExtractExpr=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(939, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(943);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),948));return this._endStructure($r1);}),941);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(952, true);$vars.n=this._getStructureValue(this.anything());$r0.value=["number",$vars.n];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(956, true);$vars.s=this._getStructureValue(this.anything());$r0.value=["string",$vars.s];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(960, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(964, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),969);}),967);$r0.value=["arr"].concat($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(972, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),976);$r0.value=["unop",$vars.op,$vars.x];return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(979, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),982);$vars.x=this._appendStructure($r0,this._apply("trans"),985);$r0.value=["getp",$vars.fd,$vars.x];return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(988, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["get",$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(992, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),996);$vars.y=this._appendStructure($r0,this._apply("trans"),999);$r0.value=["binop",$vars.op,$vars.x,$vars.y];return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1002, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1005);$vars.t=this._appendStructure($r0,this._apply("trans"),1008);$vars.e=this._appendStructure($r0,this._apply("trans"),1011);$r0.value=["condExpr",$vars.cond,$vars.t,$vars.e];return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1014, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1017);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1022);}),1020);$r0.value=["call",$vars.fn].concat($vars.args);return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1025, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1029);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1034);}),1032);$r0.value=["send",$vars.msg,$vars.recv].concat($vars.args);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1037, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1042);}),1040);$r0.value=["json"].concat($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1045, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1049);$r0.value=["binding",$vars.name,$vars.val];return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1052, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1055);$vars.e=this._appendStructure($r0,this._apply("trans"),1058);$r0.value=["when",$vars.c,$vars.e];return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1061, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1064);$r0.value=["else",$vars.e];return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1067, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1072);}),1070);$r0.value=["switch"].concat($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1075, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1082);}),1080);$r0.value=["get",("@" + $vars.id)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1085, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1089);$vars.l=this._getStructureValue(this.anything());$r0.value=["propagate",$vars.name,$vars.x,$vars.l];return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(1093, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1098);}),1096);$r0.value=["program"].concat($vars.xs);return this._endStructure($r0);}});let ExtractInputs=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1102, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1106);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1111));return this._endStructure($r1);}),1104);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1115, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1119, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1123, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1127, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1132);}),1130);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1135, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1139);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1142, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1145);$vars.x=this._appendStructure($r0,this._apply("trans"),1148);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1151, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1155, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1159);$vars.y=this._appendStructure($r0,this._apply("trans"),1162);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1165, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1168);$vars.t=this._appendStructure($r0,this._apply("trans"),1171);$vars.e=this._appendStructure($r0,this._apply("trans"),1174);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1177, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1180);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1185);}),1183);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1188, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1192);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1197);}),1195);$r0.value=$vars.recv.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1200, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1205);}),1203);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1208, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1212);$r0.value=$vars.val;return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1215, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1218);$vars.e=this._appendStructure($r0,this._apply("trans"),1221);$r0.value=$vars.c.concat($vars.e);return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1224, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1227);$r0.value=$vars.e;return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1230, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1235);}),1233);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1238, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1245);}),1243);$r0.value=[("@" + $vars.id)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1248, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1252);$vars.l=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(1256, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1261);}),1259);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}});let ExtractNodes=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1265, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1269);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1274));return this._endStructure($r1);}),1267);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1278, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1282, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1286, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1290, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1295);}),1293);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1298, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1302);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1305, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1308);$vars.x=this._appendStructure($r0,this._apply("trans"),1311);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1314, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1318, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1322);$vars.y=this._appendStructure($r0,this._apply("trans"),1325);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1328, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1331);$vars.t=this._appendStructure($r0,this._apply("trans"),1334);$vars.e=this._appendStructure($r0,this._apply("trans"),1337);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1340, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1343);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1348);}),1346);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1351, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1355);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1360);}),1358);$r0.value=$vars.recv.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1363, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1368);}),1366);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1371, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1375);$r0.value=$vars.val;return this._endStructure($r0);},
"when":function(){var $elf=this,$vars={},$r0=this._startStructure(1378, true);$vars.c=this._appendStructure($r0,this._apply("trans"),1381);$vars.e=this._appendStructure($r0,this._apply("trans"),1384);$r0.value=$vars.c.concat($vars.e);return this._endStructure($r0);},
"else":function(){var $elf=this,$vars={},$r0=this._startStructure(1387, true);$vars.e=this._appendStructure($r0,this._apply("trans"),1390);$r0.value=$vars.e;return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(1393, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1398);}),1396);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1401, true);$vars.name=this._getStructureValue(this.anything());$vars.id=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1408);$vars.a=this._appendStructure($r1,this.anything(),1411);$vars.e=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1414);$vars.n=this._appendStructure($r1,this._applyWithArgs("trans",$vars.a),1419);$vars.i=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1423);$r1.value=({"expr": $vars.e,"nodes": $vars.n,"inputs": $vars.i});return this._endStructure($r1);}),1406);$r0.value=[({"name": ("@" + $vars.id),"expr": $vars.args.map(_e),"inputs": flatten1($vars.args.map(_i)),"builtin": $vars.name})].concat(flatten1($vars.args.map(_n)));return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1429, true);$vars.name=this._getStructureValue(this.anything());$vars.a=this._getStructureValue(this.anything());$vars.i=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1434);$vars.e=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1439);$vars.nodes=this._appendStructure($r0,this._applyWithArgs("trans",$vars.a),1444);$vars.l=this._getStructureValue(this.anything());$r0.value=[({"name": $vars.name,"expr": $vars.e,"inputs": $vars.i})].concat($vars.nodes);return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(1449, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1454);}),1452);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}})

let BSJSParser=objectThatDelegatesTo(BaseStrParser,{
"space":function(){var $elf=this,$vars={},$r0=this._startStructure(1458, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(BaseStrParser._superApplyWithArgs(this,"space"),1461);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","//","\n"),1463);},function(){return this._forwardStructure(this._applyWithArgs("fromTo","/*","*/"),1467);}),1459);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(1471, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),1474);},function(){return this._forwardStructure(this.exactly("$"),1476);},function(){return this._forwardStructure(this.exactly("_"),1478);}),1472);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(1480, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),1483);},function(){return this._forwardStructure(this._apply("digit"),1485);}),1481);return this._endStructure($r0);},
"iName":function(){var $elf=this,$vars={},$r0=this._startStructure(1487, true);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1490);this._appendStructure($r1,this._apply("nameFirst"),1492);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),1496);}),1494);return this._endStructure($r1);}),1488);return this._endStructure($r0);},
"isKeyword":function(){var $elf=this,$vars={},$r0=this._startStructure(1498, true);$vars.x=this._getStructureValue(this.anything());$r0.value=this._pred(BSJSParser._isKeyword($vars.x));return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(1503, true);$vars.n=this._appendStructure($r0,this._apply("iName"),1506);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._applyWithArgs("isKeyword",$vars.n),1510);}),1508);$r0.value=["name",(($vars.n == "self")?"$elf":$vars.n)];return this._endStructure($r0);},
"keyword":function(){var $elf=this,$vars={},$r0=this._startStructure(1514, true);$vars.k=this._appendStructure($r0,this._apply("iName"),1517);this._appendStructure($r0,this._applyWithArgs("isKeyword",$vars.k),1519);$r0.value=[$vars.k,$vars.k];return this._endStructure($r0);},
"hexDigit":function(){var $elf=this,$vars={},$r0=this._startStructure(1523, true);$vars.x=this._appendStructure($r0,this._apply("char"),1526);$vars.v=this["hexDigits"].indexOf($vars.x.toLowerCase());this._pred(($vars.v >= (0)));$r0.value=$vars.v;return this._endStructure($r0);},
"hexLit":function(){var $elf=this,$vars={},$r0=this._startStructure(1533, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1536);$vars.n=this._appendStructure($r1,this._apply("hexLit"),1539);$vars.d=this._appendStructure($r1,this._apply("hexDigit"),1542);$r1.value=(($vars.n * (16)) + $vars.d);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("hexDigit"),1545);}),1534);return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1547, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1550);this._appendStructure($r1,this.exactly("0"),1551);this._appendStructure($r1,this.exactly("x"),1551);"0x";$vars.n=this._appendStructure($r1,this._apply("hexLit"),1553);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(1556);$vars.f=this._appendStructure($r1,this._consumedBy(function(){var $r2=this._startStructure(1561);this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),1565);}),1563);$r2.value=this._appendStructure($r2,this._opt(function(){var $r3=this._startStructure(1569);this._appendStructure($r3,this.exactly("."),1571);$r3.value=this._appendStructure($r3,this._many1(function(){return this._forwardStructure(this._apply("digit"),1575);}),1573);return this._endStructure($r3);}),1567);return this._endStructure($r2);}),1559);$r1.value=["number",parseFloat($vars.f)];return this._endStructure($r1);}),1548);return this._endStructure($r0);},
"escapeChar":function(){var $elf=this,$vars={},$r0=this._startStructure(1578, true);$vars.s=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(1583);this._appendStructure($r1,this.exactly("\\"),1585);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1589);this._appendStructure($r2,this.exactly("u"),1591);this._appendStructure($r2,this._apply("hexDigit"),1593);this._appendStructure($r2,this._apply("hexDigit"),1595);this._appendStructure($r2,this._apply("hexDigit"),1597);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),1599);return this._endStructure($r2);},function(){var $r2=this._startStructure(1601);this._appendStructure($r2,this.exactly("x"),1603);this._appendStructure($r2,this._apply("hexDigit"),1605);$r2.value=this._appendStructure($r2,this._apply("hexDigit"),1607);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("char"),1609);}),1587);return this._endStructure($r1);}),1581);$r0.value=unescape($vars.s);return this._endStructure($r0);},
"str":function(){var $elf=this,$vars={},$r0=this._startStructure(1612, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1615);this._appendStructure($r1,this.exactly("\""),1616);this._appendStructure($r1,this.exactly("\""),1616);this._appendStructure($r1,this.exactly("\""),1616);"\"\"\"";$vars.cs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(1620);this._appendStructure($r2,this._not(function(){var $r3=this._startStructure(1624);this._appendStructure($r3,this.exactly("\""),1625);this._appendStructure($r3,this.exactly("\""),1625);this._appendStructure($r3,this.exactly("\""),1625);$r3.value="\"\"\"";return this._endStructure($r3);}),1622);$r2.value=this._appendStructure($r2,this._apply("char"),1626);return this._endStructure($r2);}),1618);this._appendStructure($r1,this.exactly("\""),1616);this._appendStructure($r1,this.exactly("\""),1616);this._appendStructure($r1,this.exactly("\""),1616);"\"\"\"";$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1629);this._appendStructure($r1,this.exactly("\'"),1631);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),1638);},function(){var $r3=this._startStructure(1640);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\'"),1644);}),1642);$r3.value=this._appendStructure($r3,this._apply("char"),1646);return this._endStructure($r3);}),1636);}),1634);this._appendStructure($r1,this.exactly("\'"),1648);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1651);this._appendStructure($r1,this.exactly("\""),1653);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("escapeChar"),1660);},function(){var $r3=this._startStructure(1662);this._appendStructure($r3,this._not(function(){return this._forwardStructure(this.exactly("\""),1666);}),1664);$r3.value=this._appendStructure($r3,this._apply("char"),1668);return this._endStructure($r3);}),1658);}),1656);this._appendStructure($r1,this.exactly("\""),1670);$r1.value=["string",$vars.cs.join("")];return this._endStructure($r1);},function(){var $r1=this._startStructure(1673);this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("#"),1677);},function(){return this._forwardStructure(this.exactly("`"),1679);}),1675);$vars.n=this._appendStructure($r1,this._apply("iName"),1682);$r1.value=["string",$vars.n];return this._endStructure($r1);}),1613);return this._endStructure($r0);},
"special":function(){var $elf=this,$vars={},$r0=this._startStructure(1685, true);$vars.s=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this.exactly("("),1690);},function(){return this._forwardStructure(this.exactly(")"),1692);},function(){return this._forwardStructure(this.exactly("{"),1694);},function(){return this._forwardStructure(this.exactly("}"),1696);},function(){return this._forwardStructure(this.exactly("["),1698);},function(){return this._forwardStructure(this.exactly("]"),1700);},function(){return this._forwardStructure(this.exactly(","),1702);},function(){return this._forwardStructure(this.exactly(";"),1704);},function(){return this._forwardStructure(this.exactly("?"),1706);},function(){return this._forwardStructure(this.exactly(":"),1708);},function(){var $r1=this._startStructure(1710);this._appendStructure($r1,this.exactly("!"),1711);this._appendStructure($r1,this.exactly("="),1711);this._appendStructure($r1,this.exactly("="),1711);$r1.value="!==";return this._endStructure($r1);},function(){var $r1=this._startStructure(1712);this._appendStructure($r1,this.exactly("!"),1713);this._appendStructure($r1,this.exactly("="),1713);$r1.value="!=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1714);this._appendStructure($r1,this.exactly("="),1715);this._appendStructure($r1,this.exactly("="),1715);this._appendStructure($r1,this.exactly("="),1715);$r1.value="===";return this._endStructure($r1);},function(){var $r1=this._startStructure(1716);this._appendStructure($r1,this.exactly("="),1717);this._appendStructure($r1,this.exactly("="),1717);$r1.value="==";return this._endStructure($r1);},function(){var $r1=this._startStructure(1718);this._appendStructure($r1,this.exactly("="),1719);$r1.value="=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1720);this._appendStructure($r1,this.exactly(">"),1721);this._appendStructure($r1,this.exactly("="),1721);$r1.value=">=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly(">"),1722);},function(){var $r1=this._startStructure(1724);this._appendStructure($r1,this.exactly("<"),1725);this._appendStructure($r1,this.exactly("="),1725);$r1.value="<=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("<"),1726);},function(){var $r1=this._startStructure(1728);this._appendStructure($r1,this.exactly("+"),1729);this._appendStructure($r1,this.exactly("+"),1729);$r1.value="++";return this._endStructure($r1);},function(){var $r1=this._startStructure(1730);this._appendStructure($r1,this.exactly("+"),1731);this._appendStructure($r1,this.exactly("="),1731);$r1.value="+=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("+"),1732);},function(){var $r1=this._startStructure(1734);this._appendStructure($r1,this.exactly("-"),1735);this._appendStructure($r1,this.exactly("-"),1735);$r1.value="--";return this._endStructure($r1);},function(){var $r1=this._startStructure(1736);this._appendStructure($r1,this.exactly("-"),1737);this._appendStructure($r1,this.exactly("="),1737);$r1.value="-=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("-"),1738);},function(){var $r1=this._startStructure(1740);this._appendStructure($r1,this.exactly("*"),1741);this._appendStructure($r1,this.exactly("="),1741);$r1.value="*=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("*"),1742);},function(){var $r1=this._startStructure(1744);this._appendStructure($r1,this.exactly("/"),1745);this._appendStructure($r1,this.exactly("="),1745);$r1.value="/=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("/"),1746);},function(){var $r1=this._startStructure(1748);this._appendStructure($r1,this.exactly("%"),1749);this._appendStructure($r1,this.exactly("="),1749);$r1.value="%=";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("%"),1750);},function(){var $r1=this._startStructure(1752);this._appendStructure($r1,this.exactly("&"),1753);this._appendStructure($r1,this.exactly("&"),1753);this._appendStructure($r1,this.exactly("="),1753);$r1.value="&&=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1754);this._appendStructure($r1,this.exactly("&"),1755);this._appendStructure($r1,this.exactly("&"),1755);$r1.value="&&";return this._endStructure($r1);},function(){var $r1=this._startStructure(1756);this._appendStructure($r1,this.exactly("|"),1757);this._appendStructure($r1,this.exactly("|"),1757);this._appendStructure($r1,this.exactly("="),1757);$r1.value="||=";return this._endStructure($r1);},function(){var $r1=this._startStructure(1758);this._appendStructure($r1,this.exactly("|"),1759);this._appendStructure($r1,this.exactly("|"),1759);$r1.value="||";return this._endStructure($r1);},function(){return this._forwardStructure(this.exactly("."),1760);},function(){return this._forwardStructure(this.exactly("!"),1762);}),1688);$r0.value=[$vars.s,$vars.s];return this._endStructure($r0);},
"tok":function(){var $elf=this,$vars={},$r0=this._startStructure(1765, true);this._appendStructure($r0,this._apply("spaces"),1767);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("name"),1771);},function(){return this._forwardStructure(this._apply("keyword"),1773);},function(){return this._forwardStructure(this._apply("number"),1775);},function(){return this._forwardStructure(this._apply("str"),1777);},function(){return this._forwardStructure(this._apply("special"),1779);}),1769);return this._endStructure($r0);},
"toks":function(){var $elf=this,$vars={},$r0=this._startStructure(1781, true);$vars.ts=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("token"),1786);}),1784);this._appendStructure($r0,this._apply("spaces"),1788);this._appendStructure($r0,this.end(),1790);$r0.value=$vars.ts;return this._endStructure($r0);},
"token":function(){var $elf=this,$vars={},$r0=this._startStructure(1793, true);$vars.tt=this._getStructureValue(this.anything());$vars.t=this._appendStructure($r0,this._apply("tok"),1797);this._pred(($vars.t[(0)] == $vars.tt));$r0.value=$vars.t[(1)];return this._endStructure($r0);},
"spacesNoNl":function(){var $elf=this,$vars={},$r0=this._startStructure(1802, true);$r0.value=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1805);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this.exactly("\n"),1809);}),1807);$r1.value=this._appendStructure($r1,this._apply("space"),1811);return this._endStructure($r1);}),1803);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(1813, true);$vars.e=this._appendStructure($r0,this._apply("orExpr"),1816);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1820);this._appendStructure($r1,this._applyWithArgs("token","?"),1822);$vars.t=this._appendStructure($r1,this._apply("expr"),1825);this._appendStructure($r1,this._applyWithArgs("token",":"),1827);$vars.f=this._appendStructure($r1,this._apply("expr"),1830);$r1.value=["condExpr",$vars.e,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(1833);this._appendStructure($r1,this._applyWithArgs("token","="),1835);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1838);$r1.value=["set",$vars.e,$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1841);this._appendStructure($r1,this._applyWithArgs("token","+="),1843);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1846);$r1.value=["mset",$vars.e,"+",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1849);this._appendStructure($r1,this._applyWithArgs("token","-="),1851);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1854);$r1.value=["mset",$vars.e,"-",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1857);this._appendStructure($r1,this._applyWithArgs("token","*="),1859);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1862);$r1.value=["mset",$vars.e,"*",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1865);this._appendStructure($r1,this._applyWithArgs("token","/="),1867);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1870);$r1.value=["mset",$vars.e,"/",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1873);this._appendStructure($r1,this._applyWithArgs("token","%="),1875);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1878);$r1.value=["mset",$vars.e,"%",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1881);this._appendStructure($r1,this._applyWithArgs("token","&&="),1883);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1886);$r1.value=["mset",$vars.e,"&&",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1889);this._appendStructure($r1,this._applyWithArgs("token","||="),1891);$vars.rhs=this._appendStructure($r1,this._apply("expr"),1894);$r1.value=["mset",$vars.e,"||",$vars.rhs];return this._endStructure($r1);},function(){var $r1=this._startStructure(1897);this._appendStructure($r1,this._apply("empty"),1899);$r1.value=$vars.e;return this._endStructure($r1);}),1818);return this._endStructure($r0);},
"orExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1902, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1905);$vars.x=this._appendStructure($r1,this._apply("orExpr"),1908);this._appendStructure($r1,this._applyWithArgs("token","||"),1910);$vars.y=this._appendStructure($r1,this._apply("andExpr"),1913);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),1916);}),1903);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1918, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1921);$vars.x=this._appendStructure($r1,this._apply("andExpr"),1924);this._appendStructure($r1,this._applyWithArgs("token","&&"),1926);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),1929);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),1932);}),1919);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1934, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1937);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),1940);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1944);this._appendStructure($r2,this._applyWithArgs("token","=="),1946);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1949);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1952);this._appendStructure($r2,this._applyWithArgs("token","!="),1954);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1957);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1960);this._appendStructure($r2,this._applyWithArgs("token","==="),1962);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1965);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1968);this._appendStructure($r2,this._applyWithArgs("token","!=="),1970);$vars.y=this._appendStructure($r2,this._apply("relExpr"),1973);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),1942);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),1976);}),1935);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1978, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(1981);$vars.x=this._appendStructure($r1,this._apply("relExpr"),1984);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(1988);this._appendStructure($r2,this._applyWithArgs("token",">"),1990);$vars.y=this._appendStructure($r2,this._apply("addExpr"),1993);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(1996);this._appendStructure($r2,this._applyWithArgs("token",">="),1998);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2001);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2004);this._appendStructure($r2,this._applyWithArgs("token","<"),2006);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2009);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2012);this._appendStructure($r2,this._applyWithArgs("token","<="),2014);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2017);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(2020);this._appendStructure($r2,this._applyWithArgs("token","instanceof"),2022);$vars.y=this._appendStructure($r2,this._apply("addExpr"),2025);$r2.value=["binop","instanceof",$vars.x,$vars.y];return this._endStructure($r2);}),1986);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),2028);}),1979);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2030, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2033);$vars.x=this._appendStructure($r1,this._apply("addExpr"),2036);this._appendStructure($r1,this._applyWithArgs("token","+"),2038);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),2041);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2044);$vars.x=this._appendStructure($r1,this._apply("addExpr"),2047);this._appendStructure($r1,this._applyWithArgs("token","-"),2049);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),2052);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),2055);}),2031);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2057, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2060);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2063);this._appendStructure($r1,this._applyWithArgs("token","*"),2065);$vars.y=this._appendStructure($r1,this._apply("unary"),2068);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2071);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2074);this._appendStructure($r1,this._applyWithArgs("token","/"),2076);$vars.y=this._appendStructure($r1,this._apply("unary"),2079);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(2082);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),2085);this._appendStructure($r1,this._applyWithArgs("token","%"),2087);$vars.y=this._appendStructure($r1,this._apply("unary"),2090);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),2093);}),2058);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(2095, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2098);this._appendStructure($r1,this._applyWithArgs("token","-"),2100);$vars.p=this._appendStructure($r1,this._apply("postfix"),2103);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2106);this._appendStructure($r1,this._applyWithArgs("token","+"),2108);$vars.p=this._appendStructure($r1,this._apply("postfix"),2111);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2114);this._appendStructure($r1,this._applyWithArgs("token","++"),2116);$vars.p=this._appendStructure($r1,this._apply("postfix"),2119);$r1.value=["preop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2122);this._appendStructure($r1,this._applyWithArgs("token","--"),2124);$vars.p=this._appendStructure($r1,this._apply("postfix"),2127);$r1.value=["preop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2130);this._appendStructure($r1,this._applyWithArgs("token","!"),2132);$vars.p=this._appendStructure($r1,this._apply("unary"),2135);$r1.value=["unop","!",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2138);this._appendStructure($r1,this._applyWithArgs("token","void"),2140);$vars.p=this._appendStructure($r1,this._apply("unary"),2143);$r1.value=["unop","void",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2146);this._appendStructure($r1,this._applyWithArgs("token","delete"),2148);$vars.p=this._appendStructure($r1,this._apply("unary"),2151);$r1.value=["unop","delete",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2154);this._appendStructure($r1,this._applyWithArgs("token","typeof"),2156);$vars.p=this._appendStructure($r1,this._apply("unary"),2159);$r1.value=["unop","typeof",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("postfix"),2162);}),2096);return this._endStructure($r0);},
"postfix":function(){var $elf=this,$vars={},$r0=this._startStructure(2164, true);$vars.p=this._appendStructure($r0,this._apply("primExpr"),2167);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2171);this._appendStructure($r1,this._apply("spacesNoNl"),2173);this._appendStructure($r1,this._applyWithArgs("token","++"),2175);$r1.value=["postop","++",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2178);this._appendStructure($r1,this._apply("spacesNoNl"),2180);this._appendStructure($r1,this._applyWithArgs("token","--"),2182);$r1.value=["postop","--",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(2185);this._appendStructure($r1,this._apply("empty"),2187);$r1.value=$vars.p;return this._endStructure($r1);}),2169);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2190, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2193);$vars.p=this._appendStructure($r1,this._apply("primExpr"),2196);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2200);this._appendStructure($r2,this._applyWithArgs("token","["),2202);$vars.i=this._appendStructure($r2,this._apply("expr"),2205);this._appendStructure($r2,this._applyWithArgs("token","]"),2207);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(2210);this._appendStructure($r2,this._applyWithArgs("token","."),2212);$vars.m=this._appendStructure($r2,this._applyWithArgs("token","name"),2215);this._appendStructure($r2,this._applyWithArgs("token","("),2217);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),2220);this._appendStructure($r2,this._applyWithArgs("token",")"),2224);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(2227);this._appendStructure($r2,this._applyWithArgs("token","."),2229);$vars.f=this._appendStructure($r2,this._applyWithArgs("token","name"),2232);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(2235);this._appendStructure($r2,this._applyWithArgs("token","("),2237);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),2240);this._appendStructure($r2,this._applyWithArgs("token",")"),2244);$r2.value=["call",$vars.p].concat($vars.as);return this._endStructure($r2);}),2198);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),2247);}),2191);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(2249, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2252);this._appendStructure($r1,this._applyWithArgs("token","("),2254);$vars.e=this._appendStructure($r1,this._apply("expr"),2257);this._appendStructure($r1,this._applyWithArgs("token",")"),2259);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2262);this._appendStructure($r1,this._applyWithArgs("token","this"),2264);$r1.value=["this"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2267);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2270);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2273);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","number"),2276);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2279);$vars.s=this._appendStructure($r1,this._applyWithArgs("token","string"),2282);$r1.value=["string",$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2285);this._appendStructure($r1,this._applyWithArgs("token","function"),2287);$r1.value=this._appendStructure($r1,this._apply("funcRest"),2289);return this._endStructure($r1);},function(){var $r1=this._startStructure(2291);this._appendStructure($r1,this._applyWithArgs("token","new"),2293);$vars.e=this._appendStructure($r1,this._apply("primExpr"),2296);$r1.value=["new",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2299);this._appendStructure($r1,this._applyWithArgs("token","["),2301);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),2304);this._appendStructure($r1,this._applyWithArgs("token","]"),2308);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("json"),2311);},function(){return this._forwardStructure(this._apply("re"),2313);}),2250);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(2315, true);this._appendStructure($r0,this._applyWithArgs("token","{"),2317);$vars.bs=this._appendStructure($r0,this._applyWithArgs("enum","jsonBinding",","),2320);this._appendStructure($r0,this._applyWithArgs("token","}"),2324);$r0.value=["json"].concat($vars.bs);return this._endStructure($r0);},
"jsonBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(2327, true);$vars.n=this._appendStructure($r0,this._apply("jsonPropName"),2330);this._appendStructure($r0,this._applyWithArgs("token",":"),2332);$vars.v=this._appendStructure($r0,this._apply("expr"),2335);$r0.value=["binding",$vars.n,$vars.v];return this._endStructure($r0);},
"jsonPropName":function(){var $elf=this,$vars={},$r0=this._startStructure(2338, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","name"),2341);},function(){return this._forwardStructure(this._applyWithArgs("token","number"),2343);},function(){return this._forwardStructure(this._applyWithArgs("token","string"),2345);}),2339);return this._endStructure($r0);},
"re":function(){var $elf=this,$vars={},$r0=this._startStructure(2347, true);this._appendStructure($r0,this._apply("spaces"),2349);$vars.x=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(2354);this._appendStructure($r1,this.exactly("/"),2356);this._appendStructure($r1,this._apply("reBody"),2358);this._appendStructure($r1,this.exactly("/"),2360);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("reFlag"),2364);}),2362);return this._endStructure($r1);}),2352);$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"reBody":function(){var $elf=this,$vars={},$r0=this._startStructure(2367, true);this._appendStructure($r0,this._apply("re1stChar"),2369);$r0.value=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reChar"),2373);}),2371);return this._endStructure($r0);},
"re1stChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2375, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2378);this._appendStructure($r1,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("*"),2384);},function(){return this._forwardStructure(this.exactly("\\"),2386);},function(){return this._forwardStructure(this.exactly("/"),2388);},function(){return this._forwardStructure(this.exactly("["),2390);}),2382);}),2380);$r1.value=this._appendStructure($r1,this._apply("reNonTerm"),2392);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("escapeChar"),2394);},function(){return this._forwardStructure(this._apply("reClass"),2396);}),2376);return this._endStructure($r0);},
"reChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2398, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("re1stChar"),2401);},function(){return this._forwardStructure(this.exactly("*"),2403);}),2399);return this._endStructure($r0);},
"reNonTerm":function(){var $elf=this,$vars={},$r0=this._startStructure(2405, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("\n"),2411);},function(){return this._forwardStructure(this.exactly("\r"),2413);}),2409);}),2407);$r0.value=this._appendStructure($r0,this._apply("char"),2415);return this._endStructure($r0);},
"reClass":function(){var $elf=this,$vars={},$r0=this._startStructure(2417, true);this._appendStructure($r0,this.exactly("["),2419);this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("reClassChar"),2423);}),2421);$r0.value=this._appendStructure($r0,this.exactly("]"),2425);return this._endStructure($r0);},
"reClassChar":function(){var $elf=this,$vars={},$r0=this._startStructure(2427, true);this._appendStructure($r0,this._not(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this.exactly("["),2433);},function(){return this._forwardStructure(this.exactly("]"),2435);}),2431);}),2429);$r0.value=this._appendStructure($r0,this._apply("reChar"),2437);return this._endStructure($r0);},
"reFlag":function(){var $elf=this,$vars={},$r0=this._startStructure(2439, true);$r0.value=this._appendStructure($r0,this._apply("nameFirst"),2440);return this._endStructure($r0);},
"formal":function(){var $elf=this,$vars={},$r0=this._startStructure(2442, true);this._appendStructure($r0,this._apply("spaces"),2444);$r0.value=this._appendStructure($r0,this._applyWithArgs("token","name"),2446);return this._endStructure($r0);},
"funcRest":function(){var $elf=this,$vars={},$r0=this._startStructure(2448, true);this._appendStructure($r0,this._applyWithArgs("token","("),2450);$vars.fs=this._appendStructure($r0,this._applyWithArgs("listOf","formal",","),2453);this._appendStructure($r0,this._applyWithArgs("token",")"),2457);this._appendStructure($r0,this._applyWithArgs("token","{"),2459);$vars.body=this._appendStructure($r0,this._apply("srcElems"),2462);this._appendStructure($r0,this._applyWithArgs("token","}"),2464);$r0.value=["func",$vars.fs,$vars.body];return this._endStructure($r0);},
"sc":function(){var $elf=this,$vars={},$r0=this._startStructure(2467, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2470);this._appendStructure($r1,this._apply("spacesNoNl"),2472);$r1.value=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this.exactly("\n"),2476);},function(){return this._forwardStructure(this._lookahead(function(){return this._forwardStructure(this.exactly("}"),2480);}),2478);},function(){return this._forwardStructure(this.end(),2482);}),2474);return this._endStructure($r1);},function(){return this._forwardStructure(this._applyWithArgs("token",";"),2484);}),2468);return this._endStructure($r0);},
"varBinder":function(){var $elf=this,$vars={},$r0=this._startStructure(2486, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._applyWithArgs("token","var"),2489);},function(){return this._forwardStructure(this._applyWithArgs("token","let"),2491);},function(){return this._forwardStructure(this._applyWithArgs("token","const"),2493);}),2487);return this._endStructure($r0);},
"varBinding":function(){var $elf=this,$vars={},$r0=this._startStructure(2495, true);$vars.assign=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2500);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2503);$r1.value=["assignVar",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(2506);this._appendStructure($r1,this._applyWithArgs("token","["),2508);$vars.ns=this._appendStructure($r1,this._applyWithArgs("enum","formal",","),2511);this._appendStructure($r1,this._applyWithArgs("token","]"),2515);$r1.value=["assignDesctruct",$vars.ns];return this._endStructure($r1);}),2498);$vars.v=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2521);this._appendStructure($r1,this._applyWithArgs("token","="),2523);$vars.e=this._appendStructure($r1,this._apply("expr"),2526);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2529);this._appendStructure($r1,this._apply("empty"),2531);$r1.value=["get","undefined"];return this._endStructure($r1);}),2519);$r0.value=$vars.assign.concat([$vars.v]);return this._endStructure($r0);},
"block":function(){var $elf=this,$vars={},$r0=this._startStructure(2535, true);this._appendStructure($r0,this._applyWithArgs("token","{"),2537);$vars.ss=this._appendStructure($r0,this._apply("srcElems"),2540);this._appendStructure($r0,this._applyWithArgs("token","}"),2542);$r0.value=["begin",$vars.ss];return this._endStructure($r0);},
"stmt":function(){var $elf=this,$vars={},$r0=this._startStructure(2545, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("block"),2548);},function(){var $r1=this._startStructure(2550);$vars.decl=this._appendStructure($r1,this._apply("varBinder"),2553);$vars.bs=this._appendStructure($r1,this._applyWithArgs("listOf","varBinding",","),2556);this._appendStructure($r1,this._apply("sc"),2560);$r1.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r1);},function(){var $r1=this._startStructure(2563);this._appendStructure($r1,this._applyWithArgs("token","if"),2565);this._appendStructure($r1,this._applyWithArgs("token","("),2567);$vars.c=this._appendStructure($r1,this._apply("expr"),2570);this._appendStructure($r1,this._applyWithArgs("token",")"),2572);$vars.t=this._appendStructure($r1,this._apply("stmt"),2575);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2580);this._appendStructure($r2,this._applyWithArgs("token","else"),2582);$r2.value=this._appendStructure($r2,this._apply("stmt"),2584);return this._endStructure($r2);},function(){var $r2=this._startStructure(2586);this._appendStructure($r2,this._apply("empty"),2588);$r2.value=["get","undefined"];return this._endStructure($r2);}),2578);$r1.value=["if",$vars.c,$vars.t,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(2592);this._appendStructure($r1,this._applyWithArgs("token","while"),2594);this._appendStructure($r1,this._applyWithArgs("token","("),2596);$vars.c=this._appendStructure($r1,this._apply("expr"),2599);this._appendStructure($r1,this._applyWithArgs("token",")"),2601);$vars.s=this._appendStructure($r1,this._apply("stmt"),2604);$r1.value=["while",$vars.c,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2607);this._appendStructure($r1,this._applyWithArgs("token","do"),2609);$vars.s=this._appendStructure($r1,this._apply("stmt"),2612);this._appendStructure($r1,this._applyWithArgs("token","while"),2614);this._appendStructure($r1,this._applyWithArgs("token","("),2616);$vars.c=this._appendStructure($r1,this._apply("expr"),2619);this._appendStructure($r1,this._applyWithArgs("token",")"),2621);this._appendStructure($r1,this._apply("sc"),2623);$r1.value=["doWhile",$vars.s,$vars.c];return this._endStructure($r1);},function(){var $r1=this._startStructure(2626);this._appendStructure($r1,this._applyWithArgs("token","for"),2628);this._appendStructure($r1,this._applyWithArgs("token","("),2630);$vars.i=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2635);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),2638);$vars.bs=this._appendStructure($r2,this._applyWithArgs("listOf","varBinding",","),2641);$r2.value=["beginVars",$vars.decl].concat($vars.bs);return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),2646);},function(){var $r2=this._startStructure(2648);this._appendStructure($r2,this._apply("empty"),2650);$r2.value=["get","undefined"];return this._endStructure($r2);}),2633);this._appendStructure($r1,this._applyWithArgs("token",";"),2653);$vars.c=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2658);},function(){var $r2=this._startStructure(2660);this._appendStructure($r2,this._apply("empty"),2662);$r2.value=["get","true"];return this._endStructure($r2);}),2656);this._appendStructure($r1,this._applyWithArgs("token",";"),2665);$vars.u=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2670);},function(){var $r2=this._startStructure(2672);this._appendStructure($r2,this._apply("empty"),2674);$r2.value=["get","undefined"];return this._endStructure($r2);}),2668);this._appendStructure($r1,this._applyWithArgs("token",")"),2677);$vars.s=this._appendStructure($r1,this._apply("stmt"),2680);$r1.value=["for",$vars.i,$vars.c,$vars.u,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2683);this._appendStructure($r1,this._applyWithArgs("token","for"),2685);this._appendStructure($r1,this._applyWithArgs("token","("),2687);$vars.v=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2692);$vars.decl=this._appendStructure($r2,this._apply("varBinder"),2695);$vars.n=this._appendStructure($r2,this._applyWithArgs("token","name"),2698);$r2.value=["beginVars",$vars.decl,["noAssignVar",$vars.n]];return this._endStructure($r2);},function(){return this._forwardStructure(this._apply("expr"),2701);}),2690);this._appendStructure($r1,this._applyWithArgs("token","in"),2703);$vars.e=this._appendStructure($r1,this._apply("expr"),2706);this._appendStructure($r1,this._applyWithArgs("token",")"),2708);$vars.s=this._appendStructure($r1,this._apply("stmt"),2711);$r1.value=["forIn",$vars.v,$vars.e,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2714);this._appendStructure($r1,this._applyWithArgs("token","switch"),2716);this._appendStructure($r1,this._applyWithArgs("token","("),2718);$vars.e=this._appendStructure($r1,this._apply("expr"),2721);this._appendStructure($r1,this._applyWithArgs("token",")"),2723);this._appendStructure($r1,this._applyWithArgs("token","{"),2725);$vars.cs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){var $r3=this._startStructure(2732);this._appendStructure($r3,this._applyWithArgs("token","case"),2734);$vars.c=this._appendStructure($r3,this._apply("expr"),2737);this._appendStructure($r3,this._applyWithArgs("token",":"),2739);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),2742);$r3.value=["case",$vars.c,["begin",$vars.cs]];return this._endStructure($r3);},function(){var $r3=this._startStructure(2745);this._appendStructure($r3,this._applyWithArgs("token","default"),2747);this._appendStructure($r3,this._applyWithArgs("token",":"),2749);$vars.cs=this._appendStructure($r3,this._apply("srcElems"),2752);$r3.value=["default",["begin",$vars.cs]];return this._endStructure($r3);}),2730);}),2728);this._appendStructure($r1,this._applyWithArgs("token","}"),2755);$r1.value=["switch",$vars.e].concat($vars.cs);return this._endStructure($r1);},function(){var $r1=this._startStructure(2758);this._appendStructure($r1,this._applyWithArgs("token","break"),2760);this._appendStructure($r1,this._apply("sc"),2762);$r1.value=["break"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2765);this._appendStructure($r1,this._applyWithArgs("token","continue"),2767);this._appendStructure($r1,this._apply("sc"),2769);$r1.value=["continue"];return this._endStructure($r1);},function(){var $r1=this._startStructure(2772);this._appendStructure($r1,this._applyWithArgs("token","throw"),2774);this._appendStructure($r1,this._apply("spacesNoNl"),2776);$vars.e=this._appendStructure($r1,this._apply("expr"),2779);this._appendStructure($r1,this._apply("sc"),2781);$r1.value=["throw",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2784);this._appendStructure($r1,this._applyWithArgs("token","try"),2786);$vars.t=this._appendStructure($r1,this._apply("block"),2789);this._appendStructure($r1,this._applyWithArgs("token","catch"),2791);this._appendStructure($r1,this._applyWithArgs("token","("),2793);$vars.e=this._appendStructure($r1,this._applyWithArgs("token","name"),2796);this._appendStructure($r1,this._applyWithArgs("token",")"),2798);$vars.c=this._appendStructure($r1,this._apply("block"),2801);$vars.f=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(2806);this._appendStructure($r2,this._applyWithArgs("token","finally"),2808);$r2.value=this._appendStructure($r2,this._apply("block"),2810);return this._endStructure($r2);},function(){var $r2=this._startStructure(2812);this._appendStructure($r2,this._apply("empty"),2814);$r2.value=["get","undefined"];return this._endStructure($r2);}),2804);$r1.value=["try",$vars.t,$vars.e,$vars.c,$vars.f];return this._endStructure($r1);},function(){var $r1=this._startStructure(2818);this._appendStructure($r1,this._applyWithArgs("token","return"),2820);$vars.e=this._appendStructure($r1,this._or(function(){return this._forwardStructure(this._apply("expr"),2825);},function(){var $r2=this._startStructure(2827);this._appendStructure($r2,this._apply("empty"),2829);$r2.value=["get","undefined"];return this._endStructure($r2);}),2823);this._appendStructure($r1,this._apply("sc"),2832);$r1.value=["return",$vars.e];return this._endStructure($r1);},function(){var $r1=this._startStructure(2835);this._appendStructure($r1,this._applyWithArgs("token","with"),2837);this._appendStructure($r1,this._applyWithArgs("token","("),2839);$vars.x=this._appendStructure($r1,this._apply("expr"),2842);this._appendStructure($r1,this._applyWithArgs("token",")"),2844);$vars.s=this._appendStructure($r1,this._apply("stmt"),2847);$r1.value=["with",$vars.x,$vars.s];return this._endStructure($r1);},function(){var $r1=this._startStructure(2850);$vars.e=this._appendStructure($r1,this._apply("expr"),2853);this._appendStructure($r1,this._apply("sc"),2855);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(2858);this._appendStructure($r1,this._applyWithArgs("token",";"),2860);$r1.value=["get","undefined"];return this._endStructure($r1);}),2546);return this._endStructure($r0);},
"srcElem":function(){var $elf=this,$vars={},$r0=this._startStructure(2863, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2866);this._appendStructure($r1,this._applyWithArgs("token","function"),2868);$vars.n=this._appendStructure($r1,this._applyWithArgs("token","name"),2871);$vars.f=this._appendStructure($r1,this._apply("funcRest"),2874);$r1.value=["assignVar",$vars.n,$vars.f];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("stmt"),2877);}),2864);return this._endStructure($r0);},
"srcElems":function(){var $elf=this,$vars={},$r0=this._startStructure(2879, true);$vars.ss=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("srcElem"),2884);}),2882);$r0.value=["beginTop"].concat($vars.ss);return this._endStructure($r0);},
"topLevel":function(){var $elf=this,$vars={},$r0=this._startStructure(2887, true);$vars.r=this._appendStructure($r0,this._apply("srcElems"),2890);this._appendStructure($r0,this._apply("spaces"),2892);this._appendStructure($r0,this.end(),2894);$r0.value=$vars.r;return this._endStructure($r0);}});(BSJSParser["hexDigits"]="0123456789abcdef");(BSJSParser["keywords"]=({}));(keywords=["break","case","catch","continue","default","delete","do","else","finally","for","function","if","in","instanceof","new","return","switch","this","throw","try","typeof","var","void","while","with","ometa","let","const"]);for(var idx=(0);(idx < keywords["length"]);idx++){(BSJSParser["keywords"][keywords[idx]]=true);}(BSJSParser["_isKeyword"]=(function (k){return this["keywords"].hasOwnProperty(k);}));let BSJSTranslator=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(2898, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(2902);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),2907));return this._endStructure($r1);}),2900);$r0.value=$vars.ans;return this._endStructure($r0);},
"curlyTrans":function(){var $elf=this,$vars={},$r0=this._startStructure(2911, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(2914);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(2918);this._appendStructure($r2,this.exactly("begin"),2920);$r2.value=($vars.r=this._appendStructure($r2,this._apply("curlyTrans"),2924));return this._endStructure($r2);}),2916);$r1.value=$vars.r;return this._endStructure($r1);},function(){var $r1=this._startStructure(2927);this._appendStructure($r1,this._form(function(){var $r2=this._startStructure(2931);this._appendStructure($r2,this.exactly("begin"),2933);$r2.value=($vars.rs=this._appendStructure($r2,this._many(function(){return this._forwardStructure(this._apply("trans"),2939);}),2937));return this._endStructure($r2);}),2929);$r1.value=(("{" + $vars.rs.join(";")) + ";}");return this._endStructure($r1);},function(){var $r1=this._startStructure(2942);$vars.r=this._appendStructure($r1,this._apply("trans"),2945);$r1.value=(("{" + $vars.r) + ";}");return this._endStructure($r1);}),2912);return this._endStructure($r0);},
"this":function(){var $elf=this,$vars={},$r0=this._startStructure(2948, true);$r0.value="this";return this._endStructure($r0);},
"break":function(){var $elf=this,$vars={},$r0=this._startStructure(2950, true);$r0.value="break";return this._endStructure($r0);},
"continue":function(){var $elf=this,$vars={},$r0=this._startStructure(2952, true);$r0.value="continue";return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(2954, true);$vars.n=this._getStructureValue(this.anything());$r0.value=(("(" + $vars.n) + ")");return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(2958, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s.toProgramString();return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(2962, true);$vars.s=this._getStructureValue(this.anything());$r0.value=$vars.s;return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(2966, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(2970, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),2975);}),2973);$r0.value=(("[" + $vars.xs.join(",")) + "]");return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(2978, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),2982);$r0.value=(((("(" + $vars.op) + " ") + $vars.x) + ")");return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(2985, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),2988);$vars.x=this._appendStructure($r0,this._apply("trans"),2991);$r0.value=((($vars.x + "[") + $vars.fd) + "]");return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(2994, true);$vars.x=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"set":function(){var $elf=this,$vars={},$r0=this._startStructure(2998, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),3001);$vars.rhs=this._appendStructure($r0,this._apply("trans"),3004);$r0.value=(((("(" + $vars.lhs) + "=") + $vars.rhs) + ")");return this._endStructure($r0);},
"mset":function(){var $elf=this,$vars={},$r0=this._startStructure(3007, true);$vars.lhs=this._appendStructure($r0,this._apply("trans"),3010);$vars.op=this._getStructureValue(this.anything());$vars.rhs=this._appendStructure($r0,this._apply("trans"),3014);$r0.value=((((("(" + $vars.lhs) + $vars.op) + "=") + $vars.rhs) + ")");return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(3017, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3021);$vars.y=this._appendStructure($r0,this._apply("trans"),3024);$r0.value=(((((("(" + $vars.x) + " ") + $vars.op) + " ") + $vars.y) + ")");return this._endStructure($r0);},
"preop":function(){var $elf=this,$vars={},$r0=this._startStructure(3027, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3031);$r0.value=($vars.op + $vars.x);return this._endStructure($r0);},
"postop":function(){var $elf=this,$vars={},$r0=this._startStructure(3034, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),3038);$r0.value=($vars.x + $vars.op);return this._endStructure($r0);},
"return":function(){var $elf=this,$vars={},$r0=this._startStructure(3041, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3044);$r0.value=("return " + $vars.x);return this._endStructure($r0);},
"with":function(){var $elf=this,$vars={},$r0=this._startStructure(3047, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3050);$vars.s=this._appendStructure($r0,this._apply("curlyTrans"),3053);$r0.value=((("with(" + $vars.x) + ")") + $vars.s);return this._endStructure($r0);},
"if":function(){var $elf=this,$vars={},$r0=this._startStructure(3056, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3059);$vars.t=this._appendStructure($r0,this._apply("curlyTrans"),3062);$vars.e=this._appendStructure($r0,this._apply("curlyTrans"),3065);$r0.value=((((("if(" + $vars.cond) + ")") + $vars.t) + "else") + $vars.e);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(3068, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3071);$vars.t=this._appendStructure($r0,this._apply("trans"),3074);$vars.e=this._appendStructure($r0,this._apply("trans"),3077);$r0.value=(((((("(" + $vars.cond) + "?") + $vars.t) + ":") + $vars.e) + ")");return this._endStructure($r0);},
"while":function(){var $elf=this,$vars={},$r0=this._startStructure(3080, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),3083);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3086);$r0.value=((("while(" + $vars.cond) + ")") + $vars.body);return this._endStructure($r0);},
"doWhile":function(){var $elf=this,$vars={},$r0=this._startStructure(3089, true);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3092);$vars.cond=this._appendStructure($r0,this._apply("trans"),3095);$r0.value=(((("do" + $vars.body) + "while(") + $vars.cond) + ")");return this._endStructure($r0);},
"for":function(){var $elf=this,$vars={},$r0=this._startStructure(3098, true);$vars.init=this._appendStructure($r0,this._apply("trans"),3101);$vars.cond=this._appendStructure($r0,this._apply("trans"),3104);$vars.upd=this._appendStructure($r0,this._apply("trans"),3107);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3110);$r0.value=((((((("for(" + $vars.init) + ";") + $vars.cond) + ";") + $vars.upd) + ")") + $vars.body);return this._endStructure($r0);},
"forIn":function(){var $elf=this,$vars={},$r0=this._startStructure(3113, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3116);$vars.arr=this._appendStructure($r0,this._apply("trans"),3119);$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3122);$r0.value=((((("for(" + $vars.x) + " in ") + $vars.arr) + ")") + $vars.body);return this._endStructure($r0);},
"beginTop":function(){var $elf=this,$vars={},$r0=this._startStructure(3125, true);$vars.xs=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(3130);$vars.x=this._appendStructure($r1,this._apply("trans"),3133);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(3137);this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(3140);$r3.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r3);},function(){return this._forwardStructure(this.end(),3143);}),3139);$r2.value=$vars.x;return this._endStructure($r2);},function(){var $r2=this._startStructure(3146);this._appendStructure($r2,this._apply("empty"),3148);$r2.value=($vars.x + ";");return this._endStructure($r2);}),3135);return this._endStructure($r1);}),3128);$r0.value=$vars.xs.join("");return this._endStructure($r0);},
"begin":function(){var $elf=this,$vars={},$r0=this._startStructure(3152, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(3155);$vars.x=this._appendStructure($r1,this._apply("trans"),3158);this._appendStructure($r1,this.end(),3160);$r1.value=$vars.x;return this._endStructure($r1);},function(){var $r1=this._startStructure(3163);$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(3168);$vars.x=this._appendStructure($r2,this._apply("trans"),3171);$r2.value=this._appendStructure($r2,this._or(function(){var $r3=this._startStructure(3175);this._appendStructure($r3,this._or(function(){var $r4=this._startStructure(3178);$r4.value=this._pred(($vars.x[($vars.x["length"] - (1))] == "}"));return this._endStructure($r4);},function(){return this._forwardStructure(this.end(),3181);}),3177);$r3.value=$vars.x;return this._endStructure($r3);},function(){var $r3=this._startStructure(3184);this._appendStructure($r3,this._apply("empty"),3186);$r3.value=($vars.x + ";");return this._endStructure($r3);}),3173);return this._endStructure($r2);}),3166);$r1.value=(("{" + $vars.xs.join("")) + "}");return this._endStructure($r1);}),3153);return this._endStructure($r0);},
"beginVars":function(){var $elf=this,$vars={},$r0=this._startStructure(3190, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(3193);$vars.decl=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r1,this._apply("trans"),3197);this._appendStructure($r1,this.end(),3199);$r1.value=(($vars.decl + " ") + $vars.x);return this._endStructure($r1);},function(){var $r1=this._startStructure(3202);$vars.decl=this._getStructureValue(this.anything());$vars.xs=this._appendStructure($r1,this._many(function(){var $r2=this._startStructure(3207);$r2.value=($vars.x=this._appendStructure($r2,this._apply("trans"),3210));return this._endStructure($r2);}),3206);$r1.value=(($vars.decl + " ") + $vars.xs.join(","));return this._endStructure($r1);}),3191);return this._endStructure($r0);},
"func":function(){var $elf=this,$vars={},$r0=this._startStructure(3213, true);$vars.args=this._getStructureValue(this.anything());$vars.body=this._appendStructure($r0,this._apply("curlyTrans"),3217);$r0.value=(((("(function (" + $vars.args.join(",")) + ")") + $vars.body) + ")");return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(3220, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),3223);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3228);}),3226);$r0.value=((($vars.fn + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(3231, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),3235);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3240);}),3238);$r0.value=((((($vars.recv + ".") + $vars.msg) + "(") + $vars.args.join(",")) + ")");return this._endStructure($r0);},
"new":function(){var $elf=this,$vars={},$r0=this._startStructure(3243, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3246);$r0.value=("new " + $vars.x);return this._endStructure($r0);},
"assignDesctruct":function(){var $elf=this,$vars={},$r0=this._startStructure(3249, true);$vars.names=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3253);$r0.value=this.genDescructAssign($vars.names,$vars.val);return this._endStructure($r0);},
"assignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(3256, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3260);$r0.value=(($vars.name + "=") + $vars.val);return this._endStructure($r0);},
"noAssignVar":function(){var $elf=this,$vars={},$r0=this._startStructure(3263, true);$vars.name=this._getStructureValue(this.anything());$r0.value=$vars.name;return this._endStructure($r0);},
"throw":function(){var $elf=this,$vars={},$r0=this._startStructure(3267, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3270);$r0.value=("throw " + $vars.x);return this._endStructure($r0);},
"try":function(){var $elf=this,$vars={},$r0=this._startStructure(3273, true);$vars.x=this._appendStructure($r0,this._apply("curlyTrans"),3276);$vars.name=this._getStructureValue(this.anything());$vars.c=this._appendStructure($r0,this._apply("curlyTrans"),3280);$vars.f=this._appendStructure($r0,this._apply("curlyTrans"),3283);$r0.value=((((((("try " + $vars.x) + "catch(") + $vars.name) + ")") + $vars.c) + "finally") + $vars.f);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(3286, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3291);}),3289);$r0.value=(("({" + $vars.props.join(",")) + "})");return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(3294, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),3298);$r0.value=(($vars.name.toProgramString() + ": ") + $vars.val);return this._endStructure($r0);},
"switch":function(){var $elf=this,$vars={},$r0=this._startStructure(3301, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3304);$vars.cases=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),3309);}),3307);$r0.value=(((("switch(" + $vars.x) + "){") + $vars.cases.join(";")) + "}");return this._endStructure($r0);},
"case":function(){var $elf=this,$vars={},$r0=this._startStructure(3312, true);$vars.x=this._appendStructure($r0,this._apply("trans"),3315);$vars.y=this._appendStructure($r0,this._apply("trans"),3318);$r0.value=((("case " + $vars.x) + ": ") + $vars.y);return this._endStructure($r0);},
"default":function(){var $elf=this,$vars={},$r0=this._startStructure(3321, true);$vars.y=this._appendStructure($r0,this._apply("trans"),3324);$r0.value=("default: " + $vars.y);return this._endStructure($r0);}});(BSJSTranslator["genDestructId"]=(function (){if((this["_desctructId"] === undefined)){(this["_desctructId"]=(0));}else{undefined;}return this["_desctructId"]++;}));(BSJSTranslator["genDescructAssign"]=(function (names,value){let tmpName=("$_desc" + this.genDestructId());let ret=((tmpName + "=") + value);for(let i=(0);(i < names["length"]);i++){(ret+=(((((("," + names[i]) + "=") + tmpName) + "[") + i) + "]"));}return ret;}))

