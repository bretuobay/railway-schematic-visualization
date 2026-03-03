export async function loadCSVAdapter() {
  const module = await import('./index');

  return module.CSVAdapter;
}

export async function loadGeoJSONAdapter() {
  const module = await import('./index');

  return module.GeoJSONAdapter;
}

export async function loadELRAdapter() {
  const module = await import('./index');

  return module.ELRAdapter;
}

export async function loadRINFAdapter() {
  const module = await import('./index');

  return module.RINFAdapter;
}
