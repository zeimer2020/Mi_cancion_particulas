// Static stage lettering made from points. It is composited behind the agents
// only while the performer holds Space, outside the trail/history buffers.
export function createHeyMask() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 576;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const font = size => `900 ${size}px "Arial Black", Arial, sans-serif`;
  context.font = font(600);
  let metrics = context.measureText('HEY');
  const size = Math.floor(600 * Math.min(canvas.width * 0.9 / metrics.width,
    canvas.height * 0.88 / (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)));
  context.font = font(size); context.textAlign = 'center';
  metrics = context.measureText('HEY');
  context.fillStyle = '#fff';
  context.fillText('HEY', canvas.width / 2,
    (canvas.height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
  const mask = context.getImageData(0, 0, canvas.width, canvas.height).data;
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 4; y < canvas.height; y += 8) {
    for (let x = 4; x < canvas.width; x += 8) {
      if (mask[(y * canvas.width + x) * 4 + 3] < 128) continue;
      context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fill();
    }
  }
  return canvas;
}
