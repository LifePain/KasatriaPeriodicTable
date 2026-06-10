/**
 * auth.js
 * Gates the visualization behind Google Sign-In using
 * Google Identity Services (GIS).
 *
 * Flow:
 *   1. GIS library loads -> initialize with our Client ID
 *   2. Render the official "Sign in with Google" button
 *   3. On success, GIS returns an ID token (JWT). We decode its payload
 *      locally just to display name + avatar (no server verification is
 *      needed because we never grant the token any authority).
 *   4. Hide the login overlay and signal main.js to boot the 3D app.
 */
(function () {
  "use strict";

  const overlay = document.getElementById("login-overlay");
  const app = document.getElementById("app");
  const loginError = document.getElementById("login-error");

  /** Decode the payload of a JWT (base64url -> JSON). Display use only. */
  function decodeJwtPayload(token) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  }

  function showApp(user) {
    if (user) {
      document.getElementById("user-avatar").src = user.picture || "";
      document.getElementById("user-name").textContent = user.name || user.email || "";
    }
    overlay.hidden = true;
    app.hidden = false;
    // main.js listens for this to start fetching data + building the scene.
    window.dispatchEvent(new CustomEvent("app:authenticated"));
  }

  function handleCredentialResponse(response) {
    try {
      const payload = decodeJwtPayload(response.credential);
      showApp(payload);
    } catch (err) {
      console.error("Failed to decode credential:", err);
      loginError.textContent = "Sign-in failed. Please try again.";
      loginError.hidden = false;
    }
  }

  function initGis() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      // GIS script not ready yet — retry shortly.
      setTimeout(initGis, 100);
      return;
    }
    google.accounts.id.initialize({
      client_id: window.APP_CONFIG.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
    });
    google.accounts.id.renderButton(document.getElementById("gsi-button"), {
      theme: "filled_blue",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  }

  document.getElementById("signout-btn").addEventListener("click", () => {
    // Prevent silent auto re-login, then reset to the gate.
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    window.location.reload();
  });

  if (window.APP_CONFIG.SKIP_AUTH) {
    // Local development bypass (see config.js). Never ship with this on.
    window.addEventListener("DOMContentLoaded", () =>
      showApp({ name: "Dev Mode", picture: "" })
    );
  } else {
    initGis();
  }
})();
