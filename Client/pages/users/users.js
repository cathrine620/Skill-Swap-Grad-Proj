const UsersPage = {
  name: "users",
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  currentSearch: "",
  render: () => {
    return `
            <div class="section-header" style="justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom: 2rem;">
                <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
                    <h3 class="section-title" style="margin:0">User Management</h3>
                    <div class="search-container">
                        <i class="ri-search-line search-icon"></i>
                        <input type="text" id="user-search" class="search-input" placeholder="Search by name or email...">
                    </div>
                </div>
            </div>
            <div class="table-container" style="border-radius: var(--radius-lg) var(--radius-lg) 0 0; border-bottom:none;">
                <table>
                    <thead>
                        <tr>
                            <th>User Profile</th>
                            <th>Role</th>
                            <th>Verified</th>
                            <th>Warns</th>
                            <th>Status</th>
                            <th class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="6" class="text-center">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="pagination-container" class="pagination-container">
            </div>
        `;
  },
  init: async () => {
    const tableBody = document.getElementById("users-table-body");
    const paginationContainer = document.getElementById("pagination-container");
    const searchInput = document.getElementById("user-search");
    
    UsersPage.currentSearch = "";

    const fetchUsers = async (page = 1) => {
      try {
        UsersPage.currentPage = page;
        const searchTerm = UsersPage.currentSearch || "";
        let url = `/admin/users?page=${page}&limit=${UsersPage.limit}`;
        if (searchTerm.trim()) {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        const response = await api.fetchAuth(url);
        const { users = [], total = 0, totalPages = 1 } = response.data || {};
        
        UsersPage.totalPages = totalPages;

        if (!users || users.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
          paginationContainer.innerHTML = "";
          return;
        }

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserId = currentUser._id || currentUser.id;

        tableBody.innerHTML = users
          .map(
            (u) => `
                <tr class="user-row" data-id="${u._id}">
                    <td>
                        <div style="display:flex;align-items:center;gap:1rem;">
                            <img src="${u.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=random`}" 
                                 style="width:40px;height:40px;border-radius:10px;object-fit:cover;">
                            <div>
                                <div style="font-weight:700; color:var(--text-header); font-size:0.95rem;">${u.name || "Unknown"} ${u._id === currentUserId ? '<span style="color:var(--primary-color); font-size:0.7rem; font-weight:normal;">(You)</span>' : ''}</div>
                                <div style="font-size:0.8rem;color:var(--text-muted)">${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="status-badge" style="background:var(--primary-soft); color:var(--primary-color)">${u.role}</span></td>
                    <td>
                        <span class="status-badge ${u.confirmEmail ? "status-active" : "status-blocked"}">
                            <i class="${u.confirmEmail ? "ri-checkbox-circle-fill" : "ri-close-circle-fill"}"></i>
                            ${u.confirmEmail ? "Verified" : "Unverified"}
                        </span>
                    </td>
                    <td class="text-center">
                        <span style="font-weight:800; color:${(u.warnings?.length || 0) > 0 ? "var(--danger)" : "var(--text-muted)"}">
                            ${u.warnings?.length || 0}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${u.blockInfo?.isBlocked ? "status-blocked" : "status-active"}">
                            ${u.blockInfo?.isBlocked ? "Blocked" : "Active"}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex; gap: 8px; justify-content:center;">
                            ${u._id === currentUserId ? `<span style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">System Admin</span>` : `
                                ${u.blockInfo?.isBlocked 
                                    ? `<button class="action-btn btn-unblock" title="Unblock" style="color:var(--success)"><i class="ri-lock-unlock-fill"></i></button>`
                                    : `<button class="action-btn btn-block" title="Block" style="color:var(--text-muted)"><i class="ri-lock-fill"></i></button>`
                                }
                                <button class="action-btn btn-warn" title="Warn" style="color:var(--warning)"><i class="ri-error-warning-fill"></i></button>
                                <button class="action-btn btn-role" title="Change Role" style="color:var(--primary-color)"><i class="ri-shield-user-fill"></i></button>
                                <button class="action-btn btn-delete" title="Delete" style="color:var(--danger)"><i class="ri-delete-bin-7-fill"></i></button>
                            `}
                        </div>
                    </td>
                </tr>
            `
          ).join("");

        renderPagination(total);
      } catch (error) {
        console.error("Fetch error:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center error-message">Error: ${error.message}</td></tr>`;
      }
    };

    const renderPagination = (total) => {
      const start = (UsersPage.currentPage - 1) * UsersPage.limit + 1;
      const end = Math.min(UsersPage.currentPage * UsersPage.limit, total);
      let html = `<div class="pagination-info">Showing <b>${start}-${end}</b> of <b>${total}</b></div><div class="pagination-controls">`;
      html += `<button class="page-btn" id="prev-page" ${UsersPage.currentPage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
      for (let i = 1; i <= UsersPage.totalPages; i++) {
        if (i === 1 || i === UsersPage.totalPages || (i >= UsersPage.currentPage - 1 && i <= UsersPage.currentPage + 1)) {
          html += `<button class="page-btn ${i === UsersPage.currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
        } else if (i === UsersPage.currentPage - 2 || i === UsersPage.currentPage + 2) {
          html += `<span>...</span>`;
        }
      }
      html += `<button class="page-btn" id="next-page" ${UsersPage.currentPage === UsersPage.totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button></div>`;
      paginationContainer.innerHTML = html;

      paginationContainer.querySelectorAll(".page-btn[data-page]").forEach(btn => {
        btn.onclick = () => fetchUsers(parseInt(btn.dataset.page));
      });
      const prevB = document.getElementById("prev-page");
      const nextB = document.getElementById("next-page");
      if (prevB) prevB.onclick = () => fetchUsers(UsersPage.currentPage - 1);
      if (nextB) nextB.onclick = () => fetchUsers(UsersPage.currentPage + 1);
    };

    tableBody.onclick = (e) => {
      const btn = e.target.closest(".action-btn");
      if (!btn) return;

      const row = btn.closest(".user-row");
      const userId = row.getAttribute("data-id");

      if (btn.classList.contains("btn-block")) {
        showDialog({
          title: "Block User Account",
          desc: "Are you sure you want to block this user?",
          iconClass: "ri-forbid-fill",
          type: "danger",
          inputs: [
            { id: "days", label: "Duration (Days)", type: "number", default: "7" },
            { id: "reason", label: "Reason", type: "text", default: "Violation of terms" }
          ],
          onConfirm: async (data) => {
            try {
              await api.fetchAuth(`/admin/users/${userId}/block`, {
                method: "PATCH",
                body: JSON.stringify({ days: parseInt(data.days), reason: data.reason }),
              });
              await fetchUsers(UsersPage.currentPage);
              showSuccess("User has been blocked successfully.");
            } catch (err) { showError(err.message); }
          }
        });
      } else if (btn.classList.contains("btn-unblock")) {
        showDialog({
          title: "Restore Access",
          desc: "Unblock this user immediately?",
          iconClass: "ri-lock-unlock-fill",
          type: "success",
          onConfirm: async () => {
            try {
              await api.fetchAuth(`/admin/users/${userId}/unblock`, { method: "PATCH" });
              await fetchUsers(UsersPage.currentPage);
              showSuccess("User access has been restored.");
            } catch (err) { showError(err.message); }
          }
        });
      } else if (btn.classList.contains("btn-delete")) {
        showDialog({
          title: "Delete Forever",
          desc: "This cannot be undone. Wipe user data?",
          iconClass: "ri-delete-bin-fill",
          type: "danger",
          onConfirm: async () => {
            try {
              await api.fetchAuth(`/admin/users/${userId}`, { method: "DELETE" });
              await fetchUsers(UsersPage.currentPage);
              showSuccess("User has been deleted permanently.");
            } catch (err) { showError(err.message); }
          }
        });
      } else if (btn.classList.contains("btn-warn")) {
        showDialog({
          title: "Send Warning",
          desc: "User will be notified. 10 warnings = Block.",
          iconClass: "ri-error-warning-fill",
          type: "warning",
          inputs: [{ id: "reason", label: "Reason", type: "text", default: "Inappropriate behavior" }],
          onConfirm: async (data) => {
            try {
              await api.fetchAuth(`/admin/users/${userId}/warn`, {
                method: "POST",
                body: JSON.stringify({ reason: data.reason }),
              });
              await fetchUsers(UsersPage.currentPage);
              showSuccess("Warning letter sent successfully.");
            } catch (err) { showError(err.message); }
          }
        });
      } else if (btn.classList.contains("btn-role")) {
        showDialog({
          title: "Change User Role",
          desc: "Choose the new access level for this user.",
          iconClass: "ri-shield-user-fill",
          type: "primary",
          inputs: [
            { 
              id: "role", 
              label: "New Role (Normal, Mentor, Admin)", 
              type: "text", 
              default: "Normal" 
            }
          ],
          onConfirm: async (data) => {
            try {
              await api.fetchAuth(`/admin/users/${userId}/role`, {
                method: "PATCH",
                body: JSON.stringify({ role: data.role }),
              });
              await fetchUsers(UsersPage.currentPage);
              showSuccess(`User role updated to ${data.role} successfully.`);
            } catch (err) { showError(err.message); }
          }
        });
      }
    };

    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          UsersPage.currentSearch = e.target.value;
          fetchUsers(1);
        }, 500);
      });
    }

    await fetchUsers();
  },
};
