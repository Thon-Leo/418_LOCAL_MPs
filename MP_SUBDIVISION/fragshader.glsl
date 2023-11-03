#version 300 es
precision highp float;

// uniform vec3 lightDir;
// uniform vec3 halfway;

// in vec3 nOut;
out vec4 color;

// void main() {
//     vec3 n = normalize(nOut);
//     float lambert = max(0.0,dot(n, lightDir));
//     float blinn = pow(dot(n, halfway), 50.0);

    vec4 tmpColor = vec4(1, 0.373, 0.02, 1);
    // color = vec4(tmpColor.xyz * lambert + vec3(1,1,1) * blinn, tmpColor.w);
    color = tmpColor;
}