export async function apiRequest(path, method = "GET", body, token) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const readBodySafely = async () => {
    if (isJson) {
      return response.json().catch(() => null);
    }
    const text = await response.text().catch(() => "");
    return text ? { message: text } : null;
  };

  if (!response.ok) {
    const error = await readBodySafely();
    throw new Error((error && error.message) || "Request failed");
  }

  if (response.status === 204 || response.status === 205) {
    return null;
  }

  return readBodySafely();
}

export async function uploadImage(path, file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Upload failed");
  }
  return response.json();
}
