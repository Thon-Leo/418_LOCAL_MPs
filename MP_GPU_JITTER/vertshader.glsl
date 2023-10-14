#version 300 es
layout(location = 0) in vec2 aPosition;
uniform float u_time;  // Added uniform for time
void main() {
    vec4 tmpVec = vec4(aPosition, 0.0, 1.0);
    float offset = float(gl_VertexID) + 1.0;
    // Introduce jittering effect based on time
    tmpVec.x += sin(u_time * offset) * 0.02;
    tmpVec.y += cos(u_time * offset) * 0.02;
    
    gl_Position = tmpVec;
}