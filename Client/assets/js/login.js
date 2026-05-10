document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("authToken")) {
    window.location.href = "/";
    return;
  }

  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-msg");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    errorMsg.style.display = "none";
    errorMsg.textContent = "";

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.access_token) {
        localStorage.setItem("authToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);

        try {
          const parts = data.access_token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            localStorage.setItem(
              "user",
              JSON.stringify({
                id: payload.id,
                role: payload.role,
                userName: payload.userName,
                email: payload.email,
                phone: payload.phone,
                address: payload.address,
                firstName: payload.firstName,
                lastName: payload.lastName,
              }),
            );
          }
        } catch (e) {
          console.error("Error decoding token:", e);
        }

        window.location.href = "/";
      } else {
        throw new Error("No token received from server");
      }
    } catch (error) {
      console.error("Login Error:", error);
      errorMsg.textContent = error.message;
      errorMsg.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
