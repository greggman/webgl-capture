/*
 * Bla??
 */
"use strict";
var WebGLCapture = (function(){

/**
 * Wrapped logging function.
 * @param {string} msg Message to log.
 */
var log = function(msg) {
  if (window.console && window.console.log) {
    window.console.log(msg);
  }
};

var getResourceName = function(resource) {
  if (resource) {
    var info = resource.__capture_info__;
    return info.type + '[' + info.id + ']';
  }
  return 'null';
};

/**
 * Which arguements are enums.
 * @type {!Object.<number, string>}
 */
var glResourceArgs = {
  attachShader:            { 0: true, 1: true },
  bindBuffer:              { 1: true },
  bindFramebuffer:         { 1: true },
  bindRenderbuffer:        { 1: true },
  bindTexture:             { 1: true },
  compileShader:           { 0: true },
  deleteBuffer:            { 0: true },
  deleteFramebuffer:       { 0: true },
  deleteProgram:           { 0: true },
  deleteRenderbuffer:      { 0: true },
  deleteShader:            { 0: true },
  deleteTexture:           { 0: true },
  detachShader:            { 0: true, 1: true, },
  framebufferRenderbuffer: { 3: true },
  framebufferTexture2D:    { 3: true },
  getActiveAttrib:         { 0: true },
  getActiveUniform:        { 0: true },
  getAttachedShaders:      { 0: true },
  getAttribLocation:       { 0: true },
  getProgramParameter:     { 0: true },
  getProgramLogInfo:       { 0: true },
  getShaderParameter:      { 0: true },
  getShaderLogInfo:        { 0: true },
  getShaderSource:         { 0: true },
  getUniform:              { 0: true },
  getUniformLocation:      { 0: true },
  linkProgram:             { 0: true },
  shaderSource:            { 0: true },
  useProgram:              { 0: true },
  validateProgram:         { 0: true },
};

/**
 * Which arguements are enums.
 * @type {!Object.<number, string>}
 */
var glValidEnumContexts = {

  // Generic setters and getters

  'enable': { 0:true },
  'disable': { 0:true },
  'getParameter': { 0:true },

  // Rendering

  'drawArrays': { 0:true },
  'drawElements': { 0:true, 2:true },

  // Shaders

  'createShader': { 0:true },
  'getShaderParameter': { 1:true },
  'getProgramParameter': { 1:true },
  'getShaderPrecisionFormat': { 0: true, 1:true },

  // Vertex attributes

  'getVertexAttrib': { 1:true },
  'vertexAttribPointer': { 2:true },

  // Textures

  'bindTexture': { 0:true },
  'activeTexture': { 0:true },
  'getTexParameter': { 0:true, 1:true },
  'texParameterf': { 0:true, 1:true },
  'texParameteri': { 0:true, 1:true, 2:true },
  'texImage2D': { 0:true, 2:true, 6:true, 7:true },
  'texSubImage2D': { 0:true, 6:true, 7:true },
  'copyTexImage2D': { 0:true, 2:true },
  'copyTexSubImage2D': { 0:true },
  'generateMipmap': { 0:true },

  // Buffer objects

  'bindBuffer': { 0:true },
  'bufferData': { 0:true, 2:true },
  'bufferSubData': { 0:true },
  'getBufferParameter': { 0:true, 1:true },

  // Renderbuffers and framebuffers

  'pixelStorei': { 0:true, 1:true },
  'readPixels': { 4:true, 5:true },
  'bindRenderbuffer': { 0:true },
  'bindFramebuffer': { 0:true },
  'checkFramebufferStatus': { 0:true },
  'framebufferRenderbuffer': { 0:true, 1:true, 2:true },
  'framebufferTexture2D': { 0:true, 1:true, 2:true },
  'getFramebufferAttachmentParameter': { 0:true, 1:true, 2:true },
  'getRenderbufferParameter': { 0:true, 1:true },
  'renderbufferStorage': { 0:true, 1:true },

  // Frame buffer operations (clear, blend, depth test, stencil)

  'clear': { 0:true },
  'depthFunc': { 0:true },
  'blendFunc': { 0:true, 1:true },
  'blendFuncSeparate': { 0:true, 1:true, 2:true, 3:true },
  'blendEquation': { 0:true },
  'blendEquationSeparate': { 0:true, 1:true },
  'stencilFunc': { 0:true },
  'stencilFuncSeparate': { 0:true, 1:true },
  'stencilMaskSeparate': { 0:true },
  'stencilOp': { 0:true, 1:true, 2:true },
  'stencilOpSeparate': { 0:true, 1:true, 2:true, 3:true },

  // Culling

  'cullFace': { 0:true },
  'frontFace': { 0:true },
};

var glEnums = {};

var typedArrays = [
  { name: "Int8Array",         ctor: Int8Array, },
  { name: "Uint8Array",        ctor: Uint8Array, },
  { name: "Unit8ClampedArray", ctor: Uint8ClampedArray, },
  { name: "Int16Array",        ctor: Int16Array, },
  { name: "Uint16Array",       ctor: Uint16Array, },
  { name: "Int32Array",        ctor: Int32Array, },
  { name: "Uint32Array",       ctor: Uint32Array, },
  { name: "Float32Array",      ctor: Float32Array, },
  { name: "Float64Array",      ctor: Float64Array, },
];

var eolRE = /\n/g;
var crRE = /\r/g;
var quoteRE = /"/g;

var glValueToString = function(functionName, argumentIndex, value) {
  if (value === undefined) {
    return 'undefined';
  } else if (value === null) {
    return 'null';
  } else if (typeof(value) === 'number') {
    var funcInfo = glValidEnumContexts[functionName];
    if (funcInfo !== undefined) {
      if (funcInfo[argumentIndex]) {
        if (glEnums[value]) {
          return "gl." + glEnums[value];
        } else {
          return "0x" + value.toString(16);
        }
      }
    }
  } else if (typeof (value) === 'string') {
    return '"' + value.toString().replace(eolRE, "\\n").replace(crRE, "\\n").replace(quoteRE, "\\\"") + '"';
  } else if (value.length !== undefined) {
    var values = [];
    for (var ii = 0; ii < value.length; ++ii) {
      values.push(value[ii].toString());
    }
    for (var ii = 0; ii < typedArrays.length; ++ii) {
      var type = typedArrays[ii];
      if (value instanceof type.ctor) {
        return "new " + type.name + "([" + values.join(", ") + "])";
      }
    }
    return "[" + values.join(", ") + "]";
  } else if (typeof(value) == 'object') {
    var funcInfo = glResourceArgs[functionName];
    if (funcInfo) {
      if (funcInfo[argumentIndex]) {
        return getResourceName(value);
      }
    } else {
      var values = [];
      for (var key in value) {
        if (value.hasOwnProperty(key)) {
          values.push('"' + key + '":' + glValueToString("", -1, value[key]));
        }
      }
      return "{\n    " + values.join(",\n    ") + "}";
    }
  }
  return value.toString();
};

var glArgsToString = function(functionName, args) {
  if (args == undefined) {
    return "";
  }
  var values = [];
  for (var ii = 0; ii < args.length; ++ii) {
    values.push(glValueToString(functionName, ii, args[ii]));
  }
  return values.join(", ");
};

var Capture = function(ctx, opt_options) {
  var options = opt_options || { };
  var self = this;
  this.helper = options.helper === undefined ? true : options.helper;
  this.capture = false;
  this.ctx = ctx;
  this.currentProgram = null;
  this.programs = [];
  this.data = [];
  this.shaderSources = [];
  this.shaderBySource = {
  };
  this.ids = {
  };

  var makePropertyWrapper = function(wrapper, original, propertyName) {
    //log("wrap prop: " + propertyName);
    wrapper.__defineGetter__(propertyName, function() {
      return original[propertyName];
    });
    // TODO(gmane): this needs to handle properties that take more than
    // one value?
    wrapper.__defineSetter__(propertyName, function(value) {
      //log("set: " + propertyName);
      original[propertyName] = value;
    });
  };

  // Makes a function that calls a function on another object.
  var makeFunctionWrapper = function(original, functionName) {
    //log("wrap fn: " + functionName);
    var f = original[functionName];
    return function() {
      //log("call: " + functionName);
      if (self.capture) {
        var str = 'gl.' + functionName + '(' + glArgsToString(functionName, arguments) + ');';
        self.addData(str);
      }
      var result = f.apply(original, arguments);
      return result;
    };
  }

  var wrapFunction = function(name, fn) {
    return function() {
      return fn.call(self, name, arguments);
    }
  };

  var wrapper = {
    capture: this,
  };
  this.wrapper = wrapper;

  for (var propertyName in ctx) {
    if (typeof ctx[propertyName] == 'function') {
      var handler = Capture.prototype["handle_" + propertyName];
      if (handler) {
        wrapper[propertyName] = wrapFunction(propertyName, handler);
      } else {
        wrapper[propertyName] = makeFunctionWrapper(ctx, propertyName);
      }
    } else {
      makePropertyWrapper(wrapper, ctx, propertyName);
    }
  }
};

Capture.prototype.addData = function(str) {
  if (this.capture) {
    this.data.push(function() {
      return str;
    });
  }
};

Capture.prototype.log = function(msg) {
  if (this.capture) {
    log(msg);
  }
};

// TODO: handle extensions
Capture.prototype.handle_getExtension = function(name, args) {
  return null;
};

// TODO: handle extensions
Capture.prototype.handle_getSupportedExtensions = function(name, args) {
  return [];
};

Capture.prototype.handle_shaderSource = function(name, args) {
  var resource = args[0];
  var source = args[1];

  var shaderId = this.shaderBySource[source];
  if (shaderId === undefined) {
    var shaderId = this.shaderSources.length;
    this.shaderSources.push(source);
    this.shaderBySource[source] = shaderId;
  }

  this.addData('gl.' + name + '(' + getResourceName(resource) + ', document.getElementById("shader' + shaderId + '").text);');
  this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.handle_useProgram = function(name, args) {
  this.currentProgram = args[0];
  this.addData('gl.' + name + '(' + getResourceName(this.currentProgram) + ');');
  this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.handle_getUniformLocation = function(name, args) {
  var program = args[0];
  var uniformName = args[1];
  var info = program.__capture_info__;
  if (!info.uniformsByName) {
    info.uniformsByName = { };
  }
  if (!info.uniformsByName[name]) {
    var location = this.ctx.getUniformLocation(program, uniformName);
    if (!location) {
      return null;
    }
    location.__capture_info__ = {
      name: uniformName,
      value: undefined,
    };
    info.uniformsByName[uniformName] = location;
  }
  return info.uniformsByName[uniformName];
};

Capture.prototype.handle_getAttribLocation = function(name, args) {
  var program = args[0];
  var attribName = args[1];
  var info = program.__capture_info__;
  if (!info.attribsByName) {
    info.attribsByName = { };
    info.attribsByLocation = { };
  }
  if (!info.attribsByName[name]) {
    var location = this.ctx.getAttribLocation(program, attribName);
    if (location < 0) {
      return location;
    }
    info.attribsByName[attribName] = location;
    info.attribsByLocation[location] = attribName;
  }
  return info.attribsByName[attribName];
};

Capture.prototype.dumpAttribBindings = function(program) {
  var lines = [];
  var info = program.__capture_info__;
  if (info && info.attribsByName) {
    for (var attrib in info.attribsByName) {
      lines.push('gl.bindAttribLocation(' + getResourceName(program) + ', ' + info.attribsByName[attrib] + ', "' + attrib + '");');
    }
  }
  return lines.join("\n");
};

Capture.prototype.handle_bindAttribLocation = function(name, args) {
  // We don't need to dump bindAttribLocation because we bind all locations at link time.
  this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.handle_linkProgram = function(name, args) {
  var program = args[0];
  // Must bind all attribs before link.
  if (this.capture) {
    var self = this;
    this.data.push(function() {
      return self.dumpAttribBindings(program);
    });
    this.addData('gl.' + name + '(' + getResourceName(program) + ");");
  }
  this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.getContext = function() {
  return this.wrapper;
};

Capture.prototype.begin = function() {
  this.capture = true;
};

Capture.prototype.end = function() {
  this.capture = false;
};

Capture.prototype.dump = function() {
  var lines = [];
  lines.push("<html>\n<body>");

  // dump shaders to script tags
  this.shaderSources.forEach(function(source, index) {
    lines.push('<!-- =================================[ shader' + index + ' ]================== -->');
    lines.push('<script id="shader' + index + '" type="shader">');
    lines.push(source);
    lines.push('</script>');
  });

  lines.push('<!-- =============================[ code ]======================================== -->');
  lines.push('<canvas id="c" width="' + this.ctx.canvas.width + '" height="' + this.ctx.canvas.height + '"></canvas>')
  lines.push("<script>");

  if (this.helper) {
    lines.push("function setUniform(gl, type, program, name) {     ");
    lines.push("  var loc = gl.getUniformLocation(program, name);  ");
    lines.push("  var args = [loc];                                ");
    lines.push("  for (var ii = 4; ii < arguments.length; ++ii) {  ");
    lines.push("    args.push(arguments[ii]);                      ");
    lines.push("  }                                                ");
    lines.push("  gl[type].apply(gl, args);                        ");
    lines.push("}                                                  ");
  }

  lines.push('var canvas = document.getElementById("c");');
  lines.push('var gl = canvas.getContext("experimental-webgl", ' + glValueToString("getContextAttributes", -1, this.ctx.getContextAttributes()) + ')');
  for (var key in this.ids) {
    lines.push("var " + key + ' = [];');
  }
  this.data.forEach(function(func) {
    lines.push(func());
  });
  lines.push("</script>");
  lines.push("</body>\n</html>")
  lines.push("");
  console.log(lines.join("\n"));
  this.data = [];
};

Capture.prototype.handle_uniform = function(name, args) {
  var location = args[0];
  var captureArgs = [];
  for (var jj = 1; jj < args.length; ++jj) {
    var v = args[jj];
    if (v.length) {
      var values = [];
      for (var ii = 0; ii < v.length; ++ii) {
        values.push(v[ii]);
      }
      captureArgs.push("[" + values.join(", ") + "]");
    } else {
      captureArgs.push(v.toString());
    }
  }
  // TODO(gman): handle merging of arrays.
  var info = location.__capture_info__;
  if (this.helper) {
    this.addData('setUniform(gl, "' + name + '", ' + getResourceName(this.currentProgram) + ', "' + info.name + '", ' + captureArgs.join(", ") + ");");
  } else {
    this.addData("gl." + name + "(gl.getUniformLocation(" + getResourceName(this.currentProgram) + ', "' + info.name + '"), ' + captureArgs.join(", ") + ");");
  }
  this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.handle_create = function(name, args) {
  var resource = this.ctx[name].apply(this.ctx, args);
  var shortName = name.substring(6).toLowerCase();

  if (!this.ids[shortName]) {
    this.ids[shortName] = 0;
  }
  var id = this.ids[shortName]++;
  resource.__capture_info__ = {
    id: id,
    type: shortName,
  };
  this.addData(getResourceName(resource) + ' = gl.' + name + '(' + glArgsToString(name, args) + ');');
  return resource;
};

Capture.prototype.handle_get = function(name, args) {
  // Don't need the getXXX calls for playback.
  this.addData('// gl.' + name + '(' + glArgsToString(name, args) + ');');
  return this.ctx[name].apply(this.ctx, args);
};

Capture.prototype.handle_skip = function(name, args) {
  this.addData('// gl.' + name + '(' + glArgsToString(name, args) + ');');
  return this.ctx[name].apply(this.ctx, args);
};

var handlers = {
  handle_skip: [
    "readPixels",
  ],
  handle_get: [
    "getActiveAttrib",
    "getActiveUniform",
    "getAttachedShaders",
//    "getAttribLocation",
    "getBufferParameter",
    "getCheckFramebufferStatus",
    "getFramebufferAttachmentParameter",
    "getError",
    "getParameter",
    "getProgramLogInfo",
    "getProgramParameter",
    "getShaderLogInfo",
    "getShaderParameter",
    "getShaderPrecisionFormat",
    "getShaderSource",
    "getUniform",
//    "getUniformLocation",
    "getTextureParameter",
    "getVertexAttrib",
    "isBuffer",
    "isEnabled",
    "isFramebuffer",
    "isProgram",
    "isRenderbuffer",
    "isShader",
    "isTexture",
  ],
  handle_create: [
    "createBuffer",
    "createFramebuffer",
    "createProgram",
    "createRenderbuffer",
    "createShader",
    "createTexture",
  ],
  handle_uniform: [
   "uniform1f",
   "uniform2f",
   "uniform3f",
   "uniform4f",
   "uniform1i",
   "uniform2i",
   "uniform3i",
   "uniform4i",
   "uniform1fv",
   "uniform2fv",
   "uniform3fv",
   "uniform4fv",
   "uniform1iv",
   "uniform2iv",
   "uniform3iv",
   "uniform4iv",
   "uniformMatrix2fv",
   "uniformMatrix3fv",
   "uniformMatrix4fv",
  ],
};
for (var handler in handlers) {
  var functions = handlers[handler];
  functions.forEach(function(name) {
    Capture.prototype["handle_" + name] = Capture.prototype[handler];
  });
}

var init = function(ctx, opt_options) {
  for (var propertyName in ctx) {
    if (typeof ctx[propertyName] == 'number') {
      glEnums[ctx[propertyName]] = propertyName;
    }
  }
  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  var capture = new Capture(ctx, opt_options);
  return capture.getContext();
};

return {
  init: init,
};

}());


