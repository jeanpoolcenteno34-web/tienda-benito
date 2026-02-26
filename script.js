// Data Structure and Initial Data
let products = [];
let customers = [];
let cart = [];

// App State
let currentMode = 'STORE';
let currentCategory = 'alimentos';
let currentSubCategory = 'galletas'; // For Tienda mode
let isLoggedIn = false;

// Supabase Configuration
const SUPABASE_URL = 'https://vsrjygjhsfloglbaunep.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PMnpGO1fmoZbSZKyyIg8dg_B3Kze4xa';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// DOM Elements
const toggleStoreModeBtn = document.getElementById('toggleStoreModeBtn');
const adminSection = document.getElementById('adminSection');
const storeSection = document.getElementById('storeSection');
function getStoreSection() { return document.getElementById('storeSection'); }
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

// Data Management
async function saveDataToServer() {
    // This is now handled per action (create/update/delete)
}

async function loadDataFromServer() {
    if (!supabaseClient) {
        console.error("Supabase no está inicializado");
        return;
    }

    try {
        const { data: fetchedProducts, error: pError } = await supabaseClient.from('products').select('*');
        const { data: fetchedCustomers, error: cError } = await supabaseClient.from('customers').select('*');

        if (pError || cError) throw pError || cError;

        // Map snake_case from DB to camelCase for the App
        products = (fetchedProducts || []).map(p => ({
            id: p.id,
            category: p.category,
            name: p.name,
            brand: p.brand,
            measure: p.measure,
            priceKilo: p.price_kilo,
            sackWeight: p.sack_weight,
            costSack: p.cost_sack,
            priceSack: p.price_sack,
            costUnit: p.cost_unit,
            priceUnit: p.price_unit
        }));

        customers = fetchedCustomers || [];
        refreshViews();
    } catch (err) {
        console.error("Error cargando desde Supabase:", err);
    }
}

function setupRealtime() {
    if (!supabaseClient) return;

    supabaseClient.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            console.log('Change received in products', payload);
            loadDataFromServer();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
            console.log('Change received in customers', payload);
            loadDataFromServer();
        })
        .subscribe();
}

async function initApp() {
    try {
        await loadDataFromServer();
        setupRealtime();
    } catch (e) { console.error("Error en carga inicial:", e); }
    renderClientView(getFilteredByCategory());
    setupEventListeners();
}

// Helper to save products
async function upsertProduct(product) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('products').upsert({
        id: product.id,
        category: product.category,
        name: product.name,
        brand: product.brand,
        measure: product.measure,
        price_kilo: product.priceKilo,
        sack_weight: product.sackWeight,
        cost_sack: product.costSack,
        price_sack: product.priceSack,
        cost_unit: product.costUnit,
        price_unit: product.priceUnit
    });
    if (error) console.error("Error guardando producto:", error);
}

async function deleteProductFromCloud(id) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) console.error("Error eliminando producto:", error);
}

async function upsertCustomer(customer) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('customers').upsert({
        id: customer.id,
        name: customer.name,
        tab: customer.tab
    });
    if (error) console.error("Error guardando cliente:", error);
}

async function deleteCustomerFromCloud(id) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('customers').delete().eq('id', id);
    if (error) console.error("Error eliminando cliente:", error);
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
    if (currentCategory === 'alimentos') {
        return products.filter(p => (p.category || 'alimentos') === 'alimentos');
    } else if (currentCategory === 'tienda') {
        return products.filter(p => p.category === currentSubCategory);
    } else if (currentCategory === 'tienda_sl') {
        const sub_sl = currentSubCategory + '_sl';
        return products.filter(p => p.category === sub_sl);
    }
    return [];
}

function switchCategory(cat) {
    currentCategory = cat;

    // Highlight main tabs
    document.querySelectorAll('#mainCategoryTabs .tab-btn, #adminMainCategoryTabs .tab-btn').forEach(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes(`'${cat}'`)) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    const isTienda = (cat === 'tienda' || cat === 'tienda_sl');
    const tiendaSubTabs = document.getElementById('tiendaSubTabs');
    const adminTiendaSubTabs = document.getElementById('adminTiendaSubTabs');
    const customersBtn = document.getElementById('customersBtn');

    if (cat === 'tienda_sl') {
        tiendaSubTabs?.classList.remove('hidden');
        adminTiendaSubTabs?.classList.remove('hidden');
        if (customersBtn) customersBtn.classList.remove('hidden');
    } else if (cat === 'tienda') {
        tiendaSubTabs?.classList.remove('hidden');
        adminTiendaSubTabs?.classList.remove('hidden');
        if (customersBtn) customersBtn.classList.add('hidden');
    } else {
        tiendaSubTabs?.classList.add('hidden');
        adminTiendaSubTabs?.classList.add('hidden');
        if (customersBtn) customersBtn.classList.add('hidden');
    }

    const clientInventoryArea = document.getElementById('clientInventoryArea');
    const customersArea = document.getElementById('customersArea');

    if (cat === 'clientes') {
        clientInventoryArea.classList.add('hidden');
        customersArea.classList.remove('hidden');
    } else {
        clientInventoryArea.classList.remove('hidden');
        customersArea.classList.add('hidden');

        const container = document.getElementById('productsContainer');
        const colMeasure = document.getElementById('colMeasure');
        const colKilo = document.querySelector('.col-kilo');
        const colSack = document.querySelector('.col-sack');

        if (container) {
            if (isTienda) {
                container.classList.add('tienda-mode');
                const isBebidas = (currentSubCategory === 'bebidas');

                if (colMeasure) {
                    if (isBebidas) colMeasure.classList.remove('hidden');
                    else colMeasure.classList.add('hidden');
                }

                if (colKilo) colKilo.innerText = 'Precio Unidad';
                if (colSack) colSack.style.display = 'none';

                // Adjust grid based on whether measure is shown
                if (isBebidas) {
                    container.style.setProperty('--grid-layout', '2fr 1fr 1fr 60px');
                } else {
                    container.style.setProperty('--grid-layout', '3.2fr 1.2fr 60px');
                }
                container.style.paddingRight = '10px';
            } else {
                container.classList.remove('tienda-mode');
                if (colMeasure) colMeasure.classList.add('hidden');
                if (colKilo) colKilo.innerText = 'Precio Kilo';
                if (colSack) colSack.style.display = 'block';
                container.style.setProperty('--grid-layout', '2.2fr 1fr 1fr');
            }
        }
    }
    updateCartUI();
    refreshViews();
}

function switchSubCategory(sub) {
    currentSubCategory = sub;
    document.querySelectorAll('#tiendaSubTabs .tab-btn, #adminTiendaSubTabs .tab-btn').forEach(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes(`'${sub}'`)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    refreshViews();
}

function toggleFormFields() {
    const cat = document.getElementById('productCategory').value;
    const alimentosFields = document.getElementById('alimentosFields');
    const tiendaFields = document.getElementById('tiendaFields');
    const measureField = document.getElementById('measureField');

    if (cat === 'alimentos') {
        alimentosFields?.classList.remove('hidden');
        tiendaFields?.classList.add('hidden');
        measureField?.classList.add('hidden');
    } else {
        alimentosFields?.classList.add('hidden');
        tiendaFields?.classList.remove('hidden');
        measureField?.classList.remove('hidden');
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
        const isAlimento = (product.category === 'alimentos');
        const isBebidas = (product.category === 'bebidas');
        row.className = 'product-row' + (isAlimento ? ' alimento-row' : ' tienda-row');

        // Use dynamic grid layout
        const container = document.getElementById('productsContainer');
        const layout = container?.style.getPropertyValue('--grid-layout') || '';
        if (layout) row.style.gridTemplateColumns = layout;

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
            const measureHTML = isBebidas ? `<div class="row-price" style="text-align: left; justify-content: flex-start; font-weight: 400; font-size: 0.85rem; color: #666; padding-left: 5px;">${product.measure || '-'}</div>` : '';

            row.innerHTML = `
                <div class="row-info" onclick="addToCart('${product.id}')" style="cursor: pointer;">
                    <h3>${product.name}</h3>
                </div>
                ${measureHTML}
                <div class="row-price" onclick="addToCart('${product.id}')" style="cursor: pointer; justify-content: flex-end; padding-right: 15px;">
                    ${formatMoney(product.priceUnit)}
                </div>
                <div class="row-price" style="justify-content: center;">
                    <button class="btn-success btn-icon btn-small" onclick="addToCart('${product.id}')">
                        <i class="fa-solid fa-plus"></i>
                    </button>
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
                    <h4>Venta Unidad ${product.measure ? `(${product.measure})` : ''}</h4>
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
    const storeSec = document.getElementById('storeSection');
    const adminSec = document.getElementById('adminSection');

    window.scrollTo(0, 0); // Reset scroll to avoid "blank" views on mobile

    if (mode === 'ADMIN') {
        adminSec?.classList.remove('hidden-section'); adminSec?.classList.add('active-section');
        storeSec?.classList.add('hidden-section'); storeSec?.classList.remove('active-section');
        if (adminInventoryView && clientArea) adminInventoryView.appendChild(clientArea);
    } else {
        adminSec?.classList.add('hidden-section'); adminSec?.classList.remove('active-section');
        storeSec?.classList.remove('hidden-section'); storeSec?.classList.add('active-section');
        if (storeSec && clientArea) storeSec.appendChild(clientArea);
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

    const isStoreView = (currentCategory === 'tienda' || currentCategory === 'tienda_sl');
    if (cart.length > 0 && isStoreView) {
        cartBar.classList.remove('hidden');
        countEl.innerText = cart.length;
        const total = cart.reduce((sum, item) => sum + (item.priceUnit || 0), 0);
        totalEl.innerText = formatMoney(total);

        // Toggle buttons based on category
        const assignBtn = document.getElementById('assignToCustomerBtn');
        const boletaBtn = document.getElementById('viewBoletaBtn');
        if (currentCategory === 'tienda_sl') {
            assignBtn?.classList.remove('hidden');
            boletaBtn?.classList.add('hidden');
        } else {
            assignBtn?.classList.add('hidden');
            boletaBtn?.classList.remove('hidden');
        }
    } else {
        cartBar.classList.add('hidden');
    }
}

window.showBoleta = () => {
    const modal = document.getElementById('boletaModal');
    const content = document.getElementById('boletaContent');
    const totalEl = document.getElementById('boletaTotal');

    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; color: var(--primary); margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
            <div>Producto</div>
            <div style="text-align: right;">Unit.</div>
            <div style="text-align: right;">Precio</div>
        </div>
    `;

    let total = 0;
    // Group similar items for better reading
    const grouped = cart.reduce((acc, item) => {
        if (!acc[item.name]) acc[item.name] = { count: 0, price: item.priceUnit };
        acc[item.name].count++;
        return acc;
    }, {});

    for (const [name, info] of Object.entries(grouped)) {
        const itemTotal = info.count * info.price;
        total += itemTotal;
        const row = document.createElement('div');
        row.style.cssText = "display: grid; grid-template-columns: 2.2fr 1fr 1fr; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.03);";
        row.innerHTML = `
            <div style="font-weight: 600; font-size: 0.95rem;">${info.count}x ${name}</div>
            <div style="text-align: right; color: #666; font-size: 0.85rem;">${formatMoney(info.price)}</div>
            <div style="text-align: right; font-weight: 700;">${formatMoney(itemTotal)}</div>
        `;
        content.appendChild(row);
    }

    totalEl.innerText = formatMoney(total);
    modal.classList.remove('hidden');
};

window.closeBoletaModal = () => document.getElementById('boletaModal').classList.add('hidden');

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

    const customer = {
        id: Date.now().toString(),
        name: name,
        tab: []
    };
    customers.push(customer);

    await upsertCustomer(customer);
    closeCustomerModal();
    document.getElementById('customerForm').reset();
    document.getElementById('customerSearchInput').value = '';
    renderCustomersView();
}

window.deleteCustomer = async (id) => {
    if (await customConfirm("¿Eliminar cliente y su cuenta?")) {
        customers = customers.filter(c => c.id !== id);
        await deleteCustomerFromCloud(id);
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
            await upsertCustomer(c);
            closeTabModal();
            renderCustomersView();
        }
    }
}

// Assignment Logic
function showAssignToCustomer() {
    const modal = document.getElementById('assignModal');
    const list = document.getElementById('assignList');
    const newCustInput = document.getElementById('newCustomerAssignName');
    if (newCustInput) newCustInput.value = ''; // Reset input
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
    await upsertCustomer(c);
    cart = [];
    updateCartUI();
    closeAssignModal();
    customAlert(`Anotado correctamente a la cuenta de ${c.name.toUpperCase()}`);
    if (currentCategory === 'clientes') renderCustomersView();
}

window.handleNewCustomerAndAssign = async () => {
    const name = document.getElementById('newCustomerAssignName').value.trim().toUpperCase();
    if (!name) return;

    const newCustomer = {
        id: Date.now().toString(),
        name: name,
        tab: []
    };
    customers.push(newCustomer);
    await upsertCustomer(newCustomer);

    // Reset input for next time
    document.getElementById('newCustomerAssignName').value = '';

    // Now assign the cart
    await assignCartToCustomer(newCustomer.id);
};


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
            document.getElementById('productMeasure').value = p.measure || '';
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
        if (currentCategory === 'alimentos') {
            document.getElementById('productCategory').value = 'alimentos';
        } else if (currentCategory === 'tienda_sl') {
            document.getElementById('productCategory').value = currentSubCategory + '_sl';
        } else {
            document.getElementById('productCategory').value = currentSubCategory;
        }
        toggleFormFields();
    }
}

function closeModal() { modal.classList.add('hidden'); }
window.deleteProduct = async (id) => {
    if (await customConfirm("¿Seguro que deseas eliminar este producto?")) {
        products = products.filter(p => p.id !== id);
        await deleteProductFromCloud(id);
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
        brand: document.getElementById('productBrand').value.trim().toUpperCase(),
        measure: document.getElementById('productMeasure').value.trim().toUpperCase()
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

    await upsertProduct(p);
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
    document.getElementById('boletaModal').addEventListener('click', (e) => { if (e.target === document.getElementById('boletaModal')) closeBoletaModal(); });
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
    if (!modal) {
        alert(message);
        return;
    }
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
