const StorePage = {
  name: "store",
  render: () => {
    return `
            <div class="section-header" style="justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom: 2rem;">
                <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
                    <h3 class="section-title" style="margin:0">Store Products</h3>
                </div>
                <button id="add-store-item-btn" class="add-btn-primary">
                    <i class="ri-add-line"></i>
                    <span>Add New Product</span>
                </button>
            </div>
            
            <div class="store-grid" id="store-list">
                <div class="text-center" style="grid-column: 1/-1; padding: 3rem;">Loading products...</div>
            </div>
        `;
  },
  init: async () => {
    const storeList = document.getElementById("store-list");
    const addBtn = document.getElementById("add-store-item-btn");

    const fetchStoreItems = async () => {
      try {
        const response = await api.fetchAuth("/store");
        const items = response.items || [];

        if (items.length === 0) {
          storeList.innerHTML = `
                        <div class="text-center" style="grid-column:1/-1; padding:4rem; background:var(--bg-card); border-radius:var(--radius-lg);">
                            <i class="ri-store-2-line" style="font-size:3rem; color:var(--text-muted); opacity:0.5;"></i>
                            <p style="margin-top:1rem; color:var(--text-muted)">No products found. Start by adding one!</p>
                        </div>
                    `;
          return;
        }

        storeList.innerHTML = items
          .map(
            (item) => {
              let iconClass = "ri-shopping-cart-2-line";
              let typeColor = "var(--primary-color)";
              let typeBg = "var(--primary-light)";
              
              if(item.type === "hours") {
                  iconClass = "ri-time-line";
                  typeColor = "#10b981";
                  typeBg = "rgba(16, 185, 129, 0.1)";
              } else if(item.type === "voucher") {
                  iconClass = "ri-coupon-3-line";
                  typeColor = "#ec4899";
                  typeBg = "rgba(236, 72, 153, 0.1)";
              } else if(item.type === "theme") {
                  iconClass = "ri-palette-line";
                  typeColor = "#8b5cf6";
                  typeBg = "rgba(139, 92, 246, 0.1)";
              }

              return `
                <div class="store-card">
                    <div class="store-card-header">
                        <div class="store-info">
                            <h4 id="store-title-${item._id}">${item.title}</h4>
                            <span class="store-type" style="color: ${typeColor}">${item.type.toUpperCase()}</span>
                            ${!item.isActive ? '<span class="store-type" style="color: #ef4444; background: rgba(239,68,68,0.1)">INACTIVE</span>' : ''}
                        </div>
                        <div class="store-icon" style="color: ${typeColor}; background: ${typeBg}; overflow: hidden;">
                            ${item.img && item.img.secure_url ? `<img src="${item.img.secure_url}" style="width:100%; height:100%; object-fit:cover;" alt="product image"/>` : `<i class="${iconClass}"></i>`}
                        </div>
                    </div>
                    
                    <div class="store-price">
                        <i class="ri-copper-coin-fill"></i> ${item.priceInPoints} Points
                    </div>
                    
                    <div class="store-desc">
                        <div style="margin-bottom: 0.5rem"><strong>Value:</strong> <span class="store-value-tag">${item.value}</span></div>
                        ${item.validityDays ? `<div><strong>Validity:</strong> ${item.validityDays} Days</div>` : ''}
                    </div>
                    
                    <div class="track-footer" style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: auto;">
                        <span style="font-size:0.7rem; color:var(--text-muted)">ID: ${item._id.substring(0, 8)}...</span>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="track-action-btn edit-store-item" 
                                data-id="${item._id}" 
                                data-title="${item.title}" 
                                data-type="${item.type}" 
                                data-price="${item.priceInPoints}"
                                data-value="${item.value}"
                                data-validity="${item.validityDays || ""}"
                                data-active="${item.isActive}"
                                title="Edit Product">
                                <i class="ri-edit-line"></i>
                            </button>
                            <button class="track-action-btn delete-store-item" data-id="${item._id}" title="Delete Product">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }
          )
          .join("");

        storeList.querySelectorAll(".delete-store-item").forEach((btn) => {
          btn.onclick = (e) => {
            const id = btn.dataset.id;
            showDialog({
              title: "Delete Product",
              desc: "Are you sure you want to delete this product? Users won't be able to buy it anymore.",
              iconClass: "ri-delete-bin-fill",
              type: "danger",
              onConfirm: async () => {
                try {
                  await api.fetchAuth(`/store/${id}`, {
                    method: "DELETE",
                  });
                  showSuccess("Product deleted successfully.");
                  await fetchStoreItems();
                } catch (err) {
                  showError(err.message);
                }
              },
            });
          };
        });

        storeList.querySelectorAll(".edit-store-item").forEach((btn) => {
          btn.onclick = (e) => {
            const id = btn.dataset.id;
            const ds = btn.dataset;

            showDialog({
              title: "Edit Product",
              desc: `Updating details for "${ds.title}"`,
              iconClass: "ri-edit-2-fill",
              type: "warning",
              inputs: [
                { id: "title", label: "Title", type: "text", default: ds.title },
                { id: "type", label: "Type (hours, voucher, theme)", type: "text", default: ds.type },
                { id: "priceInPoints", label: "Price (Points)", type: "number", default: ds.price },
                { id: "value", label: "Value (amount, code, etc)", type: "text", default: ds.value },
                { id: "validityDays", label: "Validity Days (optional)", type: "number", default: ds.validity },
                { id: "isActive", label: "Is Active? (true/false)", type: "text", default: ds.active },
                { id: "img", label: "Image (Optional)", type: "file" }
              ],
              onConfirm: async (data) => {
                try {
                  const formData = new FormData();
                  if(data.title) formData.append("title", data.title);
                  if(data.type) formData.append("type", data.type.trim().toLowerCase());
                  if(data.priceInPoints !== "") formData.append("priceInPoints", Number(data.priceInPoints));
                  if(data.value) formData.append("value", data.value);
                  if(data.validityDays !== undefined && data.validityDays !== "") formData.append("validityDays", Number(data.validityDays));
                  if(data.isActive === "false" || data.isActive === "true") formData.append("isActive", data.isActive === "true");
                  if(data.img) formData.append("img", data.img);

                  const res = await fetch(API_BASE_URL + `/store/${id}`, {
                        method: "PATCH",
                        headers: {
                            Authorization: `skill-swap ${api.getToken()}`
                        },
                        body: formData
                    });
                  
                  const response = await res.json();
                  if (!res.ok) throw new Error(response.message || "Failed to update store item");

                  showSuccess("Product updated successfully!");
                  await fetchStoreItems();
                } catch (err) {
                  showError(err.message);
                }
              },
            });
          };
        });
      } catch (err) {
        console.error("Store load error:", err);
      }
    };

    if (addBtn) {
      addBtn.onclick = () => {
        showDialog({
          title: "Add New Product",
          desc: "Add a new hours pack, voucher, or theme.",
          iconClass: "ri-store-2-fill",
          type: "success",
          inputs: [
                { id: "title", label: "Title (e.g. 10 Free Hours)", type: "text", placeholder: "Title" },
                { id: "type", label: "Type (hours, voucher, theme)", type: "text", placeholder: "hours" },
                { id: "priceInPoints", label: "Price in Points", type: "number", placeholder: "50" },
                { id: "value", label: "Value (hours amount, discount %, theme name)", type: "text", placeholder: "10" },
                { id: "validityDays", label: "Validity Days (Optional)", type: "number", placeholder: "30" },
                { id: "img", label: "Image (Optional)", type: "file" }
          ],
          onConfirm: async (data) => {
            try {
                if(!data.title || !data.type || data.priceInPoints === "" || !data.value) {
                    throw new Error("Missing required fields (title, type, price, value)");
                }
                const formData = new FormData();
                formData.append("title", data.title);
                formData.append("type", data.type.trim().toLowerCase());
                formData.append("priceInPoints", Number(data.priceInPoints));
                formData.append("value", data.value);
                if(data.validityDays) formData.append("validityDays", Number(data.validityDays));
                formData.append("isActive", true);
                if(data.img) formData.append("img", data.img);

                const res = await fetch(API_BASE_URL + `/store/add`, {
                    method: "POST",
                    headers: {
                        Authorization: `skill-swap ${api.getToken()}`
                    },
                    body: formData
                });
                
                const response = await res.json();
                if (!res.ok) throw new Error(response.message || "Failed to add store item");

                showSuccess("Product created successfully!");
                await fetchStoreItems();
            } catch (err) {
              showError(err.message);
            }
          }
        });
      };
    }

    await fetchStoreItems();
  },
};
