#version 300 es
layout(location = 0) in vec2 aPosition;
void main() {
    vec4 tmpVec = vec4(aPosition, 0.0, 1.0);
    gl_Position = tmpVec;
}