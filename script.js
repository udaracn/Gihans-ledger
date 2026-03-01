document.addEventListener('DOMContentLoaded', () => {
    const tradeForm = document.getElementById('trade-form');
    const tradeBody = document.getElementById('trade-body');
    const dailyPnlUsd = document.getElementById('daily-pnl-usd');
    const dailyPnlPct = document.getElementById('daily-pnl-pct');
    const totalPnlUsd = document.getElementById('total-pnl-usd');
    const totalPnlPct = document.getElementById('total-pnl-pct');
    const currentDateDisplay = document.getElementById('current-date');
    const exportBtn = document.getElementById('export-csv');
    const importInput = document.getElementById('import-csv');
    const clearBtn = document.getElementById('clear-data');

    let trades = JSON.parse(localStorage.getItem('trades')) || [];

    // Set current date in display
    const updateDateDisplay = () => {
        const now = new Date();
        currentDateDisplay.textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };
    updateDateDisplay();
    setInterval(updateDateDisplay, 60000);

    // Set default date in form
    document.getElementById('date').valueAsDate = new Date();

    const saveTrades = () => {
        localStorage.setItem('trades', JSON.stringify(trades));
        renderTrades();
        updateDashboard();
    };

    const calculatePnlPct = (pnl, size) => {
        if (!size || size === 0) return 0;
        return (pnl / size) * 100;
    };

    const updateDashboard = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset * 60 * 1000));
        const todayStr = localNow.toISOString().split('T')[0];

        let totalUsd = 0;
        let totalSize = 0;
        let dailyUsd = 0;
        let dailySize = 0;

        trades.forEach(trade => {
            const pnl = parseFloat(trade.pnlUsd);
            const size = parseFloat(trade.tradeSize);

            totalUsd += pnl;
            totalSize += size;

            if (trade.date === todayStr) {
                dailyUsd += pnl;
                dailySize += size;
            }
        });

        const totalPct = totalSize > 0 ? (totalUsd / totalSize) * 100 : 0;
        const dailyPct = dailySize > 0 ? (dailyUsd / dailySize) * 100 : 0;

        dailyPnlUsd.textContent = `$${dailyUsd.toFixed(2)}`;
        dailyPnlUsd.className = dailyUsd >= 0 ? 'pnl-positive' : 'pnl-negative';
        dailyPnlPct.textContent = `${dailyPct.toFixed(2)}%`;
        dailyPnlPct.className = dailyPct >= 0 ? 'pnl-positive' : 'pnl-negative';

        totalPnlUsd.textContent = `$${totalUsd.toFixed(2)}`;
        totalPnlUsd.className = totalUsd >= 0 ? 'pnl-positive' : 'pnl-negative';
        totalPnlPct.textContent = `${totalPct.toFixed(2)}%`;
        totalPnlPct.className = totalPct >= 0 ? 'pnl-positive' : 'pnl-negative';
    };

    const renderTrades = () => {
        tradeBody.innerHTML = '';
        // Sort trades by date and time descending
        const sortedTrades = [...trades].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB - dateA;
        });

        sortedTrades.forEach((trade, index) => {
            const row = document.createElement('tr');
            const pnlPct = calculatePnlPct(trade.pnlUsd, trade.tradeSize);
            const status = trade.pnlUsd >= 0 ? 'Profit' : 'Loss';
            const statusClass = trade.pnlUsd >= 0 ? 'pnl-positive' : 'pnl-negative';

            const createCell = (text, className = '') => {
                const td = document.createElement('td');
                td.textContent = text;
                if (className) td.className = className;
                return td;
            };

            row.appendChild(createCell(trade.date));
            row.appendChild(createCell(trade.time));
            row.appendChild(createCell(trade.symbol));
            row.appendChild(createCell(trade.type));
            row.appendChild(createCell(trade.confirmations.join(', ')));
            row.appendChild(createCell(`$${parseFloat(trade.tradeSize).toFixed(2)}`));
            row.appendChild(createCell(`$${parseFloat(trade.pnlUsd).toFixed(2)}`, statusClass));
            row.appendChild(createCell(`${pnlPct.toFixed(2)}%`, statusClass));
            row.appendChild(createCell(status, statusClass));

            const actionCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.setAttribute('data-id', trade.id);
            deleteBtn.innerHTML = '&times;';
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);

            tradeBody.appendChild(row);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                trades = trades.filter(t => t.id !== id);
                saveTrades();
            };
        });
    };

    tradeForm.onsubmit = (e) => {
        e.preventDefault();

        const selectedConfirmations = Array.from(document.querySelectorAll('input[name="confirmation"]:checked'))
            .map(cb => cb.value);

        const newTrade = {
            id: Date.now().toString(),
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            symbol: document.getElementById('symbol').value.toUpperCase(),
            type: document.getElementById('type').value,
            confirmations: selectedConfirmations,
            tradeSize: parseFloat(document.getElementById('trade-size').value),
            pnlUsd: parseFloat(document.getElementById('pnl-amount').value)
        };

        trades.push(newTrade);
        saveTrades();
        tradeForm.reset();
        document.getElementById('date').valueAsDate = new Date(); // reset to today
    };

    exportBtn.onclick = () => {
        if (trades.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['id', 'date', 'time', 'symbol', 'type', 'confirmations', 'tradeSize', 'pnlUsd'];
        const csvRows = [headers.join(',')];

        trades.forEach(t => {
            const row = [
                t.id,
                t.date,
                t.time,
                t.symbol,
                t.type,
                `"${t.confirmations.join('|')}"`,
                t.tradeSize,
                t.pnlUsd
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `trade_journal_${new Date().toISOString().split('T')[0]}.csv`);
        a.click();
    };

    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n');
            const newTrades = [];

            // Assume first row is header
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;

                // Simple CSV parser (doesn't handle all edge cases but works for our format)
                const parts = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (parts.length < 8) continue;

                newTrades.push({
                    id: parts[0],
                    date: parts[1],
                    time: parts[2],
                    symbol: parts[3],
                    type: parts[4],
                    confirmations: parts[5].replace(/"/g, '').split('|').filter(c => c),
                    tradeSize: parseFloat(parts[6]),
                    pnlUsd: parseFloat(parts[7])
                });
            }

            if (confirm(`Import ${newTrades.length} trades? This will merge with existing data.`)) {
                trades = [...trades, ...newTrades];
                // Simple de-duplication by ID
                const uniqueTrades = [];
                const ids = new Set();
                trades.forEach(t => {
                    if (!ids.has(t.id)) {
                        ids.add(t.id);
                        uniqueTrades.push(t);
                    }
                });
                trades = uniqueTrades;
                saveTrades();
            }
            importInput.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear all trade data? This cannot be undone.')) {
            trades = [];
            saveTrades();
        }
    };

    // Initial render
    renderTrades();
    updateDashboard();
});
