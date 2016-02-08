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
"node":function(){var $elf=this,$vars={},$r0=this._startStructure(304, true);$vars.e=this._getStructureValue(this.anything());this._pred((! $vars.e["builtin"]));$vars.c=this._appendStructure($r0,this._applyWithArgs("trans",$vars.e["expr"]),310);$r0.value=["{name:",$vars.e["name"].toProgramString(),",eval:function(nodes){return ",$vars.c,";}",",inputs:",this._toItemString($vars.e["inputs"]),"}"].join("");return this._endStructure($r0);},
"builtinArgs":function(){var $elf=this,$vars={},$r0=this._startStructure(314, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(317);$r1.value=($vars.xs=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("trans"),322);}),320));return this._endStructure($r1);}),316);$r0.value=$vars.xs.join(",");return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(325, true);$vars.e=this._getStructureValue(this.anything());this._pred($vars.e["builtin"]);$vars.args=this._appendStructure($r0,this._applyWithArgs("builtinArgs",$vars.e["expr"]),331);$r0.value=["{name:",$vars.e["name"].toProgramString(),",builtin:",$vars.e["builtin"].toProgramString(),",start:function(nodes, builtins){return builtins[",$vars.e["builtin"].toProgramString(),"].start(nodes[",$vars.e["name"].toProgramString(),"],",$vars.args,");}",",inputs:",this._toItemString($vars.e["inputs"]),"}"].join("");return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(335, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(338);$r1.value=($vars.ns=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._or(function(){return this._forwardStructure(this._apply("node"),345);},function(){return this._forwardStructure(this._apply("builtin"),347);}),343);}),341));return this._endStructure($r1);}),337);$r0.value=(("[" + $vars.ns.join(",\n")) + "]");return this._endStructure($r0);}});(DataflowJsGen["_toItemString"]=(function (inputs){let items=({});for(let i=(0);(i < inputs["length"]);i++){(items[inputs[i]]=true);}let s="[";for(let i in items){(s+=(i.toProgramString() + ","));}(s+="]");return s;}));(DataflowJsGen["_isInput"]=(function (name){return (this["_inputs"] && (this["_inputs"][name] === true));}));(DataflowJsGen["setInput"]=(function (inputs){(this["_inputs"]=({}));for(let i=(0);(i < inputs["length"]);i++){(this["_inputs"][inputs[i]]=true);};}))
let DataflowParser=objectThatDelegatesTo(BaseStrParser,{
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(351, true);this._appendStructure($r0,this._apply("spaces"),353);$vars.f=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(358);this._appendStructure($r1,this._many1(function(){return this._forwardStructure(this._apply("digit"),362);}),360);$r1.value=this._appendStructure($r1,this._opt(function(){var $r2=this._startStructure(366);this._appendStructure($r2,this.exactly("."),368);$r2.value=this._appendStructure($r2,this._many1(function(){return this._forwardStructure(this._apply("digit"),372);}),370);return this._endStructure($r2);}),364);return this._endStructure($r1);}),356);$r0.value=parseFloat($vars.f);return this._endStructure($r0);},
"nameFirst":function(){var $elf=this,$vars={},$r0=this._startStructure(375, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("letter"),378);},function(){return this._forwardStructure(this.exactly("$"),380);},function(){return this._forwardStructure(this.exactly("_"),382);}),376);return this._endStructure($r0);},
"nameRest":function(){var $elf=this,$vars={},$r0=this._startStructure(384, true);$r0.value=this._appendStructure($r0,this._or(function(){return this._forwardStructure(this._apply("nameFirst"),387);},function(){return this._forwardStructure(this._apply("digit"),389);}),385);return this._endStructure($r0);},
"name":function(){var $elf=this,$vars={},$r0=this._startStructure(391, true);this._appendStructure($r0,this._apply("spaces"),393);$r0.value=this._appendStructure($r0,this._consumedBy(function(){var $r1=this._startStructure(397);this._appendStructure($r1,this._apply("nameFirst"),399);$r1.value=this._appendStructure($r1,this._many(function(){return this._forwardStructure(this._apply("nameRest"),403);}),401);return this._endStructure($r1);}),395);return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(405, true);this._appendStructure($r0,this._applyWithArgs("token","@"),407);$r0.value=this._appendStructure($r0,this._apply("name"),409);return this._endStructure($r0);},
"expr":function(){var $elf=this,$vars={},$r0=this._startStructure(411, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(414);$vars.x=this._appendStructure($r1,this._apply("expr"),417);this._appendStructure($r1,this._applyWithArgs("token","||"),419);$vars.y=this._appendStructure($r1,this._apply("andExpr"),422);$r1.value=["binop","||",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("andExpr"),425);}),412);return this._endStructure($r0);},
"andExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(427, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(430);$vars.x=this._appendStructure($r1,this._apply("andExpr"),433);this._appendStructure($r1,this._applyWithArgs("token","&&"),435);$vars.y=this._appendStructure($r1,this._apply("eqExpr"),438);$r1.value=["binop","&&",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("eqExpr"),441);}),428);return this._endStructure($r0);},
"eqExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(443, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(446);$vars.x=this._appendStructure($r1,this._apply("eqExpr"),449);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(453);this._appendStructure($r2,this._applyWithArgs("token","=="),455);$vars.y=this._appendStructure($r2,this._apply("relExpr"),458);$r2.value=["binop","==",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(461);this._appendStructure($r2,this._applyWithArgs("token","!="),463);$vars.y=this._appendStructure($r2,this._apply("relExpr"),466);$r2.value=["binop","!=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(469);this._appendStructure($r2,this._applyWithArgs("token","==="),471);$vars.y=this._appendStructure($r2,this._apply("relExpr"),474);$r2.value=["binop","===",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(477);this._appendStructure($r2,this._applyWithArgs("token","!=="),479);$vars.y=this._appendStructure($r2,this._apply("relExpr"),482);$r2.value=["binop","!==",$vars.x,$vars.y];return this._endStructure($r2);}),451);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("relExpr"),485);}),444);return this._endStructure($r0);},
"relExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(487, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(490);$vars.x=this._appendStructure($r1,this._apply("relExpr"),493);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(497);this._appendStructure($r2,this._applyWithArgs("token",">"),499);$vars.y=this._appendStructure($r2,this._apply("addExpr"),502);$r2.value=["binop",">",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(505);this._appendStructure($r2,this._applyWithArgs("token",">="),507);$vars.y=this._appendStructure($r2,this._apply("addExpr"),510);$r2.value=["binop",">=",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(513);this._appendStructure($r2,this._applyWithArgs("token","<"),515);$vars.y=this._appendStructure($r2,this._apply("addExpr"),518);$r2.value=["binop","<",$vars.x,$vars.y];return this._endStructure($r2);},function(){var $r2=this._startStructure(521);this._appendStructure($r2,this._applyWithArgs("token","<="),523);$vars.y=this._appendStructure($r2,this._apply("addExpr"),526);$r2.value=["binop","<=",$vars.x,$vars.y];return this._endStructure($r2);}),495);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("addExpr"),529);}),488);return this._endStructure($r0);},
"addExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(531, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(534);$vars.x=this._appendStructure($r1,this._apply("addExpr"),537);this._appendStructure($r1,this._applyWithArgs("token","+"),539);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),542);$r1.value=["binop","+",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(545);$vars.x=this._appendStructure($r1,this._apply("addExpr"),548);this._appendStructure($r1,this._applyWithArgs("token","-"),550);$vars.y=this._appendStructure($r1,this._apply("mulExpr"),553);$r1.value=["binop","-",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("mulExpr"),556);}),532);return this._endStructure($r0);},
"mulExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(558, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(561);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),564);this._appendStructure($r1,this._applyWithArgs("token","*"),566);$vars.y=this._appendStructure($r1,this._apply("unary"),569);$r1.value=["binop","*",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(572);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),575);this._appendStructure($r1,this._applyWithArgs("token","/"),577);$vars.y=this._appendStructure($r1,this._apply("unary"),580);$r1.value=["binop","/",$vars.x,$vars.y];return this._endStructure($r1);},function(){var $r1=this._startStructure(583);$vars.x=this._appendStructure($r1,this._apply("mulExpr"),586);this._appendStructure($r1,this._applyWithArgs("token","%"),588);$vars.y=this._appendStructure($r1,this._apply("unary"),591);$r1.value=["binop","%",$vars.x,$vars.y];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("unary"),594);}),559);return this._endStructure($r0);},
"unary":function(){var $elf=this,$vars={},$r0=this._startStructure(596, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(599);this._appendStructure($r1,this._applyWithArgs("token","-"),601);$vars.p=this._appendStructure($r1,this._apply("primExpr"),604);$r1.value=["unop","-",$vars.p];return this._endStructure($r1);},function(){var $r1=this._startStructure(607);this._appendStructure($r1,this._applyWithArgs("token","+"),609);$vars.p=this._appendStructure($r1,this._apply("primExpr"),612);$r1.value=["unop","+",$vars.p];return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExpr"),615);}),597);return this._endStructure($r0);},
"primExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(617, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(620);$vars.p=this._appendStructure($r1,this._apply("primExpr"),623);$r1.value=this._appendStructure($r1,this._or(function(){var $r2=this._startStructure(627);this._appendStructure($r2,this._applyWithArgs("token","["),629);$vars.i=this._appendStructure($r2,this._apply("expr"),632);this._appendStructure($r2,this._applyWithArgs("token","]"),634);$r2.value=["getp",$vars.i,$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(637);this._appendStructure($r2,this._applyWithArgs("token","."),639);$vars.m=this._appendStructure($r2,this._apply("name"),642);this._appendStructure($r2,this._applyWithArgs("token","("),644);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),647);this._appendStructure($r2,this._applyWithArgs("token",")"),651);$r2.value=["send",$vars.m,$vars.p].concat($vars.as);return this._endStructure($r2);},function(){var $r2=this._startStructure(654);this._appendStructure($r2,this._applyWithArgs("token","."),656);$vars.f=this._appendStructure($r2,this._apply("name"),659);$r2.value=["getp",["string",$vars.f],$vars.p];return this._endStructure($r2);},function(){var $r2=this._startStructure(662);this._appendStructure($r2,this._applyWithArgs("token","("),664);$vars.as=this._appendStructure($r2,this._applyWithArgs("listOf","expr",","),667);this._appendStructure($r2,this._applyWithArgs("token",")"),671);$r2.value=["call",$vars.p].concat($vars.as);return this._endStructure($r2);}),625);return this._endStructure($r1);},function(){var $r1=this._startStructure(674);$vars.b=this._appendStructure($r1,this._apply("builtin"),677);this._appendStructure($r1,this._applyWithArgs("token","("),679);$vars.as=this._appendStructure($r1,this._applyWithArgs("listOf","expr",","),682);this._appendStructure($r1,this._applyWithArgs("token",")"),686);$r1.value=["builtin",$vars.b].concat($vars.as);return this._endStructure($r1);},function(){return this._forwardStructure(this._apply("primExprHd"),689);}),618);return this._endStructure($r0);},
"primExprHd":function(){var $elf=this,$vars={},$r0=this._startStructure(691, true);$r0.value=this._appendStructure($r0,this._or(function(){var $r1=this._startStructure(694);this._appendStructure($r1,this._applyWithArgs("token","("),696);$vars.e=this._appendStructure($r1,this._apply("expr"),699);this._appendStructure($r1,this._applyWithArgs("token",")"),701);$r1.value=$vars.e;return this._endStructure($r1);},function(){var $r1=this._startStructure(704);$vars.n=this._appendStructure($r1,this._apply("name"),707);$r1.value=["get",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(710);$vars.n=this._appendStructure($r1,this._apply("number"),713);$r1.value=["number",$vars.n];return this._endStructure($r1);},function(){var $r1=this._startStructure(716);this._appendStructure($r1,this._applyWithArgs("token","["),718);$vars.es=this._appendStructure($r1,this._applyWithArgs("enum","expr",","),721);this._appendStructure($r1,this._applyWithArgs("token","]"),725);$r1.value=["arr"].concat($vars.es);return this._endStructure($r1);}),692);return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(728, true);$vars.n=this._appendStructure($r0,this._apply("name"),731);this._appendStructure($r0,this._applyWithArgs("token","<-"),733);$vars.e=this._appendStructure($r0,this._apply("expr"),736);$r0.value=["propagate",$vars.n,$vars.e,this._extractLocation($r0)];return this._endStructure($r0);},
"top":function(){var $elf=this,$vars={},$r0=this._startStructure(739, true);this._appendStructure($r0,this._apply("spaces"),741);$vars.pp=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(746);$vars.p=this._appendStructure($r1,this._apply("propagate"),749);this._appendStructure($r1,this._apply("spaces"),751);$r1.value=$vars.p;return this._endStructure($r1);}),744);this._appendStructure($r0,this.end(),754);$r0.value=["program"].concat($vars.pp);return this._endStructure($r0);}})
let flatten1=(function (array){return array.reduce((function (a,b){return a.concat(b);}));});let _e=(function (node){return node["expr"];});let _n=(function (node){return node["nodes"];});let _i=(function (node){return node["inputs"];});let ExtractExpr=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(758, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(762);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),767));return this._endStructure($r1);}),760);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(771, true);$vars.n=this._getStructureValue(this.anything());$r0.value=["number",$vars.n];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(775, true);$vars.s=this._getStructureValue(this.anything());$r0.value=["string",$vars.s];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(779, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["regExpr",$vars.x];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(783, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),788);}),786);$r0.value=["arr"].concat($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(791, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),795);$r0.value=["unop",$vars.op,$vars.x];return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(798, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),801);$vars.x=this._appendStructure($r0,this._apply("trans"),804);$r0.value=["getp",$vars.fd,$vars.x];return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(807, true);$vars.x=this._getStructureValue(this.anything());$r0.value=["get",$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(811, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),815);$vars.y=this._appendStructure($r0,this._apply("trans"),818);$r0.value=["binop",$vars.op,$vars.x,$vars.y];return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(821, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),824);$vars.t=this._appendStructure($r0,this._apply("trans"),827);$vars.e=this._appendStructure($r0,this._apply("trans"),830);$r0.value=["condExpr",$vars.cond,$vars.t,$vars.e];return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(833, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),836);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),841);}),839);$r0.value=["call",$vars.fn].concat($vars.args);return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(844, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),848);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),853);}),851);$r0.value=["send",$vars.msg,$vars.recv].concat($vars.args);return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(856, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),861);}),859);$r0.value=["json"].concat($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(864, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),868);$r0.value=["binding",$vars.name,$vars.val];return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(871, true);$vars.name=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),877);}),875);$r0.value=["get",("@" + $vars.name)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(880, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),884);$vars.l=this._getStructureValue(this.anything());$r0.value=["propagate",$vars.name,$vars.x,$vars.l];return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(888, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),893);}),891);$r0.value=["program"].concat($vars.xs);return this._endStructure($r0);}});let ExtractInputs=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(897, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(901);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),906));return this._endStructure($r1);}),899);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(910, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(914, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(918, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(922, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),927);}),925);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(930, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),934);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(937, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),940);$vars.x=this._appendStructure($r0,this._apply("trans"),943);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(946, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[$vars.x];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(950, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),954);$vars.y=this._appendStructure($r0,this._apply("trans"),957);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(960, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),963);$vars.t=this._appendStructure($r0,this._apply("trans"),966);$vars.e=this._appendStructure($r0,this._apply("trans"),969);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(972, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),975);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),980);}),978);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(983, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),987);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),992);}),990);$r0.value=trans.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(995, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1000);}),998);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1003, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1007);$r0.value=$vars.val;return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1010, true);$vars.name=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1016);}),1014);$r0.value=[("@" + $vars.name)];return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1019, true);$vars.name=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1023);$vars.l=this._getStructureValue(this.anything());$r0.value=$vars.x;return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(1027, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1032);}),1030);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}});let ExtractNodes=objectThatDelegatesTo(OMeta,{
"trans":function(){var $elf=this,$vars={},$r0=this._startStructure(1036, true);this._appendStructure($r0,this._form(function(){var $r1=this._startStructure(1040);$vars.t=this._getStructureValue(this.anything());$r1.value=($vars.ans=this._appendStructure($r1,this._apply($vars.t),1045));return this._endStructure($r1);}),1038);$r0.value=$vars.ans;return this._endStructure($r0);},
"number":function(){var $elf=this,$vars={},$r0=this._startStructure(1049, true);$vars.n=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"string":function(){var $elf=this,$vars={},$r0=this._startStructure(1053, true);$vars.s=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"regExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1057, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"arr":function(){var $elf=this,$vars={},$r0=this._startStructure(1061, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1066);}),1064);$r0.value=flatten1($vars.xs);return this._endStructure($r0);},
"unop":function(){var $elf=this,$vars={},$r0=this._startStructure(1069, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1073);$r0.value=$vars.x;return this._endStructure($r0);},
"getp":function(){var $elf=this,$vars={},$r0=this._startStructure(1076, true);$vars.fd=this._appendStructure($r0,this._apply("trans"),1079);$vars.x=this._appendStructure($r0,this._apply("trans"),1082);$r0.value=$vars.fd.concat($vars.x);return this._endStructure($r0);},
"get":function(){var $elf=this,$vars={},$r0=this._startStructure(1085, true);$vars.x=this._getStructureValue(this.anything());$r0.value=[];return this._endStructure($r0);},
"binop":function(){var $elf=this,$vars={},$r0=this._startStructure(1089, true);$vars.op=this._getStructureValue(this.anything());$vars.x=this._appendStructure($r0,this._apply("trans"),1093);$vars.y=this._appendStructure($r0,this._apply("trans"),1096);$r0.value=$vars.x.concat($vars.y);return this._endStructure($r0);},
"condExpr":function(){var $elf=this,$vars={},$r0=this._startStructure(1099, true);$vars.cond=this._appendStructure($r0,this._apply("trans"),1102);$vars.t=this._appendStructure($r0,this._apply("trans"),1105);$vars.e=this._appendStructure($r0,this._apply("trans"),1108);$r0.value=$vars.cond.concat($vars.t).concat($vars.e);return this._endStructure($r0);},
"call":function(){var $elf=this,$vars={},$r0=this._startStructure(1111, true);$vars.fn=this._appendStructure($r0,this._apply("trans"),1114);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1119);}),1117);$r0.value=$vars.fn.concat(flatten1($vars.args));return this._endStructure($r0);},
"send":function(){var $elf=this,$vars={},$r0=this._startStructure(1122, true);$vars.msg=this._getStructureValue(this.anything());$vars.recv=this._appendStructure($r0,this._apply("trans"),1126);$vars.args=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1131);}),1129);$r0.value=trans.concat(flatten1($vars.args));return this._endStructure($r0);},
"json":function(){var $elf=this,$vars={},$r0=this._startStructure(1134, true);$vars.props=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1139);}),1137);$r0.value=flatten1($vars.props);return this._endStructure($r0);},
"binding":function(){var $elf=this,$vars={},$r0=this._startStructure(1142, true);$vars.name=this._getStructureValue(this.anything());$vars.val=this._appendStructure($r0,this._apply("trans"),1146);$r0.value=$vars.val;return this._endStructure($r0);},
"builtin":function(){var $elf=this,$vars={},$r0=this._startStructure(1149, true);$vars.name=this._getStructureValue(this.anything());$vars.args=this._appendStructure($r0,this._many(function(){var $r1=this._startStructure(1155);$vars.a=this._appendStructure($r1,this.anything(),1158);$vars.e=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1161);$vars.n=this._appendStructure($r1,this._applyWithArgs("trans",$vars.a),1166);$vars.i=this._appendStructure($r1,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1170);$r1.value=({"expr": $vars.e,"nodes": $vars.n,"inputs": $vars.i});return this._endStructure($r1);}),1153);$r0.value=[({"name": ("@" + $vars.name),"expr": $vars.args.map(_e),"inputs": flatten1($vars.args.map(_i)),"builtin": $vars.name})].concat(flatten1($vars.args.map(_n)));return this._endStructure($r0);},
"propagate":function(){var $elf=this,$vars={},$r0=this._startStructure(1176, true);$vars.name=this._getStructureValue(this.anything());$vars.a=this._getStructureValue(this.anything());$vars.e=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractExpr,"trans",$vars.a),1181);$vars.i=this._appendStructure($r0,this._applyWithArgs("foreign",ExtractInputs,"trans",$vars.a),1186);$vars.nodes=this._appendStructure($r0,this._applyWithArgs("trans",$vars.a),1191);$vars.l=this._getStructureValue(this.anything());$r0.value=[({"name": $vars.name,"expr": $vars.e,"inputs": $vars.i})].concat($vars.nodes);return this._endStructure($r0);},
"program":function(){var $elf=this,$vars={},$r0=this._startStructure(1196, true);$vars.xs=this._appendStructure($r0,this._many(function(){return this._forwardStructure(this._apply("trans"),1201);}),1199);$r0.value=flatten1($vars.xs);return this._endStructure($r0);}})

