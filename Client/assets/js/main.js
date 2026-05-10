window.showDialog = ({ title, desc, iconClass, type, inputs = [], onConfirm, isError = false, hideCancel = false, confirmText = null }) => {
    const existing = document.getElementById("global-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "global-modal-overlay";
    overlay.className = "modal-overlay";
    overlay.style.display = "flex"; 
    
    const iconStyles = { danger: "icon-danger", warning: "icon-warning", success: "icon-success" };
    const btnStyles = { danger: "btn-confirm-danger", warning: "btn-confirm-warning", success: "btn-confirm-success" };

    const shouldHideCancel = hideCancel || isError;
    const finalConfirmText = confirmText || (isError ? 'Close' : 'Confirm');

    const inputsHtml = inputs.map(input => `
        <div class="modal-input-group">
            <label class="modal-label">${input.label}</label>
            <input type="${input.type || 'text'}" id="modal-input-${input.id}" class="modal-input" value="${input.default || ''}" placeholder="${input.placeholder || ''}">
        </div>
    `).join("");

    overlay.innerHTML = `
        <div class="custom-modal">
            <div class="modal-icon ${iconStyles[type] || 'icon-danger'}"><i class="${iconClass || (isError ? 'ri-error-warning-line' : 'ri-question-line')}"></i></div>
            <h4 class="modal-title">${title}</h4>
            <p class="modal-desc" style="${isError ? 'color:var(--danger)' : ''}">${desc}</p>
            ${inputsHtml}
            <div class="modal-footer">
                ${!shouldHideCancel ? `<button class="modal-btn btn-cancel" id="btn-modal-cancel">Cancel</button>` : ''}
                <button class="modal-btn ${btnStyles[type] || 'btn-confirm-danger'}" id="btn-modal-confirm">${finalConfirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.classList.add("active"); });

    const closeModal = () => {
        overlay.classList.remove("active");
        setTimeout(() => overlay.remove(), 300);
    };

    const cancelBtn = document.getElementById("btn-modal-cancel");
    if (cancelBtn) cancelBtn.onclick = closeModal;
    
    document.getElementById("btn-modal-confirm").onclick = () => {
        if (shouldHideCancel && !onConfirm) {
            closeModal();
            return;
        }
        const results = {};
        inputs.forEach(input => {
            const el = document.getElementById(`modal-input-${input.id}`);
            if (el) {
                if (el.type === "file") {
                    results[input.id] = el.files[0];
                } else {
                    results[input.id] = el.value;
                }
            }
        });
        closeModal();
        if (onConfirm) onConfirm(results);
    };
};

window.showError = (msg) => {
    showDialog({
        title: "Operation Failed",
        desc: msg,
        type: "danger",
        isError: true,
        iconClass: "ri-error-warning-fill"
    });
};

window.showSuccess = (msg) => {
    showDialog({
        title: "Success!",
        desc: msg,
        type: "success",
        hideCancel: true,
        confirmText: "Great!",
        iconClass: "ri-checkbox-circle-fill"
    });
};

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-link[data-page]");
  const contentContainer = document.getElementById("content-container");
  const pageTitle = document.getElementById("page-title");

  if (!api.isAuthenticated()) {
    window.location.href = "/login.html";
    return;
  }

  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "Admin") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        alert("Access Denied: This dashboard is only accessible to administrators.");
        window.location.href = "/login.html";
        return;
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
      api.logout();
      return;
    }
  } else {
    const token = api.getToken();
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.role !== "Admin") {
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            alert("Access Denied: This dashboard is only accessible to administrators.");
            window.location.href = "/login.html";
            return;
          }
        }
      } catch (e) {
        console.error("Error decoding token:", e);
        api.logout();
        return;
      }
    }
  }

  function populateUserProfile() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const userImg = document.getElementById("header-user-img");
      const userName = document.getElementById("header-user-name");
      const userRole = document.getElementById("header-user-role");
      const userEmail = document.getElementById("header-user-email");

      if (userName) userName.textContent = user.name || user.userName || "Admin";
      if (userRole) userRole.textContent = user.role || "Administrator";
      if (userEmail) userEmail.textContent = user.email || "";

      if (userImg) {
        userImg.src =
          user.userImage?.secure_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Admin")}&background=6366f1&color=fff&bold=true`;
      }
    } catch (e) {
      console.error("Error populating user profile:", e);
    }
  }

  populateUserProfile();

  const userProfileToggle = document.getElementById("user-profile-toggle");
  const userProfileDropdown = document.querySelector(".user-profile-dropdown");

  if (userProfileToggle && userProfileDropdown) {
    userProfileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userProfileDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!userProfileDropdown.contains(e.target)) {
        userProfileDropdown.classList.remove("active");
      }
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const page = link.getAttribute("data-page");
      loadPage(page);
    });
  });

  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  
  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";
  document.body.appendChild(backdrop);

  const toggleSidebar = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
      sidebar.classList.remove("closed");
    } else {
      sidebar.classList.toggle("closed");
      document.body.classList.toggle("sidebar-closed");
    }

    const icon = sidebarToggle.querySelector("i");
    const isOpen = isMobile ? sidebar.classList.contains("open") : !sidebar.classList.contains("closed");
    icon.className = isOpen ? "ri-menu-fold-line" : "ri-menu-unfold-line";
  };

  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
    backdrop.addEventListener("click", toggleSidebar);
  }

  links.forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 768 && sidebar.classList.contains("open")) {
            toggleSidebar();
        }
    });
  });

  function loadPage(page) {
    const capitalizedPage = page.charAt(0).toUpperCase() + page.slice(1);
    if (pageTitle) pageTitle.textContent = capitalizedPage;

    let html = "";
    let pageObj = null;

    switch (page) {
      case "dashboard":
        pageObj = typeof DashboardPage !== "undefined" ? DashboardPage : null;
        break;
      case "users":
        pageObj = typeof UsersPage !== "undefined" ? UsersPage : null;
        break;
      case "sessions":
        pageObj = typeof SessionsPage !== "undefined" ? SessionsPage : null;
        break;
      case "payments":
        pageObj = typeof PaymentsPage !== "undefined" ? PaymentsPage : null;
        break;
      case "reports":
        pageObj = typeof ReportsPage !== "undefined" ? ReportsPage : null;
        break;
      case "tracks":
        pageObj = typeof TracksPage !== "undefined" ? TracksPage : null;
        break;
      case "store":
        pageObj = typeof StorePage !== "undefined" ? StorePage : null;
        break;
      default:
        html = '<div class="text-center">Page not found</div>';
    }

    if (pageObj) {
      contentContainer.innerHTML = pageObj.render();
      if (pageObj.init) {
        pageObj.init();
      }
    } else {
      if (!html) html = '<div class="text-center">Module not loaded</div>';
      contentContainer.innerHTML = html;
    }
  }

  loadPage("dashboard");

  const logoutBtn = document.getElementById("logout-btn");
  const sidebarLogout = document.querySelector(".sidebar-footer .logout");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      api.logout();
    });
  }

  if (sidebarLogout) {
    sidebarLogout.addEventListener("click", (e) => {
      e.preventDefault();
      api.logout();
    });
  }
});
