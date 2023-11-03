#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;

in vec3 nOut;
out vec4 color;

void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(dot(n, halfway), 50.0);

    vec4 steep = vec4(0.6, 0.3, 0.3, 1);
    vec4 shallow = vec4(0.2, 0.6, 0.1, 1);
    
    float factor = step(0.577, n.y);

    vec3 blendedColor = mix(steep.xyz, shallow.xyz, factor);
    color = vec4(blendedColor * lambert + vec3(1,1,1) * blinn, shallow.w);
    
    // color = tmpColor;
}