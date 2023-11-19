#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;
uniform float fogDensity; 
uniform vec3 fogColor; 

in float vDistanceFromCamera;
in vec3 nOut;
out vec4 color;

void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(max(0.0, dot(n, halfway)), 50.0);

    // Compute visibility based on fog
    float visibility = exp(-fogDensity * vDistanceFromCamera);
    visibility = clamp(visibility, 0.0, 1.0);
    
    vec4 tmpColor = vec4(0.8, 0.6, 0.4, 1);
    vec3 litColor = tmpColor.xyz * lambert + vec3(1,1,1) * blinn;
    vec3 finalColor = visibility * litColor + (1.0 - visibility) * fogColor;
    
    
    // Output the final color
    color = vec4(finalColor, tmpColor.w);
    // color = vec4(litColor, 1.0);
    // color = vec4(vec3(vDistanceFromCamera), 1.0);
}
