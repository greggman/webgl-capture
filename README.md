WebGL Capture
=============

A library to capture a stream of WebGL commands from a WebGL program and generate a stand alone program.

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
           gl.capture.insertInElement(document.body);
         }
       }
       requestAnimationFrame(renderLoop);
    }

The code above will capture all initialization and the first frame of drawing.
It will then create a div above the page and insert all the code into it. Copy
the code to an empty HTML file, plop it in a browser and it should reproduce
the first frame of your scene.

This is alpha code.

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
    work on the machine the code is played back on.

TODO
----

*   Support sending the captured data to some simple server (node/python).

    The problem right now is the files are often so big that even copying
    and pasting them off the page is tedious. I'm not a net guru but I
    suspect WebSockets will be needed because generating a single string
    to pass to XMLHttpRequest.send will probably kill the browser.

*   Right now it just captures commands, not state. That means in order to
    generate a runnable capture you need to capture all initialization
    commands, then ideally generate no commands until all your data is
    loaded, then finally render 1 frame, end the capture.

    For a three.js program that usually means doing something like

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
              gl.capture.insertInElement(document.body);
            }
          }
        }

    And, in three.js

        function initGL () {

          try {
            ...
          } catch ( error ) {
            console.error( error );
          }

          if (window.WebGLCapture) {
            _gl = window.WebGLCapture.init(_gl);
            _gl.capture.begin();
          }

          ...

    It would ... probably ... be better to try to capture the state
    and then let you spit out one frame, saving out only the state
    used in that frame but that assumed you're animating. There are
    apps that just draw something once or in response to input so
    both options are probably needed.

*   Turn this into extension. I think the WebGL Inspector or the
    google Web Tracing Framework will eventually support something
    similar to this so maybe no need to make this an extension.

    Besides, as is it's cross browser. Then again, if it was an
    extension you could capture in one browser and maybe run in another





