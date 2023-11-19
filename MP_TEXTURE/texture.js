
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
let view = m4view([1,1.1,1], [0, 0, 0], [0, 1, 0])
/* ---------------------- TERRAIN ----------------------- */
let grid = {
    'triangles' : [],
    'attributes' : []
};
/* ---------------------- TEXTURE ----------------------- */
let currColor = [0.8, 0.8, 0.8, 1]
let currA = 0.5
let useTexture = false
let slot = 0; // or a larger integer if this isn't the only texture
/* ---------------------- LIGHTING ---------------------- */
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
    const ntfs = await fetch('nontextfragshader.glsl').then(res => res.text())
    const fs = await fetch('fragshader.glsl').then(res => res.text())
    window.nontextprogram = compile(vs,ntfs)
    window.textprogram = compile(vs,fs)
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
 * generate grid based on the gridsize, we assume 1 < gridsize < 256
 */
function generateGrid(gridsize) {
    let vertices = [];
    let triangles = [];
    let textCoords = [];
    let segmentSize = 2 / (gridsize-1); // the offset of each vertex
    let textSize = 1 / (gridsize-1);
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

            let s = i * textSize;
            let t = j * textSize;
            textCoords.push([s,t])
        }
    }

    // Push the new data
    grid.triangles = triangles; // Set the triangle indices
    grid.attributes.push(vertices); // Add the entire array of vertices as one entry into grid.attributes
    grid.attributes.push(textCoords);
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
 * apply weathering 
 */
function weatherSmooth(geom, weatheringLoop, gridsize) {
    if (weatheringLoop == 0 || weatheringLoop === undefined) return;

    for (let lc = 0; lc < weatheringLoop; lc++) {
        for (let i = 0; i < geom.attributes[0].length; i += 1) {
            let currV = geom.attributes[0][i]
            // console.log('v:', currV)

            // the 4 neighboring verts, if one or more are missing, use itself to replace them
            // i / gridsize is the row number
            // i % gridsize is the col number
            let pn = (parseInt(i / gridsize) == 0) ? currV : geom.attributes[0][i - gridsize]
            let ps = (parseInt(i / gridsize) == gridsize - 1 ) ? currV : geom.attributes[0][i + gridsize]
            let pw = (i % (gridsize) == 0) ? currV : geom.attributes[0][i - 1]
            let pe = (i % gridsize == gridsize - 1) ? currV : geom.attributes[0][i + 1]

            let pny = pn[1]
            let psy = ps[1]
            let pwy = pw[1]
            let pey = pe[1]
    
            let mean = (pny+psy+pwy+pey)/4
    
            geom.attributes[0][i][1] = (currV[1] + mean) / 2
        }
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
        // i / gridsize is the row number
        // i % gridsize is the col number
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
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    // check if we have a geometry
    if (grid.attributes.length == 0) return
    let currProgram = (useTexture) ? textprogram : nontextprogram
    gl.useProgram(currProgram)
    gl.uniformMatrix4fv(currProgram.uniforms.p, false, window.p)
    
    gl.uniform3fv(currProgram.uniforms.lightDir, lightDir)
    gl.uniform3fv(currProgram.uniforms.halfway, half)
    gl.uniform1f(currProgram.uniforms.a, currA)

    if (useTexture) {
        gl.uniform1i(currProgram.uniforms.aTextureIPlanToUse, slot) // where `slot` is same it was in step 2 above
    } else {
        gl.uniform4fv(currProgram.uniforms.color, currColor)
    }
    let m = m4rotY(seconds/2)
    gl.uniformMatrix4fv(currProgram.uniforms.mv, false, m4mul(view, m))
    gl.uniformMatrix4fv(currProgram.uniforms.m, false, m)

    gl.bindVertexArray(gridGeom.vao)
    gl.drawElements(gridGeom.mode, gridGeom.count, gridGeom.type, 0) // Draw
}  

/* ------------------Event Listener-----------------------*/

window.addEventListener('load', setup)
    
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2;
        const faults = Number(document.querySelector('#faults').value) || 0;
        const weatheringLoop = Number(document.querySelector('#weathering').value) || 0;

        console.log('gridsize: ', gridsize);
        console.log('faults: ', faults);
        console.log('weatheringLoop: ', weatheringLoop);
        if (gridsize > 1 && gridsize < 256) {
            generateGrid(gridsize);
            applyFaults(grid, faults);
            weatherSmooth(grid, weatheringLoop, gridsize)
            addNormal(grid, gridsize)
            window.gridGeom = setupGeometry(grid);
        } else {
            console.error("The gridsize: ", gridsize, " is out of bound!")
        }
            
    });
    const textureInput = document.getElementById('textureInput');
    
    textureInput.addEventListener('input', function() {
        const value = textureInput.value;
        if (value === '') {
            useTexture = false
            currColor = [0.8, 0.8, 0.8, 1]
            currA = 0.5
        } else if (/^#([0-9a-f]{8})$/i.test(value)) {
            // Parse the hex color string
            const r = parseInt(value.substr(1, 2), 16) / 255;
            const g = parseInt(value.substr(3, 2), 16) / 255;
            const b = parseInt(value.substr(5, 2), 16) / 255;
            const a = parseInt(value.substr(7, 2), 16) / 255;
            
            useTexture = false
            currColor = [r, g, b, 1]
            currA = a
        } else if (/\.(jpg|png)$/.test(value)) {
            
            let img = new Image();
            img.crossOrigin = 'anonymous'; // Needed if the image is served from another domain
            
            img.addEventListener('load', function() {
                useTexture = true
                let texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + slot);
                gl.bindTexture(gl.TEXTURE_2D, texture);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

                gl.texImage2D(
                    gl.TEXTURE_2D, // destination slot
                    0, // the mipmap level this data provides; almost always 0
                    gl.RGBA, // how to store it in graphics memory
                    gl.RGBA, // how it is stored in the image object
                    gl.UNSIGNED_BYTE, // size of a single pixel-color in HTML
                    img, // source data
                );
                gl.generateMipmap(gl.TEXTURE_2D)
            });

            img.addEventListener('error', function() {
                // Handle image loading errors
                console.error('cannot load img')
            });
            img.src = value;
        }
    });
});


