const STORAGE_KEYS = {
  users: 'transport_users',
  orders: 'transport_orders',
  session: 'transport_session',
};

const authSection = document.getElementById('auth-section');
const customerDashboard = document.getElementById('customer-dashboard');
const carrierDashboard = document.getElementById('carrier-dashboard');
const authMessage = document.getElementById('auth-message');

const customerWelcome = document.getElementById('customer-welcome');
const carrierWelcome = document.getElementById('carrier-welcome');

const customerOrdersList = document.getElementById('customer-orders');
const carrierFeedList = document.getElementById('carrier-feed');

const state = {
  users: load(STORAGE_KEYS.users, []),
  orders: load(STORAGE_KEYS.orders, []),
  session: load(STORAGE_KEYS.session, null),
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.users));
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders));
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(state.session));
}

function setMessage(text, isError = true) {
  authMessage.style.color = isError ? '#b91c1c' : '#15803d';
  authMessage.textContent = text;
}

function findUserByEmail(email) {
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

function registerUser(role, payload) {
  if (findUserByEmail(payload.email)) {
    setMessage('Пользователь с таким email уже существует.');
    return;
  }

  state.users.push({
    id: crypto.randomUUID(),
    role,
    ...payload,
  });

  save();
  setMessage('Регистрация прошла успешно. Теперь выполните вход.', false);
}

function login(role, email, password) {
  const user = findUserByEmail(email);

  if (!user || user.role !== role || user.password !== password) {
    setMessage('Неверные учетные данные.');
    return;
  }

  state.session = { id: user.id, role: user.role };
  save();
  setMessage('');
  render();
}

function logout() {
  state.session = null;
  save();
  render();
}

function getCurrentUser() {
  if (!state.session) return null;
  return state.users.find((user) => user.id === state.session.id) || null;
}

function createOrder(formData) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'customer') return;

  const addresses = formData.get('addresses')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (addresses.length === 0) {
    alert('Добавьте хотя бы один адрес.');
    return;
  }

  const order = {
    id: crypto.randomUUID(),
    customerId: currentUser.id,
    customerName: currentUser.companyName,
    passengers: Number(formData.get('passengers')),
    addresses,
    comment: formData.get('comment').trim(),
    createdAt: new Date().toISOString(),
  };

  state.orders.unshift(order);
  save();
  render();
}

function formatDate(value) {
  return new Date(value).toLocaleString('ru-RU');
}

function renderCustomerOrders(user) {
  const orders = state.orders.filter((order) => order.customerId === user.id);

  if (orders.length === 0) {
    customerOrdersList.innerHTML = '<li class="order-item">У вас пока нет заявок.</li>';
    return;
  }

  customerOrdersList.innerHTML = orders
    .map(
      (order) => `
      <li class="order-item">
        <strong>Заявка #${order.id.slice(0, 8)}</strong>
        <div class="order-meta">Создано: ${formatDate(order.createdAt)}</div>
        <div>Пассажиров: <strong>${order.passengers}</strong></div>
        <div>Адреса: ${order.addresses.join(' → ')}</div>
        ${order.comment ? `<div>Комментарий: ${order.comment}</div>` : ''}
      </li>
    `
    )
    .join('');
}

function renderCarrierFeed() {
  if (state.orders.length === 0) {
    carrierFeedList.innerHTML = '<li class="order-item">Пока нет доступных заявок.</li>';
    return;
  }

  carrierFeedList.innerHTML = state.orders
    .map(
      (order) => `
      <li class="order-item">
        <strong>Заявка от ${order.customerName}</strong>
        <div class="order-meta">Создано: ${formatDate(order.createdAt)}</div>
        <div>Пассажиров: <strong>${order.passengers}</strong></div>
        <div>Адреса развозки: ${order.addresses.join(' → ')}</div>
        ${order.comment ? `<div>Комментарий: ${order.comment}</div>` : ''}
      </li>
    `
    )
    .join('');
}

function render() {
  const currentUser = getCurrentUser();

  authSection.classList.toggle('hidden', Boolean(currentUser));
  customerDashboard.classList.toggle('hidden', !currentUser || currentUser.role !== 'customer');
  carrierDashboard.classList.toggle('hidden', !currentUser || currentUser.role !== 'carrier');

  if (!currentUser) return;

  if (currentUser.role === 'customer') {
    customerWelcome.textContent = `Вы вошли как: ${currentUser.companyName} (${currentUser.email})`;
    renderCustomerOrders(currentUser);
  }

  if (currentUser.role === 'carrier') {
    carrierWelcome.textContent = `Вы вошли как: ${currentUser.driverName}, минивен ${currentUser.vehicleNumber}`;
    renderCarrierFeed();
  }
}

document.getElementById('customer-register-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  registerUser('customer', {
    companyName: formData.get('companyName').trim(),
    email: formData.get('email').trim(),
    password: formData.get('password'),
  });

  event.currentTarget.reset();
});

document.getElementById('carrier-register-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  registerUser('carrier', {
    driverName: formData.get('driverName').trim(),
    vehicleNumber: formData.get('vehicleNumber').trim(),
    email: formData.get('email').trim(),
    password: formData.get('password'),
  });

  event.currentTarget.reset();
});

document.getElementById('customer-login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  login('customer', formData.get('email').trim(), formData.get('password'));
});

document.getElementById('carrier-login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  login('carrier', formData.get('email').trim(), formData.get('password'));
});

document.getElementById('order-form').addEventListener('submit', (event) => {
  event.preventDefault();
  createOrder(new FormData(event.currentTarget));
  event.currentTarget.reset();
});

document.getElementById('customer-logout').addEventListener('click', logout);
document.getElementById('carrier-logout').addEventListener('click', logout);

render();
