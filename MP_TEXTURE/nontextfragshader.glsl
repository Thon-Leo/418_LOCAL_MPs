#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;
uniform vec4 color;
uniform float a;

in vec3 nOut;
out vec4 colorOut;

void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(max(0.0,dot(n, halfway)), 50.0);

    vec3 diffuse = color.rgb * lambert * (1.0 - a);
    vec3 specular = vec3(1.0,1.0,1.0) * blinn * a * 3.0; 

    colorOut = vec4(diffuse + specular, 1.0);
    // color = tmpColor;
}