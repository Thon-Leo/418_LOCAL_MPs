
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/* ------------------FLIGHT---------------------*/
let camPos = [0,0,0]
let globalUpVec = [0,1,0]

let forwardVec = [0,0,-1]
let rightVec = normalize(cross(forwardVec, globalUpVec))
let upVec = normalize(cross(forwardVec, rightVec))

let T, R
let view
let pitchAngle = 0
const MAX_PITCH = Math.PI / 2 - 0.1
window.keysBeingPressed = {}
/* ------------------FOG---------------------*/
let fogEnabled = true; 
let fogKeyDown = false;
let previousFogDensity; 
let fogDensity = 1;
let fogColor = [1,1,1]
/* ------------------TERRAIN---------------------*/
let grid = {
    'triangles' : [],
    'attributes' : []
};

/* ------------------LIGHTING---------------------*/
let lightDir = normalize([1,2,1])
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

    generateGrid(50)
    applyFaults(grid, 50)
    addNormal(grid, 50)
    window.gridGeom = setupGeometry(grid)


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
    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // handle keys
    if (keysBeingPressed['ArrowUp'] && pitchAngle > -MAX_PITCH) {
        forwardVec = normalize(rotateVector(forwardVec, rightVec, -Math.PI/180))
        pitchAngle -= Math.PI/180

    } else if (keysBeingPressed['ArrowDown'] && pitchAngle < MAX_PITCH) {
        forwardVec = normalize(rotateVector(forwardVec, rightVec, Math.PI/180))
        pitchAngle += Math.PI/180

    } else if (keysBeingPressed['ArrowLeft']) {
        forwardVec = normalize(rotateVector(forwardVec, globalUpVec, Math.PI/180))

    } else if (keysBeingPressed['ArrowRight']) {
        forwardVec = normalize(rotateVector(forwardVec, globalUpVec, -Math.PI/180))

    } else if (keysBeingPressed['w']) {
        camPos = add(camPos, scalarMultiplyVec3(0.01, forwardVec))
        
    } else if (keysBeingPressed['a']) {
        camPos = add(camPos, scalarMultiplyVec3(-0.01, rightVec))
        
    } else if (keysBeingPressed['s']) {
        camPos = add(camPos, scalarMultiplyVec3(-0.01, forwardVec))
        
    } else if (keysBeingPressed['d']) {
        camPos = add(camPos, scalarMultiplyVec3(0.01, rightVec))
        
    } else if (keysBeingPressed['g']) {
        fogDensity *= 0.8;
        console.log('g')
    } else if (keysBeingPressed['h']) {
        fogDensity *= 1.25;
        console.log('h')
    } else if (keysBeingPressed['f'] && !fogKeyDown) {
        fogKeyDown = true;
        console.log('f', fogKeyDown)
        if (fogEnabled) {
            previousFogDensity = fogDensity;
            fogDensity = 0.0;
        } else {
            fogDensity = previousFogDensity;
        }
        fogEnabled = !fogEnabled;
    } else if (!keysBeingPressed['f'] && fogKeyDown) {
        fogKeyDown = false;
    }

    // calculating view mat
    rightVec = normalize(cross(forwardVec, globalUpVec))
    upVec = normalize(cross(forwardVec, rightVec))

    T = m4trans(-camPos[0],-camPos[1],-camPos[2])
    R = new Float32Array([[rightVec[0], upVec[0], -forwardVec[0], 0],[rightVec[1], upVec[1], -forwardVec[1], 0],[rightVec[2], upVec[2], -forwardVec[2], 0],[0,0,0,1]].flat())
    view = m4mul(R, T)
    // send uniforms
    gl.useProgram(program)
    gl.uniformMatrix4fv(program.uniforms.mv, false, view)
    gl.uniformMatrix4fv(program.uniforms.p, false, window.p)
    gl.uniform3fv(program.uniforms.lightDir, lightDir)
    gl.uniform3fv(program.uniforms.halfway, half)
    // fog
    gl.uniform3fv(program.uniforms.fogColor, fogColor)
    gl.uniform1f(program.uniforms.fogDensity, fogDensity);
    // draw
    gl.bindVertexArray(gridGeom.vao)
    gl.drawElements(gridGeom.mode, gridGeom.count, gridGeom.type, 0) // Draw
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
        window.p = m4perspNegZ(0.1, 50, 1.5, canvas.width, canvas.height)
    } 
}

/**
 * generate grid based on the gridsize, we assume 1 < gridsize < 256
 */
function generateGrid(gridsize) {
    let vertices = [];
    let triangles = [];
    let segmentSize = 2 / (gridsize-1); // the offset of each vertex
    // clear grid
    grid = {
        'triangles' : [],
        'attributes' : []
    };

    // Generate triangle indices
    for (let j = 0; j < gridsize-1; j++) {     
        for (let i = 0; i < gridsize-1; i++) {
            triangles.push([i + j*gridsize, i + 1 + j*gridsize, i + gridsize + j*gridsize]);
            triangles.push([i + 1 + j*gridsize, i + gridsize + j*gridsize, i + gridsize + 1 + j*gridsize]);
        }
    } 

    // Generate vertices positions
    for (let j = 0; j < gridsize; j++) {     
        for (let i = 0; i < gridsize; i++) {
            let x = i * segmentSize - 1;
            let y = 0;  // This is a flat plane on the Y-axis
            let z = j * segmentSize - 1;
            vertices.push([x, y, z]);
        }
    }

    // Push the new data
    grid.triangles = triangles; // Set the triangle indices
    grid.attributes.push(vertices); // Add the entire array of vertices as one entry into grid.attributes
}

/**
 * uses faulting method to change the terrain, the faults need to be non-neg
 * the method also normalize the height as well
 * @param {*} grid 
 * @param {*} faults 
 * @param {*} c
 */
function applyFaults(grid, faults, c) {
    if (faults == 0) return
    if (faults < 0) console.error("fault should be greater than 0!")
    if (c === undefined) c = 1
    for (let f = 0; f < faults; f++) {
        let randDis = Math.random()
        let randTheta = Math.random() * 2 * Math.PI
        // choose a random point
        let x1 = Math.random() * 2 - 1 // Random value between -1 and 1
        let z1 = Math.random() * 2 - 1
        
        // choose a random normal
        let nx =  Math.cos(randTheta)
        let nz =  Math.sin(randTheta)

        // Iterate over all vertices in the grid
        for (let i = 0; i < grid.attributes[0].length; i++) {
            let vertex = grid.attributes[0][i];

            // Determine which side of the fault line the vertex lies on
            if (dot(sub(vertex, [x1,0,z1]), [nx, 0, nz]) > 0) {
                // Displace upwards
                vertex[1] += randDis;
                
            } else {
                // Displace downwards
                vertex[1] -= randDis;
            }
        }
    }
    let maxH = -1
    let minH = 1
    // normalize 
    for (let i = 0; i < grid.attributes[0].length; i++) {
        let currY = grid.attributes[0][i][1]
        if (currY > maxH)
            maxH = currY
        if (currY < minH)
            minH = currY
    }
    let diff = (maxH - minH)
    let sum = (maxH + minH)/2
    for (let i = 0; i < grid.attributes[0].length; i++) {
        grid.attributes[0][i][1] = (grid.attributes[0][i][1] - sum) / diff * c
    }
      
}

/**
 * add normals to our geomtry
 * @param {Number} gridsize
 */
function addNormal(geom, gridsize) {
    let ni = geom.attributes.length
    geom.attributes.push([])
    for (let i = 0; i < geom.attributes[0].length; i += 1) {
        let currV = geom.attributes[0][i]

        // the 4 neighboring verts, if one or more are missing, use itself to replace them
        let pn = (parseInt(i / gridsize) == 0) ? currV : geom.attributes[0][i - gridsize]
        let ps = (parseInt(i / gridsize) == gridsize - 1 ) ? currV : geom.attributes[0][i + gridsize]
        let pw = (i % (gridsize) == 0) ? currV : geom.attributes[0][i - 1]
        let pe = (i % gridsize == gridsize - 1) ? currV : geom.attributes[0][i + 1]

        let n = cross(sub(pn, ps),sub(pw, pe))
        
        geom.attributes[ni].push(normalize(n))
    }
    console.log(grid); 
}

/**
 * doing vec3 multiplication with a scalar
 * @param {*} scalar 
 * @param {*} vec 
 * @returns 
 */
function scalarMultiplyVec3(scalar, vec) {
    return [scalar * vec[0], scalar * vec[1], scalar * vec[2]];
}

/**
 * rotate a vec v around another vec k, with an angle theta
 * @param {vec3} v 
 * @param {vec3} k 
 * @param {number} theta 
 * @returns 
 */
function rotateVector(v, k, theta) {
    const vCosTheta = scalarMultiplyVec3(Math.cos(theta), v);
    const kCrossVsinTheta = scalarMultiplyVec3(Math.sin(theta), cross(k, v));
    const kDotVOneMinusCosTheta = scalarMultiplyVec3(dot(k, v) * (1 - Math.cos(theta)), k);

    return [
        vCosTheta[0] + kCrossVsinTheta[0] + kDotVOneMinusCosTheta[0],
        vCosTheta[1] + kCrossVsinTheta[1] + kDotVOneMinusCosTheta[1],
        vCosTheta[2] + kCrossVsinTheta[2] + kDotVOneMinusCosTheta[2]
    ];
}


/* ------------------Event Listener-----------------------*/

window.addEventListener('load', setup)
    

window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)


