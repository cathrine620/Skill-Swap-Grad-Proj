const PaymentsPage = {
  name: "payments",
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  currentSearch: "",

  render: () => {
    return `
            <div class="section-header" style="justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom: 2rem;">
                <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <h3 class="section-title">Payment History</h3>
                </div>
                <div class="stat-card" style="width:fit-content; padding: 0.75rem 1.25rem; margin-bottom:0; background:var(--bg-card); border:1px solid var(--border-soft); border-radius:var(--radius-md);">
                    <span style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.5px;">Total Revenue</span>
                    <div style="font-size:1.5rem; font-weight:800; color:var(--success)" id="total-revenue">$0</div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Instructor</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="payments-table-body">
                         <tr><td colspan="5" class="text-center">Loading payments...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="payments-pagination-container" class="pagination-container"></div>
        `;
  },
  init: async () => {
    const tableBody = document.getElementById("payments-table-body");
    const paginationContainer = document.getElementById("payments-pagination-container");
    const totalRevEl = document.getElementById("total-revenue");

    const fetchPayments = async (page = 1) => {
      try {
        PaymentsPage.currentPage = page;
        const searchTerm = PaymentsPage.currentSearch || "";
        let url = `/admin/payments?page=${page}&limit=${PaymentsPage.limit}`;
        if (searchTerm.trim()) {
           url += `&search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await api.fetchAuth(url);
        const { payments = [], totalRevenue = 0, pagination = {} } = response.data || {};
        
        PaymentsPage.totalPages = pagination.totalPages || 1;
        totalRevEl.textContent = `$${totalRevenue.toLocaleString()}`;

        if (!payments || payments.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No payment history found</td></tr>';
          paginationContainer.innerHTML = "";
          return;
        }

        tableBody.innerHTML = payments
          .map((p) => `
                <tr>
                    <td>
                        <div class="user-cell">
                             <img src="${p.studentId?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.studentId?.name || "S")}&background=random`}" class="session-avatar">
                             <div class="user-info">
                                <span class="user-name">${p.studentId?.name || "Unknown"}</span>
                                <span class="user-role badge-student">Student</span>
                             </div>
                        </div>
                    </td>
                    <td>
                        <div class="user-cell">
                             <img src="${p.instructorId?.userImage?.secure_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.instructorId?.name || "I")}&background=random`}" class="session-avatar">
                             <div class="user-info">
                                <span class="user-name">${p.instructorId?.name || "Unknown"}</span>
                                <span class="user-role badge-mentor">Instructor</span>
                             </div>
                        </div>
                    </td>
                    <td><span style="font-weight:700; color:var(--text-header)">$${p.price}</span></td>
                    <td>${new Date(p.createdAt || p.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-active">Paid</span></td>
                </tr>
            `
          ).join("");

        renderPagination(pagination.totalPayments || 0);
      } catch (error) {
        console.error("Error fetching payments:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center error-message">Error loading payments</td></tr>`;
      }
    };

    const renderPagination = (total) => {
      const start = (PaymentsPage.currentPage - 1) * PaymentsPage.limit + 1;
      const end = Math.min(PaymentsPage.currentPage * PaymentsPage.limit, total);
      
      let html = `<div class="pagination-info">Showing <b>${start}-${end}</b> of <b>${total}</b></div><div class="pagination-controls">`;
      html += `<button class="page-btn" id="prev-page-pay" ${PaymentsPage.currentPage === 1 ? "disabled" : ""}><i class="ri-arrow-left-s-line"></i></button>`;
      
      for (let i = 1; i <= PaymentsPage.totalPages; i++) {
        if (i === 1 || i === PaymentsPage.totalPages || (i >= PaymentsPage.currentPage - 1 && i <= PaymentsPage.currentPage + 1)) {
          html += `<button class="page-btn ${i === PaymentsPage.currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
        } else if (i === PaymentsPage.currentPage - 2 || i === PaymentsPage.currentPage + 2) {
          html += `<span>...</span>`;
        }
      }
      
      html += `<button class="page-btn" id="next-page-pay" ${PaymentsPage.currentPage === PaymentsPage.totalPages ? "disabled" : ""}><i class="ri-arrow-right-s-line"></i></button></div>`;
      paginationContainer.innerHTML = html;

      paginationContainer.querySelectorAll(".page-btn[data-page]").forEach(btn => {
        btn.onclick = () => fetchPayments(parseInt(btn.dataset.page));
      });
      
      const prevB = document.getElementById("prev-page-pay");
      const nextB = document.getElementById("next-page-pay");
      if (prevB) prevB.onclick = () => fetchPayments(PaymentsPage.currentPage - 1);
      if (nextB) nextB.onclick = () => fetchPayments(PaymentsPage.currentPage + 1);
    };

    await fetchPayments();
  },
};
