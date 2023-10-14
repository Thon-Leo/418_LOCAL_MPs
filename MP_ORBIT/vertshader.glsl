#version 300 es
layout(location = 0) in vec4 position;
layout(location = 1) in vec4 colorIn;
out vec4 colorOut;
uniform mat4 mv;
uniform mat4 p;
void main() {
    colorOut = colorIn;
    gl_Position = p * mv * position;
}