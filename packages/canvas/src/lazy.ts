export async function loadCanvasRenderer() {
  const module = await import('./index');

  return module.CanvasRenderer;
}

export async function loadHybridRenderer() {
  const module = await import('./index');

  return module.HybridRenderer;
}
