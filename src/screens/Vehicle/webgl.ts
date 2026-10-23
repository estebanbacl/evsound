export function webglAvailable() {
  try {
    return !!document.createElement('canvas').getContext('webgl')
  } catch {
    return false
  }
}
