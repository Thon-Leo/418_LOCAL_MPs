
/* global var declaration */
let Identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
let view = m4view([1,2,1], [0,0,0], [0,0,1])


/* -------------- OBJ --------------- */
let obj = {
    'triangles' : [],
    'attributes' : []
};

let centerPos = [0,0,0]
let scaleInterval = 2
/* -------------- RAINBOW -------------- */


/* ------------- LIGHTING -------------- */
let lightDir = normalize([1,2,1])
let half = normalize(add(lightDir, [0,0,0]))

/* -------------------------------------------- */
/* -------------------------------------------- */
/* ---------- NO CHANGE FUNCTIONS ------------- */
/* -------------------------------------------- */
/* -------------------------------------------- */
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
 * add normals to the current geom
 */
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

/* -------------------------------------------------- */
/* -------------------------------------------------- */
/* --------------------- DRAW ----------------------- */
/* -------------------------------------------------- */
/* -------------------------------------------------- */



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
    if (obj.attributes.length == 0) return
    gl.useProgram(program)
    gl.uniformMatrix4fv(program.uniforms.p, false, window.p)
    
    gl.uniform3fv(program.uniforms.lightDir, lightDir)
    gl.uniform3fv(program.uniforms.halfway, half)

    let m = m4rotZ(seconds/2)
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(view, m))
    gl.uniformMatrix4fv(program.uniforms.m, false, m)

    gl.bindVertexArray(objGeom.vao)
    gl.drawElements(objGeom.mode, objGeom.count, objGeom.type, 0) // Draw
}


/* -------------------------------------------------- */
/* -------------------------------------------------- */
/* --------------- PER TASK FUNCTIONS --------------- */
/* -------------------------------------------------- */
/* -------------------------------------------------- */

/**
 * loads the obj into the program
 * @param {text} filename 
 */
function loadOBJFile(fileName) {
    fetch(fileName)
        .then(response => response.text())
        .then(objText => {
            const { vertices, textureCoords, normals, faces } = parseOBJ(objText);
            // clear old geom
            obj = {
                'triangles' : [],
                'attributes' : []
            };


            // log
            // console.log('vertices: ', vertices)
            // console.log('tex'textureCoords)
            // console.log('normals: ', normals)
            // console.log('faces: ', faces)


            // set up obj
            obj.triangles = faces
            obj.attributes[0] = vertices
            if (textureCoords.length != 0) {
                obj.attributes.push(textureCoords)
            } else {
                let verticesColors = new Array(vertices.length).fill().map(() => [.8, .8, .8, 1]);
                obj.attributes.push(verticesColors)
            }
            if (normals.length != 0) {
                obj.attributes.push(normals)
            } else {
                console.log(obj)
                addNormal(obj)
            }
            window.objGeom = setupGeometry(obj)
        })
        .catch(error => {
            console.error('Error loading OBJ file:', error);
        });
}

/**
 * helper function to read the obj file.
 * This function should parse the lines as specified on the course website.
 * It also scale the verts and center them 
 * @param {*} objText 
 * @returns 
 */
function parseOBJ(objText) {
    let vertices = [];
    let textureCoords = [];
    let normals = [];
    let faces = [];

    // parse it
    let lines = objText.split('\n');
    for (const line of lines) {
        if (line.startsWith('#')) { // This line is a comment, ignore it.
            continue
        } else if (line.startsWith('v ')) { // Handle vertex line
            let vertexCoordinates = line.split(/\s+/).slice(1).map(Number)
            // some stupid sanity checks
            if (vertexCoordinates.length > 3)
                vertexCoordinates = [vertexCoordinates[0], vertexCoordinates[1], vertexCoordinates[2]]
            vertices.push(vertexCoordinates)
        } else if (line.startsWith('vn ')) { // Handle normal line
            let normal = line.split(/\s+/).slice(1).map(Number)
            normals.push(normal)
        } else if (line.startsWith('vt ')) { // Handle texture coordinate line
            continue
        } else if (line.startsWith('f ')) {
            let face = line.substring(2).split(' ').map(faceStr => {
                return faceStr.split('/').map(numStr => parseInt(numStr, 10) - 1);
            });
            // some stupid sanity checks
            if (face.length > 3)
                face = [face[1], face[2], face[3]]
            faces.push(face);
        }
    }

    // scale
    let S = calculateMaxSeparation(vertices)
    vertices = multiplyArrayByScalar(vertices, scaleInterval/S)

    // center
    let [Ax, Ay, Az] = calcluateVertexAverage(vertices)
    for (let i = 0; i < vertices.length; i++) {
        vertices[i][0] -= Ax;
        vertices[i][1] -= Ay;
        vertices[i][2] -= Az;
    }
    return { vertices, textureCoords, normals, faces };
}


/**
 * this method finds the max seperation between verts, it is used to scale the obj
 * @param {Array} vertices 
 * @returns 
 */
function calculateMaxSeparation(vertices) {
    let maxSeparation = 0;

    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const distance = distanceBetweenVertices(vertices[i], vertices[j]);
            maxSeparation = Math.max(maxSeparation, distance);
        }
    }

    return maxSeparation;
}

/**
 * This function calculates the avg of all the vertices
 * @param {Array} vertices 
 * @returns an array contains the avg values of X, Y, Z
 */
function calcluateVertexAverage(vertices) {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let len = vertices.length;
    for (let i = 0; i < len; i++) {
        sumX += vertices[i][0];
        sumY += vertices[i][1];
        sumZ += vertices[i][2];
    }

    return [sumX/len, sumY/len, sumZ/len];
}

/**
 * helper func of calculateMaxSeparation
 * @param {*} vertexA 
 * @param {*} vertexB 
 * @returns 
 */
function distanceBetweenVertices(vertexA, vertexB) {
    const [x1, y1, z1] = vertexA;
    const [x2, y2, z2] = vertexB;
    return Math.sqrt(
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2) +
        Math.pow(z2 - z1, 2)
    );
}

function multiplyArrayByScalar(array, scalar) {
    return array.map(vertex => vertex.map(component => component * scalar));
}



/* ------------------ Event Listener ----------------------- */

window.addEventListener('load', setup)
    
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#submit').addEventListener('click', function(event) {
        event.preventDefault(); // This will prevent the default form submission action

        // Use querySelector to get the file names from the input fields
        const objFileName = document.querySelector('#objFileName').value.trim();
        // const imagePath = document.querySelector('#imagePath').value.trim();

        // Log the file names to the console or use them for further processing
        console.log("OBJ File Name:", objFileName);
        // console.log("Texture Map File Name:", imagePath);

        if (objFileName !== '') {
            loadOBJFile(objFileName);

            // if (imagePath !== '') {
            //     loadTextureMap(imagePath);
            // }
        } else {
            console.error("Please provide an OBJ file name.");
        }
    });
});

