const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const size = 512
const supersample = 2
const renderSize = size * supersample
const teal = [8, 127, 140, 255]
const white = [255, 255, 255, 255]

function insideRoundedRect(x, y, width, height, radius) {
  const cx = Math.max(radius, Math.min(width - radius, x))
  const cy = Math.max(radius, Math.min(height - radius, y))
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function cubic(a, b, c, d, t) {
  const mt = 1 - t
  return mt ** 3 * a + 3 * mt ** 2 * t * b + 3 * mt * t ** 2 * c + t ** 3 * d
}

function toothPath(scale) {
  const p = []
  const addLine = (x, y) => p.push([x * scale, y * scale])
  const addCurve = (from, c1, c2, to) => {
    for (let i = 1; i <= 18; i += 1) {
      const t = i / 18
      p.push([cubic(from[0], c1[0], c2[0], to[0], t) * scale, cubic(from[1], c1[1], c2[1], to[1], t) * scale])
    }
  }
  addLine(18, 15)
  addCurve([18, 15], [22, 15], [25, 18], [32, 18])
  addCurve([32, 18], [39, 18], [42, 15], [46, 15])
  addCurve([46, 15], [50, 15], [53, 19], [53, 25])
  addCurve([53, 25], [53, 38], [47, 53], [40, 53])
  addCurve([40, 53], [36, 53], [37, 45], [32, 45])
  addCurve([32, 45], [27, 45], [28, 53], [24, 53])
  addCurve([24, 53], [17, 53], [11, 38], [11, 25])
  addCurve([11, 25], [11, 19], [14, 15], [18, 15])
  return p
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0
  const x = ax + t * dx
  const y = ay + t * dy
  return Math.hypot(px - x, py - y)
}

function smilePath(scale) {
  const points = []
  const from = [25 * scale, 25 * scale]
  const c1 = [27 * scale, 21 * scale]
  const c2 = [30 * scale, 19 * scale]
  const middle = [32 * scale, 19 * scale]
  const c3 = [34 * scale, 19 * scale]
  const c4 = [37 * scale, 21 * scale]
  const to = [39 * scale, 25 * scale]
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24
    if (t <= 0.5) points.push([cubic(from[0], c1[0], c2[0], middle[0], t * 2), cubic(from[1], c1[1], c2[1], middle[1], t * 2)])
    else points.push([cubic(middle[0], c3[0], c4[0], to[0], (t - 0.5) * 2), cubic(middle[1], c3[1], c4[1], to[1], (t - 0.5) * 2)])
  }
  return points
}

const png = new PNG({ width: size, height: size })
const tooth = toothPath(size / 64)
const smile = smilePath(size / 64)
const strokeWidth = 3 * size / 64

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    let backgroundHits = 0
    let toothHits = 0
    let smileHits = 0
    for (let sy = 0; sy < supersample; sy += 1) {
      for (let sx = 0; sx < supersample; sx += 1) {
        const px = x + (sx + 0.5) / supersample
        const py = y + (sy + 0.5) / supersample
        if (insideRoundedRect(px, py, size, size, 18 * size / 64)) backgroundHits += 1
        if (pointInPolygon(px, py, tooth)) toothHits += 1
        for (let i = 1; i < smile.length; i += 1) {
          if (distanceToSegment(px, py, smile[i - 1][0], smile[i - 1][1], smile[i][0], smile[i][1]) <= strokeWidth / 2) {
            smileHits += 1
            break
          }
        }
      }
    }
    const total = supersample * supersample
    const idx = (size * y + x) << 2
    if (backgroundHits === 0) {
      png.data[idx + 3] = 0
      continue
    }
    const toothAlpha = toothHits / total
    const smileAlpha = smileHits / total
    let red = teal[0]
    let green = teal[1]
    let blue = teal[2]
    let alpha = backgroundHits / total
    const blend = (color, coverage) => {
      red = color[0] * coverage + red * (1 - coverage)
      green = color[1] * coverage + green * (1 - coverage)
      blue = color[2] * coverage + blue * (1 - coverage)
      alpha = coverage + alpha * (1 - coverage)
    }
    blend(white, toothAlpha)
    blend(teal, smileAlpha)
    png.data[idx] = Math.round(red)
    png.data[idx + 1] = Math.round(green)
    png.data[idx + 2] = Math.round(blue)
    png.data[idx + 3] = Math.round(alpha * 255)
  }
}

const output = path.resolve(__dirname, '..', 'assets', 'dentahub-icon.png')
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, PNG.sync.write(png))
console.log(output)
