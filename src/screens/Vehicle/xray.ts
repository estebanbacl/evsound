import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three'

/** Translucent fresnel surface: edges glow, faces stay almost transparent. */
export function createXrayMaterial(color = '#ff2a2a', base = 0.02, strength = 0.45) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uBase: { value: base },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uBase; uniform float uStrength;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
        gl_FragColor = vec4(uColor, uBase + f * uStrength);
      }`,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
}
