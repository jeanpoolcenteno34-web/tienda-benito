// Data Structure and Initial Data
let products = [];
let customers = [];
let cart = [];

// App State
let currentMode = 'STORE';
let currentCategory = 'alimentos';
let isLoggedIn = false;

// DOM Elements
const toggleStoreModeBtn = document.getElementById('toggleStoreModeBtn');
const adminSection = document.getElementById('adminSection');
const storeSection = document.querySelector('section:not(#adminSection)');
const productsGrid = document.getElementById('productsGrid');
const adminProductsContainer = document.getElementById('adminProductsContainer');
const searchInput = document.getElementById('searchInput');

// Modal Elements
const modal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const cancelBtn = document.getElementById('cancelFormBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');

// Login Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const loginErrorMsg = document.getElementById('loginErrorMsg');

// Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'benito123';

// Initialize App
async function initApp() {
    await loadDataFromServer();
    renderClientView(getFilteredByCategory());
    setupEventListeners();
    setInterval(pollServerForChanges, 3000);
}

// Data Management
async function saveDataToServer() {
    try {
        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products, customers })
        });
    } catch (err) {
        console.error("Error guardando datos", err);
    }
}

async function loadDataFromServer() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            products = data.products || [];
            customers = data.customers || [];
            refreshViews();
        }
    } catch (err) {
        console.error("Error cargando datos", err);
    }
}

async function pollServerForChanges() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            const fetchedProducts = data.products || [];
            const fetchedCustomers = data.customers || [];

            let changed = false;
            if (JSON.stringify(fetchedProducts) !== JSON.stringify(products)) {
                products = fetchedProducts;
                changed = true;
            }
            if (JSON.stringify(fetchedCustomers) !== JSON.stringify(customers)) {
                customers = fetchedCustomers;
                changed = true;
            }

            if (changed) refreshViews();
        }
    } catch (err) { }
}

function refreshViews() {
    const filtered = getFilteredByCategory();
    if (currentMode === 'ADMIN') {
        renderAdminView(filtered);
    }

    if (currentCategory === 'clientes') {
        renderCustomersView();
    } else {
        renderClientView(filtered);
    }
}

function getFilteredByCategory() {
    return products.filter(p => (p.category || 'alimentos') === currentCategory);
}

function switchCategory(cat) {
    currentCategory = cat;
    window.scrollTo(0, 0); // Reset scroll
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnText = btn.innerText.toUpperCase();
        if (btnText.includes(cat === 'alimentos' ? 'ALIMENTOS' : 'TIENDA')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const clientInventoryArea = document.getElementById('clientInventoryArea');
    const customersArea = document.getElementById('customersArea');

    const customersBtn = document.getElementById('customersBtn');
    if (cat === 'clientes') {
        clientInventoryArea.classList.add('hidden');
        customersArea.classList.remove('hidden');
        if (customersBtn) customersBtn.classList.add('hidden');
    } else {
        clientInventoryArea.classList.remove('hidden');
        customersArea.classList.add('hidden');
        if (customersBtn) {
            if (cat === 'tienda') customersBtn.classList.remove('hidden');
            else customersBtn.classList.add('hidden');
        }

        const container = document.getElementById('productsContainer');
        if (container) {
            if (cat === 'tienda') {
                container.classList.add('tienda-mode');
                const colKilo = document.querySelector('.col-kilo');
                const colSack = document.querySelector('.col-sack');
                if (colKilo) colKilo.innerText = 'Precio Unidad';
                if (colSack) colSack.style.display = 'none';
            } else {
                container.classList.remove('tienda-mode');
                const colKilo = document.querySelector('.col-kilo');
                const colSack = document.querySelector('.col-sack');
                if (colKilo) colKilo.innerText = 'Precio Kilo';
                if (colSack) colSack.style.display = 'block';
            }
        }
    }
    updateCartUI();
    refreshViews();
}

function toggleFormFields() {
    const cat = document.getElementById('productCategory').value;
    const alimentosFields = document.getElementById('alimentosFields');
    const tiendaFields = document.getElementById('tiendaFields');
    if (alimentosFields && tiendaFields) {
        if (cat === 'alimentos') {
            alimentosFields.classList.remove('hidden');
            tiendaFields.classList.add('hidden');
        } else {
            alimentosFields.classList.add('hidden');
            tiendaFields.classList.remove('hidden');
        }
    }
}

function formatMoney(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'S/ 0.00';
    return 'S/ ' + parseFloat(amount).toFixed(2);
}

function renderClientView(productsToRender) {
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    if (productsToRender.length === 0) {
        productsGrid.innerHTML = `<p style="padding: 20px; text-align: center; color: #666;">No hay productos en esta categoría.</p>`;
        return;
    }

    productsToRender.forEach(product => {
        const row = document.createElement('div');
        const isAlimento = (product.category || 'alimentos') === 'alimentos';
        row.className = 'product-row' + (isAlimento ? ' alimento-row' : '');

        if (isAlimento) {
            row.innerHTML = `
                <div class="row-info">
                    ${product.brand ? `<span class="brand-text">${product.brand}</span>` : ''}
                    <h3>${product.name}</h3>
                </div>
                <div class="row-price">${formatMoney(product.priceKilo)}</div>
                <div class="row-price">${formatMoney(product.priceSack)}</div>
            `;
        } else {
            row.innerHTML = `
                <div class="row-info" onclick="addToCart('${product.id}')" style="cursor: pointer;">
                    ${product.brand ? `<span class="brand-text">${product.brand}</span>` : ''}
                    <h3>${product.name}</h3>
                </div>
                <div class="row-price" style="grid-column: span 1;" onclick="addToCart('${product.id}')" style="cursor: pointer;">${formatMoney(product.priceUnit)}</div>
                <div class="row-price">
                    <button class="btn-success btn-icon btn-small" onclick="addToCart('${product.id}')"><i class="fa-solid fa-plus"></i></button>
                </div>
            `;
        }
        productsGrid.appendChild(row);
    });
}

function renderAdminView(productsToRender) {
    if (!adminProductsContainer) return;
    adminProductsContainer.innerHTML = '';
    if (productsToRender.length === 0) {
        adminProductsContainer.innerHTML = `<p style="text-align: center; color: #666; width: 100%;">No hay productos registrados.</p>`;
        return;
    }

    productsToRender.forEach(product => {
        const cat = product.category || 'alimentos';
        let statsHTML = '';
        if (cat === 'alimentos') {
            const costKilo = (product.costSack && product.sackWeight) ? (product.costSack / product.sackWeight) : 0;
            const profitKilo = (costKilo > 0) ? (product.priceKilo - costKilo) : null;
            const profitSack = (product.costSack) ? (product.priceSack - product.costSack) : null;
            statsHTML = `
                <div class="stat-box kilo">
                    <h4>Venta Kilo</h4>
                    <div class="stat-row"><span>Costo Calc:</span><span>${formatMoney(costKilo)}</span></div>
                    <div class="stat-row"><span>Venta:</span><span>${formatMoney(product.priceKilo)}</span></div>
                    ${profitKilo !== null ? `<div class="stat-row profit"><span>Ganancia:</span><span>${formatMoney(profitKilo)}</span></div>` : ''}
                </div>
                <div class="stat-box sack">
                    <h4>Saco (${product.sackWeight} Kg)</h4>
                    <div class="stat-row"><span>Costo Real:</span><span>${formatMoney(product.costSack || 0)}</span></div>
                    <div class="stat-row"><span>Venta:</span><span>${formatMoney(product.priceSack)}</span></div>
                    ${profitSack !== null ? `<div class="stat-row profit"><span>Ganancia:</span><span>${formatMoney(profitSack)}</span></div>` : ''}
                </div>`;
        } else {
            const profit = (product.costUnit) ? (product.priceUnit - product.costUnit) : null;
            statsHTML = `
                <div class="stat-box">
                    <h4>Venta Unidad</h4>
                    <div class="stat-row"><span>Costo Compra:</span><span>${formatMoney(product.costUnit || 0)}</span></div>
                    <div class="stat-row"><span>Venta Actual:</span><span>${formatMoney(product.priceUnit)}</span></div>
                    ${profit !== null ? `<div class="stat-row profit"><span>Ganancia:</span><span>${formatMoney(profit)}</span></div>` : ''}
                </div>`;
        }

        const card = document.createElement('div');
        card.className = 'admin-card glass-panel';
        card.innerHTML = `
            <div class="admin-card-header">
                <h3>${product.brand ? `<small style="color: var(--primary); display: block; font-size: 0.8rem; text-transform: uppercase;">${product.brand}</small>` : ''}${product.name}</h3>
                <div class="admin-actions">
                    <button class="btn-icon" onclick="editProduct('${product.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-danger" onclick="deleteProduct('${product.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="admin-stats-grid">${statsHTML}</div>
        `;
        adminProductsContainer.appendChild(card);
    });
}

function attemptToggleAdminMode() {
    if (currentMode === 'ADMIN') { isLoggedIn = false; setMode('STORE'); }
    else { if (isLoggedIn) setMode('ADMIN'); else openLoginModal(); }
}

function setMode(mode) {
    currentMode = mode;
    toggleStoreModeBtn.innerHTML = (mode === 'ADMIN') ? `<i class="fa-solid fa-store"></i> <span>Salir Dueño</span>` : `<i class="fa-solid fa-user-shield"></i> <span>Modo Dueño</span>`;
    const clientArea = document.getElementById('clientInventoryArea');
    const adminInventoryView = document.getElementById('adminInventoryView');
    if (mode === 'ADMIN') {
        adminSection.classList.remove('hidden-section'); adminSection.classList.add('active-section');
        storeSection.classList.add('hidden-section'); storeSection.classList.remove('active-section');
        if (adminInventoryView && clientArea) adminInventoryView.appendChild(clientArea);
    } else {
        adminSection.classList.add('hidden-section'); adminSection.classList.remove('active-section');
        storeSection.classList.remove('hidden-section'); storeSection.classList.add('active-section');
        if (storeSection && clientArea) storeSection.appendChild(clientArea);
    }
    refreshViews();
}

function filterProducts(e) {
    const term = e.target.value.toLowerCase();
    const filtered = getFilteredByCategory().filter(p => p.name.toLowerCase().includes(term) || (p.brand && p.brand.toLowerCase().includes(term)));
    if (currentMode === 'ADMIN') { renderAdminView(filtered); renderClientView(filtered); }
    else { renderClientView(filtered); }
}

function openLoginModal() { loginModal.classList.remove('hidden'); loginForm.reset(); document.getElementById('username').focus(); }
function closeLoginModal() { loginModal.classList.add('hidden'); }
function handleLoginSubmit(e) {
    e.preventDefault();
    if (document.getElementById('username').value === ADMIN_USER && document.getElementById('password').value === ADMIN_PASS) {
        isLoggedIn = true; closeLoginModal(); setMode('ADMIN');
    } else loginErrorMsg.style.display = 'block';
}

// Cart Logic
function addToCart(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    cart.push({ ...p, cartId: Date.now() + Math.random() });
    updateCartUI();
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    updateCartUI();
}

function clearCart() {
    cart = [];
    updateCartUI();
}

function updateCartUI() {
    const cartBar = document.getElementById('cartBar');
    const countEl = document.getElementById('cartItemsCount');
    const totalEl = document.getElementById('cartTotal');

    if (cart.length > 0 && (currentCategory === 'tienda' || currentCategory === 'tienda_sl')) {
        cartBar.classList.remove('hidden');
        countEl.innerText = cart.length;
        const total = cart.reduce((sum, item) => sum + (item.priceUnit || 0), 0);
        totalEl.innerText = formatMoney(total);
    } else {
        cartBar.classList.add('hidden');
    }
}

// Customers Logic
function renderCustomersView() {
    const grid = document.getElementById('customersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const term = document.getElementById('customerSearchInput').value.toLowerCase();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(term));

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="text-align: center; color: #666; width: 100%;">No hay clientes registrados.</p>`;
        return;
    }

    filtered.forEach(c => {
        const balance = (c.tab || []).reduce((sum, item) => sum + item.price, 0);
        const card = document.createElement('div');
        card.className = 'admin-card glass-panel customer-card';
        card.onclick = () => openTabModal(c.id);
        card.innerHTML = `
            <div class="admin-card-header" style="border:none; margin:0;">
                <h3>${c.name}</h3>
                <div class="admin-actions">
                    <button class="btn-danger btn-icon btn-small" onclick="event.stopPropagation(); deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="customer-balance">${formatMoney(balance)}</div>
            <p style="font-size: 0.8rem; color: #666;">${(c.tab || []).length} productos pendientes</p>
        `;
        grid.appendChild(card);
    });
}

window.openCustomerModal = () => document.getElementById('customerModal').classList.remove('hidden');
window.closeCustomerModal = () => document.getElementById('customerModal').classList.add('hidden');

async function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('customerName').value.trim().toUpperCase();
    if (!name) return;

    customers.push({
        id: Date.now().toString(),
        name: name,
        tab: []
    });

    await saveDataToServer();
    closeCustomerModal();
    document.getElementById('customerForm').reset();
    document.getElementById('customerSearchInput').value = '';
    renderCustomersView();
}

window.deleteCustomer = async (id) => {
    if (await customConfirm("¿Eliminar cliente y su cuenta?")) {
        customers = customers.filter(c => c.id !== id);
        await saveDataToServer();
        renderCustomersView();
    }
};

window.openTabModal = (customerId) => {
    const c = customers.find(x => x.id === customerId);
    if (!c) return;

    const modal = document.getElementById('customerTabModal');
    const list = document.getElementById('customerTabList');
    const totalEl = document.getElementById('customerTabTotal');
    const title = document.getElementById('tabModalTitle');

    title.innerText = `Cuenta de ${c.name}`;
    list.innerHTML = '';
    let total = 0;

    (c.tab || []).forEach((item, index) => {
        total += item.price;
        const row = document.createElement('div');
        row.className = 'tab-item'; // Changed from 'product-row' to 'tab-item' to match original context

        const info = document.createElement('div');
        info.className = 'tab-item-info'; // Changed from 'row-info'

        // Original item structure: { name, price, date }
        // The provided snippet used p.brand, p.name, p.priceUnit which are product properties.
        // Adapting to use 'item' properties from 'c.tab'.
        const name = document.createElement('div'); // Changed from h3 to div for consistency with original tab-item structure
        name.className = 'tab-item-name';
        name.innerText = item.name; // Using item.name

        const date = document.createElement('div');
        date.style.cssText = 'font-size: 0.7rem; color: #666;';
        date.innerText = new Date(item.date).toLocaleString(); // Using item.date

        info.appendChild(name);
        info.appendChild(date);

        const price = document.createElement('div');
        price.className = 'tab-item-price'; // Changed from 'row-price'
        price.innerText = formatMoney(item.price); // Using item.price

        // The addBtnCol and addBtn logic seems to be for adding to cart, which is not typical for a customer's tab view.
        // Removing this part to maintain the original intent of displaying tab items, not adding new ones.
        // If the user intended to add items to the tab from this modal, a different UI/logic would be needed.
        // For now, keeping it as a display of existing tab items.

        row.appendChild(info);
        row.appendChild(price);
        list.appendChild(row); // Appending to list, not container
    });

    totalEl.innerText = formatMoney(total);
    document.getElementById('clearTabBtn').onclick = () => clearTab(customerId);
    modal.classList.remove('hidden');
};

window.closeTabModal = () => document.getElementById('customerTabModal').classList.add('hidden');

async function clearTab(customerId) {
    if (await customConfirm("¿Marcar cuenta como PAGADA? Esto borrará el historial del cliente.")) {
        const c = customers.find(x => x.id === customerId);
        if (c) {
            c.tab = [];
            await saveDataToServer();
            closeTabModal();
            renderCustomersView();
        }
    }
}

// Assignment Logic
function showAssignToCustomer() {
    const modal = document.getElementById('assignModal');
    const list = document.getElementById('assignList');
    list.innerHTML = '';

    if (customers.length === 0) {
        list.innerHTML = `<p style="padding: 20px; text-align: center;">No hay clientes. Crea uno primero en la pestaña "Clientes".</p>`;
    } else {
        customers.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'assign-btn';
            btn.innerHTML = `<span>${c.name}</span> <i class="fa-solid fa-chevron-right"></i>`;
            btn.onclick = () => assignCartToCustomer(c.id);
            list.appendChild(btn);
        });
    }
    modal.classList.remove('hidden');
}

window.closeAssignModal = () => document.getElementById('assignModal').classList.add('hidden');

async function assignCartToCustomer(customerId) {
    const c = customers.find(x => x.id === customerId);
    if (!c) return;
    const items = cart.map(item => ({ name: item.name, price: item.priceUnit, date: new Date().toISOString() }));
    c.tab.push(...items);
    await saveDataToServer();
    cart = [];
    updateCartUI();
    closeAssignModal();
    customAlert(`Anotado correctamente a la cuenta de ${c.name.toUpperCase()}`);
    if (currentCategory === 'clientes') renderCustomersView();
}


function openModal(isEdit = false, productId = null) {
    modal.classList.remove('hidden');
    if (isEdit) {
        modalTitle.innerText = "Editar Producto";
        const p = products.find(x => x.id === productId);
        if (p) {
            document.getElementById('productId').value = p.id;
            document.getElementById('productCategory').value = p.category || 'alimentos';
            document.getElementById('productName').value = p.name;
            document.getElementById('productBrand').value = p.brand || '';
            document.getElementById('priceKilo').value = p.priceKilo || '';
            document.getElementById('sackWeight').value = p.sackWeight || '';
            document.getElementById('costSack').value = p.costSack || '';
            document.getElementById('priceSack').value = p.priceSack || '';
            if (document.getElementById('costUnit')) document.getElementById('costUnit').value = p.costUnit || '';
            if (document.getElementById('priceUnit')) document.getElementById('priceUnit').value = p.priceUnit || '';
            toggleFormFields();
        }
    } else {
        modalTitle.innerText = "Añadir Producto";
        productForm.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productCategory').value = currentCategory;
        toggleFormFields();
    }
}

function closeModal() { modal.classList.add('hidden'); }
window.deleteProduct = async (id) => {
    if (await customConfirm("¿Seguro que deseas eliminar este producto?")) {
        products = products.filter(p => p.id !== id);
        await saveDataToServer();
        refreshViews();
    }
};
window.editProduct = (id) => openModal(true, id);

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const cat = document.getElementById('productCategory').value;
    let p = {
        id: id || Date.now().toString(),
        category: cat,
        name: document.getElementById('productName').value.trim().toUpperCase(),
        brand: document.getElementById('productBrand').value.trim().toUpperCase()
    };

    if (cat === 'alimentos') {
        p.priceKilo = parseFloat(document.getElementById('priceKilo').value) || 0;
        p.sackWeight = parseFloat(document.getElementById('sackWeight').value) || 0;
        p.costSack = parseFloat(document.getElementById('costSack').value) || null;
        p.priceSack = parseFloat(document.getElementById('priceSack').value) || 0;
    } else {
        p.costUnit = parseFloat(document.getElementById('costUnit').value) || null;
        p.priceUnit = parseFloat(document.getElementById('priceUnit').value) || 0;
    }

    if (id) { const idx = products.findIndex(x => x.id === id); if (idx !== -1) products[idx] = p; }
    else products.push(p);

    await saveDataToServer();
    closeModal();
    refreshViews();
}

function setupEventListeners() {
    toggleStoreModeBtn.addEventListener('click', attemptToggleAdminMode);
    searchInput.addEventListener('input', filterProducts);
    document.getElementById('customerSearchInput').addEventListener('input', renderCustomersView);
    document.getElementById('addNewProductBtn').addEventListener('click', () => openModal(false));
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    cancelLoginBtn.addEventListener('click', closeLoginModal);
    loginForm.addEventListener('submit', handleLoginSubmit);
    productForm.addEventListener('submit', handleFormSubmit);
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
    document.getElementById('customerModal').addEventListener('click', (e) => { if (e.target === document.getElementById('customerModal')) closeCustomerModal(); });
    document.getElementById('customerTabModal').addEventListener('click', (e) => { if (e.target === document.getElementById('customerTabModal')) closeTabModal(); });
    document.getElementById('confirmModal').addEventListener('click', (e) => { if (e.target === document.getElementById('confirmModal')) closeConfirm(false); });
}

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const acceptBtn = document.getElementById('confirmAcceptBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        msgEl.innerText = message;
        modal.classList.remove('hidden');

        const handleResult = (result) => {
            modal.classList.add('hidden');
            acceptBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(result);
        };

        acceptBtn.onclick = () => handleResult(true);
        cancelBtn.onclick = () => handleResult(false);
    });
}

function customAlert(message, title = "Información") {
    const modal = document.getElementById('alertModal');
    const msgEl = document.getElementById('alertMessage');
    const titleEl = document.getElementById('alertTitle');

    titleEl.innerText = title;
    msgEl.innerText = message;
    modal.classList.remove('hidden');
}

window.closeAlert = () => {
    document.getElementById('alertModal').classList.add('hidden');
};

function closeConfirm(res) {
    // This is just a helper for backdrop click
    const modal = document.getElementById('confirmModal');
    if (!modal.classList.contains('hidden')) {
        document.getElementById('confirmCancelBtn').click();
    }
}

document.addEventListener('DOMContentLoaded', initApp);
