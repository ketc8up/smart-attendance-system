let appConfigPromise;

async function loadConfig() {
  if (!appConfigPromise) {
    appConfigPromise = fetch("./config.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load app config.");
        }

        return response.json();
      })
      .catch(() => ({ apiBaseUrl: "/api" }));
  }

  return appConfigPromise;
}

export async function fetchDashboard(uid) {
  const config = await loadConfig();
  const response = await fetch(
    `${config.apiBaseUrl}/dashboard/${encodeURIComponent(uid)}`
  );
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Unable to load dashboard.");
  }

  return payload;
}
