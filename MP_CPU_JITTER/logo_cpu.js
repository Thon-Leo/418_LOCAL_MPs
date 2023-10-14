
/* global var declaration */
let vertexBuffer;
var rectangleVertices = new Float32Array([
    // ABC
    -0.4,-0.7,
    0.4,-0.7,
    0.4,-0.4,
    // ACD
    -0.4,-0.7,
    0.4,-0.4,
    -0.4,-0.4,
    // EFG
    -0.2,-0.5,
    0.2,-0.5,
    0.2, 0.5,
    // EGH
    -0.2,-0.5,
    0.2, 0.5,
    -0.2, 0.5,
    // IJK
    -0.4, 0.4,
    0.4, 0.4,
    0.4, 0.7,
    // IKL
    -0.4, 0.4,
    0.4, 0.7,
    -0.4, 0.7
]); // init the buffer, the vertices are listed above

/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    if (!gl) {
        console.error("WebGL2 not supported or context creation failed");
        return;
    }
    
    const vs = await fetch('vertshader.glsl').then(res => res.text())
    const fs = await fetch('fragshader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    provideBuffer();
    tick(0) // <- ensure this function is called only once, at the end of setup
}

/**
 * Compiles two shaders, links them together, looks up their uniform locations,
 * and returns the result. Reports any shader errors to the console.
 *
 * @param {string} vs_source - the source code of the vertex shader
 * @param {string} fs_source - the source code of the fragment shader
 * @return {WebGLProgram} the compiled and linked program
 */
function compile(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Runs the animation using requestAnimationFrame. This is like a loop that
 * runs once per screen refresh, but a loop won't work because we need to let
 * the browser do other things between ticks. Instead, we have a function that
 * requests itself be queued to be run again as its last step.
 * 
 * @param {Number} milliseconds - milliseconds since web page loaded; 
 *        automatically provided by the browser when invoked with
 *        requestAnimationFrame
 */
function tick(milliseconds) {
    const seconds = milliseconds / 1000
    draw(seconds)
    requestAnimationFrame(tick) // <- only call this here, nowhere else
}

/**
 * provides the input buffer to the vert shader, this should be the logo
 */
function provideBuffer() {
   /* 
    A -0.4,-0.7
    B  0.4,-0.7
    C  0.4,-0.4
    D -0.4,-0.4
    E -0.2,-0.5
    F  0.2,-0.5
    G  0.2, 0.5
    H -0.2, 0.5
    I -0.4, 0.4
    J  0.4, 0.4
    K  0.4, 0.7
    L -0.4, 0.7
*/
    for (let i = 0; i < 36; i+=1) {
        rectangleVertices[i] += (Math.random()-0.5) * 0.001
    }
    
    vertexBuffer = gl.createBuffer();   // create a buffer
    // enable in buffer
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);   // bind the buffer to gl's arraybuffer
    gl.bufferData(gl.ARRAY_BUFFER, rectangleVertices, gl.DYNAMIC_DRAW); // supply the data using the vectices
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    provideBuffer()

    let count = 18
    // Bind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    // Draw the rectangle
    gl.drawArrays(gl.TRIANGLES, 0, count)
}

window.addEventListener('load', setup)


