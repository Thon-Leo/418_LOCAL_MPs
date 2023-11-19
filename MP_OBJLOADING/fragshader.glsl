#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;

in vec3 nOut;
in vec4 colorOut;

out vec4 color;

void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(dot(n, halfway), 50.0);

    vec4 tmpColor = colorOut;
    color = vec4(tmpColor.xyz * lambert + vec3(1,1,1) * blinn, tmpColor.w);
    // color = tmpColor;
}