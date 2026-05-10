const TracksPage = {
  name: "tracks",
  render: () => {
    return `
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                <h3 class="section-title" style="margin:0">Tracks Management</h3>
                <button id="add-track-page-btn" class="add-btn-primary">
                    <i class="ri-add-line"></i>
                    <span>Add New Track</span>
                </button>
            </div>
            
            <div class="tracks-grid" id="tracks-list">
                <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">Loading tracks...</div>
            </div>
        `;
  },
  init: async () => {
    const tracksList = document.getElementById("tracks-list");
    const addBtn = document.getElementById("add-track-page-btn");

    const fetchTracks = async () => {
      try {
        const response = await api.fetchAuth("/admin/tracks");
        const tracks = response.data || [];

        if (tracks.length === 0) {
          tracksList.innerHTML = `
                        <div class="text-center" style="grid-column:1/-1; padding:4rem; background:var(--bg-card); border-radius:var(--radius-lg);">
                            <i class="ri-folder-open-line" style="font-size:3rem; color:var(--text-muted); opacity:0.5;"></i>
                            <p style="margin-top:1rem; color:var(--text-muted)">No tracks found. Start by adding one!</p>
                        </div>
                    `;
          return;
        }

        tracksList.innerHTML = tracks
          .map(
            (track) => `
                <div class="track-card">
                    <div class="track-card-header">
                        <div class="track-icon">
                            <i class="ri-map-pin-user-line"></i>
                        </div>
                        <div class="track-info">
                            <h4 id="track-name-${track._id}">${track.name}</h4>
                            <span class="track-slug">/${track.slug}</span>
                        </div>
                    </div>
                    
                    <div class="track-stats">
                        <div class="stat-item" title="Mentors">
                            <i class="ri-user-star-line"></i>
                            <span>${track.mentorCount || 0}</span>
                        </div>
                        <div class="stat-item" title="Students">
                            <i class="ri-group-line"></i>
                            <span>${track.studentCount || 0}</span>
                        </div>
                        <div class="stat-item" title="Total People">
                            <i class="ri-team-line"></i>
                            <span>${(track.mentorCount || 0) + (track.studentCount || 0)} Total</span>
                        </div>
                    </div>

                    <div class="track-desc" id="track-desc-${track._id}">
                        ${track.description || "No description provided for this track."}
                    </div>

                    <div class="skills-section">
                        <div class="skills-title">
                            <span>SKILLS</span>
                            <button class="add-skill-btn" data-track-id="${track._id}">
                                <i class="ri-add-line"></i> Add
                            </button>
                        </div>
                        <div class="skills-list">
                            ${
                              track.skills?.length > 0
                                ? track.skills
                                    .map(
                                      (skill) => `
                                <div class="skill-tag">
                                    <span>${skill.name}</span>
                                    <div class="skill-actions">
                                        <i class="ri-edit-line skill-action edit-skill" 
                                           data-id="${skill._id}" 
                                           data-name="${skill.name}"
                                           data-track-id="${track._id}"></i>
                                        <i class="ri-close-line skill-action delete-skill delete" 
                                           data-id="${skill._id}"
                                           data-name="${skill.name}"></i>
                                    </div>
                                </div>
                            `,
                                    )
                                    .join("")
                                : '<span style="font-size:0.8rem; color:var(--text-muted)">No skills yet</span>'
                            }
                        </div>
                    </div>

                    <div class="track-footer" style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.7rem; color:var(--text-muted)">ID: ${track._id.substring(0, 8)}...</span>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="track-action-btn edit-track" 
                                data-id="${track._id}" 
                                data-name="${track.name}" 
                                data-desc="${track.description || ""}" 
                                title="Edit Track">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="track-action-btn delete-track" data-id="${track._id}" title="Delete Track">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `,
          )
          .join("");

        tracksList.querySelectorAll(".delete-track").forEach((btn) => {
          btn.onclick = (e) => {
            const id = btn.dataset.id;
            showDialog({
              title: "Delete Track",
              desc: "Are you sure? You cannot delete a track if it has users or skills associated with it.",
              iconClass: "ri-delete-bin-fill",
              type: "danger",
              onConfirm: async () => {
                try {
                  await api.fetchAuth(`/admin/tracks/${id}`, {
                    method: "DELETE",
                  });
                  showSuccess("Track deleted successfully.");
                  await fetchTracks();
                } catch (err) {
                  showError(err.message);
                }
              },
            });
          };
        });

        tracksList.querySelectorAll(".edit-track").forEach((btn) => {
          btn.onclick = (e) => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const desc = btn.dataset.desc;

            showDialog({
              title: "Edit Track",
              desc: `Updating details for "${name}"`,
              iconClass: "ri-edit-2-fill",
              type: "warning",
              inputs: [
                { id: "name", label: "Track Name", type: "text", default: name },
                {
                  id: "description",
                  label: "Description",
                  type: "text",
                  default: desc,
                },
              ],
              onConfirm: async (data) => {
                try {
                  await api.fetchAuth(`/admin/tracks/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: data.name,
                      description: data.description,
                    }),
                  });
                  showSuccess("Track updated successfully!");
                  await fetchTracks();
                } catch (err) {
                  showError(err.message);
                }
              },
            });
          };
        });

        tracksList.querySelectorAll(".add-skill-btn").forEach((btn) => {
          btn.onclick = () => {
            const trackId = btn.dataset.trackId;
            showDialog({
              title: "Add Skill",
              desc: "Add a new skill to this track.",
              iconClass: "ri-add-circle-fill",
              type: "success",
              inputs: [
                { id: "name", label: "Skill Name", type: "text", placeholder: "e.g. React.js" }
              ],
              onConfirm: async (data) => {
                try {
                  await api.fetchAuth("/admin/skills", {
                    method: "POST",
                    body: JSON.stringify({ name: data.name, trackId }),
                  });
                  showSuccess("Skill added successfully!");
                  await fetchTracks();
                } catch (err) {
                  showError(err.message);
                }
              }
            });
          };
        });

        tracksList.querySelectorAll(".edit-skill").forEach((btn) => {
          btn.onclick = () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const trackId = btn.dataset.trackId;
            showDialog({
              title: "Edit Skill",
              desc: `Rename skill "${name}"`,
              iconClass: "ri-edit-line",
              type: "warning",
              inputs: [
                { id: "name", label: "Skill Name", type: "text", default: name }
              ],
              onConfirm: async (data) => {
                try {
                  await api.fetchAuth(`/admin/skills/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ name: data.name, trackId }),
                  });
                  showSuccess("Skill updated successfully!");
                  await fetchTracks();
                } catch (err) {
                  showError(err.message);
                }
              }
            });
          };
        });

        tracksList.querySelectorAll(".delete-skill").forEach((btn) => {
          btn.onclick = () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            showDialog({
              title: "Delete Skill",
              desc: `Are you sure you want to delete the skill "${name}"?`,
              iconClass: "ri-delete-bin-fill",
              type: "danger",
              onConfirm: async () => {
                try {
                  await api.fetchAuth(`/admin/skills/${id}`, {
                    method: "DELETE",
                  });
                  showSuccess("Skill deleted successfully.");
                  await fetchTracks();
                } catch (err) {
                  showError(err.message);
                }
              }
            });
          };
        });

      } catch (err) {
        console.error("Tracks load error:", err);
      }
    };

    if (addBtn) {
      addBtn.onclick = () => {
        showDialog({
          title: "Add New Track",
          desc: "Create a new learning track for the community.",
          iconClass: "ri-add-circle-fill",
          type: "success",
          inputs: [
            { id: "name", label: "Track Name", type: "text", placeholder: "e.g. Graphic Design" },
            { id: "description", label: "Description", type: "text", placeholder: "What is this track about?" }
          ],
          onConfirm: async (data) => {
            try {
              await api.fetchAuth("/admin/tracks", {
                method: "POST",
                body: JSON.stringify({ name: data.name, description: data.description }),
              });
              showSuccess("Track created successfully!");
              await fetchTracks();
            } catch (err) {
              showError(err.message);
            }
          }
        });
      };
    }

    await fetchTracks();
  },
};
