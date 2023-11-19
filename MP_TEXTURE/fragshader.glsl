#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;
uniform sampler2D aTextureIPlanToUse;

in vec3 nOut;
in vec2 vTexCoord;
out vec4 colorOut;

void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(max(0.0,dot(n, halfway)), 50.0);

    vec4 lookedUpRGBA = texture(aTextureIPlanToUse, vTexCoord);
    vec3 diffuse = lookedUpRGBA.rgb * lambert;

    colorOut = vec4(diffuse, lookedUpRGBA.w);
    // color = tmpColor;
}