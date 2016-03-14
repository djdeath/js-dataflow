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
"grammar":function(){var $elf=this,$vars={},$r0=this._startStructure(920, true);this._appendStructure($r0,this._apply("spaces"),922);$vars.pp=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(927);$vars.p=this._appendStructure($r1,this._apply("propagate"),930);this._appendStructure($r1,this._apply("spaces"),932);$r1.value=$vars.p;return this._endStructure($r1);}),925);this._appendStructure($r0,this.end(),935);$r0.value=["dataflow"].concat($vars.pp);return this._endStructure($r0);}});(DataflowParser["_uniqueId"]=(function (base){if((this["_id"] === undefined)){(this["_id"]=(0));}else{undefined;}(this["_id"]+=(1));return ((base + ":") + this["_id"]);}))
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
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1093, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1098);}),1096);$r0.value=["dataflow"].concat($vars.xs);return this._endStructure($r0);}});let ExtractInputs=objectThatDelegatesTo(OMeta,{
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
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1256, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1261);}),1259);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}});let ExtractNodes=objectThatDelegatesTo(OMeta,{
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
"dataflow":function(){var $elf=this,$vars={},$r0=this._startStructure(1449, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1454);}),1452);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}})

