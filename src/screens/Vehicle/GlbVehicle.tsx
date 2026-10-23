import { useEffect, useState } from 'react'
import { EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createXrayMaterial } from './xray'

/** Loads a .glb (if present) and restyles it as X-ray. Calls onMissing when unavailable. */
export function GlbVehicle({
  url,
  edgeAngle,
  onMissing,
}: {
  url: string
  edgeAngle: number
  onMissing: () => void
}) {
  const [scene, setScene] = useState<Object3D | null>(null)
  useEffect(() => {
    let cancelled = false
    new GLTFLoader().load(
      url,
      (gltf) => {
        if (cancelled) return
        const xray = createXrayMaterial()
        const edgeMat = new LineBasicMaterial({
          color: '#ff2a2a',
          transparent: true,
          opacity: 0.85,
        })
        const meshes: Mesh[] = []
        gltf.scene.traverse((o) => {
          if ((o as Mesh).isMesh) meshes.push(o as Mesh)
        })
        for (const m of meshes) {
          m.add(new LineSegments(new EdgesGeometry(m.geometry, edgeAngle), edgeMat))
          m.material = xray
        }
        setScene(gltf.scene)
      },
      undefined,
      () => !cancelled && onMissing(),
    )
    return () => {
      cancelled = true
    }
  }, [url, edgeAngle, onMissing])
  return scene ? <primitive object={scene} /> : null
}
