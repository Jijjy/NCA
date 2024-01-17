#version 300 es
#define TAU 6.28318530718
precision highp float;

uniform sampler2D uTex;

uniform vec2 rez;
uniform int renderMode;

out vec4 outColor;

uniform mat3 u_kernel;

#ACTIVATION#
vec4 getCell(vec2 p){ return texture(uTex, p / rez); }

float applyKernel(vec2 p, mat3 m){
  float sum = 0.0;
  for(int i=0; i<3; i++)
  for(int j=0; j<3; j++)
    sum += getCell(p + vec2( i-1 , j-1 )).r * m[i][j];

  return activation(sum);
}

void main() {
  vec2 p = gl_FragCoord.xy;

  float x = applyKernel(p, u_kernel);

  if(renderMode == 1){
    outColor = vec4(x,x,x,1.0);
    return;
  }

  outColor = vec4(x,x,x,1.0);
}