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
/* global WebGLObject */
const WebGLCapture = (function(){


const getResourceName = function(resource) {
  if (resource) {
    const info = resource.__capture_info__;
    return `${info.type}[${info.id}]`;
  }
  return 'null';
};

const glEnums = {};

function glEnumToString(value) {
  return glEnums[value];
}

/**
 * Types of contexts we have added to map
 */
const mappedContextTypes = {};

/**
 * Map of names to numbers.
 * @type {Object}
 */
const enumStringToValue = {};

/**
 * Initializes this module. Safe to call more than once.
 * @param {!WebGLRenderingContext} ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
function addEnumsForContext(ctx, type) {
  if (!mappedContextTypes[type]) {
    mappedContextTypes[type] = true;
    for (const propertyName in ctx) {
      if (typeof ctx[propertyName] === 'number') {
        //glEnums[ctx[propertyName]] = propertyName;
        enumStringToValue[propertyName] = ctx[propertyName];
      }
    }
  }
}

function enumArrayToString(gl, enums) {
  const enumStrings = [];
  if (enums.length) {
    for (let i = 0; i < enums.length; ++i) {
      enums.push(glEnumToString(enums[i]));  // eslint-disable-line
    }
    return `[${enumStrings.join(', ')}]`;
  }
  return enumStrings.toString();
}

function makeBitFieldToStringFunc(enums) {
  return function(gl, value) {
    let orResult = 0;
    const orEnums = [];
    for (let i = 0; i < enums.length; ++i) {
      const enumValue = enumStringToValue[enums[i]];
      if ((value & enumValue) !== 0) {
        orResult |= enumValue;
        orEnums.push(glEnumToString(enumValue));  // eslint-disable-line
      }
    }
    if (orResult === value) {
      return orEnums.join(' | ');
    } else {
      return glEnumToString(value);  // eslint-disable-line
    }
  };
}

const destBufferBitFieldToString = makeBitFieldToStringFunc([
  'COLOR_BUFFER_BIT',
  'DEPTH_BUFFER_BIT',
  'STENCIL_BUFFER_BIT',
]);

function convertToObjectIfArray(obj, key) {
  if (Array.isArray(obj[key])) {
    obj[key] = Object.fromEntries(obj[key].map(ndx => [Math.abs(ndx), ndx]));
  }
}

function checkArrayForUniform() {}
function checkArrayForUniformWithOffset() {}
function checkArrayForUniformWithOffsetAndLength() {}
function checkTypedArrayWithOffset() {}
function checkOptionalTypedArrayWithOffset() {}
function checkBufferSourceWithOffset() {}
function checkBufferSourceWithOffsetAndLength() {}
function getUniformNameErrorMsg() {}

/**
 * Info about functions based on the number of arguments to the function.
 *
 * enums specifies which arguments are enums
 *
 *    'texImage2D': {
 *       9: { enums: [0, 2, 6, 7 ] },
 *       6: { enums: [0, 2, 3, 4 ] },
 *    },
 *
 * means if there are 9 arguments then 6 and 7 are enums, if there are 6
 * arguments 3 and 4 are enums. You can provide a function instead in
 * which case you should use object format. For example
 *
 *     `clear`: {
 *       1: { enums: { 0: convertClearBitsToString }},
 *     },
 *
 * numbers specifies which arguments are numbers, if an argument is negative that
 * argument might not be a number so we can check only check for NaN
 * arrays specifies which arguments are arrays
 *
 * @type {!Object.<number, (!Object.<number, string>|function)}
 */
const glFunctionInfos = {
  // Generic setters and getters

  'enable': {1: { enums: [0] }},
  'disable': {1: { enums: [0] }},
  'getParameter': {1: { enums: [0] }},

  // Rendering

  'drawArrays': {3:{ enums: [0], numbers: [1, 2] }},
  'drawElements': {4:{ enums: [0, 2], numbers: [1, 3] }},
  'drawArraysInstanced': {4: { enums: [0], numbers: [1, 2, 3] }},
  'drawElementsInstanced': {5: { enums: [0, 2], numbers: [1, 3, 4] }},
  'drawRangeElements': {6: { enums: [0, 4], numbers: [1, 2, 3, 5] }},

  // Shaders

  'createShader': {1: { enums: [0] }},
  'getActiveAttrib': {2: { numbers: [1] }},
  'getActiveUniform': {2: { numbers: [1] }},
  'getShaderParameter': {2: { enums: [1] }},
  'getProgramParameter': {2: { enums: [1] }},
  'getShaderPrecisionFormat': {2: { enums: [0, 1] }},
  'bindAttribLocation': {3: {numbers: [1]}},

  // Vertex attributes

  'getVertexAttrib': {2: { enums: [1], numbers: [0] }},
  'vertexAttribPointer': {6: { enums: [2], numbers: [0, 1, 4, 5] }},
  'vertexAttribIPointer': {5: { enums: [2], numbers: [0, 1, 3, 4] }},  // WebGL2
  'vertexAttribDivisor': {2: { numbers: [0, 1] }}, // WebGL2
  'disableVertexAttribArray': {1: {numbers: [0] }},
  'enableVertexAttribArray': {1: {numbers: [0] }},

  // Textures

  'bindTexture': {2: { enums: [0] }},
  'activeTexture': {1: { enums: [0, 1] }},
  'getTexParameter': {2: { enums: [0, 1] }},
  'texParameterf': {3: { enums: [0, 1] }},
  'texParameteri': {3: { enums: [0, 1, 2] }},
  'texImage2D': {
    9: { enums: [0, 2, 6, 7], numbers: [1, 3, 4, 5], arrays: [-8], },
    6: { enums: [0, 2, 3, 4], },
    10: { enums: [0, 2, 6, 7], numbers: [1, 3, 4, 5, 9], arrays: {8: checkOptionalTypedArrayWithOffset }, }, // WebGL2
  },
  'texImage3D': {
    10: { enums: [0, 2, 7, 8], numbers: [1, 3, 4, 5] },  // WebGL2
    11: { enums: [0, 2, 7, 8], numbers: [1, 3, 4, 5, 10], arrays: {9: checkTypedArrayWithOffset}},  // WebGL2
  },
  'texSubImage2D': {
    9: { enums: [0, 6, 7], numbers: [1, 2, 3, 4, 5] },
    7: { enums: [0, 4, 5], numbers: [1, 2, 3] },
    10: { enums: [0, 6, 7], numbers: [1, 2, 3, 4, 5, 9], arrays: {9: checkTypedArrayWithOffset} },  // WebGL2
  },
  'texSubImage3D': {
    11: { enums: [0, 8, 9], numbers: [1, 2, 3, 4, 5, 6, 7] },  // WebGL2
    12: { enums: [0, 8, 9], numbers: [1, 2, 3, 4, 5, 6, 7, 11], arrays: {10: checkTypedArrayWithOffset} },  // WebGL2
  },
  'texStorage2D': { 5: { enums: [0, 2], numbers: [1, 3, 4] }},  // WebGL2
  'texStorage3D': { 6: { enums: [0, 2], numbers: [1, 3, 4, 6] }},  // WebGL2
  'copyTexImage2D': {8: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, 7] }},
  'copyTexSubImage2D': {8: { enums: [0], numbers: [1, 2, 3, 4, 5, 6, 7]}},
  'copyTexSubImage3D': {9: { enums: [0], numbers: [1, 2, 3, 4, 5, 6, 7, 8] }},  // WebGL2
  'generateMipmap': {1: { enums: [0] }},
  'compressedTexImage2D': {
    7: { enums: [0, 2], numbers: [1, 3, 4, 5] },
    8: { enums: [0, 2], numbers: [1, 3, 4, 5, 7] },  // WebGL2
    9: { enums: [0, 2], numbers: [1, 3, 4, 5, 7, 8] },  // WebGL2
  },
  'compressedTexSubImage2D': {
    8: { enums: [0, 6], numbers: [1, 2, 3, 4, 5] },
    9: { enums: [0, 6], numbers: [1, 2, 3, 4, 5, 8] },  // WebGL2
    10: { enums: [0, 6], numbers: [1, 2, 3, 4, 5, 8, 9] },  // WebGL2
  },
  'compressedTexImage3D': {
    8: { enums: [0, 2], numbers: [1, 3, 4, 5, 6] },  // WebGL2
    9: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, -7, 8] },  // WebGL2
    10: { enums: [0, 2], numbers: [1, 3, 4, 5, 6, 8, 9] },  // WebGL2
  },
  'compressedTexSubImage3D': {
    12: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11] },  // WebGL2
    11: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8, -9, 10] },  // WebGL2
    10: { enums: [0, 8], numbers: [1, 2, 3, 4, 5, 6, 7, 8] },  // WebGL2
  },

  // Buffer objects

  'bindBuffer': {2: { enums: [0] }},
  'bufferData': {
    3: { enums: [0, 2], numbers: [-1], arrays: [-1] },
    4: { enums: [0, 2], numbers: [-1, 3], arrays: { 1: checkBufferSourceWithOffset } },  // WebGL2
    5: { enums: [0, 2], numbers: [-1, 3, 4], arrays: { 1: checkBufferSourceWithOffsetAndLength } },  // WebGL2
  },
  'bufferSubData': {
    3: { enums: [0], numbers: [1], arrays: [2] },
    4: { enums: [0], numbers: [1, 3], arrays: {2: checkBufferSourceWithOffset} },  // WebGL2
    5: { enums: [0], numbers: [1, 3, 4], arrays: {2: checkBufferSourceWithOffsetAndLength} },  // WebGL2
  },
  'copyBufferSubData': {
    5: { enums: [0], numbers: [2, 3, 4] },  // WebGL2
  },
  'getBufferParameter': {2: { enums: [0, 1] }},
  'getBufferSubData': {
    3: { enums: [0], numbers: [1] },  // WebGL2
    4: { enums: [0], numbers: [1, 3] },  // WebGL2
    5: { enums: [0], numbers: [1, 3, 4] },  // WebGL2
  },

  // Renderbuffers and framebuffers

  'pixelStorei': {2: { enums: [0, 1], numbers: [1] }},
  'readPixels': {
    7: { enums: [4, 5], numbers: [0, 1, 2, 3, -6] },
    8: { enums: [4, 5], numbers: [0, 1, 2, 3, 7] },  // WebGL2
  },
  'bindRenderbuffer': {2: { enums: [0] }},
  'bindFramebuffer': {2: { enums: [0] }},
  'blitFramebuffer': {10: { enums: { 8: destBufferBitFieldToString, 9:true }, numbers: [0, 1, 2, 3, 4, 5, 6, 7]}},  // WebGL2
  'checkFramebufferStatus': {1: { enums: [0] }},
  'framebufferRenderbuffer': {4: { enums: [0, 1, 2], }},
  'framebufferTexture2D': {5: { enums: [0, 1, 2], numbers: [4] }},
  'framebufferTextureLayer': {5: { enums: [0, 1], numbers: [3, 4] }},  // WebGL2
  'getFramebufferAttachmentParameter': {3: { enums: [0, 1, 2] }},
  'getInternalformatParameter': {3: { enums: [0, 1, 2] }},  // WebGL2
  'getRenderbufferParameter': {2: { enums: [0, 1] }},
  'invalidateFramebuffer': {2: { enums: { 0: true, 1: enumArrayToString, } }},  // WebGL2
  'invalidateSubFramebuffer': {6: { enums: { 0: true, 1: enumArrayToString, }, numbers: [2, 3, 4, 5] }},  // WebGL2
  'readBuffer': {1: { enums: [0] }},  // WebGL2
  'renderbufferStorage': {4: { enums: [0, 1], numbers: [2, 3] }},
  'renderbufferStorageMultisample': {5: { enums: [0, 2], numbers: [1, 3, 4] }},  // WebGL2

  // Frame buffer operations (clear, blend, depth test, stencil)

  'lineWidth': {1: {numbers: [0]}},
  'polygonOffset': {2: {numbers: [0, 1]}},
  'scissor': {4: { numbers: [0, 1, 2, 3]}},
  'viewport': {4: { numbers: [0, 1, 2, 3]}},
  'clear': {1: { enums: { 0: destBufferBitFieldToString } }},
  'clearColor': {4: { numbers: [0, 1, 2, 3]}},
  'clearDepth': {1: { numbers: [0]}},
  'clearStencil': {1: { numbers: [0]}},
  'depthFunc': {1: { enums: [0] }},
  'depthRange': {2: { numbers: [0, 1]}},
  'blendColor': {4: { numbers: [0, 1, 2, 3]}},
  'blendFunc': {2: { enums: [0, 1] }},
  'blendFuncSeparate': {4: { enums: [0, 1, 2, 3] }},
  'blendEquation': {1: { enums: [0] }},
  'blendEquationSeparate': {2: { enums: [0, 1] }},
  'stencilFunc': {3: { enums: [0], numbers: [1, 2] }},
  'stencilFuncSeparate': {4: { enums: [0, 1], numberS: [2, 3] }},
  'stencilMask': {1: { numbers: [0] }},
  'stencilMaskSeparate': {2: { enums: [0], numbers: [1] }},
  'stencilOp': {3: { enums: [0, 1, 2] }},
  'stencilOpSeparate': {4: { enums: [0, 1, 2, 3] }},

  // Culling

  'cullFace': {1: { enums: [0] }},
  'frontFace': {1: { enums: [0] }},

  // ANGLE_instanced_arrays extension

  'drawArraysInstancedANGLE': {4: { enums: [0], numbers: [1, 2, 3] }},
  'drawElementsInstancedANGLE': {5: { enums: [0, 2], numbers: [1, 3, 4] }},

  // EXT_blend_minmax extension

  'blendEquationEXT': {1: { enums: [0] }},

  // Multiple Render Targets

  'drawBuffersWebGL': {1: { enums: { 0: enumArrayToString, }, arrays: [0] }},  // WEBGL_draw_buffers
  'drawBuffers': {1: { enums: { 0: enumArrayToString, }, arrays: [0] }},  // WebGL2
  'clearBufferfv': {
    3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
    4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
  },
  'clearBufferiv': {
    3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
    4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
  },
  'clearBufferuiv': {
    3: { enums: [0], numbers: [1], arrays: [2] },  // WebGL2
    4: { enums: [0], numbers: [1, 2], arrays: [2] },  // WebGL2
  },
  'clearBufferfi': { 4: { enums: [0], numbers: [1, 2, 3] }},  // WebGL2

  // uniform value setters
  'uniform1f': { 2: {numbers: [1]} },
  'uniform2f': { 3: {numbers: [1, 2]} },
  'uniform3f': { 4: {numbers: [1, 2, 3]} },
  'uniform4f': { 5: {numbers: [1, 2, 3, 4]} },

  'uniform1i': { 2: {numbers: [1]} },
  'uniform2i': { 3: {numbers: [1, 2]} },
  'uniform3i': { 4: {numbers: [1, 2, 3]} },
  'uniform4i': { 5: {numbers: [1, 2, 3, 4]} },

  'uniform1fv': {
    2: {arrays: {1: checkArrayForUniform(1)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(1)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(1)}, numbers: [2, 3]},
  },
  'uniform2fv': {
    2: {arrays: {1: checkArrayForUniform(2)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(2)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(2)}, numbers: [2, 3]},
  },
  'uniform3fv': {
    2: {arrays: {1: checkArrayForUniform(3)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(3)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(3)}, numbers: [2, 3]},
  },
  'uniform4fv': {
    2: {arrays: {1: checkArrayForUniform(4)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(4)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(4)}, numbers: [2, 3]},
  },

  'uniform1iv': {
    2: {arrays: {1: checkArrayForUniform(1)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(1)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(1)}, numbers: [2, 3]},
  },
  'uniform2iv': {
    2: {arrays: {1: checkArrayForUniform(2)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(2)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(2)}, numbers: [2, 3]},
  },
  'uniform3iv': {
    2: {arrays: {1: checkArrayForUniform(3)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(3)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(3)}, numbers: [2, 3]},
  },
  'uniform4iv': {
    2: {arrays: {1: checkArrayForUniform(4)}},
    3: {arrays: {1: checkArrayForUniformWithOffset(4)}, numbers: [2]},
    4: {arrays: {1: checkArrayForUniformWithOffsetAndLength(4)}, numbers: [2, 3]},
  },

  'uniformMatrix2fv': {
    3: {arrays: {2: checkArrayForUniform(4)}},
    4: {arrays: {2: checkArrayForUniformWithOffset(4)}, numbers: [3]},
    5: {arrays: {2: checkArrayForUniformWithOffsetAndLength(4)}, numbers: [3, 4]},
  },
  'uniformMatrix3fv': {
    3: {arrays: {2: checkArrayForUniform(9)}},
    4: {arrays: {2: checkArrayForUniformWithOffset(9)}, numbers: [3]},
    5: {arrays: {2: checkArrayForUniformWithOffsetAndLength(9)}, numbers: [3, 4]},
  },
  'uniformMatrix4fv': {
    3: {arrays: {2: checkArrayForUniform(16)}},
    4: {arrays: {2: checkArrayForUniformWithOffset(16)}, numbers: [3]},
    5: {arrays: {2: checkArrayForUniformWithOffsetAndLength(16)}, numbers: [3, 4]},
  },

  'uniform1ui': { 2: {numbers: [1]} },  // WebGL2
  'uniform2ui': { 3: {numbers: [1, 2]} },  // WebGL2
  'uniform3ui': { 4: {numbers: [1, 2, 3]} },  // WebGL2
  'uniform4ui': { 5: {numbers: [1, 2, 3, 4]} },  // WebGL2

  'uniform1uiv': {  // WebGL2
    2: { arrays: {1: checkArrayForUniform(1)}, },
    3: { arrays: {1: checkArrayForUniformWithOffset(1)}, numbers: [2] },
    4: { arrays: {1: checkArrayForUniformWithOffsetAndLength(1)}, numbers: [2, 3] },
  },
  'uniform2uiv': {  // WebGL2
    2: { arrays: {1: checkArrayForUniform(2)}, },
    3: { arrays: {1: checkArrayForUniformWithOffset(2)}, numbers: [2] },
    4: { arrays: {1: checkArrayForUniformWithOffsetAndLength(2)}, numbers: [2, 3] },
  },
  'uniform3uiv': {  // WebGL2
    2: { arrays: {1: checkArrayForUniform(3)}, },
    3: { arrays: {1: checkArrayForUniformWithOffset(3)}, numbers: [2] },
    4: { arrays: {1: checkArrayForUniformWithOffsetAndLength(3)}, numbers: [2, 3] },
  },
  'uniform4uiv': {  // WebGL2
    2: { arrays: {1: checkArrayForUniform(4)}, },
    3: { arrays: {1: checkArrayForUniformWithOffset(4)}, numbers: [2] },
    4: { arrays: {1: checkArrayForUniformWithOffsetAndLength(4)}, numbers: [2, 3] },
  },
  'uniformMatrix3x2fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(6)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(6)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(6)}, numbers: [3, 4] },
  },
  'uniformMatrix4x2fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(8)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(8)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(8)}, numbers: [3, 4] },
  },

  'uniformMatrix2x3fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(6)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(6)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(6)}, numbers: [3, 4] },
  },
  'uniformMatrix4x3fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(12)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(12)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(12)}, numbers: [3, 4] },
  },

  'uniformMatrix2x4fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(8)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(8)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(8)}, numbers: [3, 4] },
  },
  'uniformMatrix3x4fv': {  // WebGL2
    3: { arrays: {2: checkArrayForUniform(12)}, },
    4: { arrays: {2: checkArrayForUniformWithOffset(12)}, numbers: [3] },
    5: { arrays: {2: checkArrayForUniformWithOffsetAndLength(12)}, numbers: [3, 4] },
  },

  // attribute value setters
  'vertexAttrib1f': { 2: {numbers: [0, 1]}},
  'vertexAttrib2f': { 3: {numbers: [0, 1, 2]}},
  'vertexAttrib3f': { 4: {numbers: [0, 1, 2, 3]}},
  'vertexAttrib4f': { 5: {numbers: [0, 1, 2, 3, 4]}},

  'vertexAttrib1fv': { 2: {numbers: [0], arrays: [1]}},
  'vertexAttrib2fv': { 2: {numbers: [0], arrays: [1]}},
  'vertexAttrib3fv': { 2: {numbers: [0], arrays: [1]}},
  'vertexAttrib4fv': { 2: {numbers: [0], arrays: [1]}},

  'vertexAttribI4i': { 5: {numbers: [0, 1, 2, 3, 4]}},  // WebGL2
  'vertexAttribI4iv': {2: {numbers: [0], arrays: [1]}},  // WebGL2
  'vertexAttribI4ui': {5: {numbers: [0, 1, 2, 3, 4]}},  // WebGL2
  'vertexAttribI4uiv': {2: {numbers: [0], arrays: [1]}},  // WebGL2

  // QueryObjects

  'beginQuery': { 2: { enums: [0] }},  // WebGL2
  'endQuery': { 1: { enums: [0] }},  // WebGL2
  'getQuery': { 2: { enums: [0, 1] }},  // WebGL2
  'getQueryParameter': { 2: { enums: [1] }},  // WebGL2

  //  Sampler Objects

  'samplerParameteri': { 3: { enums: [1] }},  // WebGL2
  'samplerParameterf': { 3: { enums: [1] }},  // WebGL2
  'getSamplerParameter': { 2: { enums: [1] }},  // WebGL2

  //  Sync objects

  'clientWaitSync': { 3: { enums: { 1: makeBitFieldToStringFunc(['SYNC_FLUSH_COMMANDS_BIT']) }, numbers: [2] }},  // WebGL2
  'fenceSync': { 2: { enums: [0] }},  // WebGL2
  'getSyncParameter': { 2: { enums: [1] }},  // WebGL2

  //  Transform Feedback

  'bindTransformFeedback': { 2: { enums: [0] }},  // WebGL2
  'beginTransformFeedback': { 1: { enums: [0] }},  // WebGL2

  // Uniform Buffer Objects and Transform Feedback Buffers
  'bindBufferBase': { 3: { enums: [0], numbers: [1]}},  // WebGL2
  'bindBufferRange': { 5: { enums: [0], numbers: [1, 3, 4]}},  // WebGL2
  'getIndexedParameter': { 2: { enums: [0], numbers: [1] }},  // WebGL2
  'getActiveUniforms': { 3: { enums: [2] }, arrays: [1]},  // WebGL2
  'getActiveUniformBlockParameter': { 3: { enums: [2], numbers: [1] }},  // WebGL2
  'getActiveUniformBlockName': { 2: {numbers: [1]}}, // WebGL2
  'transformFeedbackVaryings': { 3: {enums: [2]}}, // WebGL2
  'uniformBlockBinding': { 3: { numbers: [1, 2]}}, // WebGL2
};
for (const [name, fnInfos] of Object.entries(glFunctionInfos)) {
  for (const fnInfo of Object.values(fnInfos)) {
    convertToObjectIfArray(fnInfo, 'enums');
    convertToObjectIfArray(fnInfo, 'numbers');
    convertToObjectIfArray(fnInfo, 'arrays');
  }
  if (/uniform(\d|Matrix)/.test(name)) {
    fnInfos.errorHelper = getUniformNameErrorMsg;
  }
}

const typedArrays = [
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

const elements = [
  { name: "image", ctor: Image },
  { name: "image", ctor: HTMLImageElement },
  { name: "canvas", ctor: HTMLCanvasElement },
  { name: "video", ctor: HTMLVideoElement },
  { name: "imagedata", ctor: ImageData },
];

const eolRE = /\n/g;
const crRE = /\r/g;
const quoteRE = /"/g;

function glValueToString(ctx, functionName, numArgs, argumentIndex, value) {
  if (value === undefined) {
    return 'undefined';
  } else if (value === null) {
    return 'null';
  } else if (typeof (value) === 'number') {
    const funcInfos = glFunctionInfos[functionName];
    if (funcInfos !== undefined) {
      const funcInfo = funcInfos[numArgs];
      if (funcInfo !== undefined) {
        if (funcInfo.enums) {
          const entry = funcInfo.enums[argumentIndex];
          if (typeof entry === 'function') {
            return entry(ctx, value)
          } else if (entry !== undefined) {
            return glEnums[value];
          }
        }
      }
    }
  } else if (typeof (value) === 'string') {
    return JSON.stringify(value);
  } else if (value.length !== undefined) {
    const values = [];
    const step = 32;
    for (let jj = 0; jj < value.length; jj += step) {
      const end = Math.min(jj + step, value.length);
      const sub = [];
      for (let ii = jj; ii < end; ++ii) {
        sub.push(typeof value[ii] === 'string' ? JSON.stringify(value[ii]) : value[ii].toString());
      }
      values.push(sub.join(", "));
    }
    for (let ii = 0; ii < typedArrays.length; ++ii) {
      const type = typedArrays[ii];
      if (value instanceof type.ctor) {
        return `new ${type.name}([\n${values.join(",\n")}\n])`;
      }
    }
    return `\n[\n${values.join(",\n")}\n]`;
  } else if (value instanceof ArrayBuffer) {
    const view = new Uint8Array(value);
    return `new Uint8Array([${view}]).buffer`;
  } else if (typeof (value) === 'object') {
    if (value.__capture_info__ !== undefined) {
      return getResourceName(value);
    } else {
      for (const type of elements) {
        if (value instanceof type.ctor) {
          return type.name + "<-----------";
        }
      }
      const values = [];
      for (const [k, v] of Object.entries(value)) {
        values.push(`"${k}": ${glValueToString(ctx, "", 0, -1, v)}`);
      }
      return `{\n    ${values.join(",\n    ")}}`;
    }
  }
  return value.toString();
}

function glArgsToString(ctx, functionName, args) {
  if (args === undefined) {
    return "";
  }
  const values = [];
  for (let ii = 0; ii < args.length; ++ii) {
    values.push(glValueToString(ctx, functionName, args.length, ii, args[ii]));
  }
  return values.join(", ");
}

function makePropertyWrapper(wrapper, original, propertyName) {
  //log("wrap prop: " + propertyName);
  wrapper.__defineGetter__(propertyName, function() {
    return original[propertyName];
  });
  // TODO(gman): this needs to handle properties that take more than
  // one value?
  wrapper.__defineSetter__(propertyName, function(value) {
    //log("set: " + propertyName);
    original[propertyName] = value;
  });
}

// Makes a function that calls a function on another object.
function makeFunctionWrapper(apiName, original, functionName, capturer) {
  //log("wrap fn: " + functionName);
  const f = original[functionName];
  return function(...args) {
    //log("call: " + functionName);
    if (functionName === 'clear') {
      debugger;
    }
    if (capturer.capture) {
      const str = `${apiName}.${functionName}(${glArgsToString(this, functionName, args)});`;
      capturer.addData(str);
    }
    const result = f.apply(original, args);
    return result;
  };
}

function wrapFunction(name, fn, helper) {
  return function(...args) {
    return fn.call(helper, name, args);
  };
}

function makeWrapper(apiName, original, helper, capturer) {
  const wrapper = {};
  for (const propertyName in original) {
    if (typeof original[propertyName] === 'number') {
      glEnums[original[propertyName]] = apiName + "." + propertyName;
    }
    if (typeof original[propertyName] === 'function') {
      const handler = helper.constructor.prototype["handle_" + propertyName];
      if (handler) {
        wrapper[propertyName] = wrapFunction(propertyName, handler, helper);
      } else {
        wrapper[propertyName] = makeFunctionWrapper(apiName, original, propertyName, capturer);
      }
    } else {
      makePropertyWrapper(wrapper, original, propertyName);
    }
  }
  addEnumsForContext(original, apiName);
  return wrapper;
}

class WebGLWrapper {
  constructor(ctx, capturer) {
    this.ctx = ctx;
    this.capturer = capturer;
    this.currentProgram = null;
    this.programs = [];
    this.numImages = 0;
    this.images = {};
    this.extensions = {};
    this.shaderSources = [];
    const gl = this.ctx;
    this.fb = gl.createFramebuffer();
    this.shaderBySource = {
    };
    this.ids = {
    };

    this.wrapper = makeWrapper("gl", gl, this, capturer);
  }

  generate() {
    const out = [];

    out.push(`<canvas width="${this.ctx.canvas.width}" height="${this.ctx.canvas.height}"></canvas>`);
    out.push("<script>");

    out.push('const shaderSources = [');
    out.push(this.shaderSources.map(s => `\`${s}\``).join(',\n'));
    out.push(`];`);

    if (this.helper) {
      out.push(`
      function setUniform(gl, type, program, name, ...args) {
        const loc = gl.getUniformLocation(program, name);  
        const newArgs = [loc, ...args];
        gl[type].apply(gl, args);
      }
      `);
    }

    if (this.numImages) {
      out.push(`
      const images = { };
      function loadImages() {
        const imageUrls = [
  ${this.images.map(v => `  "${v}",`).join('\n')}
        ];
        Promise.all(imageUrls.map((url) => {  
          const img = new Image();
          img.src = url;
          images[url] = img;
          return img.decode();
        }).then(render);
      }
      `);
    }

    out.push('const canvas = document.querySelector("canvas");');
    out.push(`const gl = canvas.getContext("${this.ctx.texImage3D ? 'webgl2' : 'webgl'}", ${glValueToString(this.ctx, "getContextAttributes", 0, -1, this.ctx.getContextAttributes())});`);

    // Add extension objects.
    for (const key of Object.keys(this.extensions)) {
      out.push(`const ${key} = gl.getExtension("${key}");`);
    }

    // Add resource arrays.
    for (const key of Object.keys(this.ids)) {
      out.push(`const ${key} = [];`);
    }
    out.push("function render() {");

    // FIX:
    this.capturer.data.forEach(function(func) {
      out.push(func());
    });
    out.push("}");

    if (this.numImages) {
      out.push("loadImages();");
    } else {
      out.push("render();");
    }

    out.push("</script>");
    return out.join('\n');
  }

  // TODO: handle extensions
  handle_getExtension(name, args) {
    const extensionName = args[0].toLowerCase();
    let extension = this.extensions[extensionName];
    if (!extension) {
      extension = this.ctx[name].apply(this.ctx, args);
      if (extension) {
        extension = makeWrapper(extensionName, extension, {}, this.capturer);
        this.extensions[extensionName] = extension;
      }
    }
    return extension;
  }

  handle_shaderSource(name, args) {
    const resource = args[0];
    const source = args[1];

    let shaderId = this.shaderBySource[source];
    if (shaderId === undefined) {
      shaderId = this.shaderSources.length;
      this.shaderSources.push(source);
      this.shaderBySource[source] = shaderId;
    }

    this.capturer.addData(`gl.${name}(${getResourceName(resource)}, shaderSources[${shaderId}]);`);
    this.ctx[name].apply(this.ctx, args);
  }

  handle_useProgram(name, args) {
    this.currentProgram = args[0];
    this.capturer.addData(`gl.${name}(${getResourceName(this.currentProgram)});`);
    this.ctx[name].apply(this.ctx, args);
  }

  handle_getUniformLocation(name, args) {
    const program = args[0];
    const uniformName = args[1];
    const info = program.__capture_info__;
    if (!info.uniformsByName) {
      info.uniformsByName = { };
    }
    if (!info.uniformsByName[name]) {
      const location = this.ctx.getUniformLocation(program, uniformName);
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
  }

  handle_getAttribLocation(name, args) {
    const program = args[0];
    const attribName = args[1];
    const info = program.__capture_info__;
    if (!info.attribsByName) {
      info.attribsByName = { };
      info.attribsByLocation = { };
    }
    if (!info.attribsByName[name]) {
      const location = this.ctx.getAttribLocation(program, attribName);
      if (location < 0) {
        return location;
      }
      info.attribsByName[attribName] = location;
      info.attribsByLocation[location] = attribName;
    }
    return info.attribsByName[attribName];
  }

  dumpAttribBindings(program) {
    const lines = [];
    const info = program.__capture_info__;
    if (info && info.attribsByName) {
      for (const attrib in info.attribsByName) {
        lines.push(`gl.bindAttribLocation(${getResourceName(program)}, ${info.attribsByName[attrib]}, "${attrib}");`);
      }
    }
    return lines.join("\n");
  }

  handle_bindAttribLocation(name, args) {
    // We don't need to dump bindAttribLocation because we bind all locations at link time.
    this.ctx[name].apply(this.ctx, args);
  }

  handle_linkProgram(name, args) {
    const program = args[0];
    // Must bind all attribs before link.
    if (this.capturer.capture) {
      const self = this;
      this.capturer.addFn(function() {
        return self.dumpAttribBindings(program);
      });
      this.capturer.addData(`gl.${name}(${getResourceName(program)});`);
    }
    this.ctx[name].apply(this.ctx, args);
  }

  handle_uniform(name, args) {
    const location = args[0];
    const captureArgs = [];
    for (let jj = 1; jj < args.length; ++jj) {
      const v = args[jj];
      if (v.length) {
        const values = [];
        for (let ii = 0; ii < v.length; ++ii) {
          values.push(v[ii]);
        }
        captureArgs.push("[" + values.join(", ") + "]");
      } else {
        captureArgs.push(v.toString());
      }
    }
    // TODO(gman): handle merging of arrays.
    const info = location.__capture_info__;
    if (this.helper) {
      this.capturer.addData(`setUniform(gl, "${name}", ${getResourceName(this.currentProgram)}, "${info.name}", ${captureArgs.join(", ")}};`);
    } else {
      this.capturer.addData(`gl.${name}(gl.getUniformLocation(${getResourceName(this.currentProgram)}, "${info.name}"), ${captureArgs.join(", ")});`);
    }
    this.ctx[name].apply(this.ctx, args);
  }

  handle_create(name, args) {
    const resource = this.ctx[name].apply(this.ctx, args);
    const shortName = name.substring(6).toLowerCase();

    if (!this.ids[shortName]) {
      this.ids[shortName] = 0;
    }
    const id = this.ids[shortName]++;
    resource.__capture_info__ = {
      id: id,
      type: shortName,
    };
    this.capturer.addData(`${getResourceName(resource)} = gl.${name}(${glArgsToString(this.ctx, name, args)});`);
    return resource;
  }

  doTexImage2DForImage(name, image, args) {
    const newArgs = [...args];
    newArgs.push(null);
    let argStr = glArgsToString(this.ctx, name, newArgs);
    argStr = argStr.replace('null', `images["${image.src}"]`);
    this.images[image.src] = true;
    ++this.numImages;
    this.capturer.addData(`gl.${name}(${argStr});`);
  }

  doTexImage2DForImageData(name, imageData, args) {
    const target = args[0];
    const level = args[1];
    const internalFormat = args[2];
    const format = args[3];
    const type = args[4];

    const newArgs = [target, level, internalFormat, imageData.width, imageData.height, 0, format, type, imageData.data];
    this.capturer.addData(`gl.${name}(${glArgsToString(this.ctx, name, newArgs)});`);
  }

  handle_texImage2D(name, args) {
    this.ctx[name].apply(this.ctx, args);
    // lastarg is always data.
    const data = args[args.length - 1];
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
      this.capturer.addData(`gl.${name}(${glArgsToString(this.ctx, name, args)});`);
    }
  }

  handle_get(name, args) {
    // Don't need the getXXX calls for playback.
    this.capturer.addData(`// gl.${name}(${glArgsToString(this.ctx, name, args)});`);
    return this.ctx[name].apply(this.ctx, args);
  }

  handle_skip(name, args) {
    this.capturer.addData(`// gl.${name}(${glArgsToString(this.ctx, name, args)});`);
    return this.ctx[name].apply(this.ctx, args);
  }
}

const handlers = {
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
    "createQuery",
    "createRenderbuffer",
    "createSampler",
    "createShader",
    "createTexture",
    "createTransformFeedback",
    "createVertexArray",
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
for (const [handler, functions] of Object.entries(handlers)) {
  functions.forEach(function(name) {
    WebGLWrapper.prototype["handle_" + name] = WebGLWrapper.prototype[handler];
  });
}

class Capture {
  constructor(ctx, opt_options) {
    const options = opt_options || { };
    this.helper = options.helper === undefined ? true : options.helper;
    this.capture = false;
    this.data = [];

    const helper = new WebGLWrapper(ctx, this);
    this.webglHelper = helper;
    this.webglWrapper = helper.wrapper;
    this.webglWrapper.capture = this;
  }
  addFn(fn) {
    this.data.push(fn);
  }
  addData(str) {
    if (this.capture) {
      this.addFn(function() {
        return str;
      });
    }
  }

  log(msg) {
    if (this.capture) {
      console.log(msg);
    }
  }

  getContext() {
    return this.webglWrapper;
  }

  begin() {
    this.capture = true;
  }

  end() {
    this.capture = false;
  }

  generate() {
    return this.webglHelper.generate();
  }
}

// Wrap canvas.getContext;
let autoCapture = true;

function init(ctx, opt_options) {
  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  if (!ctx.capture) {
    ctx.capture = new Capture(ctx, opt_options);
    if (autoCapture) {
      ctx.capture.begin();
    }
  }
  return ctx.capture.getContext();
}

HTMLCanvasElement.prototype.getContext = (function(oldFn) {
  return function(...args) {
    let ctx = oldFn.apply(this, args);
    const type = arguments[0];
    if (autoCapture && (type === "experimental-webgl" || type === "webgl" || type === "webgl2")) {
      ctx = init(ctx);
    }
    return ctx;
  };
}(HTMLCanvasElement.prototype.getContext));

const setAutoCapture = function(capture) {
  autoCapture = capture;
};

return {
  init: init,
  setAutoCapture: setAutoCapture,
};

}());



