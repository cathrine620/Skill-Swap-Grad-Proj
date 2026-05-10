const ReportsPage = {
  name: "reports",
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  currentSearch: "",

  render: () => {
    return `
            <div class="section-header" style="justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom: 2rem;">
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <h3 class="section-title">User Reports</h3>
                    <div class="search-container">
                        <i class="ri-search-line search-icon"></i>
                        <input type="text" id="report-search" class="search-input" placeholder="Search reporter, reported, or reason...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Reported User</th>
                            <th>Reporter</th>
                            <th>Issue / Reason</th>
                            <th>Date</th>
                            <th class="text-center">Action Status</th>
                        </tr>
                    </thead>
                    <tbody id="reports-table-body">
                        <tr><td colspan="5" class="text-center">Loading reports...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="reports-pagination-container" class="pagination-container"></div>
        `;
  },
  init: async () => {
    const tableBody = document.getElementById("reports-table-body");
    const paginationContainer = document.getElementById("reports-pagination-container");
    const searchInput = document.getElementById("report-search");

    const fetchReports = async (page = 1) => {
      try {
        ReportsPage.currentPage = page;
        const searchTerm = ReportsPage.currentSearch || "";
        let url = `/admin/reports?page=${page}&limit=${ReportsPage.limit}`;
        if (searchTerm.trim()) {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await api.fetchAuth(url);
        const { reports = [], pagination = {} } = response.data || {};
        
        ReportsPage.totalPages = pagination.totalPages || 1;

        if (!reports || reports.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No reports found</td></tr>';
          paginationContainer.innerHTML = "";
          return;
        }

        tableBody.innerHTML = reports
          .map((report) => {
            const isDealtWith = report.reportedUser?.blockInfo?.isBlocked;
            return `
                <tr class="${isDealtWith || !report.reportedUser ? 'row-disabled' : ''}" data-userid="${report.reportedUser?._id || ''}">
                    <td>
                        <div class="user-cell">
                             <img src="${report.reportedUser?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedUser?.name || "U")}&background=random`}" class="session-avatar">
                             <div class="user-info">
                                 <span class="user-name">${report.reportedUser?.name || "Unknown User"}</span>
                                 ${report.reportedUser ? '<span class="user-role badge-student">Reported</span>' : '<span class="status-badge status-blocked" style="padding:2px 8px">User Deleted</span>'}
                             </div>
                        </div>
                    </td>
                    <td>
                        <div class="user-cell">
                            <img src="${report.reportedBy?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedBy?.name || "U")}&background=random`}" class="session-avatar">
                            <div class="user-info">
                                <span class="user-name">${report.reportedBy?.name || "Unknown User"}</span>
                                <span class="user-role badge-mentor">Reporter</span>
                            </div>
                        </div>
                    </td>
                    <td style="max-width:300px; white-space:normal; font-size:0.9rem; color:var(--text-muted)">${report.reason}</td>
                    <td>${new Date(report.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div style="display:flex; gap: 8px; justify-content:center; align-items:center;">
                            ${!report.reportedUser ? `
                                <span class="status-badge" style="background:var(--border-soft); color:var(--text-muted)">Internal Record</span>
                            ` : isDealtWith ? `
                                <span class="status-badge status-completed" style="opacity:0.8">
                                    <i class="ri-checkbox-circle-fill"></i> Decision Taken
                                </span>
                            ` : `
                                <button class="action-btn btn-warn" title="Warn User" style="color:var(--warning)">
                                    <i class="ri-alert-fill"></i>
                                </button>
                                <button class="action-btn btn-block" title="Block User" style="color:var(--danger)">
                                    <i class="ri-user-forbid-fill"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
          })
          .join("");

        renderPagination(pagination.totalReports || 0);
      } catch (error) {
        console.error("Error fetching reports:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error loading reports: ${error.message}</td></tr>`;
      }
    };

    const renderPagination = (total) => {
      const start = (ReportsPage.currentPage - 1) * ReportsPage.limit + 1;
      const end = Math.min(ReportsPage.currentPage * ReportsPage.limit, total);
      
      let html = `<div class="pagination-info">Showing <b>${start}-${end}</b> of <b>${total}</b></div><div class="pagination-controls">`;
      html += `<button class="page-btn" id="prev-page-rep" ${ReportsPage.currentPage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
      
      for (let i = 1; i <= ReportsPage.totalPages; i++) {
        if (i === 1 || i === ReportsPage.totalPages || (i >= ReportsPage.currentPage - 1 && i <= ReportsPage.currentPage + 1)) {
          html += `<button class="page-btn ${i === ReportsPage.currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
        } else if (i === ReportsPage.currentPage - 2 || i === ReportsPage.currentPage + 2) {
          html += `<span>...</span>`;
        }
      }
      
      html += `<button class="page-btn" id="next-page-rep" ${ReportsPage.currentPage === ReportsPage.totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button></div>`;
      paginationContainer.innerHTML = html;

      paginationContainer.querySelectorAll(".page-btn[data-page]").forEach(btn => {
        btn.onclick = () => fetchReports(parseInt(btn.dataset.page));
      });
      
      const prevB = document.getElementById("prev-page-rep");
      const nextB = document.getElementById("next-page-rep");
      if (prevB) prevB.onclick = () => fetchReports(ReportsPage.currentPage - 1);
      if (nextB) nextB.onclick = () => fetchReports(ReportsPage.currentPage + 1);
    };

    tableBody.onclick = (e) => {
        const btn = e.target.closest(".action-btn");
        if (!btn) return;

        const row = btn.closest("tr");
        const userId = row.getAttribute("data-userid");
        if (!userId) {
            return;
        }

        if (btn.classList.contains("btn-warn")) {
            showDialog({
                title: "Issue Warning",
                desc: "Send a formal warning to this reported user.",
                iconClass: "ri-alert-fill",
                type: "warning",
                inputs: [{ id: "reason", label: "Warning Reason", type: "text", default: "Violation of community rules" }],
                onConfirm: async (data) => {
                    try {
                        await api.fetchAuth(`/admin/users/${userId}/warn`, {
                            method: "POST",
                            body: JSON.stringify({ reason: data.reason }),
                        });
                        await fetchReports(ReportsPage.currentPage);
                        showSuccess("Warning has been sent to the user.");
                    } catch (err) { showError(err.message); }
                }
            });
        } else if (btn.classList.contains("btn-block")) {
            showDialog({
                title: "Block User Account",
                desc: "Are you sure you want to block this user based on the report?",
                iconClass: "ri-user-forbid-fill",
                type: "danger",
                inputs: [
                    { id: "days", label: "Duration (Days)", type: "number", default: "7" },
                    { id: "reason", label: "Block Reason", type: "text", default: "Misconduct reported by community" }
                ],
                onConfirm: async (data) => {
                    try {
                        await api.fetchAuth(`/admin/users/${userId}/block`, {
                            method: "PATCH",
                            body: JSON.stringify({ days: parseInt(data.days), reason: data.reason }),
                        });
                        await fetchReports(ReportsPage.currentPage);
                        showSuccess("User has been blocked successfully.");
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
          ReportsPage.currentSearch = e.target.value;
          fetchReports(1);
        }, 500);
      });
    }

    await fetchReports();
  },
};
