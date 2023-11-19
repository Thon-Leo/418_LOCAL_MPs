#version 300 es
layout(location = 0) in vec4 position;
layout(location = 1) in vec3 normal;

uniform mat4 mv; // Model-view matrix
uniform mat4 p;  // Projection matrix

out vec3 nOut;
out vec3 worldPosOut; // Output world position

void main() {
    nOut = normal;
    worldPosOut = vec3(mv * position); // Calculate world position
    gl_Position = p * mv * position;
}
