/* ==================================================================
   ACCOUNTS.JS — Multi-user "Add Account" modal
   - List all accounts (stored in localStorage)
   - Switch between accounts
   - Add new account
   Exposes: window.Accounts
================================================================== */

window.Accounts = (function () {

    const STORAGE_KEY = 'reverb_accounts';
    const ACTIVE_KEY = 'reverb_active_account';

    let modal, closeBtn, cancelBtn, saveBtn, listEl, nameInput, emailInput;

    /* ---------- Load accounts ---------- */
    function loadAccounts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        /* Default: one account */
        return [
            { id: '1', name: 'Alex Carter', email: 'alex@reverb.fm' }
        ];
    }

    function saveAccounts(accounts) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        } catch (e) {}
    }

    function getActiveId() {
        return localStorage.getItem(ACTIVE_KEY) || '1';
    }

    function setActiveId(id) {
        localStorage.setItem(ACTIVE_KEY, id);
    }

    /* ---------- Render list ---------- */
    function renderList() {
        if (!listEl) return;
        const accounts = loadAccounts();
        const activeId = getActiveId();

        listEl.innerHTML = accounts.map(acc => {
            const initial = (acc.name || 'A').trim().charAt(0).toUpperCase() || 'A';
            const activeClass = acc.id === activeId ? 'active' : '';
            return `
                <div class="account-item ${activeClass}" data-account-id="${acc.id}">
                    <div class="account-item-avatar">${initial}</div>
                    <div class="account-item-info">
                        <span class="account-item-name">${acc.name}</span>
                        <span class="account-item-email">${acc.email}</span>
                    </div>
                    <i class="fas fa-circle-check account-item-check"></i>
                </div>
            `;
        }).join('');

        /* Click to switch */
        listEl.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-account-id');
                switchToAccount(id);
            });
        });
    }

    /* ---------- Switch account ---------- */
    function switchToAccount(id) {
        const accounts = loadAccounts();
        const acc = accounts.find(a => a.id === id);
        if (!acc) return;

        setActiveId(id);

        /* Update profile */
        if (window.ProfileEdit) {
            window.ProfileEdit.set({
                name: acc.name,
                email: acc.email,
                avatar: acc.avatar || ''
            });
        }

        renderList();

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast(`Switched to ${acc.name}`);
        }

        /* Close after short delay */
        setTimeout(closeModal, 500);
    }

    /* ---------- Add new account ---------- */
    function addNewAccount() {
        const name = (nameInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();

        if (!name) {
            if (window.BottomNav && window.BottomNav.showToast) {
                window.BottomNav.showToast('Please enter a name');
            }
            nameInput?.focus();
            return;
        }

        const accounts = loadAccounts();
        const newId = String(Date.now());
        accounts.push({ id: newId, name, email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@reverb.fm` });
        saveAccounts(accounts);

        /* Clear inputs */
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';

        renderList();

        if (window.BottomNav && window.BottomNav.showToast) {
            window.BottomNav.showToast(`Added ${name}`);
        }

        /* Auto switch to new account */
        setTimeout(() => switchToAccount(newId), 400);
    }

    /* ---------- Modal controls ---------- */
    function openModal() {
        renderList();
        if (modal) modal.classList.add('active');
        setTimeout(() => nameInput?.focus(), 200);
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
    }

    /* ---------- Init ---------- */
    function init() {
        modal = document.getElementById('add-account-modal');
        closeBtn = document.getElementById('add-account-close');
        cancelBtn = document.getElementById('add-account-cancel');
        saveBtn = document.getElementById('add-account-save');
        listEl = document.getElementById('account-list');
        nameInput = document.getElementById('new-account-name');
        emailInput = document.getElementById('new-account-email');

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (saveBtn) saveBtn.addEventListener('click', addNewAccount);

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        /* Enter key on inputs */
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); emailInput?.focus(); }
            });
        }
        if (emailInput) {
            emailInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); addNewAccount(); }
            });
        }

        console.log('[Accounts] Loaded.');
    }

    return { init, open: openModal, close: closeModal };
})();