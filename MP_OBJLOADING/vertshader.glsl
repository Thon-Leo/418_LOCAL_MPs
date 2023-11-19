#version 300 es
layout(location = 0) in vec4 position;
layout(location = 1) in vec4 color;
layout(location = 2) in vec3 normal;


uniform mat4 mv;
uniform mat4 p;
uniform mat4 m;

out vec3 nOut;
out vec4 colorOut;

void main() {
    nOut = mat3(m) * normal;
    gl_Position = p * mv * position;
    colorOut = color;
}