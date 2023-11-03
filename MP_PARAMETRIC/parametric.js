
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
let view = m4view([1,0,1], [0, 0, 0], [0, 1, 0])
let parametric = {
    'triangles' : [],
    'attributes' : []
};
let lightDir = normalize([2,2,2])
let half = normalize(add(lightDir, [0,0,0]))
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
        provideBuffer(data, i, gl.DYNAMIC_DRAW)
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

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    // check if we have a geometry
    if (parametric.attributes.length == 0) return
    gl.useProgram(program)
    gl.uniformMatrix4fv(program.uniforms.p, false, window.p)
    
    gl.uniform3fv(program.uniforms.lightDir, lightDir)
    gl.uniform3fv(program.uniforms.halfway, half)
    
    let m = m4rotY(seconds/2)
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(view, m))
    gl.uniformMatrix4fv(program.uniforms.m, false, m)

    gl.bindVertexArray(paraGeom.vao)
    gl.drawElements(paraGeom.mode, paraGeom.count, paraGeom.type, 0) // Draw
}

/**
 * css code to fill the screen every time we refreshes, also computing the p mat here
 */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0,canvas.width, canvas.height)
        window.p = m4perspNegZ(0.1, 20, 1.5, canvas.width, canvas.height)
    } 
}

/**
 * generates the geom
 */
function generateGeometry(rings, slices) {
    parametric = {
        'triangles' : [],
        'attributes' : []
    };

    /* vertex */
    let r = 1; // assuming radius of sphere is 1
    let vertices = [];

    // Top vertex
    vertices.push([0, r, 0]);

    for (let i = 1; i <= rings; i++) {
        let theta = (Math.PI / (rings + 1)) * i;
        for (let j = 0; j < slices; j++) {
            let phi = (2 * Math.PI / slices) * j;
            let x = r * Math.sin(theta) * Math.cos(phi);
            let y = r * Math.cos(theta);
            let z = r * Math.sin(theta) * Math.sin(phi);
            vertices.push([x, y, z]);
        }
    }

    // Bottom vertex
    vertices.push([0, -r, 0]);
    parametric.attributes.push(vertices)
    
    /* triangles */
    for (let i = 1; i <= slices; i++) {
        let next = (i % slices) + 1;
        parametric.triangles.push([0, i, next]);
    }
    
    // Middle part triangulation
    for (let h = 1; h < rings; h++) {
        for (let a = 1; a <= slices; a++) {
            // Current vertex index
            let current = (h - 1) * slices + a;
            
            // The vertex to the right of the current vertex
            let right = current + 1;
            if (a == slices) {
                right = (h - 1) * slices + 1;
            }
            
            // The vertex below the current vertex
            let below = current + slices;
            
            // The vertex diagonal to the current vertex
            let diagonal = below + 1;
            if (a == slices) {
                diagonal = current + 1;
            }
            
            // Add triangles
            parametric.triangles.push([current, right, below]);
            parametric.triangles.push([right, diagonal, below]);
        }
    }
    
    // Bottom vertex triangulation
    let bottomVertexIndex = rings * slices + 1;
    for (let i = 1; i <= slices; i++) {
        let current = (rings - 1) * slices + i;
        let next = current + 1;
        if (i == slices) {
            next = (rings - 1) * slices + 1;
        }
        parametric.triangles.push([bottomVertexIndex, next, current]);
    }
}

/**
 * add normals to our geomtry for parametric
 */
function addNormal(geom) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for (let i = 0; i < geom.attributes[0].length; i += 1) {
        geom.attributes[ni].push(normalize(geom.attributes[0][i]))
    }
    console.log(parametric); 
}
    

/* ------------------Event Listener-----------------------*/

window.addEventListener('load', setup)
    
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#submit').addEventListener('click', event => {
        const rings = Number(document.querySelector('#rings').value) || 2;
        const slices = Number(document.querySelector('#slices').value) || 0;
        console.log('rings: ', rings);
        console.log('slices: ', slices);
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
        if (rings > 0 && slices > 3) {
            generateGeometry(rings, slices)
            addNormal(parametric)
            window.paraGeom = setupGeometry(parametric);
        } else {
            
        }
            
    });
});






