export async function post(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep a stable error shape when the endpoint does not return JSON.
  }

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la solicitud.');
  }

  return data;
}
