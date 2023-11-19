#version 300 es
precision highp float;

uniform vec3 lightDir;
uniform vec3 halfway;

in vec3 nOut;
in float Y;

out vec4 color;
void main() {
    vec3 n = normalize(nOut);
    float lambert = max(0.0,dot(n, lightDir));
    float blinn = pow(max(0.0, dot(n, halfway)), 50.0);
    
    // Define colors for your gradient
    vec3 color1 = vec3(1.0, 0.0, 0.0); // Red
    vec3 color2 = vec3(1.0, 0.5, 0.0); // Orange
    vec3 color3 = vec3(1.0, 1.0, 0.0); // yellow
    vec3 color4 = vec3(0.0, 1.0, 0.0); // green
    vec3 color5 = vec3(0.0, 1.0, 1.0); // cyan
    vec3 color6 = vec3(0.0, 0.0, 1.0); // Blue
    vec3 color7 = vec3(0.5, 0.0, 1.0); // violet

    // Interpolate between colors based on Y
    float interval = 1.0 / 6.0;
    vec3 terrainColor = color1; 

    terrainColor = mix(terrainColor, color2, smoothstep(0.00, 0.16, Y));
    terrainColor = mix(terrainColor, color3, smoothstep(0.16, 0.33, Y));
    terrainColor = mix(terrainColor, color4, smoothstep(0.33, 0.49, Y));
    terrainColor = mix(terrainColor, color5, smoothstep(0.49, 0.66, Y));
    terrainColor = mix(terrainColor, color6, smoothstep(0.66, 0.82, Y));
    terrainColor = mix(terrainColor, color7, smoothstep(0.82, 1.00, Y));

    // lighting
    vec3 litColor = terrainColor.xyz * lambert + vec3(1,1,1) * blinn;
    
    // Output the final color
    color = vec4(litColor, 1);

}
