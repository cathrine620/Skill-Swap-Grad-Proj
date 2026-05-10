const SessionsPage = {
  name: "sessions",
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  currentSearch: "",

  render: () => {
    return `
            <div class="section-header" style="justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom: 2rem;">
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <h3 class="section-title">Session Log</h3>
                    <div class="search-container">
                        <i class="ri-search-line search-icon"></i>
                        <input type="text" id="session-search" class="search-input" placeholder="Search student, instructor, or code...">
                    </div>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Instructor</th>
                            <th>Duration</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="sessions-table-body">
                        <tr><td colspan="6" class="text-center">Loading sessions...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="sessions-pagination-container" class="pagination-container"></div>
        `;
  },
  init: async () => {
    const tableBody = document.getElementById("sessions-table-body");
    const paginationContainer = document.getElementById("sessions-pagination-container");
    const searchInput = document.getElementById("session-search");

    const fetchSessions = async (page = 1) => {
      try {
        SessionsPage.currentPage = page;
        const searchTerm = SessionsPage.currentSearch || "";
        let url = `/admin/sessions?page=${page}&limit=${SessionsPage.limit}`;
        if (searchTerm.trim()) {
           url += `&search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await api.fetchAuth(url);
        const { sessions = [], pagination = {} } = response.data || {};
        
        SessionsPage.totalPages = pagination.totalPages || 1;

        if (!sessions || sessions.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No sessions found</td></tr>';
          paginationContainer.innerHTML = "";
          return;
        }

        tableBody.innerHTML = sessions
          .map(
            (session) => `
                <tr>
                    <td>
                        <div class="user-cell">
                            <img src="${session.studentId?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.studentId?.name || "S")}&background=random`}" class="session-avatar">
                            <div class="user-info">
                                <span class="user-name">${session.studentId?.name || "Unknown Student"}</span>
                                <span class="user-role badge-student">Student</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="user-cell">
                            <img src="${session.instructorId?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.instructorId?.name || "M")}&background=random`}" class="session-avatar">
                            <div class="user-info">
                                <span class="user-name">${session.instructorId?.name || "Unknown Instructor"}</span>
                                <span class="user-role badge-mentor">Instructor</span>
                            </div>
                        </div>
                    </td>
                    <td>${session.duration_mins || 0} mins</td>
                    <td>${new Date(session.date || Date.now()).toLocaleDateString()}</td>
                    <td>${session.time || "N/A"}</td>
                    <td><span class="status-badge status-${session.status?.toLowerCase() || "pending"}">${session.status || "Pending"}</span></td>
                </tr>
            `
          ).join("");

        renderPagination(pagination.totalSessions || 0);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center error">Error loading sessions: ${error.message}</td></tr>`;
      }
    };

    const renderPagination = (total) => {
      const start = (SessionsPage.currentPage - 1) * SessionsPage.limit + 1;
      const end = Math.min(SessionsPage.currentPage * SessionsPage.limit, total);
      
      let html = `<div class="pagination-info">Showing <b>${start}-${end}</b> of <b>${total}</b></div><div class="pagination-controls">`;
      html += `<button class="page-btn" id="prev-page-sess" ${SessionsPage.currentPage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
      
      for (let i = 1; i <= SessionsPage.totalPages; i++) {
        if (i === 1 || i === SessionsPage.totalPages || (i >= SessionsPage.currentPage - 1 && i <= SessionsPage.currentPage + 1)) {
          html += `<button class="page-btn ${i === SessionsPage.currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
        } else if (i === SessionsPage.currentPage - 2 || i === SessionsPage.currentPage + 2) {
          html += `<span>...</span>`;
        }
      }
      
      html += `<button class="page-btn" id="next-page-sess" ${SessionsPage.currentPage === SessionsPage.totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button></div>`;
      paginationContainer.innerHTML = html;

      paginationContainer.querySelectorAll(".page-btn[data-page]").forEach(btn => {
        btn.onclick = () => fetchSessions(parseInt(btn.dataset.page));
      });
      
      const prevB = document.getElementById("prev-page-sess");
      const nextB = document.getElementById("next-page-sess");
      if (prevB) prevB.onclick = () => fetchSessions(SessionsPage.currentPage - 1);
      if (nextB) nextB.onclick = () => fetchSessions(SessionsPage.currentPage + 1);
    };

    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          SessionsPage.currentSearch = e.target.value;
          fetchSessions(1);
        }, 500);
      });
    }

    await fetchSessions();
  },
};
