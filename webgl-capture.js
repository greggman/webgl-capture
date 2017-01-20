/*
 * Copyright (c) 2013, Gregg Tavares
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of greggman.com nor the names of its contributors
 *   may be used to endorse or promote products derived from this software
 *   without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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

/**
 * Needed because 'arguments' is not really an array :-(
 */
var copySubArray = function(src, start, len) {
  var dst = [];
  for (var ii = 0; ii < len; ++ii) {
    dst.push(src[start + ii]);
  }
  return dst;
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

  'enable': {1: { 0:true }},
  'disable': {1: { 0:true }},
  'getParameter': {1: { 0:true }},

  // Rendering

  'drawArrays': {3:{ 0:true }},
  'drawElements': {4:{ 0:true, 2:true }},

  // Shaders

  'createShader': {1: { 0:true }},
  'getShaderParameter': {2: { 1:true }},
  'getProgramParameter': {2: { 1:true }},
  'getShaderPrecisionFormat': {2: { 0: true, 1:true }},

  // Vertex attributes

  'getVertexAttrib': {2: { 1:true }},
  'vertexAttribPointer': {6: { 2:true }},

  // Textures

  'bindTexture': {2: { 0:true }},
  'activeTexture': {1: { 0:true }},
  'getTexParameter': {2: { 0:true, 1:true }},
  'texParameterf': {3: { 0:true, 1:true }},
  'texParameteri': {3: { 0:true, 1:true, 2:true }},
  'texImage2D': {
     9: { 0:true, 2:true, 6:true, 7:true },
     6: { 0:true, 2:true, 3:true, 4:true },
  },
  'texSubImage2D': {
    9: { 0:true, 6:true, 7:true },
    7: { 0:true, 4:true, 5:true },
  },
  'copyTexImage2D': {8: { 0:true, 2:true }},
  'copyTexSubImage2D': {8: { 0:true }},
  'generateMipmap': {1: { 0:true }},
  'compressedTexImage2D': {7: { 0: true, 2:true }},
  'compressedTexSubImage2D': {8: { 0: true, 6:true }},

  // Buffer objects

  'bindBuffer': {2: { 0:true }},
  'bufferData': {3: { 0:true, 2:true }},
  'bufferSubData': {3: { 0:true }},
  'getBufferParameter': {2: { 0:true, 1:true }},

  // Renderbuffers and framebuffers

  'pixelStorei': {2: { 0:true, 1:true }},
  'readPixels': {7: { 4:true, 5:true }},
  'bindRenderbuffer': {2: { 0:true }},
  'bindFramebuffer': {2: { 0:true }},
  'checkFramebufferStatus': {1: { 0:true }},
  'framebufferRenderbuffer': {4: { 0:true, 1:true, 2:true }},
  'framebufferTexture2D': {5: { 0:true, 1:true, 2:true }},
  'getFramebufferAttachmentParameter': {3: { 0:true, 1:true, 2:true }},
  'getRenderbufferParameter': {2: { 0:true, 1:true }},
  'renderbufferStorage': {4: { 0:true, 1:true }},

  // Frame buffer operations (clear, blend, depth test, stencil)

  'clear': {1: { 0:true }},
  'depthFunc': {1: { 0:true }},
  'blendFunc': {2: { 0:true, 1:true }},
  'blendFuncSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},
  'blendEquation': {1: { 0:true }},
  'blendEquationSeparate': {2: { 0:true, 1:true }},
  'stencilFunc': {3: { 0:true }},
  'stencilFuncSeparate': {4: { 0:true, 1:true }},
  'stencilMaskSeparate': {2: { 0:true }},
  'stencilOp': {3: { 0:true, 1:true, 2:true }},
  'stencilOpSeparate': {4: { 0:true, 1:true, 2:true, 3:true }},

  // Culling

  'cullFace': {1: { 0:true }},
  'frontFace': {1: { 0:true }},
};

var glEnums = {};

var typedArrays = [
  { name: "Int8Array",         ctor: Int8Array, },
  { name: "Uint8Array",        ctor: Uint8Array, },
  { name: "Uint8ClampedArray", ctor: Uint8ClampedArray, },
  { name: "Int16Array",        ctor: Int16Array, },
  { name: "Uint16Array",       ctor: Uint16Array, },
  { name: "Int32Array",        ctor: Int32Array, },
  { name: "Uint32Array",       ctor: Uint32Array, },
  { name: "Float32Array",      ctor: Float32Array, },
  { name: "Float64Array",      ctor: Float64Array, },
];

var elements = [
  { name: "image", ctor: Image },
  { name: "image", ctor: HTMLImageElement },
  { name: "canvas", ctor: HTMLCanvasElement },
  { name: "video", ctor: HTMLVideoElement },
  { name: "imagedata", ctor: ImageData },
];

var eolRE = /\n/g;
var crRE = /\r/g;
var quoteRE = /"/g;

var glEnumToString = function(value) {
  if (glEnums[value]) {
    return glEnums[value];
  } else {
    return "0x" + value.toString(16);
  }
};

var glValueToString = function(functionName, numArgs, argumentIndex, value) {
  if (value === undefined) {
    return 'undefined';
  } else if (value === null) {
    return 'null';
  } else if (typeof(value) === 'number') {
    var funcInfo = glValidEnumContexts[functionName];
    if (funcInfo !== undefined) {
      var funcInfo = funcInfo[numArgs];
      if (funcInfo !== undefined) {
        if (funcInfo[argumentIndex]) {
          return glEnumToString(value);
        }
      }
    }
  } else if (typeof (value) === 'string') {
    return '"' + value.toString().replace(eolRE, "\\n").replace(crRE, "\\n").replace(quoteRE, "\\\"") + '"';
  } else if (value.length !== undefined) {
    var values = [];
    var step = 32;
    for (var jj = 0; jj < value.length; jj += step) {
      var end = Math.min(jj + step, value.length);
      var sub = [];
      for (var ii = jj; ii < end; ++ii) {
        sub.push(value[ii].toString());
      }
      values.push(sub.join(", "));
    }
    for (var ii = 0; ii < typedArrays.length; ++ii) {
      var type = typedArrays[ii];
      if (value instanceof type.ctor) {
        return "new " + type.name + "([\n" + values.join(",\n") + "\n])";
      }
    }
    return "\n[\n" + values.join(",\n") + "\n]";
  } else if (typeof(value) == 'object') {
    var funcInfo = glResourceArgs[functionName];
    if (funcInfo) {
      if (funcInfo[argumentIndex]) {
        return getResourceName(value);
      }
    } else {
      for (var ii = 0; ii < elements.length; ++ii) {
        var type = elements[ii];
        if (value instanceof type.ctor) {
          return type.name + "<-----------";
        }
      }
      var values = [];
      for (var key in value) {
        if (value.hasOwnProperty(key)) {
          values.push('"' + key + '":' + glValueToString("", 0, -1, value[key]));
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
    values.push(glValueToString(functionName, args.length, ii, args[ii]));
  }
  return values.join(", ");
};

var Dumper = function() {
  this.lines = [];
};

Dumper.prototype.addLine = function(str) {
  this.lines.push(str);
};

Dumper.prototype.dump = function() {
  return this.lines.join("\n");
};

var Inserter = function(element) {
  this.element = element;
  this.root = document.createElement("div");
  this.root.style = "";
  var style = document.createElement("style");
  style.appendChild(document.createTextNode(".canvascapture pre { margin: 0px; }"));
  this.root.appendChild(style);
};

Inserter.prototype.addLine = function(str) {
  var pre = document.createElement("pre");
  pre.appendChild(document.createTextNode(str));
  this.root.appendChild(pre);
};

Inserter.prototype.finish = function() {
  var style = this.root.style;
  style.position = "absolute";
  style.zIndex = 100000;
  style.left = "0px";
  style.top = "0px";
  style.width = "100%";
  style.height = "100%";
  style.overflow = "scroll";
  style.color = "white";
  style.backgroundColor = "rgba(0,0,0,0.6)";
  this.element.appendChild(this.root);
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
var makeFunctionWrapper = function(apiName, original, functionName, capturer) {
  //log("wrap fn: " + functionName);
  var f = original[functionName];
  return function() {
    //log("call: " + functionName);
    if (capturer.capture) {
      var str = apiName + '.' + functionName + '(' + glArgsToString(functionName, arguments) + ');';
      capturer.addData(str);
    }
    var result = f.apply(original, arguments);
    return result;
  };
}

var wrapFunction = function(name, fn, helper) {
  return function() {
    return fn.call(helper, name, arguments);
  }
};

var makeWrapper = function(apiName, original, helper, capturer) {
  var wrapper = {};
  for (var propertyName in original) {
    if (typeof original[propertyName] == 'number') {
      glEnums[original[propertyName]] = apiName + "." + propertyName;
    }
    if (typeof original[propertyName] == 'function') {
      var handler = helper.constructor.prototype["handle_" + propertyName];
      if (handler) {
        wrapper[propertyName] = wrapFunction(propertyName, handler, helper);
      } else {
        wrapper[propertyName] = makeFunctionWrapper(apiName, original, propertyName, capturer);
      }
    } else {
      makePropertyWrapper(wrapper, original, propertyName);
    }
  }
  return wrapper;
};

var WebGLWrapper = function(ctx, capturer) {
  this.ctx = ctx;
  this.capturer = capturer;
  this.currentProgram = null;
  this.programs = [];
  this.numImages = 0;
  this.images = {};
  this.extensions = {};
  this.shaderSources = [];
  var gl = this.ctx;
  this.fb = gl.createFramebuffer();
  this.shaderBySource = {
  };
  this.ids = {
  };

  this.wrapper = makeWrapper("gl", gl, this, capturer);
};

WebGLWrapper.prototype.generate = function(out) {
  // dump shaders to script tags
  this.shaderSources.forEach(function(source, index) {
    out.addLine('<!-- =================================[ shader' + index + ' ]================== -->');
    out.addLine('<script id="shader' + index + '" type="shader">');
    out.addLine(source);
    out.addLine('</script>');
  });

  out.addLine('<!-- =============================[ code ]======================================== -->');
  out.addLine('<canvas id="c" width="' + this.ctx.canvas.width + '" height="' + this.ctx.canvas.height + '"></canvas>')
  out.addLine("<script>");

  if (this.helper) {
    out.addLine("function setUniform(gl, type, program, name) {     ");
    out.addLine("  var loc = gl.getUniformLocation(program, name);  ");
    out.addLine("  var args = [loc];                                ");
    out.addLine("  for (var ii = 4; ii < arguments.length; ++ii) {  ");
    out.addLine("    args.push(arguments[ii]);                      ");
    out.addLine("  }                                                ");
    out.addLine("  gl[type].apply(gl, args);                        ");
    out.addLine("}                                                  ");
  }

  if (this.numImages) {
    out.addLine("var imageUrls = [                    ");
    for (var key in this.images) {
      out.addLine('  "' + key + '",');
    }
    out.addLine("];")
    out.addLine("var images = { };                    ");
    out.addLine("function loadImages() {              ");
    out.addLine("  var count = 0;                     ");
    out.addLine("  var checkFinished = function() {   ");
    out.addLine("    --count;                         ");
    out.addLine("    if (!count) {                    ");
    out.addLine("      render();                      ");
    out.addLine("    }                                ");
    out.addLine("  };                                 ");
    out.addLine("  imageUrls.forEach(function(url) {  ");
    out.addLine("    ++count;                         ");
    out.addLine("    var img = new Image();           ");
    out.addLine("    img.onload = checkFinished;      ");
    out.addLine("    img.src = url;                   ");
    out.addLine("    images[url] = img;               ");
    out.addLine("  });                                ");
    out.addLine("}                                    ");
  }

  out.addLine('var canvas = document.getElementById("c");');
  out.addLine('var gl = canvas.getContext("experimental-webgl", ' + glValueToString("getContextAttributes", 0, -1, this.ctx.getContextAttributes()) + ');');

  // Add extension objects.
  for (var key in this.extensions) {
    out.addLine("var " + key + ' = gl.getExtension("' + key + '");');
  }

  // Add resource arrays.
  for (var key in this.ids) {
    out.addLine("var " + key + ' = [];');
  }
  out.addLine("function render() {");

  // FIX:
  this.capturer.data.forEach(function(func) {
    out.addLine(func());
  });
  out.addLine("}");

  if (this.numImages) {
    out.addLine("loadImages();");
  } else {
    out.addLine("render();");
  }

  out.addLine("</script>");
};

// TODO: handle extensions
WebGLWrapper.prototype.handle_getExtension = function(name, args) {
  var extensionName = args[0].toLowerCase();
  var extension = this.extensions[extensionName];
  if (!extension) {
    extension = this.ctx[name].apply(this.ctx, args);
    if (extension) {
      extension = makeWrapper(extensionName, extension, {}, this.capturer);
      this.extensions[extensionName] = extension;
    }
  }
  return extension;
};

WebGLWrapper.prototype.handle_shaderSource = function(name, args) {
  var resource = args[0];
  var source = args[1];

  var shaderId = this.shaderBySource[source];
  if (shaderId === undefined) {
    var shaderId = this.shaderSources.length;
    this.shaderSources.push(source);
    this.shaderBySource[source] = shaderId;
  }

  this.capturer.addData('gl.' + name + '(' + getResourceName(resource) + ', document.getElementById("shader' + shaderId + '").text);');
  this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_useProgram = function(name, args) {
  this.currentProgram = args[0];
  this.capturer.addData('gl.' + name + '(' + getResourceName(this.currentProgram) + ');');
  this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_getUniformLocation = function(name, args) {
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

WebGLWrapper.prototype.handle_getAttribLocation = function(name, args) {
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

WebGLWrapper.prototype.dumpAttribBindings = function(program) {
  var lines = [];
  var info = program.__capture_info__;
  if (info && info.attribsByName) {
    for (var attrib in info.attribsByName) {
      lines.push('gl.bindAttribLocation(' + getResourceName(program) + ', ' + info.attribsByName[attrib] + ', "' + attrib + '");');
    }
  }
  return lines.join("\n");
};

WebGLWrapper.prototype.handle_bindAttribLocation = function(name, args) {
  // We don't need to dump bindAttribLocation because we bind all locations at link time.
  this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_linkProgram = function(name, args) {
  var program = args[0];
  // Must bind all attribs before link.
  if (this.capturer.capture) {
    var self = this;
    this.capturer.addFn(function() {
      return self.dumpAttribBindings(program);
    });
    this.capturer.addData('gl.' + name + '(' + getResourceName(program) + ");");
  }
  this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_uniform = function(name, args) {
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
    this.capturer.addData('setUniform(gl, "' + name + '", ' + getResourceName(this.currentProgram) + ', "' + info.name + '", ' + captureArgs.join(", ") + ");");
  } else {
    this.capturer.addData("gl." + name + "(gl.getUniformLocation(" + getResourceName(this.currentProgram) + ', "' + info.name + '"), ' + captureArgs.join(", ") + ");");
  }
  this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_create = function(name, args) {
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
  this.capturer.addData(getResourceName(resource) + ' = gl.' + name + '(' + glArgsToString(name, args) + ');');
  return resource;
};

WebGLWrapper.prototype.doTexImage2DForImage = function(name, image, args) {
  var gl = this.ctx;
  var fb = this.fb;
  var newArgs = copySubArray(args, 0, args.length - 1);
  newArgs.push(null);
  var argStr = glArgsToString(name, newArgs);
  argStr = argStr.replace('null', 'images["' + image.src + '"]');
  this.images[image.src] = true;
  ++this.numImages;
  this.capturer.addData('gl.' + name + '(' + argStr + ');');
//  var oldFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
//  var texBinding = target == gl.TEXTURE_2D ? gl.TEXTURE_BINDING_2D : gl.TEXTURE_BINDING_CUBE_MAP;
//  var tex = gl.getParameter(texBinding);
//  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
//  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, tex, 0);
//  var status =gl.checkFramebufferStatus(gl.FRAMEBUFFER);
//  if (status != gl.FRAMEBUFFER_COMPLETE) {
//    throw('webgl-capture: Need to render texture to readable format');
//  }
//  console.log('getting image: ' + image.src + ", " + image.width + ", " + image.height);
//  var data = new Uint8Array(image.width * image.height * 4);
//  gl.readPixels(0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
//  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, null, 0);
//  gl.bindFramebuffer(gl.FRAMEBUFFER, oldFb);
//  var newArgs = [target, level, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data];
//  this.capturer.addData('gl.' + name + '(' + glArgsToString(name, newArgs) + ');');
};

WebGLWrapper.prototype.doTexImage2DForImageData = function(name, imageData, args) {
  var target = args[0];
  var level = args[1];
  var internalFormat = args[2];
  var format = args[3];
  var type = args[4];

  var newArgs = [target, level, internalFormat, imageData.width, imageData.height, 0, format, type, imageData.data];
  this.capturer.addData('gl.' + name + '(' + glArgsToString(name, newArgs) + ');');
};

WebGLWrapper.prototype.handle_texImage2D = function(name, args) {
  this.ctx[name].apply(this.ctx, args);
  // lastarg is always data.
  var data = args[args.length - 1];
  if (data instanceof HTMLCanvasElement) {
    // Extract as ImageData
    this.doTexImage2DForImageData(name, data.getImageData(0, 0, data.width, data.height), args);
  } else if (data instanceof ImageData) {
    this.doTexImage2DForImageData(name, data, args);
  } else if (data instanceof HTMLImageElement ||
             data instanceof Image ||
             data instanceof HTMLVideoElement) {
    // Extract data.
    this.doTexImage2DForImage(name, data, args);
  } else {
    // Assume it's array buffer
    this.capturer.addData('gl.' + name + '(' + glArgsToString(name, args) + ');');
  }
};

WebGLWrapper.prototype.handle_get = function(name, args) {
  // Don't need the getXXX calls for playback.
  this.capturer.addData('// gl.' + name + '(' + glArgsToString(name, args) + ');');
  return this.ctx[name].apply(this.ctx, args);
};

WebGLWrapper.prototype.handle_skip = function(name, args) {
  this.capturer.addData('// gl.' + name + '(' + glArgsToString(name, args) + ');');
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
    "getSupportedExtensions",
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
    WebGLWrapper.prototype["handle_" + name] = WebGLWrapper.prototype[handler];
  });
}

var Capture = function(ctx, opt_options) {
  var options = opt_options || { };
  var self = this;
  this.helper = options.helper === undefined ? true : options.helper;
  this.capture = false;
  this.data = [];

  var helper = new WebGLWrapper(ctx, this);
  this.webglHelper = helper;
  this.webglWrapper = helper.wrapper;
  this.webglWrapper.capture = this;
};

Capture.prototype.addFn = function(fn) {
  this.data.push(fn);
};

Capture.prototype.addData = function(str) {
  if (this.capture) {
    this.addFn(function() {
      return str;
    });
  }
};

Capture.prototype.log = function(msg) {
  if (this.capture) {
    log(msg);
  }
};

Capture.prototype.getContext = function() {
  return this.webglWrapper;
};

Capture.prototype.begin = function() {
  this.capture = true;
};

Capture.prototype.end = function() {
  this.capture = false;
};


Capture.prototype.insertInElement = function(element) {
  var inserter = new Inserter(element);
  this.generate(inserter);
  inserter.finish();
};

Capture.prototype.dump = function() {
  var dumper = new Dumper();
  this.generate(dumper);
  return dumper.dump("\n");
};

Capture.prototype.generate = function(out) {
  out.addLine("<html>\n<body>");
  this.webglHelper.generate(out);
  out.addLine("</body>\n</html>")
  out.addLine("");
  this.data = [];
};

// Wrap cavnas.getContext;
var autoCapture = true;

var init = function(ctx, opt_options) {
  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  if (!ctx.capture) {
    ctx.capture = new Capture(ctx, opt_options);
    if (autoCapture) {
      ctx.capture.begin();
    }
  }
  return ctx.capture.getContext();
};

HTMLCanvasElement.prototype.getContext = (function(oldFn) {
  return function() {
    var ctx = oldFn.apply(this, arguments)
    var type = arguments[0];
    if (autoCapture && (type == "experimental-webgl" || type == "webgl")) {
      ctx = init(ctx);
    }
    return ctx;
  };
}(HTMLCanvasElement.prototype.getContext));

var setAutoCapture = function(capture) {
  autoCapture = capture;
};

return {
  init: init,
  setAutoCapture: setAutoCapture,
};

}());



