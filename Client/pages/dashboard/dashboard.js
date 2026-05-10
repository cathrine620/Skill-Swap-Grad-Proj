const DashboardPage = {
  name: "dashboard",
  render: () => {
    return `
            <div class="stats-grid">
                <div class="stat-card purple">
                    <div class="stat-header">
                        <span class="stat-title">Total Users</span>
                        <div class="stat-icon"><i class="ri-user-group-line"></i></div>
                    </div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-header">
                        <span class="stat-title">Exchanged Hours</span>
                        <div class="stat-icon"><i class="ri-time-line"></i></div>
                    </div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card yellow">
                    <div class="stat-header">
                        <span class="stat-title">Total Revenue</span>
                        <div class="stat-icon"><i class="ri-money-dollar-circle-line"></i></div>
                    </div>
                    <div class="stat-value">...</div>
                </div>
                <div class="stat-card pink">
                    <div class="stat-header">
                        <span class="stat-title">Active Mentors</span>
                        <div class="stat-icon"><i class="ri-award-line"></i></div>
                    </div>
                    <div class="stat-value">...</div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-card">
                    <div class="section-header">
                        <h3 class="section-title">Revenue Overview</h3>
                    </div>
                    <div class="canvas-container" style="position: relative; height: 300px; width: 100%;">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <div class="section-header">
                        <h3 class="section-title">User Distribution</h3>
                    </div>
                    <div class="canvas-container" style="position: relative; height: 300px; width: 100%;">
                        <canvas id="userChart"></canvas>
                    </div>
                </div>
            </div>
        `;
  },
  init: async () => {
    try {
      const statsResponse = await api.fetchAuth("/admin/dashboard/stats");
      const revenueResponse = await api.fetchAuth(
        "/admin/dashboard/revenue-overview",
      );
      const userDistResponse = await api.fetchAuth(
        "/admin/dashboard/user-distribution",
      );

      if (!statsResponse || !revenueResponse || !userDistResponse) {
        return;
      }

      const stats = statsResponse.data;
      const revenueData = revenueResponse.data;
      const userDist = userDistResponse.data;

      const setVal = (selector, val) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = val;
      };

      setVal(".stat-card.purple .stat-value", stats.totalUsers || 0);
      setVal(".stat-card.green .stat-value", `${stats.exchangedHours || 0}h`);
      setVal(".stat-card.yellow .stat-value", `$${stats.totalRevenue || 0}`);
      setVal(".stat-card.pink .stat-value", stats.activeMentors || 0);

      const revenueLabels = revenueData.weeks
        ? revenueData.weeks.map((w) => `Week ${w.weekNumber}`)
        : [];
      const revenueValues = revenueData.weeks
        ? revenueData.weeks.map((w) => w.revenue)
        : [];

      const canvas1 = document.getElementById("revenueChart");
      const canvas2 = document.getElementById("userChart");

      if (!window.dashboardCharts) window.dashboardCharts = {};

      if (canvas1) {
        if (window.dashboardCharts.revenue) {
          window.dashboardCharts.revenue.destroy();
        }
        window.dashboardCharts.revenue = new Chart(canvas1.getContext("2d"), {
          type: "line",
          data: {
            labels: revenueLabels,
            datasets: [
              {
                label: "Revenue ($)",
                data: revenueValues,
                backgroundColor: "rgba(99, 102, 241, 0.2)",
                borderColor: "#6366f1",
                borderWidth: 2,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true, grid: { borderDash: [5, 5] } },
              x: { grid: { display: false } },
            },
          },
        });
      }

      if (canvas2) {
        if (window.dashboardCharts.userDist) {
          window.dashboardCharts.userDist.destroy();
        }
        window.dashboardCharts.userDist = new Chart(canvas2.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: ["Students", "Mentors"],
            datasets: [
              {
                data: [userDist.normalUsers || 0, userDist.mentors || 0],
                backgroundColor: ["#6366f1", "#ec4899"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
            },
          },
        });
      }
    } catch (error) {
      console.error("Dashboard Error:", error);
    }
  },
};
