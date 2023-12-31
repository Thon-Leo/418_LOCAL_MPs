
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
let view = m4view([10,5,0], [0, 0, 0], [0, 1, 0])
let curDir = [0,1,0];
let curTrans = [0,0,0];
/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2', {antialias:false, depth:true, preserveDrawingBuffer:true})
    if (!gl) {
        console.error("WebGL2 not supported or context creation failed");
        return;
    }
    
    const vs = await fetch('vertshader.glsl').then(res => res.text())
    const fs = await fetch('fragshader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    window.geomT = setupGeometry(tetrahedron)
    window.geomO = setupGeometry(octahedron)
    gl.enable(gl.DEPTH_TEST)
    fillScreen()
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
 * provides the input buffer to the vert shader
 * 
 * @param data a 2D array of per-vertex data ([[x, y, z, w], [x, y, z, w] ... ])
 * @param loc the layout location of the vertext shader's 'in' addribute
 * @param mode (optional) gl.STATIC_DRAW etc.
 * 
 */
function provideBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)

    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc);

    return buf
}

/**
 * Create a Vertex Array Object and puts into it all of the data in the given JSON 
 * structure
 * @param {*} geom has the form:
 * - 'triangles': [a list of indices of vertices]
 * - 'attributes': [a list of 2 or 3 or 4 vectors, one per vertex to go in location 0],
 *                [a list of 2 or 3 or 4 vectors, one per vertex to go in location 1] 
 *                  ... 
 * 
 * @returns an object with 4 keys
 *     - mode - the first elem for gl.drawElements
 *     - count - the second elem for gl.drawElements
 *     - type - the third elem for gl.drawElements
 *     - vao - vertex array object used with gl.bindArray
 */
function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for (let i = 0; i < geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        provideBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles)
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW) 

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }

}

var tetrahedron = 
{"triangles" : 
    [0,1,2, 0,2,3, 0,3,1, 1,2,3],
 "attributes" : [   // positions
                    [[1,1,1], [-1,-1,1], [-1,1,-1], [1,-1,-1]],
                    // colors
                    [[1,1,1], [0,0,1], [0,1,0], [1,0,0]]
                ]
}


var octahedron = 
{"triangles" : 
    [0,1,2, 0,2,3, 0,3,4, 0,4,1, 5,1,4, 5,4,3, 5,3,2, 5,2,1],
 "attributes" : [   // positions
                    [[1,0,0],[0,1,0],[0,0,1],[0,-1,0],[0,0,-1],[-1,0,0]],
                    // colors
                    [[1,0.5,0.5],[0.5,1,0.5],[0.5,0.5,1],[0.5,0,0.5],[0.5,0.5,0],[0,0.5,0.5]]
                ]
}


/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.useProgram(program)
    gl.uniformMatrix4fv(program.uniforms.p, false, window.p)
    
    for (let i = 0; i < 3; i+=1) {
        curTrans[i] += curDir[i] * 0.01
    }

    let m = m4trans(...curTrans)
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(view, m))
    gl.bindVertexArray(geomO.vao)
    gl.drawElements(geomO.mode, geomO.count, geomO.type, 0) // Draw
}

function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0,canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) 
        window.p = m4perspNegZ(0.1, 20, 1.5, canvas.width, canvas.height)
    }
     
}

const m4mulScalar = (m, c) => {
    for (let i = 0; i < 16; i+=1) m[i]*c
    return m
}


window.addEventListener('load', setup)
    
window.addEventListener('keydown', (event) => {
    if (event.key === "q") { // Check if the 'a' key has been pressed
        console.log('q')
        curDir = [-1,0,0]
    } else if (event.key === "e") {
        console.log('e')
        curDir = [1,0,0]
    } else if (event.key === "a") {
        console.log('a')
        curDir = [0,0,1]
    } else if (event.key === "d") {
        console.log('d')
        curDir = [0,0,-1]
    } else if (event.key === "w") {
        console.log('w')
        curDir = [0,1,0]
    } else if (event.key === "s") {
        console.log('s')
        curDir = [0,-1,0]
    } 
})


