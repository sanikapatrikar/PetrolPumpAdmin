/* =========================================================
   Patrikar Petroleum Point - API Client Layer
   ========================================================= */

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  if (window.location.port === '5000') return '/api';
  const host = window.location.hostname || 'localhost';
  return `http://${host}:5000/api`;
};

const API_BASE = getApiBaseUrl();

const API = {
  // Auth API
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  // Fuel Rates API
  async getRates() {
    const res = await fetch(`${API_BASE}/rates`);
    return res.json();
  },

  async updateRates(ratesArray) {
    const res = await fetch(`${API_BASE}/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates: ratesArray })
    });
    return res.json();
  },

  // Tanks API
  async getTanks() {
    const res = await fetch(`${API_BASE}/tanks`);
    return res.json();
  },

  async addTank(data) {
    const res = await fetch(`${API_BASE}/tanks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async refillTank(data) {
    const res = await fetch(`${API_BASE}/tanks/refill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Shifts API
  async getShifts(date = '', shift = '') {
    let url = `${API_BASE}/shifts?`;
    if (date) url += `date=${date}&`;
    if (shift) url += `shift=${shift}`;
    const res = await fetch(url);
    return res.json();
  },

  async addShift(data) {
    const res = await fetch(`${API_BASE}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Reconciliation API
  async getReconciliations(date = '') {
    const res = await fetch(`${API_BASE}/reconcile?date=${date}`);
    return res.json();
  },

  async saveReconciliation(data) {
    const res = await fetch(`${API_BASE}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Credit Customers API
  async getCustomers() {
    const res = await fetch(`${API_BASE}/customers`);
    return res.json();
  },

  async addCustomer(data) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCustomerTransactions(id) {
    const res = await fetch(`${API_BASE}/customers/${id}/transactions`);
    return res.json();
  },

  async addCreditTransaction(customerId, data) {
    const res = await fetch(`${API_BASE}/customers/${customerId}/transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCustomer(id) {
    const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Expenses API
  async getExpenses(date = '', month = '') {
    let url = `${API_BASE}/expenses?`;
    if (date) url += `date=${date}&`;
    if (month) url += `month=${month}`;
    const res = await fetch(url);
    return res.json();
  },

  async addExpense(data) {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteExpense(id) {
    const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Employees API
  async getEmployees() {
    const res = await fetch(`${API_BASE}/employees`);
    return res.json();
  },

  async addEmployee(data) {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateEmployee(id, data) {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteEmployee(id) {
    const res = await fetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Reports API
  async getDailyReport(date = '') {
    const res = await fetch(`${API_BASE}/reports/daily?date=${date}`);
    return res.json();
  }
};
