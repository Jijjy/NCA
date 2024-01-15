#version 300 es
#define TAU 6.28318530718
precision highp float;

uniform sampler2D uTex;

uniform float time;
uniform vec2 rez;
uniform int renderMode;

out vec4 outColor;

uniform float u_kernel[9];

float activation(float f){ return tanh(f); }
vec4 getCell(vec2 p){ return texture(uTex, p / rez); }

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 p = gl_FragCoord.xy;

  if(renderMode == 1){
    float x = getCell(p).x;
    outColor = vec4(x,x,x,1.0);
    return;
  }

  float sum
    = getCell(p + vec2( 1.,-1.)).r * u_kernel[0] 
    + getCell(p + vec2( 0.,-1.)).r * u_kernel[1]
    + getCell(p + vec2(-1.,-1.)).r * u_kernel[2]
    + getCell(p + vec2( 1., 0.)).r * u_kernel[3]
    + getCell(p + vec2( 0., 0.)).r * u_kernel[4]
    + getCell(p + vec2(-1., 0.)).r * u_kernel[5]
    + getCell(p + vec2( 1., 1.)).r * u_kernel[6]
    + getCell(p + vec2( 0., 1.)).r * u_kernel[7]
    + getCell(p + vec2(-1., 1.)).r * u_kernel[8];
  
  float x = activation(sum);
  outColor = vec4(x,x,x,1.0);
}