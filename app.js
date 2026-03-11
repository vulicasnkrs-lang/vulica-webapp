/* Telegram */
const tg = window.Telegram?.WebApp || null;

/* ========================= */
/*          STATE            */
/* ========================= */

const state = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  brandSet: new Set(),
  allSizes: new Set(),
  mysteryProductId: null,
  orders: JSON.parse(localStorage.getItem('orders') || '[]'),
  postponed: JSON.parse(localStorage.getItem('postponed') || '[]'),
  reserved: JSON.parse(localStorage.getItem('reserved') || '[]'),
  view: 'catalog'
};

/* ========================= */
/*         ELEMENTS          */
/* ========================= */

const els = {
  catalog: document.getElementById('catalog'),

  brandFilter: document.getElementById('brandFilter'),
  sizeFilter: document.getElementById('sizeFilter'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),

  filtersSection: document.getElementById('filtersSection'),

  mysteryBox: document.getElementById('mysteryBox'),
  openMysteryBtn: document.getElementById('openMysteryBtn'),

  mysteryModal: document.getElementById('mysteryModal'),
  closeMystery: document.getElementById('closeMystery'),
  mysteryImg: document.getElementById('mysteryImg'),
  mysteryTitle: document.getElementById('mysteryTitle'),
  mysteryPrice: document.getElementById('mysteryPrice'),
  mysteryOk: document.getElementById('mysteryOk'),

  /* CATALOG HEADER */
  profileAvatarHeader: document.getElementById('profileAvatar'),
  cartBtn: document.getElementById('cartBtn'),

  /* PRODUCT MODAL */
  productModal: document.getElementById('productModal'),
  carousel: document.getElementById('carousel'),
  thumbStrip: document.getElementById('thumbStrip'),

  modalBrand: document.getElementById('modalBrand'),
  modalStockInline: document.getElementById('modalStockInline'),
  modalTitle: document.getElementById('modalTitle'),
  modalPrice: document.getElementById('modalPrice'),
  modalMaterials: document.getElementById('modalMaterials'),
  modalSizes: document.getElementById('modalSizes'),
  addToCartBtn: document.getElementById('addToCartBtn'),
  reserveBtn: document.getElementById('reserveBtn'),
  stockBadge: document.getElementById('stockBadge'),


  /* PRODUCT MODAL HEADER */
  profileAvatarModal: document.getElementById('profileAvatarModal'),
  cartBtnModal: document.getElementById('cartBtnModal'),

  /* OPTIONAL OLD AVAILABILITY (SAFE IF NULL) */
  availabilityBlock: document.getElementById('availabilityBlock'),
  stockCount: document.getElementById('stockCount'),

  browserBackBtn: document.getElementById('browserBackBtn'),

  /* CART */
  cartDrawer: document.getElementById('cartDrawer'),
  closeCart: document.getElementById('closeCart'),
  cartList: document.getElementById('cartList'),
  cartTotal: document.getElementById('cartTotal'),
  checkoutBtn: document.getElementById('checkoutBtn'),

  /* PROFILE */
  profileModal: document.getElementById('profileModal'),
  profileAvatarProfile: document.getElementById('profileAvatarProfile'),
  profileName: document.getElementById('profileName'),
  profileUsername: document.getElementById('profileUsername'),
  profileTabs: document.querySelectorAll('.profile-tab'),
  profileOrders: document.getElementById('profileOrders'),
  profilePostponed: document.getElementById('profilePostponed'),
  shareBtn: document.getElementById('shareBtn')

};

/* ========================= */
/*     GLOBAL VARIABLES      */
/* ========================= */

let currentProduct = null;
let selectedSize = null;

/* ========================= */
/*            INIT           */
/* ========================= */

async function init() {
  renderSkeletons();
  await loadProducts();
// 🔥 Если WebApp открыт по ссылке с конкретным товаром
if (tg?.initDataUnsafe?.start_param) {
  openProductScreen(tg.initDataUnsafe.start_param);
}

  restoreStock();
  cleanupReserved();

  buildFilters();
  updateCartBadge();
  renderCatalog();
  attachEvents();
  initProfileFromTelegram();
  renderProfileSections();
  renderProfileOrders();
  renderProfilePostponed();

  if (tg) {
    tg.expand();
    tg.MainButton.text = 'Оформить заказ';
    tg.MainButton.onClick(checkout);
  }
}

/* ========================= */
/*       LOAD PRODUCTS       */
/* ========================= */

async function loadProducts() {
  try {
    const res = await fetch('/products.json', { cache: 'no-store' });
    state.products = await res.json();
  } catch {
    state.products = [];
  }

  state.products.forEach(p => {
    state.brandSet.add(p.brand);
    (p.sizes || []).forEach(obj => state.allSizes.add(obj.eu));
  });

  state.filtered = applyPostponedFilter([...state.products]);
}

/* ========================= */
/*   TELEGRAM PROFILE INIT   */
/* ========================= */

function initProfileFromTelegram() {
  if (!tg?.initDataUnsafe?.user) return;

  const user = tg.initDataUnsafe.user;

  els.profileName.textContent =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Покупатель';

  els.profileUsername.textContent = user.username ? '@' + user.username : '';

  if (user.photo_url) {
    els.profileAvatarHeader.style.backgroundImage = `url(${user.photo_url})`;
    els.profileAvatarHeader.style.backgroundSize = 'cover';
    els.profileAvatarHeader.style.backgroundPosition = 'center';

    els.profileAvatarModal.style.backgroundImage = `url(${user.photo_url})`;
    els.profileAvatarModal.style.backgroundSize = 'cover';
    els.profileAvatarModal.style.backgroundPosition = 'center';

    els.profileAvatarProfile.style.backgroundImage = `url(${user.photo_url})`;
    els.profileAvatarProfile.style.backgroundSize = 'cover';
    els.profileAvatarProfile.style.backgroundPosition = 'center';
  }
}

/* ========================= */
/*         SKELETONS         */
/* ========================= */

function renderSkeletons() {
  els.catalog.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const sk = document.createElement('div');
    sk.className = 'card skeleton';
    sk.innerHTML = `
      <div class="card-image skeleton"></div>
      <div class="card-info">
        <div class="skeleton" style="height:16px; width:70%;"></div>
        <div class="skeleton" style="height:18px; width:40%; margin-top:6px;"></div>
      </div>
    `;
    els.catalog.appendChild(sk);
  }
}

/* ========================= */
/*    POSTPONED FILTERING    */
/* ========================= */

function applyPostponedFilter(arr) {
  const now = Date.now();
  const active = state.postponed.filter(x => new Date(x.until).getTime() > now);
  const hiddenIds = active.map(x => x.id);
  return arr.filter(p => !hiddenIds.includes(p.id));
}

/* ========================= */
/*       BUILD FILTERS       */
/* ========================= */

function buildFilters() {
  [...state.brandSet].sort().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    els.brandFilter.appendChild(opt);
  });

  for (let s = 35; s <= 49; s++) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = String(s);
    els.sizeFilter.appendChild(opt);
  }
}

/* ========================= */
/*       APPLY FILTERS       */
/* ========================= */

function applyFilters() {
  let arr = [...state.products];

  const brand = els.brandFilter.value;
  const size = els.sizeFilter.value;
  const search = els.searchInput.value.trim().toLowerCase();
  const sort = els.sortSelect.value;

  if (brand) arr = arr.filter(p => p.brand === brand);

  if (size) {
    const s = Number(size);
    arr = arr.filter(p =>
      (p.sizes || []).some(obj => obj.eu === s && obj.stock > 0)
    );
  }

  if (search) arr = arr.filter(p => p.title.toLowerCase().includes(search));

  if (sort === 'price-asc') arr.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);

  state.filtered = applyPostponedFilter(arr);
  renderCatalog();
}

/* ========================= */
/*       RENDER CATALOG      */
/* ========================= */

function renderCatalog() {
  els.catalog.innerHTML = '';

  if (!state.filtered.length) {
    const empty = document.createElement('div');
    empty.style.color = '#aeb4c0';
    empty.style.padding = '20px';
    empty.textContent = 'Ничего не найдено';
    els.catalog.appendChild(empty);
    return;
  }

  state.filtered.forEach((p, i) => {
    const node = cardNode(p);
    node.style.animationDelay = `${i * 40}ms`;
    els.catalog.appendChild(node);
  });
}

/* ========================= */
/*          CARD NODE        */
/* ========================= */

function cardNode(p) {
  const node = document.createElement('div');
  node.className = 'card';
  node.dataset.id = p.id;

  const cover = p.images?.[0] || '';
  const price = formatPrice(p.price);

  node.innerHTML = `
    <div class="card-image">
      <img src="${cover}" alt="${p.title}">
    </div>

    <div class="card-info">
      <div class="card-title">${p.title}</div>
      <div class="card-price">${price}</div>
    </div>
  `;

  node.addEventListener('click', () => {
    if (tg) openProductScreen(p.id);
    else openProductModal(p);
  });

  node.addEventListener('mousemove', (e) => {
    const rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const tiltX = (y / rect.height) * 3;
    const tiltY = -(x / rect.width) * 3;
    node.style.transform =
      `translateY(-4px) scale(1.02) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  node.addEventListener('mouseleave', () => {
    node.style.transform = '';
  });

  return node;
}
/* ========================= */
/*   PRODUCT SCREEN (TG)     */
/* ========================= */

function openProductScreen(productId) {
  const p = state.products.find(x => String(x.id) === String(productId));
  if (!p) return;

  currentProduct = p;
  selectedSize = null;

  openProductModal(p);

  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    closeProductModal();
    tg.BackButton.hide();
    tg.BackButton.onClick(() => {});
  });
}

/* ========================= */
/*       AVAILABILITY        */
/* ========================= */

function updateAvailabilityBlock(p, size) {
  if (!els.stockCount) return;

  if (!size) {
    els.stockCount.textContent = '—';
    return;
  }

  const sizeObj = (p.sizes || []).find(x => x.eu === size);
  if (!sizeObj) {
    els.stockCount.textContent = '—';
    return;
  }

  els.stockCount.textContent = sizeObj.stock;
}
function selectSize(size) {
  selectedSize = size;

  els.modalSizes.querySelectorAll('.size')
    .forEach(el =>
      el.classList.toggle('active', String(el.dataset.eu) === String(size))
    );

  document.querySelectorAll('#sizeSpecList .size-spec')
    .forEach(el =>
      el.classList.toggle('active', String(el.dataset.size) === String(size))
    );

  updateAvailabilityBlock(currentProduct, size);

  els.modalPrice.classList.remove('bump');
  void els.modalPrice.offsetWidth;
  els.modalPrice.classList.add('bump');
}


/* ========================= */ 
/* STOCK STATUS LOGIC */ 
/* ========================= */
function formatStockStatus(totalStock) {
  if (totalStock === 0) {
    return 'Нет в наличии';
  }

  if (totalStock > 7) {
    return `${totalStock} шт. • В наличии`;
  }

  if (totalStock >= 4) {
    return `${totalStock} шт. • Последние размеры`;
  }

  return `${totalStock} шт. • Осталось мало`;
}

/* ========================= */
/*       PRODUCT MODAL       */
/* ========================= */

function openProductModal(p) {
  currentProduct = p;
  selectedSize = null;

  const carousel = els.carousel;
  const thumbStrip = els.thumbStrip;

  carousel.innerHTML = '';
  thumbStrip.innerHTML = '';

  const imgs = p.images || [];

  /* --- GALLERY IMAGES (CINEMATIC + PARALLAX READY) --- */
  imgs.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = p.title;
    img.draggable = false;
    carousel.appendChild(img);
  });

  /* observeSections ВНЕ цикла */
  observeSections();

  /* --- THUMBNAILS --- */
  imgs.forEach((src, i) => {
    const t = document.createElement('div');
    t.className = 'thumb' + (i === 0 ? ' active' : '');
    t.innerHTML = `<img src="${src}" alt="">`;

    t.addEventListener('click', () => {
      const width = carousel.clientWidth;
      carousel.scrollTo({ left: width * i, behavior: 'smooth' });
      updateThumbs(i);
    });

    thumbStrip.appendChild(t);
  });

  const thumbs = Array.from(thumbStrip.querySelectorAll('.thumb'));

  /* --- SCROLL SYNC --- */
  carousel.scrollLeft = 0;

  carousel.onscroll = () => {
    const width = carousel.clientWidth || 1;
    const index = Math.round(carousel.scrollLeft / width);
    const safeIndex = Math.min(Math.max(index, 0), imgs.length - 1);
    updateThumbs(safeIndex);
  };

  function updateThumbs(i) {
    thumbs.forEach((th, idx) => {
      th.classList.toggle('active', idx === i);
    });
  }

  /* ========================= */
  /*   PREMIUM CARD FIELDS     */
  /* ========================= */

  els.modalBrand.textContent = p.brand || '';

  const totalStock = (p.sizes || []).reduce((sum, x) => sum + x.stock, 0);
  els.modalStockInline.textContent = formatStockStatus(totalStock);
els.stockBadge.textContent = formatStockStatus(totalStock);



  els.modalTitle.textContent = p.title;
  els.modalPrice.textContent = formatPrice(p.price);
/* ========================= */
/*        SHARE BUTTON       */
/* ========================= */

if (els.shareBtn) {
  els.shareBtn.onclick = async () => {
  const url = `https://vulica.store/share/product/${p.id}`;
    const text = `${p.title} — ${formatPrice(p.price)}`;

    if (tg) {
      const shareLink =
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(shareLink);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text, url });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована');
    } catch {
      alert('Не удалось скопировать ссылку');
    }
  };
}



 if (p.materials && typeof p.materials === 'object') {
  els.modalMaterials.innerHTML = Object.entries(p.materials)
    .map(([key, value]) =>
      `<div class="key">${beautifyMaterialKey(key)}</div>
       <div class="value">${value}</div>`
    )
    .join('');
} else {
  els.modalMaterials.innerHTML = '';
}


  updateAvailabilityBlock(p, null);

/* ========================= */
/*          SIZES            */
/* ========================= */

els.modalSizes.innerHTML = '';

(p.sizes || []).forEach((obj, idx) => {
  const b = document.createElement('button');
  b.className = 'size';

  b.dataset.eu = obj.eu;
  b.dataset.cm = obj.cm;
  b.dataset.stock = obj.stock;

  const stockLevel =
    obj.stock <= 0 ? 0 :
    obj.stock === 1 ? 1 :
    obj.stock === 2 ? 2 :
    obj.stock <= 4 ? 3 :
    obj.stock <= 7 ? 4 : 5;

  b.innerHTML = `
    <div class="size-top">
      <span class="size-eu">${obj.eu}</span>
      <span class="size-stock-dots size-stock-${stockLevel}">
        <span></span><span></span><span></span><span></span><span></span>
      </span>
    </div>
    <div class="size-bottom">
      <span class="size-cm">${obj.cm} см</span>
      <span class="size-stock-label">
        ${obj.stock > 0 ? `${obj.stock} шт` : 'Нет в наличии'}
      </span>
    </div>
  `;

  if (obj.stock <= 0) {
    b.disabled = true;
    b.classList.add('disabled');
  }

  b.addEventListener('click', (event) => {
    // INK‑MORPH
    let ink = b.querySelector('.size-ink');
    if (!ink) {
      ink = document.createElement('span');
      ink.className = 'size-ink';
      b.appendChild(ink);
    }
    ink.style.animation = 'none';
    void ink.offsetWidth;
    ink.style.animation = 'inkSpread .45s ease-out';

    if (obj.stock <= 0) return;
   tg?.HapticFeedback?.impactOccurred('light');



    selectSize(obj.eu);

    els.modalSizes.querySelectorAll('.size')
      .forEach(x => x.classList.remove('active'));
    b.classList.add('active');

    updateAvailabilityBlock(p, obj.eu);

    els.modalPrice.classList.remove('bump');
    void els.modalPrice.offsetWidth;
    els.modalPrice.classList.add('bump');
  });

  b.style.animationDelay = `${idx * 40}ms`;
  els.modalSizes.appendChild(b);
});




  /* ========================= */
  /*        OPEN MODAL         */
  /* ========================= */

  els.productModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    els.productModal.classList.add('open');
  });

  /* ========================= */
  /*       ADD TO CART         */
  /* ========================= */

  els.addToCartBtn.onclick = (e) => {
    addRippleEffect(els.addToCartBtn, e);
tg?.HapticFeedback?.impactOccurred('medium');


    const qty = 1;

    if (!selectedSize) selectedSize = pickFirstSize(p);

    if (!selectedSize) {
      alert('Выберите размер');
      return;
    }

    addToCart(p, selectedSize, qty);
    createFlyAnimation(p);

    closeProductModal();
    openCart();
  };

  /* ========================= */
  /*         RESERVE           */
  /* ========================= */

  if (els.reserveBtn) {
    els.reserveBtn.onclick = () => {
      tg?.HapticFeedback?.notificationOccurred('success');


      if (!selectedSize) {
        alert('Выберите размер');
        return;
      }

      const sizeObj = (p.sizes || []).find(x => x.eu === selectedSize);
if (!sizeObj || sizeObj.stock <= 0) {
  alert('Нет в наличии');
  return;
}


      sizeObj.stock -= 1;
      saveStock();

      const until = Date.now() + 24 * 60 * 60 * 1000;
      state.reserved.push({
        id: p.id,
        size: selectedSize,
        until
      });
      localStorage.setItem('reserved', JSON.stringify(state.reserved));

      updateAvailabilityBlock(p, selectedSize);

      addToCart(p, selectedSize, 1);

      closeProductModal();
      openCart();
    };
  }

  /* ========================= */
  /*   PREMIUM GALLERY INIT    */
  /* ========================= */

  setTimeout(() => {
    initParallaxGallery();
  }, 60);
}

/* ========================= */
/*   HELPERS FOR MATERIALS   */
/* ========================= */

function beautifyMaterialKey(key) {
  const map = {
    upper: 'Верх',
    sole: 'Подошва',
    midsole: 'Промежуточная подошва',
    lining: 'Подкладка',
    weight: 'Вес'
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}
/* ========================= */
/*    CLOSE PRODUCT MODAL    */
/* ========================= */

function closeProductModal() {
  els.productModal.classList.remove('open');

  setTimeout(() => {
    els.productModal.classList.add('hidden');
  }, 220);

  if (tg) {
    tg.BackButton.hide();
    tg.BackButton.onClick(() => {});
  }
}
/* ========================= */
/*            CART           */
/* ========================= */

function pickFirstSize(p) {
  const obj = (p.sizes || []).find(x => x.stock > 0);
  return obj ? obj.eu : null;
}

function addToCart(p, size, qty) {
  const key = `${p.id}:${size}`;
  const idx = state.cart.findIndex(x => x.key === key);

  if (idx >= 0) {
    state.cart[idx].qty += qty;
  } else {
    state.cart.push({
      key,
      id: p.id,
      title: p.title,
      brand: p.brand,
      price: p.price,
      size,
      qty,
      images: p.images
    });
  }

  persistCart();
  updateCartBadge();
}

function persistCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
}

function openCart() {
  renderCart();
  els.cartDrawer.classList.remove('hidden');
}

function closeCart() {
  els.cartDrawer.classList.add('hidden');
}

function renderCart() {
  els.cartList.innerHTML = '';

  if (!state.cart.length) {
    const empty = document.createElement('div');
    empty.style.color = '#aeb4c0';
    empty.textContent = 'Корзина пуста';
    els.cartList.appendChild(empty);
    els.cartTotal.textContent = formatPrice(0);
    return;
  }

  state.cart.forEach(item => {
    const node = document.createElement('div');
    node.className = 'cart-item';

    node.innerHTML = `
      <img src="${item.images?.[0] || ''}" alt="">
      <div>
        <div><strong>${item.title}</strong></div>
        <div class="meta">Размер ${item.size}</div>

        <div class="qty-row">
          <button class="qty-btn" data-act="minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-act="plus">+</button>
          <button class="remove-btn" data-act="remove">Удалить</button>
        </div>
      </div>

      <div class="price">${formatPrice(item.price)}</div>
    `;

    node.querySelector('[data-act="minus"]').addEventListener('click', () => changeQty(item.key, -1));
    node.querySelector('[data-act="plus"]').addEventListener('click', () => changeQty(item.key, +1));
    node.querySelector('[data-act="remove"]').addEventListener('click', () => removeItem(item.key));

    els.cartList.appendChild(node);
  });

  els.cartTotal.textContent = formatPrice(cartTotal());
}

function changeQty(key, delta) {
  const idx = state.cart.findIndex(x => x.key === key);
  if (idx < 0) return;

  state.cart[idx].qty += delta;
  if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);

  persistCart();
  updateCartBadge();
  renderCart();
}

function removeItem(key) {
  const idx = state.cart.findIndex(x => x.key === key);
  if (idx < 0) return;

  state.cart.splice(idx, 1);
  persistCart();
  updateCartBadge();
  renderCart();
}

function cartTotal() {
  return state.cart.reduce((sum, x) => sum + x.price * x.qty, 0);
}

function formatPrice(v) {
  return `${v} BYN`;
}

function updateCartBadge() {
  els.cartBtn.textContent = formatPrice(cartTotal());
  els.cartBtnModal.textContent = formatPrice(cartTotal());
}

/* ========================= */
/*       PROFILE SECTIONS    */
/* ========================= */

function switchProfileTab(tab) {
  const sections = {
    orders: els.profileOrders,
    postponed: els.profilePostponed
  };

  Object.values(sections).forEach(s => s.classList.remove('active'));
  if (sections[tab]) sections[tab].classList.add('active');
}

function renderProfileSections() {
  switchProfileTab('orders');
}

/* ========================= */
/*          ORDERS           */
/* ========================= */

function renderProfileOrders() {
  els.profileOrders.innerHTML = '';

  if (!state.orders.length) {
    const empty = document.createElement('div');
    empty.className = 'profile-empty';
    empty.textContent = 'Покупок пока нет';
    els.profileOrders.appendChild(empty);
    return;
  }

  const sorted = [...state.orders].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  sorted.forEach(order => {
    const node = document.createElement('div');
    node.className = 'profile-order';

    const date = new Date(order.ts);
    const dateStr = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    node.innerHTML = `
      <div class="profile-order-header">
        <div class="profile-order-date">${dateStr}</div>
        <div class="profile-order-total">${formatPrice(order.total)}</div>
      </div>
      <div class="profile-order-items">
        ${order.items.map(it => `
          <div class="profile-order-item">
            <div class="title">${it.title}</div>
            <div class="meta">Размер ${it.size} • ${it.qty} шт.</div>
          </div>
        `).join('')}
      </div>
    `;

    els.profileOrders.appendChild(node);
  });
}

/* ========================= */
/*       PROFILE POSTPONED   */
/* ========================= */

function renderProfilePostponed() {
  els.profilePostponed.innerHTML = '';

  cleanupPostponed();

  if (!state.postponed.length) {
    const empty = document.createElement('div');
    empty.className = 'profile-empty';
    empty.textContent = 'Отложенных пар нет';
    els.profilePostponed.appendChild(empty);
    return;
  }

  state.postponed.forEach(entry => {
    const p = state.products.find(x => x.id === entry.id);
    if (!p) return;

    const node = document.createElement('div');
    node.className = 'profile-postponed-item';

    const cover = p.images?.[0] || '';
    const untilDate = new Date(entry.until);
    const diffMs = untilDate.getTime() - Date.now();
    const daysLeft = Math.max(1, Math.ceil(diffMs / 86400000));

    node.innerHTML = `
      <div class="profile-postponed-left">
        <img src="${cover}" alt="${p.title}">
        <div>
          <div class="title">${p.title}</div>
          <div class="meta">${p.brand}</div>
          <div class="meta">Ещё ~${daysLeft} дн.</div>
        </div>
      </div>
      <div class="profile-postponed-right">
        <div class="price">${formatPrice(p.price)}</div>
        <button class="secondary small" data-id="${p.id}">Вернуть в каталог</button>
      </div>
    `;

    node.querySelector('button').addEventListener('click', () => {
      state.postponed = state.postponed.filter(x => x.id !== p.id);
      savePostponed();
      state.filtered = applyPostponedFilter([...state.products]);
      renderCatalog();
      renderProfilePostponed();
    });

    els.profilePostponed.appendChild(node);
  });
}

/* ========================= */
/*          CHECKOUT         */
/* ========================= */

async function checkout() {
  if (!state.cart.length) {
    alert('Корзина пуста');
    return;
  }

  const order = {
    items: state.cart.map(x => ({
      id: x.id,
      title: x.title,
      brand: x.brand,
      size: x.size,
      qty: x.qty,
      price: x.price
    })),
    total: cartTotal(),
    ts: new Date().toISOString()
  };

  try {
    const res = await fetch('/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    if (res.ok) {
      state.orders.push(order);
      saveOrders();
      renderProfileOrders();

      tg?.showPopup({
        title: 'Заказ',
        message: '✅ Заказ отправлен!',
        buttons: [{ type: 'ok' }]
      });

      state.cart = [];
      localStorage.removeItem('cart');
      renderCart();
      updateCartBadge();
    } else {
      throw new Error('Server error');
    }
  } catch {
    tg?.showPopup({
      title: 'Ошибка',
      message: 'Не удалось отправить заказ',
      buttons: [{ type: 'ok' }]
    });
  }
}

/* ========================= */
/*   STOCK SAVE / RESTORE    */
/* ========================= */

function saveStock() {
  const stockMap = {};
  state.products.forEach(p => {
    stockMap[p.id] = (p.sizes || []).map(obj => ({
      eu: obj.eu,
      stock: obj.stock
    }));
  });
  localStorage.setItem('stockMap', JSON.stringify(stockMap));
}


function restoreStock() {
  const raw = localStorage.getItem('stockMap');
  if (!raw) return;

  const stockMap = JSON.parse(raw);

  state.products.forEach(p => {
    if (!stockMap[p.id]) return;

    (p.sizes || []).forEach(obj => {
      const saved = stockMap[p.id].find(x => x.eu === obj.eu);
      if (saved) obj.stock = saved.stock;
    });
  });
}

/* ========================= */
/*     CLEANUP RESERVED      */
/* ========================= */

function cleanupReserved() {
  const now = Date.now();
  const before = state.reserved.length;

  state.reserved = state.reserved.filter(r => {
    if (r.until > now) return true;

    const p = state.products.find(x => x.id === r.id);
    if (p) {
      const sizeObj = (p.sizes || []).find(x => x.eu === r.size);
      if (sizeObj) sizeObj.stock += 1;
    }

    return false;
  });

  if (state.reserved.length !== before) {
    localStorage.setItem('reserved', JSON.stringify(state.reserved));
    saveStock();
  }
}
/* ========================= */
/*            UTILS          */
/* ========================= */

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function saveOrders() {
  localStorage.setItem('orders', JSON.stringify(state.orders));
}

function savePostponed() {
  localStorage.setItem('postponed', JSON.stringify(state.postponed));
}

function cleanupPostponed() {
  const now = Date.now();
  const before = state.postponed.length;
  state.postponed = state.postponed.filter(
    x => new Date(x.until).getTime() > now
  );
  if (state.postponed.length !== before) {
    savePostponed();
  }
}

function addRippleEffect(button, event) {
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const circle = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const existing = button.getElementsByClassName('ripple')[0];
  if (existing) existing.remove();

  button.appendChild(circle);
}

/* ========================= */
/*       FLY ANIMATION       */
/* ========================= */

function createFlyAnimation(p) {
  const src = p.images?.[0] || '';
  if (!src) return;

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.style.width = '64px';
  img.style.height = '64px';
  img.style.borderRadius = '16px';
  img.style.objectFit = 'cover';

  const fly = document.createElement('div');
  fly.className = 'fly';
  fly.appendChild(img);
  document.body.appendChild(fly);

  const startRect = els.productModal.getBoundingClientRect();
  const cartRect = els.cartBtn.getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  fly.style.left = `${startX - 32}px`;
  fly.style.top = `${startY - 32}px`;

  requestAnimationFrame(() => {
    const dx = endX - startX;
    const dy = endY - startY;
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(0.4)`;
    fly.style.opacity = '0';
  });

  setTimeout(() => {
    fly.remove();
  }, 700);
}

/* ========================= */
/*       MYSTERY BOX         */
/* ========================= */

function openMysteryBox() {
  const arr = state.filtered.length ? state.filtered : state.products;
  if (!arr.length) return;

  const p = arr[Math.floor(Math.random() * arr.length)];
  state.mysteryProductId = p.id;

  els.mysteryImg.src = p.images?.[0] || '';
  els.mysteryTitle.textContent = p.title;
  els.mysteryPrice.textContent = formatPrice(p.price);

  els.mysteryModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    els.mysteryModal.classList.add('open');
  });
}

function closeMysteryModal() {
  els.mysteryModal.classList.remove('open');
  setTimeout(() => {
    els.mysteryModal.classList.add('hidden');
  }, 200);
}

/* ========================= */
/*   PROFILE MODAL (NEW)     */
/* ========================= */

function openProfileModal() {
  els.profileModal.classList.remove('hidden');

  requestAnimationFrame(() => {
    els.profileModal.classList.add('open');
  });

  if (tg) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
      closeProfileModal();
      tg.BackButton.hide();
      tg.BackButton.onClick(() => {});
    });
  }
}

function closeProfileModal() {
  els.profileModal.classList.remove('open');

  setTimeout(() => {
    els.profileModal.classList.add('hidden');
  }, 200);

  if (tg) {
    tg.BackButton.hide();
    tg.BackButton.onClick(() => {});
  }
}

/* ========================= */
/*       ATTACH EVENTS       */
/* ========================= */

function attachEvents() {
  els.brandFilter.addEventListener('change', applyFilters);
  els.sizeFilter.addEventListener('change', applyFilters);
  els.sortSelect.addEventListener('change', applyFilters);
  els.searchInput.addEventListener('input', debounce(applyFilters, 300));

  els.openMysteryBtn.addEventListener('click', openMysteryBox);
  els.closeMystery.addEventListener('click', closeMysteryModal);
  els.mysteryOk.addEventListener('click', closeMysteryModal);

  els.cartBtn.addEventListener('click', openCart);
  els.cartBtnModal.addEventListener('click', openCart);
  els.closeCart.addEventListener('click', closeCart);
  els.checkoutBtn.addEventListener('click', checkout);

  els.profileAvatarHeader.addEventListener('click', () => {
    openProfileModal();
    renderProfileSections();
    renderProfileOrders();
    renderProfilePostponed();
  });

  els.profileAvatarModal.addEventListener('click', () => {
    openProfileModal();
    renderProfileSections();
    renderProfileOrders();
    renderProfilePostponed();
  });

  els.profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.profileTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchProfileTab(tab.dataset.tab);
    });
  });

  if (!tg) {
    els.browserBackBtn.addEventListener('click', () => {
      closeProductModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCart();
      closeProductModal();
      closeMysteryModal();
      closeProfileModal();
    }
  });
}

/* ========================= */
/*   SECTION OBSERVER        */
/* ========================= */

function observeSections() {
  const sections = document.querySelectorAll('.modal-info section');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.2 });

  sections.forEach(s => obs.observe(s));
}

/* ========================================================= */
/*                PREMIUM PARALLAX ENGINE                    */
/* ========================================================= */

function initParallaxGallery() {
  const carousel = document.getElementById("carousel");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll("img"));
  if (slides.length === 0) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  function updateActiveState() {
    const index = Math.round(carousel.scrollLeft / carousel.offsetWidth);

    slides.forEach((img, i) => {
      img.classList.remove("active-photo", "inactive-photo");
      if (i === index) img.classList.add("active-photo");
      else img.classList.add("inactive-photo");
    });

    const thumbs = document.querySelectorAll(".thumb");
    thumbs.forEach((t, i) => {
      t.classList.toggle("active", i === index);
    });
  }

  updateActiveState();

  function applyParallax() {
    const delta = currentX - startX;

    slides.forEach((img) => {
      img.classList.add("parallax-shift");
      img.style.transform = `translateX(${delta * 0.12}px) scale(${img.classList.contains("active-photo") ? 1.10 : 1.04})`;
    });
  }

  function resetParallax() {
    slides.forEach((img) => {
      img.style.transform = "";
      img.classList.remove("parallax-shift");
    });
  }

  carousel.addEventListener("touchstart", (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    currentX = startX;
  });

  carousel.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    applyParallax();
  });

  carousel.addEventListener("touchend", () => {
    isDragging = false;
    resetParallax();
    setTimeout(updateActiveState, 120);
  });

  carousel.addEventListener("scroll", () => {
    setTimeout(updateActiveState, 80);
  });
}

init();
