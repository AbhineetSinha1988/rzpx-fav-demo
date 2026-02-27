/* ═══════════════════════════════════════════════════════════════
   LendBridge — RazorpayX FAV Demo  |  app.js
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {
  // ─── State ─────────────────────────────────────────────────
  let currentStep = 0;
  let isDemoMode  = true;
  let activeTab   = 'upi';

  const applicant = {
    name: '', email: '', phone: '', loanAmount: 0,
  };
  let bankData = null;

  // ─── Screen IDs in order ────────────────────────────────────
  const SCREENS = [
    'screen-welcome',
    'screen-details',
    'screen-verify',
    'screen-confirm',
    'screen-success',
  ];

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    try {
      const res  = await fetch('/api/config');
      const cfg  = await res.json();
      isDemoMode = cfg.demo;
    } catch {
      isDemoMode = true;
    }

    if (isDemoMode) {
      document.getElementById('demo-pill').classList.remove('hidden');
    }

    bindForms();
    showScreen(0);
  }

  // ─── Navigation ─────────────────────────────────────────────
  function goTo(step) {
    currentStep = step;
    showScreen(step);
    updateProgress(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showScreen(step) {
    SCREENS.forEach((id, i) => {
      const el = document.getElementById(id);
      el.classList.toggle('active', i === step);
    });

    const progressWrap = document.getElementById('progress-wrap');
    progressWrap.classList.toggle('hidden', step === 0 || step === 4);
  }

  function updateProgress(step) {
    // steps: 1 = details, 2 = verify, 3 = confirm
    const circles = [
      document.querySelector('#ps-1 .ps-circle'),
      document.querySelector('#ps-2 .ps-circle'),
      document.querySelector('#ps-3 .ps-circle'),
    ];
    const labels = [
      document.querySelector('#ps-1 .ps-label'),
      document.querySelector('#ps-2 .ps-label'),
      document.querySelector('#ps-3 .ps-label'),
    ];
    const lines = [
      document.getElementById('pl-1'),
      document.getElementById('pl-2'),
    ];

    circles.forEach((c, i) => {
      c.classList.remove('active', 'done');
      labels[i].classList.remove('active', 'done');
    });
    lines.forEach(l => l.classList.remove('done'));

    // step 1 = "details", maps to progress index 0
    const pi = step - 1; // 0-based progress index
    for (let i = 0; i < 3; i++) {
      if (i < pi) {
        circles[i].classList.add('done');
        labels[i].classList.add('done');
      } else if (i === pi) {
        circles[i].classList.add('active');
        labels[i].classList.add('active');
      }
    }
    for (let i = 0; i < 2; i++) {
      if (i < pi - 1) lines[i].classList.add('done');
    }
  }

  // ─── Tab switching ───────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.verify-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('tab-upi').classList.toggle('active',   tab === 'upi');
    document.getElementById('tab-phone').classList.toggle('active', tab === 'phone');

    // Clear errors
    ['err-upi', 'err-vpa-phone'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
    hideVerifyError();
  }

  // ─── Form binding ────────────────────────────────────────────
  function bindForms() {
    document.getElementById('form-details').addEventListener('submit', onDetailsSubmit);
    document.getElementById('form-verify').addEventListener('submit',  onVerifySubmit);
  }

  // ─── Step 1 — Details validation ─────────────────────────────
  function onDetailsSubmit(e) {
    e.preventDefault();
    let valid = true;

    const name  = document.getElementById('inp-name').value.trim();
    const email = document.getElementById('inp-email').value.trim();
    const phone = document.getElementById('inp-phone').value.trim();
    const loan  = document.getElementById('inp-loan').value.trim();

    clearFieldError('inp-name',  'err-name');
    clearFieldError('inp-email', 'err-email');
    clearFieldError('inp-phone', 'err-phone');
    clearFieldError('inp-loan',  'err-loan');

    if (!name || name.length < 2) {
      setFieldError('inp-name', 'err-name', 'Please enter your full name'); valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('inp-email', 'err-email', 'Enter a valid email address'); valid = false;
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      setFieldError('inp-phone', 'err-phone', 'Enter a valid 10-digit mobile number'); valid = false;
    }
    const loanNum = parseInt(loan);
    if (!loan || isNaN(loanNum) || loanNum < 50000 || loanNum > 5000000) {
      setFieldError('inp-loan', 'err-loan', 'Enter an amount between ₹50,000 and ₹50,00,000'); valid = false;
    }

    if (!valid) return;

    applicant.name       = name;
    applicant.email      = email;
    applicant.phone      = phone;
    applicant.loanAmount = loanNum;

    goTo(2);
  }

  // ─── Step 2 — Bank verification ──────────────────────────────
  async function onVerifySubmit(e) {
    e.preventDefault();

    let value;
    if (activeTab === 'upi') {
      value = document.getElementById('inp-upi').value.trim();
      clearFieldError('inp-upi', 'err-upi');
      if (!value || !isValidUPI(value)) {
        setFieldError('inp-upi', 'err-upi', 'Enter a valid UPI ID (e.g. name@okhdfcbank)');
        return;
      }
    } else {
      value = document.getElementById('inp-vpa-phone').value.trim();
      clearFieldError('inp-vpa-phone', 'err-vpa-phone');
      if (!value || !/^\d{10}$/.test(value)) {
        setFieldError('inp-vpa-phone', 'err-vpa-phone', 'Enter a valid 10-digit mobile number');
        return;
      }
    }

    hideVerifyError();
    setLoadingState(true);

    try {
      const res  = await fetch('/api/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:  activeTab,
          value: value,
          name:  applicant.name,
          email: applicant.email,
          phone: applicant.phone,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Validation failed — please try again.');
      }

      bankData = json.data;
      renderBankDetails(bankData, json.demo);
      goTo(3);

    } catch (err) {
      showVerifyError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }

  // ─── UPI format validator ─────────────────────────────────────
  function isValidUPI(vpa) {
    // Must contain exactly one @, both sides non-empty
    return /^[a-zA-Z0-9._\-+]+@[a-zA-Z0-9]+$/.test(vpa);
  }

  // ─── Render bank details on screen 3 ─────────────────────────
  function renderBankDetails(data, demo) {
    // Bank avatar + color
    const avatar = document.getElementById('bank-avatar');
    const initials = (data.bankName || 'BK')
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('');
    avatar.textContent = initials;
    avatar.style.background = data.bankColor || '#1D4ED8';

    setText('bank-name-display',  data.bankName || '—');
    setText('bank-branch-display', data.branchName || data.vpa.split('@')[1]?.toUpperCase() || '—');
    setText('detail-name',   data.registeredName || applicant.name || '—');
    setText('detail-vpa',    data.vpa || '—');
    setText('detail-fa-id',  data.fundAccountId  || '—');
    setText('detail-fav-id', data.validationId   || '—');

    // Account number + IFSC (available in demo; live API doesn't expose raw numbers for VPA)
    const rowAccount = document.getElementById('row-account');
    const rowIfsc    = document.getElementById('row-ifsc');
    if (data.accountNumber) {
      setText('detail-account', data.accountNumber);
      rowAccount.classList.remove('hidden');
    } else {
      rowAccount.classList.add('hidden');
    }
    if (data.ifscCode) {
      setText('detail-ifsc', data.ifscCode);
      rowIfsc.classList.remove('hidden');
    } else {
      rowIfsc.classList.add('hidden');
    }

    // Demo note
    const demoNote = document.getElementById('demo-note');
    demoNote.classList.toggle('hidden', !demo);
  }

  // ─── Populate success screen ──────────────────────────────────
  function populateSuccess() {
    const appId = 'LB-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    setText('success-app-id', appId);
    setText('success-name',   applicant.name || '—');
    setText('success-bank',   bankData ? `${bankData.bankName} (Verified)` : '—');
    setText('success-loan',   applicant.loanAmount ? `₹${Number(applicant.loanAmount).toLocaleString('en-IN')}` : '—');
  }

  // ─── Loading state ────────────────────────────────────────────
  function setLoadingState(loading) {
    const loadingEl = document.getElementById('verify-loading');
    const btnEl     = document.getElementById('btn-verify');
    const formEl    = document.getElementById('form-verify');

    loadingEl.classList.toggle('hidden', !loading);
    btnEl.disabled = loading;

    // Disable inputs while loading
    formEl.querySelectorAll('input, button').forEach(el => {
      if (el !== btnEl) el.disabled = loading;
    });
  }

  function showVerifyError(msg) {
    const errEl = document.getElementById('verify-error');
    document.getElementById('verify-error-msg').textContent = msg;
    errEl.classList.remove('hidden');
  }
  function hideVerifyError() {
    document.getElementById('verify-error').classList.add('hidden');
  }

  // ─── Field helpers ─────────────────────────────────────────────
  function setFieldError(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.add('is-invalid');
    const err = document.getElementById(errId);
    if (err) err.textContent = msg;
  }
  function clearFieldError(inputId, errId) {
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.remove('is-invalid');
    const err = document.getElementById(errId);
    if (err) err.textContent = '';
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ─── Reset ────────────────────────────────────────────────────
  function reset() {
    applicant.name = applicant.email = applicant.phone = '';
    applicant.loanAmount = 0;
    bankData   = null;
    activeTab  = 'upi';

    document.getElementById('inp-name').value  = '';
    document.getElementById('inp-email').value = '';
    document.getElementById('inp-phone').value = '';
    document.getElementById('inp-loan').value  = '';
    document.getElementById('inp-upi').value   = '';
    document.getElementById('inp-vpa-phone').value = '';

    hideVerifyError();
    switchTab('upi');
    goTo(0);
  }

  // ─── Override goTo to handle success population ───────────────
  const _goTo = goTo;
  function goToPublic(step) {
    if (step === 4) populateSuccess();
    _goTo(step);
  }

  // ─── Bootstrap ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  return { goTo: goToPublic, switchTab, reset };
})();
