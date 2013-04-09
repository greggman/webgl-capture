WebGL Capture
=============

A small library to capture a stream of WebGL commands from a WebGL program and generate a stand alone program.

Often you need to file a bug or make a reducted test case from a larger WebGL program. This can be very tedious.
Instead, why not capture the commands sent to WebGL and generate a program that calls those commands. You'll
then have the minimal program and you can start paring it down quicker and file a bug for a particular browser
or GPU vendor.

Example

    <script src="webgl-capture.js"></script>
    <script>
    var canvas = document.getElementById("someCanvas");
    var gl = canvas.getContext("experimental-webgl");
    var captured = false;

    // Only capture if the capture libray is available.
    if (window.WebGLCapture) {
      gl = window.WebGLCapture.init(gl);
      gl.capture.begin();
    }

    initWebGLStuff();

    function renderLoop() {
       renderWebGLStuff();

       // capture the first frame.
       if (!captured) {
         captured = true;
         if (gl.capture) {
           gl.capture.end();
           console.log(gl.capture.dump());
         }
       }
       requestAnimationFrame(renderLoop);
    }

The code above will capture all initialization and the first frame of drawing.
It will then output a large string to the javascript console. Copy the
string to an empty HTML file, plop it in a browser and it should reproduce
the first frame of your scene.

Note: this is alpha. I still need to handle textures.
