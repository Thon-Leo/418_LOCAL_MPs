
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

let view = m4view([10,0,0], [0, 0, 0], [0, 1, 0])
let lightDir = normalize([1,0,-1])
let half = normalize(add(lightDir, [0,0,0]))

var phi = (1 + Math.sqrt(5)) / 2;
var icosahedron = {
    "triangles": [
        [0,1,4], [0,6,1], [1,11,9], [1,6,11], [0,10,6], [0,8,10], [0,4,8], [1,9,4],
        [4,9,5], [4,5,8], [6,10,7], [6,7,11],
        [2,3,7], [2,5,3], [2,7,10], [3,11,7], [11,3,9], [2,10,8], [3,5,9], [2,8,5]
    ],
  "attributes": [
    // Define the positions of vertices
    [
      [1, phi, 0], // 0
      [-1, phi, 0],
      [1, -phi, 0], // 2
      [-1, -phi, 0],
      [0, 1, phi], // 4
      [0, -1, phi],
      [0, 1, -phi], // 6
      [0, -1, -phi],
      [phi, 0, 1], // 8
      [-phi, 0, 1],
      [phi, 0, -1], // 10
      [-phi, 0, -1]
    ]
  ]
};
/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2', {antialias: false, depth: true, preserveDrawingBuffer: true})
    if (!gl) {
        console.error("WebGL2 not supported or context creation failed");
        return;
    }
    
    const vs = await fetch('vertshader.glsl').then(res => res.text())
    const fs = await fetch('fragshader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    addNormal(icosahedron)
    window.geomI = setupGeometry(icosahedron)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
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

    var indices = new Uint16Array(geom.triangles.flat())
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


function addNormal(geom) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for (let i = 0; i < geom.attributes[0].length; i+=1) {
        // geom.attributes[ni].push(geom.attributes[0][i])
        geom.attributes[ni].push([0,0,0])
    }
    for (let i = 0; i < geom.triangles.length; i += 1) {
        let p0 = geom.attributes[0][geom.triangles[i][0]]
        let p1 = geom.attributes[0][geom.triangles[i][1]]
        let p2 = geom.attributes[0][geom.triangles[i][2]]
        let e1 = sub(p1,p0)
        let e2 = sub(p2,p0)
        let n = cross(e1,e2)

        geom.attributes[ni][geom.triangles[i][0]] = add(geom.attributes[ni][geom.triangles[i][0]], n)
        geom.attributes[ni][geom.triangles[i][1]] = add(geom.attributes[ni][geom.triangles[i][1]], n)
        geom.attributes[ni][geom.triangles[i][2]] = add(geom.attributes[ni][geom.triangles[i][2]], n)
    }
    for (let i = 0; i < geom.attributes[0].length; i+=1) {
        geom.attributes[ni][i] = normalize(geom.attributes[ni][i])
    }

}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    gl.uniformMatrix4fv(program.uniforms.p, false, window.p)

    gl.uniform3fv(program.uniforms.lightDir, lightDir)
    gl.uniform3fv(program.uniforms.halfway, half)

    let m = m4rotY(seconds)
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(view,m))
    gl.uniformMatrix4fv(program.uniforms.m, false, m)

    gl.bindVertexArray(geomI.vao)
    gl.drawElements(geomI.mode, geomI.count, geomI.type, 0) // Draw
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
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }   
}

const m4mulScalar = (m, c) => {
    for (let i = 0; i < 16; i+=1) m[i]*c
    return m
}


window.addEventListener('load', setup)
    
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#submit').addEventListener('click', event => {
        const rounds = Number(document.querySelector('#rounds').value);
        console.log("Rounds:", rounds);
    })
})



