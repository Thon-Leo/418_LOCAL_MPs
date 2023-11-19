#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 eyePos; // Add this uniform for the camera's position

in vec3 nOut;
in vec3 worldPosOut; // Receive the world position from the vertex shader

out vec4 color;

void main() {
    vec3 n = normalize(nOut);
    vec3 viewDir = normalize(eyePos - worldPosOut); // Calculate the view vector for this fragment
    vec3 halfwayDir = normalize(lightDir + viewDir); // Calculate the halfway vector using the view vector

    float lambert = max(0.0, dot(n, lightDir));
    float blinn = pow(max(0.0, dot(n, halfwayDir)), 50.0);

    vec4 tmpColor = vec4(0.8, 0.6, 0.4, 1);
    color = vec4(tmpColor.xyz * lambert + vec3(1,1,1) * blinn, tmpColor.w);
}
