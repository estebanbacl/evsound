import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
} from 'three'

const noRaycast = () => null

/** Dark studio with red and white strip lights, baked to an environment map for reflections. */
export function StudioEnv() {
  const gl = useThree((s) => s.gl)
  const get = useThree((s) => s.get)
  useEffect(() => {
    const room = new Scene()
    const add = (
      color: string,
      k: number,
      size: [number, number],
      pos: [number, number, number],
    ) => {
      const mat = new MeshBasicMaterial({
        color: new Color(color).multiplyScalar(k),
        side: DoubleSide,
      })
      const m = new Mesh(new PlaneGeometry(size[0], size[1]), mat)
      m.position.set(...pos)
      m.lookAt(0, 0, 0)
      room.add(m)
    }
    room.add(
      new Mesh(
        new SphereGeometry(30, 16, 12),
        new MeshBasicMaterial({ color: new Color('#050507'), side: BackSide }),
      ),
    )
    add('#ffffff', 5, [16, 5], [0, 14, 0]) // overhead softbox
    add('#ff1f1f', 6, [2.5, 12], [-9, 3, -4]) // red strip, rear-left
    add('#ff1f1f', 5, [2.5, 12], [9, 3, -6]) // red strip, rear-right
    add('#ffffff', 9, [1.2, 14], [9, 4, 7]) // white strip, front-right
    add('#9fc4ff', 6, [1.2, 10], [-10, 3, 6]) // cool strip, front-left
    add('#ff3b1f', 0.6, [30, 3], [0, -2.5, 0]) // faint red floor bounce
    const pm = new PMREMGenerator(gl)
    const rt = pm.fromScene(room, 0.03)
    const scene = get().scene
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
      pm.dispose()
      room.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          ;(o.material as MeshBasicMaterial).dispose()
        }
      })
    }
  }, [gl, get])
  return null
}

const GROUND_VERT = /* glsl */ `
  varying vec2 vP;
  void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

/** Red floor glow with a faint ring and a soft contact shadow under the car. */
export function Ground({ length, width }: { length: number; width: number }) {
  const mats = useMemo(() => {
    const glow = new ShaderMaterial({
      uniforms: { uE: { value: [length / 2 + 0.2, width / 2 + 0.25] } },
      vertexShader: GROUND_VERT,
      fragmentShader: /* glsl */ `
        uniform vec2 uE; varying vec2 vP;
        void main() {
          float d = length(vec2(vP.x / uE.x, vP.y / uE.y));
          float halo = exp(-pow(max(d - 0.95, 0.0) * 2.4, 1.3)) * 0.22;
          float ring = smoothstep(0.03, 0.0, abs(d - 1.45)) * 0.3;
          float fade = smoothstep(3.4, 1.2, length(vP));
          gl_FragColor = vec4(1.0, 0.12, 0.1, (halo + ring) * fade);
        }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const shadow = new ShaderMaterial({
      uniforms: { uE: { value: [length / 2 + 0.1, width / 2 + 0.1] } },
      vertexShader: GROUND_VERT,
      fragmentShader: /* glsl */ `
        uniform vec2 uE; varying vec2 vP;
        void main() {
          float d = length(vec2(vP.x / uE.x, vP.y / uE.y));
          gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.25, 0.35, d) * 0.85);
        }`,
      transparent: true,
      depthWrite: false,
    })
    return { glow, shadow }
  }, [length, width])
  const plane = useMemo(() => new PlaneGeometry(16, 16), [])
  useEffect(
    () => () => {
      mats.glow.dispose()
      mats.shadow.dispose()
      plane.dispose()
    },
    [mats, plane],
  )
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={plane} material={mats.shadow} position={[0, 0, 0.002]} raycast={noRaycast} />
      <mesh geometry={plane} material={mats.glow} position={[0, 0, 0.004]} raycast={noRaycast} />
    </group>
  )
}

let haloTexture: CanvasTexture | null = null
function getHalo() {
  if (haloTexture) return haloTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.25, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  }
  haloTexture = new CanvasTexture(c)
  return haloTexture
}

/** Additive light bloom billboard. */
export function Halo({
  position,
  color,
  size,
  opacity = 0.8,
}: {
  position: [number, number, number]
  color: string
  size: number
  opacity?: number
}) {
  return (
    <sprite position={position} scale={[size, size, 1]} raycast={noRaycast}>
      <spriteMaterial
        map={getHalo()}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}
