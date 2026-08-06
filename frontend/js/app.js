/* =========================================================
   Patrikar Petroleum Point - Application Controller
   SPA Navigation, Modals, State & REST API Interactivity
   ========================================================= */

const App = {
  state: {
    user: null,
    currentView: 'dashboard',
    rates: [],
    tanks: [],
    employees: [],
    customers: [],
    currentShiftReadings: [],
    selectedDate: new Date().toISOString().split('T')[0]
  },

  init() {
    console.log('Initializing Patrikar Petroleum Point Admin App...');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    this.state.selectedDate = today;

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (!input.value) input.value = today;
    });

    // Check user authentication session
    this.checkAuth();
  },

  checkAuth() {
    const sessionRaw = localStorage.getItem('iocl_admin_session');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    if (sessionRaw) {
      try {
        const user = JSON.parse(sessionRaw);
        this.state.user = user;
        this.updateHeaderProfile(user);

        if (loginContainer) {
          loginContainer.classList.add('hidden');
          loginContainer.style.display = 'none';
        }
        if (appContainer) {
          appContainer.style.display = 'flex';
        }

        // Start Clock & Load Initial App Data
        this.startClock();
        this.loadAppData();
        return;
      } catch (err) {
        console.error('Invalid session data:', err);
        localStorage.removeItem('iocl_admin_session');
      }
    }

    // Unauthenticated: Show Login Screen
    if (loginContainer) {
      loginContainer.style.display = 'flex';
      loginContainer.classList.remove('hidden');
    }
    if (appContainer) {
      appContainer.style.display = 'none';
    }
  },

  updateHeaderProfile(user) {
    const userNameEl = document.getElementById('current-user-name');
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userNameEl && user.full_name) {
      userNameEl.textContent = user.full_name;
    }
    if (userAvatarEl && user.full_name) {
      userAvatarEl.textContent = user.full_name.charAt(0).toUpperCase();
    }
  },

  loadAppData() {
    this.loadRates();
    this.loadEmployees();
    this.loadTanksData();
    this.loadCustomers();
    this.loadDashboardData();
  },

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const alertBox = document.getElementById('login-alert');
    const alertMsg = document.getElementById('login-alert-msg');
    const btnSubmit = document.getElementById('btn-login-submit');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      if (alertMsg) alertMsg.textContent = 'Please enter both username and password.';
      if (alertBox) alertBox.style.display = 'flex';
      return;
    }

    if (alertBox) alertBox.style.display = 'none';

    // UI Loading State
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="btn-text">Verifying Credentials...</span>`;
    }

    try {
      let loginSuccess = false;
      let userData = null;

      // Call API Login
      try {
        const res = await API.login(username, password);
        if (res && res.success) {
          loginSuccess = true;
          userData = res.user || { username, full_name: 'Manoj Patrikar', role: 'Admin' };
        }
      } catch (apiErr) {
        console.warn('API auth unavailable, attempting local credential validation...', apiErr);
      }

      // Offline / Fallback Validation
      if (!loginSuccess && username.toLowerCase() === 'admin' && password === 'admin123') {
        loginSuccess = true;
        userData = { username: 'admin', full_name: 'Manoj Patrikar', role: 'Station Admin' };
      }

      if (loginSuccess && userData) {
        // Save Session
        localStorage.setItem('iocl_admin_session', JSON.stringify(userData));
        this.state.user = userData;
        this.updateHeaderProfile(userData);

        // Transition Screen
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');

        if (loginContainer) {
          loginContainer.classList.add('hidden');
          setTimeout(() => {
            loginContainer.style.display = 'none';
          }, 400);
        }

        if (appContainer) {
          appContainer.style.display = 'flex';
        }

        this.startClock();
        this.loadAppData();
        this.showToast(`Welcome back, ${userData.full_name}! (IndianOil Portal)`, 'success');
      } else {
        if (alertMsg) alertMsg.textContent = 'Invalid admin username or password. Please try again.';
        if (alertBox) alertBox.style.display = 'flex';
      }
    } catch (err) {
      console.error('Error during login:', err);
      if (alertMsg) alertMsg.textContent = 'An unexpected error occurred. Please try again.';
      if (alertBox) alertBox.style.display = 'flex';
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span class="btn-text">Sign In to Admin Portal</span><span class="btn-arrow">→</span>`;
      }
    }
  },

  quickLogin() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (usernameInput) usernameInput.value = 'admin';
    if (passwordInput) passwordInput.value = 'admin123';
    this.handleLogin(new Event('submit'));
  },

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('btn-toggle-pass');
    if (passwordInput) {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (toggleBtn) toggleBtn.textContent = '🙈';
      } else {
        passwordInput.type = 'password';
        if (toggleBtn) toggleBtn.textContent = '👁️';
      }
    }
  },

  startClock() {
    const clockEl = document.getElementById('live-clock');
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN');
      if (clockEl) clockEl.textContent = `${dateStr} | ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  switchView(viewId) {
    this.state.currentView = viewId;
    
    // Update sidebar active link
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update view visibility
    document.querySelectorAll('.view-section').forEach(section => {
      section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    // Refresh view specific data
    switch (viewId) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'tanks':
        this.loadTanksData();
        break;
      case 'shifts':
        this.loadShiftsData();
        break;
      case 'reconciliation':
        this.loadReconciliationData();
        break;
      case 'credit':
        this.loadCustomersData();
        break;
      case 'expenses':
        this.loadExpensesData();
        break;
      case 'employees':
        this.loadEmployeesData();
        break;
      case 'reports':
        this.loadDayEndReport();
        break;
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'danger' ? '⚠️' : 'ℹ️'}</span> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
    if (modalId === 'modal-log-shift') {
      this.onNozzleSelected();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  // 1. FUEL RATES MANAGEMENT
  async loadRates() {
    try {
      const res = await API.getRates();
      if (res.success && res.rates) {
        this.state.rates = res.rates;
        
        // Update header ticker
        res.rates.forEach(r => {
          if (r.fuel_type.includes('MS') || r.fuel_type === 'Petrol (MS)') {
            const el = document.getElementById('rate-ms');
            if (el) el.textContent = `₹${Number(r.rate_per_litre || 0).toFixed(2)}`;
            const inp = document.getElementById('input-rate-ms');
            if (inp) inp.value = r.rate_per_litre;
          }
          if (r.fuel_type.includes('HSD') || r.fuel_type === 'Diesel (HSD)') {
            const el = document.getElementById('rate-hsd');
            if (el) el.textContent = `₹${Number(r.rate_per_litre || 0).toFixed(2)}`;
            const inp = document.getElementById('input-rate-hsd');
            if (inp) inp.value = r.rate_per_litre;
          }
        });
      }
    } catch (err) {
      console.error('Error loading rates:', err);
    }
  },

  async handleUpdateRates(e) {
    e.preventDefault();
    const updatedRates = [
      { fuel_type: 'Petrol (MS)', rate_per_litre: parseFloat(document.getElementById('input-rate-ms').value) },
      { fuel_type: 'Diesel (HSD)', rate_per_litre: parseFloat(document.getElementById('input-rate-hsd').value) }
    ];

    try {
      const res = await API.updateRates(updatedRates);
      if (res.success) {
        this.showToast('Fuel rates updated successfully!', 'success');
        this.closeModal('modal-update-rates');
        this.loadRates();
        if (this.state.currentView === 'dashboard') this.loadDashboardData();
      }
    } catch (err) {
      this.showToast('Failed to update rates', 'danger');
    }
  },

  // 2. DASHBOARD DATA & GAUGES
  async loadDashboardData() {
    const selectedDate = document.getElementById('dash-date-picker').value || this.state.selectedDate;

    try {
      const [tanksRes, shiftsRes, expRes, recRes] = await Promise.all([
        API.getTanks(),
        API.getShifts(selectedDate),
        API.getExpenses(selectedDate),
        API.getReconciliations(selectedDate)
      ]);

      // Render Tank Gauges
      if (tanksRes.success && tanksRes.tanks) {
        this.renderTankGauges('dashboard-tanks-container', tanksRes.tanks);
      }

      // Render Shift Stats & Recent Shifts Table
      if (shiftsRes.success && shiftsRes.readings) {
        this.state.currentShiftReadings = shiftsRes.readings;
        let totalSales = 0;
        let totalLitres = 0;
        
        const recentBody = document.getElementById('dash-recent-shifts');
        recentBody.innerHTML = '';

        shiftsRes.readings.slice(0, 5).forEach(r => {
          totalSales += r.total_amount;
          totalLitres += r.net_litres;

          const row = document.createElement('tr');
          row.innerHTML = `
            <td><span class="badge badge-navy">${r.shift_name}</span></td>
            <td><strong>${r.nozzle_name}</strong></td>
            <td>${r.net_litres.toFixed(1)} L</td>
            <td><strong>₹${r.total_amount.toLocaleString('en-IN')}</strong></td>
          `;
          recentBody.appendChild(row);
        });

        document.getElementById('kpi-total-sales').textContent = `₹${totalSales.toLocaleString('en-IN')}`;
        document.getElementById('kpi-total-litres').textContent = `${totalLitres.toFixed(1)} Litres Sold Today`;

        // Render Doughnut Chart
        const fuelSalesAgg = {};
        shiftsRes.readings.forEach(sr => {
          if (!fuelSalesAgg[sr.fuel_type]) fuelSalesAgg[sr.fuel_type] = { fuel_type: sr.fuel_type, amount: 0 };
          fuelSalesAgg[sr.fuel_type].amount += sr.total_amount;
        });

        ChartsManager.renderSalesDistributionChart(Object.values(fuelSalesAgg));
      }

      // Render Reconciled Cash / Digital / Udhar
      if (recRes.success && recRes.reconciliations && recRes.reconciliations.length > 0) {
        const lastRec = recRes.reconciliations[0];
        document.getElementById('kpi-cash-collected').textContent = `₹${lastRec.cash_collected.toLocaleString('en-IN')}`;
        document.getElementById('kpi-digital-collected').textContent = `₹${lastRec.digital_collected.toLocaleString('en-IN')}`;
        document.getElementById('kpi-udhar-due').textContent = `₹${lastRec.udhar_amount.toLocaleString('en-IN')}`;
      }

      // Render Expenses KPI
      if (expRes.success) {
        document.getElementById('kpi-today-expenses').textContent = `₹${expRes.total_expense.toLocaleString('en-IN')}`;
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  },

  renderTankGauges(containerId, tanks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    tanks.forEach(tank => {
      const fillPercentage = Math.min(100, Math.max(0, (tank.current_stock / tank.max_capacity) * 100));
      const isLow = tank.current_stock <= tank.min_alert_level;

      const card = document.createElement('div');
      card.className = 'tank-card';
      card.innerHTML = `
        <div class="tank-header">
          <span class="tank-name">${tank.tank_name}</span>
          <span class="tank-fuel-type">${tank.fuel_type}</span>
        </div>
        <div class="tank-progress-outer">
          <div class="tank-progress-inner ${isLow ? 'low' : ''}" style="width: ${fillPercentage.toFixed(1)}%;"></div>
          <span class="tank-progress-text">${fillPercentage.toFixed(1)}% (${tank.current_stock.toLocaleString()} L)</span>
        </div>
        <div class="tank-meta">
          <span>Capacity: <strong>${tank.max_capacity.toLocaleString()} L</strong></span>
          <span>Alert Min: <strong style="${isLow ? 'color: var(--danger);' : ''}">${tank.min_alert_level.toLocaleString()} L</strong></span>
        </div>
        ${isLow ? '<div style="color: var(--danger); font-size: 0.75rem; font-weight: 700;">⚠️ LOW FUEL ALERT - Tanker Refill Required</div>' : ''}
      `;
      container.appendChild(card);
    });
  },

  // 3. TANK MANAGEMENT & REFILLS
  async loadTanksData() {
    try {
      const res = await API.getTanks();
      if (res.success) {
        this.state.tanks = res.tanks;
        this.renderTankGauges('tanks-management-container', res.tanks);

        // Populate tank select dropdown in refill modal
        const tankSelect = document.getElementById('refill-input-tank');
        if (tankSelect) {
          tankSelect.innerHTML = '';
          res.tanks.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.tank_name} (${t.fuel_type}) - Stock: ${t.current_stock}L`;
            tankSelect.appendChild(opt);
          });
        }

        // Render Refill Table
        const refillBody = document.getElementById('tanks-refill-table');
        refillBody.innerHTML = '';
        if (res.recent_refills) {
          res.recent_refills.forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${r.delivery_date}</td>
              <td><strong>${r.tank_name}</strong></td>
              <td><span class="badge badge-navy">${r.fuel_type}</span></td>
              <td>${r.invoice_number || '-'}</td>
              <td><strong style="color: var(--success);">+${r.litres_added.toLocaleString()} L</strong></td>
              <td>₹${r.rate_per_litre}</td>
              <td>${r.supplier_name}</td>
            `;
            refillBody.appendChild(row);
          });
        }
      }
    } catch (err) {
      console.error('Error loading tanks data:', err);
    }
  },

  async handleTankRefill(e) {
    e.preventDefault();
    const data = {
      tank_id: parseInt(document.getElementById('refill-input-tank').value),
      delivery_date: document.getElementById('refill-input-date').value,
      invoice_number: document.getElementById('refill-input-invoice').value,
      litres_added: parseFloat(document.getElementById('refill-input-litres').value),
      rate_per_litre: parseFloat(document.getElementById('refill-input-rate').value || 0),
      supplier_name: document.getElementById('refill-input-supplier').value
    };

    try {
      const res = await API.refillTank(data);
      if (res.success) {
        this.showToast('Tank stock delivery recorded successfully!', 'success');
        this.closeModal('modal-tank-refill');
        if (e.target && e.target.reset) e.target.reset();
        this.loadTanksData();
        this.loadDashboardData();
        this.loadDayEndReport();
      }
    } catch (err) {
      this.showToast('Failed to record refill', 'danger');
    }
  },

  async handleAddTank(e) {
    e.preventDefault();
    const data = {
      tank_name: document.getElementById('add-tank-name').value,
      fuel_type: document.getElementById('add-tank-fuel').value,
      max_capacity: parseFloat(document.getElementById('add-tank-capacity').value),
      current_stock: parseFloat(document.getElementById('add-tank-stock').value)
    };

    try {
      const res = await API.addTank(data);
      if (res.success) {
        this.showToast('New tank added successfully!', 'success');
        this.closeModal('modal-add-tank');
        if (e.target && e.target.reset) e.target.reset();
        this.loadTanksData();
        this.loadDashboardData();
      }
    } catch (err) {
      this.showToast('Failed to add tank', 'danger');
    }
  },

  // 4. SHIFT READINGS
  async loadEmployees() {
    try {
      const res = await API.getEmployees();
      if (res.success) {
        this.state.employees = res.employees;
        const attSelect = document.getElementById('shift-input-attendant');
        if (attSelect) {
          attSelect.innerHTML = '<option value="">None / Unassigned</option>';
          res.employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = `${emp.name} (${emp.role})`;
            attSelect.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  },

  onNozzleSelected() {
    const nozzleSelect = document.getElementById('shift-input-nozzle');
    const selectedOpt = nozzleSelect.options[nozzleSelect.selectedIndex];
    const fuelType = selectedOpt.dataset.fuel;
    
    document.getElementById('shift-input-fuel').value = fuelType;

    // Find rate for fuelType
    const rateObj = this.state.rates.find(r => r.fuel_type === fuelType || fuelType.includes(r.fuel_type.split(' ')[0]));
    const rate = rateObj ? rateObj.rate_per_litre : 100.0;
    document.getElementById('shift-input-rate').value = rate;

    this.calculateShiftNetLitres();
  },

  calculateShiftNetLitres() {
    const openVal = parseFloat(document.getElementById('shift-input-open').value || 0);
    const closeVal = parseFloat(document.getElementById('shift-input-close').value || 0);
    const testingVal = parseFloat(document.getElementById('shift-input-testing').value || 0);
    const rateVal = parseFloat(document.getElementById('shift-input-rate').value || 0);

    const netLitres = Math.max(0, closeVal - openVal - testingVal);
    const totalAmount = netLitres * rateVal;

    document.getElementById('shift-input-net-litres').value = netLitres.toFixed(2);
    document.getElementById('shift-input-total-amount').value = totalAmount.toFixed(2);
  },

  async loadShiftsData() {
    const filterDate = document.getElementById('shift-filter-date').value || this.state.selectedDate;

    try {
      const res = await API.getShifts(filterDate);
      if (res.success && res.readings) {
        const tableBody = document.getElementById('shift-readings-table');
        tableBody.innerHTML = '';

        res.readings.forEach(r => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${r.reading_date}</td>
            <td><span class="badge badge-navy">${r.shift_name}</span></td>
            <td><strong>${r.nozzle_name}</strong></td>
            <td>${r.fuel_type}</td>
            <td>${r.opening_meter.toLocaleString()}</td>
            <td>${r.closing_meter.toLocaleString()}</td>
            <td>${r.testing_litres} L</td>
            <td><strong style="color: var(--iocl-navy);">${Number(r.net_litres || 0).toFixed(2)} L</strong></td>
            <td>₹${r.rate.toFixed(2)}</td>
            <td><strong style="color: var(--iocl-saffron);">₹${r.total_amount.toLocaleString('en-IN')}</strong></td>
            <td>${r.attendant_name || 'Staff'}</td>
          `;
          tableBody.appendChild(row);
        });

        // Render shift sales chart
        ChartsManager.renderShiftSalesChart(res.readings);
      }
    } catch (err) {
      console.error('Error loading shifts:', err);
    }
  },

  async handleLogShift(e) {
    e.preventDefault();
    const data = {
      reading_date: document.getElementById('shift-input-date').value,
      shift_name: document.getElementById('shift-input-name').value,
      nozzle_name: document.getElementById('shift-input-nozzle').value,
      fuel_type: document.getElementById('shift-input-fuel').value,
      opening_meter: parseFloat(document.getElementById('shift-input-open').value),
      closing_meter: parseFloat(document.getElementById('shift-input-close').value),
      testing_litres: parseFloat(document.getElementById('shift-input-testing').value || 0),
      rate: parseFloat(document.getElementById('shift-input-rate').value),
      attendant_id: document.getElementById('shift-input-attendant').value ? parseInt(document.getElementById('shift-input-attendant').value) : null
    };

    try {
      const res = await API.addShift(data);
      if (res.success) {
        this.showToast('Nozzle shift reading logged & tank stock updated!', 'success');
        this.closeModal('modal-log-shift');
        if (e.target && e.target.reset) e.target.reset();
        this.loadShiftsData();
        this.loadTanksData();
        this.loadDashboardData();
        this.loadDayEndReport();
      } else {
        this.showToast(res.message || 'Failed to log shift', 'danger');
      }
    } catch (err) {
      this.showToast('Failed to log shift reading', 'danger');
    }
  },

  // 5. PAYMENT RECONCILIATION
  async loadReconciliationData() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('recon-date').value = today;

    try {
      const [shiftsRes, reconRes] = await Promise.all([
        API.getShifts(today),
        API.getReconciliations()
      ]);

      if (shiftsRes.success && shiftsRes.readings) {
        const expectedTotal = shiftsRes.readings.reduce((acc, r) => acc + r.total_amount, 0);
        document.getElementById('recon-expected').value = expectedTotal.toFixed(2);
      }

      if (reconRes.success && reconRes.reconciliations) {
        const tableBody = document.getElementById('recon-history-table');
        tableBody.innerHTML = '';

        reconRes.reconciliations.forEach(r => {
          const actualTotal = r.cash_collected + r.digital_collected + r.udhar_amount;
          const isSurplus = r.difference_amount >= 0;

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${r.reconciliation_date} (${r.shift_name})</td>
            <td>₹${r.expected_amount.toLocaleString('en-IN')}</td>
            <td><strong>₹${actualTotal.toLocaleString('en-IN')}</strong></td>
            <td><span class="badge ${isSurplus ? 'badge-success' : 'badge-danger'}">
              ${isSurplus ? '+' : ''}₹${r.difference_amount.toFixed(2)}
            </span></td>
          `;
          tableBody.appendChild(row);
        });
      }

      this.calculateReconciliationDiff();

    } catch (err) {
      console.error('Error loading reconciliation:', err);
    }
  },

  calculateReconciliationDiff() {
    const expected = parseFloat(document.getElementById('recon-expected').value || 0);
    const cash = parseFloat(document.getElementById('recon-cash').value || 0);
    const digital = parseFloat(document.getElementById('recon-digital').value || 0);
    const udhar = parseFloat(document.getElementById('recon-udhar').value || 0);

    const actual = cash + digital + udhar;
    const diff = actual - expected;

    const displayEl = document.getElementById('recon-diff-display');
    if (diff === 0) {
      displayEl.style.color = 'var(--success)';
      displayEl.style.borderColor = 'var(--success)';
      displayEl.textContent = `₹0.00 (Perfectly Balanced)`;
    } else if (diff > 0) {
      displayEl.style.color = 'var(--info)';
      displayEl.style.borderColor = 'var(--info)';
      displayEl.textContent = `+₹${diff.toFixed(2)} (Cash Surplus)`;
    } else {
      displayEl.style.color = 'var(--danger)';
      displayEl.style.borderColor = 'var(--danger)';
      displayEl.textContent = `-₹${Math.abs(diff).toFixed(2)} (Cash Shortage)`;
    }
  },

  async saveCurrentReconciliation() {
    const data = {
      reconciliation_date: document.getElementById('recon-date').value,
      shift_name: document.getElementById('recon-shift').value,
      cash_collected: parseFloat(document.getElementById('recon-cash').value || 0),
      digital_collected: parseFloat(document.getElementById('recon-digital').value || 0),
      udhar_amount: parseFloat(document.getElementById('recon-udhar').value || 0),
      expected_amount: parseFloat(document.getElementById('recon-expected').value || 0),
      notes: document.getElementById('recon-notes').value
    };

    try {
      const res = await API.saveReconciliation(data);
      if (res.success) {
        this.showToast('Payment reconciliation saved successfully!', 'success');
        this.loadReconciliationData();
        this.loadDashboardData();
        this.loadDayEndReport();
      }
    } catch (err) {
      this.showToast('Failed to save reconciliation', 'danger');
    }
  },

  // 6. CUSTOMER UDHAR LEDGER
  async loadCustomers() {
    try {
      const res = await API.getCustomers();
      if (res.success && res.customers) {
        this.state.customers = res.customers;

        // Populate modal customer dropdown
        const select = document.getElementById('ctxn-input-customer');
        if (select) {
          select.innerHTML = '';
          res.customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.vehicle_number || 'No vehicle'}) - Due: ₹${c.current_balance}`;
            select.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  },

  async loadCustomersData() {
    await this.loadCustomers();
    this.renderCustomersTable(this.state.customers);
  },

  renderCustomersTable(customers) {
    const tableBody = document.getElementById('customers-table');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    customers.forEach(c => {
      const isOverLimit = c.current_balance > c.credit_limit;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '-'}</td>
        <td><span class="badge badge-navy">${c.vehicle_number || '-'}</span></td>
        <td>₹${c.credit_limit.toLocaleString('en-IN')}</td>
        <td><strong style="color: ${c.current_balance > 0 ? 'var(--danger)' : 'var(--success)'};">₹${c.current_balance.toLocaleString('en-IN')}</strong></td>
        <td><span class="badge ${isOverLimit ? 'badge-danger' : c.current_balance > 0 ? 'badge-warning' : 'badge-success'}">
          ${isOverLimit ? 'Credit Exceeded' : c.current_balance > 0 ? 'Payment Due' : 'Clear'}
        </span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="App.openCustomerLedgerModal(${c.id})">📜 History</button>
          <button class="btn btn-danger btn-sm" onclick="App.deleteCustomer(${c.id})">🗑️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  },

  filterCustomers() {
    const query = document.getElementById('customer-search-input').value.toLowerCase();
    const filtered = this.state.customers.filter(c => 
      c.name.toLowerCase().includes(query) || (c.vehicle_number && c.vehicle_number.toLowerCase().includes(query))
    );
    this.renderCustomersTable(filtered);
  },

  async openCustomerLedgerModal(customerId) {
    try {
      const res = await API.getCustomerTransactions(customerId);
      if (res.success) {
        const custNameEl = document.getElementById('ledger-customer-name');
        const custInfoEl = document.getElementById('ledger-customer-info');
        const tableBody = document.getElementById('ledger-transactions-table');

        if (custNameEl) custNameEl.textContent = res.customer.name;
        if (custInfoEl) custInfoEl.textContent = `Phone: ${res.customer.phone || '-'} | Vehicle: ${res.customer.vehicle_number || '-'} | Due Balance: ₹${Number(res.customer.current_balance || 0).toLocaleString('en-IN')}`;

        if (tableBody) {
          tableBody.innerHTML = '';
          if (res.transactions && res.transactions.length > 0) {
            res.transactions.forEach(t => {
              const row = document.createElement('tr');
              const isGiven = t.txn_type === 'GIVEN';
              row.innerHTML = `
                <td>${t.txn_date}</td>
                <td><span class="badge ${isGiven ? 'badge-danger' : 'badge-success'}">${isGiven ? 'Udhar Fuel Given' : 'Payment Received'}</span></td>
                <td>${t.fuel_type || '-'}</td>
                <td>${t.litres ? `${t.litres} L` : '-'}</td>
                <td>${t.bill_number || '-'}</td>
                <td><strong style="color: ${isGiven ? 'var(--danger)' : 'var(--success)'};">₹${Number(t.amount || 0).toLocaleString('en-IN')}</strong></td>
                <td>${t.notes || '-'}</td>
              `;
              tableBody.appendChild(row);
            });
          } else {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 16px;">No ledger transactions recorded yet.</td></tr>';
          }
        }
        this.openModal('modal-customer-ledger');
      }
    } catch (err) {
      console.error('Error loading customer ledger:', err);
      this.showToast('Failed to load customer transactions history', 'danger');
    }
  },

  async handleAddCustomer(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('cust-input-name').value,
      phone: document.getElementById('cust-input-phone').value,
      vehicle_number: document.getElementById('cust-input-vehicle').value,
      credit_limit: parseFloat(document.getElementById('cust-input-limit').value || 50000)
    };

    try {
      const res = await API.addCustomer(data);
      if (res.success) {
        this.showToast('Credit customer created successfully!', 'success');
        this.closeModal('modal-add-customer');
        if (e.target && e.target.reset) e.target.reset();
        this.loadCustomersData();
      }
    } catch (err) {
      this.showToast('Failed to add customer', 'danger');
    }
  },

  async handleCreditTxn(e) {
    e.preventDefault();
    const customerId = document.getElementById('ctxn-input-customer').value;
    const data = {
      txn_type: document.getElementById('ctxn-input-type').value,
      txn_date: document.getElementById('ctxn-input-date').value,
      fuel_type: document.getElementById('ctxn-input-fuel').value,
      litres: parseFloat(document.getElementById('ctxn-input-litres').value || 0),
      amount: parseFloat(document.getElementById('ctxn-input-amount').value),
      bill_number: document.getElementById('ctxn-input-bill').value,
      notes: document.getElementById('ctxn-input-notes').value
    };

    try {
      const res = await API.addCreditTransaction(customerId, data);
      if (res.success) {
        this.showToast(res.message, 'success');
        this.closeModal('modal-credit-txn');
        if (e.target && e.target.reset) e.target.reset();
        this.loadCustomersData();
        this.loadDashboardData();
        this.loadDayEndReport();
      }
    } catch (err) {
      this.showToast('Failed to record transaction', 'danger');
    }
  },

  async deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this credit customer account?')) return;
    try {
      const res = await API.deleteCustomer(id);
      if (res.success) {
        this.showToast('Customer deleted', 'info');
        this.loadCustomersData();
      }
    } catch (err) {
      this.showToast('Failed to delete customer', 'danger');
    }
  },

  // 7. DAILY EXPENSES
  async loadExpensesData() {
    try {
      const res = await API.getExpenses();
      if (res.success && res.expenses) {
        document.getElementById('expenses-total-badge').textContent = `Total: ₹${res.total_expense.toLocaleString('en-IN')}`;

        const tableBody = document.getElementById('expenses-table');
        tableBody.innerHTML = '';

        res.expenses.forEach(exp => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${exp.expense_date}</td>
            <td><span class="badge badge-navy">${exp.category}</span></td>
            <td>${exp.payment_method}</td>
            <td>${exp.description || '-'}</td>
            <td><strong style="color: var(--danger);">₹${exp.amount.toLocaleString('en-IN')}</strong></td>
            <td><button class="btn btn-danger btn-sm" onclick="App.deleteExpense(${exp.id})">🗑️</button></td>
          `;
          tableBody.appendChild(row);
        });
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  },

  async handleAddExpense(e) {
    e.preventDefault();
    const data = {
      expense_date: document.getElementById('exp-input-date').value,
      category: document.getElementById('exp-input-category').value,
      payment_method: document.getElementById('exp-input-method').value,
      amount: parseFloat(document.getElementById('exp-input-amount').value),
      description: document.getElementById('exp-input-desc').value
    };

    try {
      const res = await API.addExpense(data);
      if (res.success) {
        this.showToast('Expense recorded!', 'success');
        this.closeModal('modal-add-expense');
        if (e.target && e.target.reset) e.target.reset();
        this.loadExpensesData();
        this.loadDashboardData();
        this.loadDayEndReport();
      }
    } catch (err) {
      this.showToast('Failed to record expense', 'danger');
    }
  },

  async deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await API.deleteExpense(id);
      if (res.success) {
        this.showToast('Expense deleted', 'info');
        this.loadExpensesData();
      }
    } catch (err) {
      this.showToast('Failed to delete expense', 'danger');
    }
  },

  // 8. EMPLOYEE DIRECTORY
  async loadEmployeesData() {
    try {
      const res = await API.getEmployees();
      if (res.success && res.employees) {
        const tableBody = document.getElementById('employees-table');
        tableBody.innerHTML = '';

        res.employees.forEach(emp => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${emp.name}</strong></td>
            <td><span class="badge badge-navy">${emp.role}</span></td>
            <td>${emp.phone || '-'}</td>
            <td>${emp.assigned_shift} Shift</td>
            <td><span class="badge ${emp.status === 'Active' ? 'badge-success' : 'badge-warning'}">${emp.status}</span></td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="App.deleteEmployee(${emp.id})">🗑️ Delete</button>
            </td>
          `;
          tableBody.appendChild(row);
        });
      }
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  },

  async handleAddEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('emp-input-name').value.trim();
    const role = document.getElementById('emp-input-role').value;
    const phone = document.getElementById('emp-input-phone').value.trim();
    const assigned_shift = document.getElementById('emp-input-shift').value;
    const status = document.getElementById('emp-input-status').value;

    if (!name) {
      this.showToast('Please enter employee name', 'danger');
      return;
    }

    const data = { name, role, phone, assigned_shift, status };

    try {
      const res = await API.addEmployee(data);
      if (res && res.success) {
        this.showToast('Employee added to directory!', 'success');
        this.closeModal('modal-add-employee');
        e.target.reset();
        this.loadEmployeesData();
        this.loadEmployees();
      } else {
        this.showToast((res && res.message) || 'Failed to add employee', 'danger');
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      const errMsg = err.message === 'Failed to fetch'
        ? 'Failed to connect to backend API server. Make sure node server is running on port 5000.'
        : (err.message || 'Failed to add employee');
      this.showToast(errMsg, 'danger');
    }
  },

  async deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const res = await API.deleteEmployee(id);
      if (res.success) {
        this.showToast('Employee removed', 'info');
        this.loadEmployeesData();
      }
    } catch (err) {
      this.showToast('Failed to delete employee', 'danger');
    }
  },

  // 9. DAY-END SETTLEMENT REPORT
  async loadDayEndReport() {
    const date = document.getElementById('report-date-picker').value || this.state.selectedDate;
    document.getElementById('report-sheet-date').textContent = `DAILY SETTLEMENT SUMMARY SHEET - ${date}`;

    try {
      const res = await API.getDailyReport(date);
      if (res.success) {
        const s = res.summary;
        document.getElementById('report-gross-sales').textContent = `₹${s.total_gross_sales.toLocaleString('en-IN')}`;
        document.getElementById('report-total-litres').textContent = `${s.total_litres_sold.toFixed(1)} L`;
        document.getElementById('report-expenses').textContent = `₹${s.total_expenses.toLocaleString('en-IN')}`;
        document.getElementById('report-net-cash').textContent = `₹${s.net_cash_in_drawer.toLocaleString('en-IN')}`;

        // Fuel Breakdown Table
        const fuelBody = document.getElementById('report-fuel-breakdown');
        fuelBody.innerHTML = '';
        res.fuel_breakdown.forEach(f => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${f.fuel_type}</strong></td>
            <td>₹${f.rate.toFixed(2)}</td>
            <td>${f.litres.toFixed(1)} L</td>
            <td><strong>₹${f.amount.toLocaleString('en-IN')}</strong></td>
          `;
          fuelBody.appendChild(row);
        });

        // Nozzles Readings Table
        const nozzleBody = document.getElementById('report-nozzles-body');
        nozzleBody.innerHTML = '';
        if (res.shift_readings.length === 0) {
          nozzleBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 16px;">No nozzle readings recorded for this shift</td></tr>`;
        } else {
          res.shift_readings.forEach(sr => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${sr.nozzle_name}</td>
              <td>${sr.fuel_type}</td>
              <td>${sr.opening_meter}</td>
              <td>${sr.closing_meter}</td>
              <td>${sr.testing_litres} L</td>
              <td><strong>${sr.net_litres.toFixed(1)} L</strong></td>
              <td style="text-align: right;"><strong>₹${sr.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            `;
            nozzleBody.appendChild(row);
          });
        }

        // Udhar & Expenses Table
        const creditBody = document.getElementById('report-credit-body');
        creditBody.innerHTML = '';
        if (res.credit_transactions.length === 0) {
          creditBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">No credit transactions recorded for this shift</td></tr>`;
        } else {
          res.credit_transactions.forEach(ct => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${ct.customer_name} ${ct.vehicle_number ? '(' + ct.vehicle_number + ')' : ''}</td>
              <td style="text-align: center;"><span class="badge ${ct.txn_type === 'GIVEN' ? 'badge-danger' : 'badge-success'}">${ct.txn_type}</span></td>
              <td style="text-align: right;">₹${ct.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            creditBody.appendChild(row);
          });
        }

        const expBody = document.getElementById('report-expenses-body');
        expBody.innerHTML = '';
        if (res.expenses.length === 0) {
          expBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">No station expenses recorded for this shift</td></tr>`;
        } else {
          res.expenses.forEach(e => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${e.category}</td>
              <td>${e.description || '-'}</td>
              <td style="text-align: right;">₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            expBody.appendChild(row);
          });
        }
      }
    } catch (err) {
      console.error('Error loading report:', err);
    }
  },

  exportReportCSV() {
    const date = document.getElementById('report-date-picker').value || this.state.selectedDate;
    API.getDailyReport(date).then(res => {
      if (!res.success) return;
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `PATRIKAR PETROLEUM POINT - DAY END SETTLEMENT (${date})\n\n`;
      csvContent += `Gross Fuel Revenue,₹${res.summary.total_gross_sales}\n`;
      csvContent += `Total Litres Sold,${res.summary.total_litres_sold} L\n`;
      csvContent += `Total Station Expenses,₹${res.summary.total_expenses}\n`;
      csvContent += `Net Cash in Drawer,₹${res.summary.net_cash_in_drawer}\n\n`;
      
      csvContent += "FUEL BREAKDOWN\nFuel Type,Rate,Litres Sold,Amount\n";
      res.fuel_breakdown.forEach(f => {
        csvContent += `"${f.fuel_type}",${f.rate},${f.litres},${f.amount}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Patrikar_Petroleum_Report_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  },

  logout() {
    localStorage.removeItem('iocl_admin_session');
    this.state.user = null;
    
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const alertBox = document.getElementById('login-alert');
    const passInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('btn-toggle-pass');

    if (passInput) passInput.value = '';
    if (alertBox) alertBox.style.display = 'none';
    if (toggleBtn && passInput) {
      passInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }

    if (appContainer) appContainer.style.display = 'none';
    if (loginContainer) {
      loginContainer.style.display = 'flex';
      setTimeout(() => loginContainer.classList.remove('hidden'), 50);
    }

    this.showToast('Logged out of Patrikar Petroleum Admin Portal', 'info');
  }
};

// Initialize app when DOM loaded
document.addEventListener('DOMContentLoaded', () => App.init());

