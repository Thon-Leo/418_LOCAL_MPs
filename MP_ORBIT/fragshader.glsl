#version 300 es
precision highp float;
in vec4 colorOut;
out vec4 color;
void main() {
    color = colorOut;
}