/* ═══════════════════════════════════════════════════════════════
   LendBridge — RazorpayX FAV Demo  |  app.js
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {
  // ─── State ─────────────────────────────────────────────────
  let currentStep  = 0;
  let isDemoMode   = true;
  let verifyMode   = 'upi';   // 'upi' | 'rpd'
  let rpdFavId     = null;
  let rpdPollTimer = null;

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

    circles.forEach((c, i) => { c.classList.remove('active', 'done'); labels[i].classList.remove('active', 'done'); });
    lines.forEach(l => l.classList.remove('done'));

    const pi = step - 1;
    for (let i = 0; i < 3; i++) {
      if (i < pi)       { circles[i].classList.add('done');   labels[i].classList.add('done'); }
      else if (i === pi){ circles[i].classList.add('active'); labels[i].classList.add('active'); }
    }
    for (let i = 0; i < 2; i++) {
      if (i < pi - 1) lines[i].classList.add('done');
    }
  }

  // ─── Verification mode switching ─────────────────────────────
  function switchMode(mode) {
    verifyMode = mode;
    document.querySelectorAll('.verify-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.getElementById('panel-upi').classList.toggle('active', mode === 'upi');
    document.getElementById('panel-rpd').classList.toggle('active', mode === 'rpd');

    clearFieldError('inp-upi', 'err-upi');
    hideVerifyError();
    hideRPDError();
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

  // ─── Step 2 — UPI ID verification ────────────────────────────
  async function onVerifySubmit(e) {
    e.preventDefault();

    const value = document.getElementById('inp-upi').value.trim();
    clearFieldError('inp-upi', 'err-upi');
    if (!value || !isValidUPI(value)) {
      setFieldError('inp-upi', 'err-upi', 'Enter a valid UPI ID (e.g. name@okhdfcbank)');
      return;
    }

    hideVerifyError();
    setLoadingState(true);

    try {
      const res  = await fetch('/api/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:  'upi',
          value: value,
          name:  applicant.name,
          email: applicant.email,
          phone: applicant.phone,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Validation failed — please try again.');

      bankData = json.data;
      renderBankDetails(bankData, json.demo);
      goTo(3);

    } catch (err) {
      showVerifyError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }

  // ─── Step 2 — Reverse Penny Drop: initiate ───────────────────
  async function startRPD() {
    const btn = document.getElementById('btn-start-rpd');
    btn.disabled = true;
    btn.textContent = 'Starting…';

    try {
      const res  = await fetch('/api/validate-rpd', { method: 'POST' });
      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to start verification.');

      rpdFavId = json.favId;

      // Transition to payment UI
      document.getElementById('rpd-intro').classList.add('hidden');
      document.getElementById('rpd-pay').classList.remove('hidden');

      if (json.demo) {
        // Demo mode: auto-complete after 3 seconds with mock data
        rpdPollTimer = setTimeout(() => {
          bankData = {
            vpa:            'demo@okhdfcbank',
            bankName:       'HDFC Bank',
            bankColor:      '#004C8F',
            registeredName: applicant.name || 'Rahul Kumar',
            accountNumber:  '50XXXXXX6789',
            accountType:    'SAVINGS',
            ifscCode:       'HDFC0001234',
            accountStatus:  'active',
            accountVerified: true,
            validationId:   rpdFavId,
            utr:            null,
          };
          renderBankDetails(bankData, true);
          goTo(3);
        }, 3000);
        return;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile && json.intentUrl) {
        // Mobile: show app deep-link buttons
        document.getElementById('rpd-qr-wrap').classList.add('hidden');
        document.getElementById('rpd-apps-wrap').classList.remove('hidden');
        if (json.phonepeUrl) document.getElementById('rpd-btn-phonepe').href = json.phonepeUrl;
        if (json.gpayUrl)    document.getElementById('rpd-btn-gpay').href    = json.gpayUrl;
        if (json.paytmUrl)   document.getElementById('rpd-btn-paytm').href   = json.paytmUrl;
        if (json.bhimUrl)    document.getElementById('rpd-btn-bhim').href    = json.bhimUrl;
        if (json.intentUrl)  document.getElementById('rpd-btn-any').href     = json.intentUrl;
      } else if (json.qrCode) {
        // Desktop: show QR code
        document.getElementById('rpd-qr-wrap').classList.remove('hidden');
        document.getElementById('rpd-apps-wrap').classList.add('hidden');
        document.getElementById('rpd-qr-img').src = 'data:image/png;base64,' + json.qrCode;
      }

      // Start polling regardless of QR vs app buttons
      pollRPD(rpdFavId);

    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = 'Start Verification <svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>';
      showRPDError(err.message || 'Failed to start. Please try again.');
    }
  }

  // ─── Step 2 — Reverse Penny Drop: poll ───────────────────────
  function pollRPD(favId) {
    rpdPollTimer = setInterval(async () => {
      try {
        const res  = await fetch(`/api/validate-rpd/${favId}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || 'Poll failed');

        if (json.status === 'completed' && json.data) {
          clearInterval(rpdPollTimer);
          bankData = json.data;
          renderBankDetails(bankData, json.demo);
          goTo(3);
        } else if (json.status === 'failed') {
          clearInterval(rpdPollTimer);
          showRPDError('Verification failed. Please try again.');
        }
        // else: still pending — keep polling
      } catch (err) {
        clearInterval(rpdPollTimer);
        showRPDError(err.message || 'Connection error. Please try again.');
      }
    }, 3000);
  }

  // ─── Step 2 — Reverse Penny Drop: cancel ─────────────────────
  function cancelRPD() {
    clearInterval(rpdPollTimer);
    clearTimeout(rpdPollTimer);
    rpdFavId     = null;
    rpdPollTimer = null;

    document.getElementById('rpd-intro').classList.remove('hidden');
    document.getElementById('rpd-pay').classList.add('hidden');
    document.getElementById('rpd-qr-wrap').classList.remove('hidden');
    document.getElementById('rpd-apps-wrap').classList.add('hidden');
    hideRPDError();

    const btn = document.getElementById('btn-start-rpd');
    btn.disabled = false;
    btn.innerHTML = 'Start Verification <svg viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>';
  }

  // ─── UPI format validator ─────────────────────────────────────
  function isValidUPI(vpa) {
    return /^[a-zA-Z0-9._\-+]+@[a-zA-Z0-9]+$/.test(vpa);
  }

  // ─── Render bank details on screen 3 ─────────────────────────
  function renderBankDetails(data, demo) {
    const avatar   = document.getElementById('bank-avatar');
    const initials = (data.bankName || 'BK').split(' ').slice(0, 2).map(w => w[0]).join('');
    avatar.textContent       = initials;
    avatar.style.background  = data.bankColor || '#1D4ED8';

    setText('bank-name-display',  data.bankName || '—');
    setText('bank-branch-display', data.branchName || (data.vpa ? data.vpa.split('@')[1]?.toUpperCase() : null) || '—');
    setText('detail-name',   data.registeredName || applicant.name || '—');
    setText('detail-vpa',    data.vpa || '—');
    setText('detail-fa-id',  data.fundAccountId  || '—');
    setText('detail-fav-id', data.validationId   || '—');

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

    document.getElementById('demo-note').classList.toggle('hidden', !demo);
  }

  // ─── Populate success screen ──────────────────────────────────
  function populateSuccess() {
    const appId = 'LB-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    setText('success-app-id', appId);
    setText('success-name',   applicant.name || '—');
    setText('success-bank',   bankData ? `${bankData.bankName} (Verified)` : '—');
    setText('success-loan',   applicant.loanAmount ? `₹${Number(applicant.loanAmount).toLocaleString('en-IN')}` : '—');
  }

  // ─── Loading state (UPI panel) ────────────────────────────────
  function setLoadingState(loading) {
    const loadingEl = document.getElementById('verify-loading');
    const btnEl     = document.getElementById('btn-verify');
    const formEl    = document.getElementById('form-verify');
    loadingEl.classList.toggle('hidden', !loading);
    btnEl.disabled = loading;
    formEl.querySelectorAll('input, button').forEach(el => { if (el !== btnEl) el.disabled = loading; });
  }

  function showVerifyError(msg) {
    document.getElementById('verify-error-msg').textContent = msg;
    document.getElementById('verify-error').classList.remove('hidden');
  }
  function hideVerifyError() {
    document.getElementById('verify-error').classList.add('hidden');
  }
  function showRPDError(msg) {
    document.getElementById('rpd-error-msg').textContent = msg;
    document.getElementById('rpd-error').classList.remove('hidden');
  }
  function hideRPDError() {
    document.getElementById('rpd-error').classList.add('hidden');
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
    bankData = null;

    document.getElementById('inp-name').value  = '';
    document.getElementById('inp-email').value = '';
    document.getElementById('inp-phone').value = '';
    document.getElementById('inp-loan').value  = '';
    document.getElementById('inp-upi').value   = '';

    cancelRPD();
    hideVerifyError();
    switchMode('upi');
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

  return { goTo: goToPublic, switchMode, reset, startRPD, cancelRPD };
})();
