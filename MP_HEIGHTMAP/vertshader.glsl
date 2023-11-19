#version 300 es
layout(location = 0) in vec4 position;
layout(location = 1) in vec3 normal;

uniform mat4 mv;
uniform mat4 p;
uniform float maxY;
uniform float minY;

out vec3 nOut;
out float Y;

void main() {
    nOut = normal;
    vec4 pos = p * mv * position;
    gl_Position = pos;
    Y = (position.y - minY) / (maxY - minY);
}