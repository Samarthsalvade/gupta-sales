var STORAGE_KEY = 'gsc_admin_key';
var form = document.getElementById('adminLoginForm');
var keyInput = document.getElementById('adminKeyInput');
var msg = document.getElementById('adminMsg');
var resultsBox = document.getElementById('adminResults');
var tableBody = document.getElementById('adminTableBody');
var countLabel = document.getElementById('adminCount');
var lastSubscribers = [];

var settingsCard = document.getElementById('settingsCard');
var settingsForm = document.getElementById('settingsForm');
var notifyEmailInput = document.getElementById('notifyEmailInput');
var settingsMsg = document.getElementById('settingsMsg');

var savedKey = sessionStorage.getItem(STORAGE_KEY);
if (savedKey) {
    keyInput.value = savedKey;
    loadSubscribers(savedKey);
    loadSettings(savedKey);
}

form.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = keyInput.value.trim();
    loadSubscribers(key);
    loadSettings(key);
});

settingsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = keyInput.value.trim();
    var email = notifyEmailInput.value.trim();
    settingsMsg.textContent = 'Saving...';
    settingsMsg.style.color = 'var(--slate)';

    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({ email: email })
    })
        .then(function (r) {
            if (!r.ok) throw new Error('failed');
            return r.json();
        })
        .then(function () {
            settingsMsg.textContent = 'Saved. Enquiries will now be sent to ' + email + '.';
            settingsMsg.style.color = '#1a7f37';
        })
        .catch(function () {
            settingsMsg.textContent = 'Could not save. Check your admin key and try again.';
            settingsMsg.style.color = '#d92d20';
        });
});

function loadSettings(key) {
    if (!key) return;
    fetch('/api/settings', {
        headers: { 'X-Admin-Key': key }
    })
        .then(function (r) {
            if (!r.ok) throw new Error('failed');
            return r.json();
        })
        .then(function (data) {
            notifyEmailInput.value = data.email || '';
            settingsCard.style.display = 'block';
        })
        .catch(function () {
            settingsCard.style.display = 'none';
        });
}

document.getElementById('refreshBtn').addEventListener('click', function () {
    loadSubscribers(keyInput.value.trim());
});

document.getElementById('downloadBtn').addEventListener('click', function () {
    if (!lastSubscribers.length) return;
    var rows = [['Phone Number', 'Submitted From', 'Date & Time']];
    lastSubscribers.forEach(function (s) {
        rows.push([s.phone, s.source || '', new Date(s.created_at).toLocaleString()]);
    });
    var csv = rows.map(function (r) {
        return r.map(function (cell) {
            var value = String(cell).replace(/"/g, '""');
            return '"' + value + '"';
        }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gsc-subscribers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function loadSubscribers(key) {
    if (!key) return;
    msg.textContent = 'Loading...';
    msg.style.color = 'var(--slate)';
    resultsBox.style.display = 'none';

    fetch('/api/subscribers', {
        headers: { 'X-Admin-Key': key }
    })
        .then(function (r) {
            if (r.status === 401) throw new Error('unauthorized');
            if (!r.ok) throw new Error('failed');
            return r.json();
        })
        .then(function (data) {
            sessionStorage.setItem(STORAGE_KEY, key);
            lastSubscribers = data.subscribers || [];
            renderTable(lastSubscribers);
            msg.textContent = '';
            resultsBox.style.display = 'block';
        })
        .catch(function (err) {
            sessionStorage.removeItem(STORAGE_KEY);
            if (err.message === 'unauthorized') {
                msg.textContent = 'Incorrect admin key.';
            } else {
                msg.textContent = 'Could not load subscribers. Is the database configured?';
            }
            msg.style.color = '#d92d20';
        });
}

function renderTable(subscribers) {
    countLabel.textContent = subscribers.length + ' phone number' + (subscribers.length === 1 ? '' : 's') + ' collected';
    tableBody.innerHTML = '';
    subscribers.forEach(function (s, i) {
        var tr = document.createElement('tr');
        var date = new Date(s.created_at);
        tr.innerHTML =
            '<td>' + (i + 1) + '</td>' +
            '<td>' + escapeHtml(s.phone) + '</td>' +
            '<td>' + escapeHtml(s.source || '—') + '</td>' +
            '<td>' + date.toLocaleString() + '</td>';
        tableBody.appendChild(tr);
    });
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
