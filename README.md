WebGL Capture
=============

A library to capture a stream of WebGL commands from a WebGL program and
generate a stand alone program.

Often I need to file a bug or make a reduced test case from a larger
WebGL program.  This can be very tedious.  Instead, why not capture the
commands sent to WebGL and generate a program that calls those commands.
I'll then have the minimal program and I can start paring it down
quicker and file a bug for a particular browser or GPU vendor.

Example

```js
<script src="webgl-capture.js"></script>
<script>
const canvas = document.getElementById("someCanvas");
const gl = canvas.getContext("experimental-webgl");
let captured = false;

initWebGLStuff();

function renderLoop() {
   renderWebGLStuff();

   // capture the first frame.
   if (!captured) {
     captured = true;

     // only call this code if it exists.
     if (gl.capture) {
       gl.capture.end();
       console.log(gl.capture.generate());
     }
   }
   requestAnimationFrame(renderLoop);
}
```

The code above will capture all initialization and the first frame of
drawing.  It will then print that code to the JavaScript console.
Copy the code to an empty HTML file, plop it in a browser and it
should reproduce the first frame of your scene.

[There's a live example here](https://greggman.github.io/webgl-capture/examples/twgl-cube.html)
as well as [a an example of a capture here](https://greggman.github.io/webgl-capture/examples/twgl-cube-example-capture.html).

** This is beta code **

Documentation
-------------

By default capturing starts automatically. To turn it off early call

   WebGLCapture.setAutoCapture(false);

Before calling `canvas.getContext`


Notes
-----

*   It won't work with video textures. Maybe someday.

*   It can generate very large files. This is because it has to dump

    *   All buffer data (vertices, normals)

    *   All non image based textures

*   Not all extensions are supported. For example OES_vertex_array_objects
    is not supported...yet.

*   Because it's generating code to replay the commands those commands
    are potentially specific to the machine it was captured on. For example,
    if the app checks for OES_texture_float and then uses floating point
    textures the commands written will assume that floating point textures
    work on the machine the code is played back on. It also assumes the
    extensions will have the same prefixes.

*   Textures based on image tags assume it can reload the image from the
    url on image.src at the time texImage2D is called. I originally tried
    to save the image data in arrays but that make the files way too large.

TODO
----

*   Support sending the captured data to some simple server (node/python).

    The problem right now is the files are often so big that even copying
    and pasting them off the page is tedious. I'm not a net guru but I
    suspect WebSockets will be needed because generating a single string
    to pass to fetch will probably kill the browser. I could
    do something crazy like uuencode the data but it's still huge amounts
    of data so it's probably best to just use a server.

    Another solution would be to copy the data to blobs and allow you to
    download it.

*   Right now it just captures commands, not state. That means in order to
    generate a runnable capture you need to capture all initialization
    commands, then ideally generate no commands until all your data is
    loaded, then finally render 1 frame and end the capture.

    For a three.js program that usually means doing something like this.

        var loadCount = 0;
        var loadNeeded = 3;  // number of things to load before rendering

        function loadedImage() {
           ++loadCount;
        }

        ...


        // make all the loading functions call loadedImage

        var cube = THREE.ImageUtils.loadTextureCube(
            urls, undefined, loadedImage );
        var texture = THREE.ImageUtils.loadTexture(
            "textures/normal/ninja/normal.jpg", undefined, loadedImage);
        var map = THREE.ImageUtils.loadCompressedTexture(
            'textures/compressed/disturb_dxt1_nomip.dds', undefined, loadedImage );

        ...

        function animate() {
          requestAnimationFrame( animate );

          // don't render if all the data is not loaded.
          if (loadCount != loadNeeded) {
            return;
          }

          ...
          renderer.render( scene, camera );

          if (!captured) {
            captured = true;
            var gl = renderer.context;
            if (gl.capture) {
              gl.capture.end();
              console.log(gl.capture.generate());
            }
          }
        }

    It would ... probably ... be better to try to capture the state
    and then let you spit out one frame, saving out only the state
    used in that frame but that assumed you're animating. There are
    apps that just draw something once or in response to input so
    both options are probably needed.





