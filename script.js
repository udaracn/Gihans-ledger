/**
 * This script handles all the application logic for the Professional Trade Journal.
 * It manages data storage, UI updates, trade calculations, and CSV export/import.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements Initialization ---
    // Getting references to the main HTML elements we will interact with.
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
    const pnlChartCtx = document.getElementById('pnl-chart').getContext('2d');

    // Market Session elements
    const sessions = {
        sydney: { open: 22, close: 7, status: document.getElementById('sydney-status'), timer: document.getElementById('sydney-timer') },
        tokyo: { open: 0, close: 9, status: document.getElementById('tokyo-status'), timer: document.getElementById('tokyo-timer') },
        london: { open: 8, close: 17, status: document.getElementById('london-status'), timer: document.getElementById('london-timer') },
        newyork: { open: 13, close: 22, status: document.getElementById('newyork-status'), timer: document.getElementById('newyork-timer') }
    };
    const btcPriceEl = document.getElementById('btc-price');
    const ethPriceEl = document.getElementById('eth-price');
    const fearGreedEl = document.getElementById('fear-greed');

    // --- Market Data Fetching ---

    /**
     * Fetches real-time crypto prices from Binance public API.
     */
    const fetchPrices = async () => {
        try {
            // Using CoinGecko public API
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
            const data = await response.json();
            if (data.bitcoin) btcPriceEl.textContent = `$${data.bitcoin.usd.toLocaleString()}`;
            if (data.ethereum) ethPriceEl.textContent = `$${data.ethereum.usd.toLocaleString()}`;
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
    };

    /**
     * Fetches the Crypto Fear & Greed Index from Alternative.me public API.
     */
    const fetchFearGreed = async () => {
        try {
            const response = await fetch('https://api.alternative.me/fng/');
            const data = await response.json();
            const fng = data.data[0];
            fearGreedEl.textContent = `${fng.value} (${fng.value_classification})`;
            // Color coding based on value
            const val = parseInt(fng.value);
            if (val < 25) fearGreedEl.style.color = '#ff4d4d'; // Extreme Fear
            else if (val < 45) fearGreedEl.style.color = '#ffa64d'; // Fear
            else if (val < 55) fearGreedEl.style.color = '#ffff4d'; // Neutral
            else if (val < 75) fearGreedEl.style.color = '#a6ff4d'; // Greed
            else fearGreedEl.style.color = '#4dff4d'; // Extreme Greed
        } catch (error) {
            console.error('Error fetching Fear & Greed Index:', error);
        }
    };

    // --- Market Session Logic ---

    /**
     * Updates the status and countdown timers for global market sessions.
     * All times are processed in UTC.
     */
    const updateMarketSessions = () => {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMin = now.getUTCMinutes();
        const utcSec = now.getUTCSeconds();

        for (const city in sessions) {
            const session = sessions[city];
            let isOpen = false;

            // Check if the current UTC hour falls within the session's open hours.
            if (session.open < session.close) {
                isOpen = utcHour >= session.open && utcHour < session.close;
            } else {
                // For sessions that cross midnight (e.g., Sydney)
                isOpen = utcHour >= session.open || utcHour < session.close;
            }

            session.status.textContent = isOpen ? 'OPEN' : 'CLOSED';
            session.status.className = isOpen ? 'status-open' : 'status-closed';

            // Calculate time remaining until the next status change.
            let targetHour;
            if (isOpen) {
                targetHour = session.close;
            } else {
                targetHour = session.open;
            }

            let diffHours = targetHour - utcHour;
            if (diffHours <= 0) diffHours += 24;

            let remainingMin = 59 - utcMin;
            let remainingSec = 59 - utcSec;
            let remainingHours = diffHours - 1;

            // Format the timer string.
            session.timer.textContent = `(${remainingHours}h ${remainingMin}m ${remainingSec}s)`;
        }
    };

    // Initial session update and set interval for every second.
    updateMarketSessions();
    setInterval(updateMarketSessions, 1000);

    // Initial fetch and set timers for periodic updates.
    fetchPrices();
    fetchFearGreed();
    setInterval(fetchPrices, 30000); // Update prices every 30 seconds
    setInterval(fetchFearGreed, 3600000); // Update Fear & Greed every hour

    // --- Data Management ---
    // Loading existing trades from browser's local storage or initializing an empty array.
    let trades = JSON.parse(localStorage.getItem('trades')) || [];

    /**
     * Updates the current date and time in the header every minute.
     */
    const updateDateDisplay = () => {
        const now = new Date();
        currentDateDisplay.textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };
    updateDateDisplay();
    setInterval(updateDateDisplay, 60000); // Update every 60 seconds

    /**
     * Set the default value for the trade date field to today's date.
     */
    document.getElementById('date').valueAsDate = new Date();

    /**
     * Saves the current list of trades to local storage and refreshes the UI.
     */
    const saveTrades = () => {
        localStorage.setItem('trades', JSON.stringify(trades));
        renderTrades();
        updateDashboard();
        updateChart();
    };

    /**
     * Calculates the PNL percentage relative to the trade size.
     * @param {number} pnl - The profit or loss amount in USD.
     * @param {number} size - The total trade size in USD.
     * @returns {number} The PNL percentage.
     */
    const calculatePnlPct = (pnl, size) => {
        if (!size || size === 0) return 0;
        return (pnl / size) * 100;
    };

    /**
     * Calculates high-level PNL statistics for the dashboard.
     * Includes daily PNL (USD/%) and total PNL (USD/%).
     */
    const updateDashboard = () => {
        // We use local date to determine "today" for the daily PNL calculation.
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

            // If the trade was made today, add it to the daily statistics.
            if (trade.date === todayStr) {
                dailyUsd += pnl;
                dailySize += size;
            }
        });

        // Calculate final percentages.
        const totalPct = totalSize > 0 ? (totalUsd / totalSize) * 100 : 0;
        const dailyPct = dailySize > 0 ? (dailyUsd / dailySize) * 100 : 0;

        // Update the dashboard UI elements with formatted values and colors.
        dailyPnlUsd.textContent = `$${dailyUsd.toFixed(2)}`;
        dailyPnlUsd.className = dailyUsd >= 0 ? 'pnl-positive' : 'pnl-negative';
        dailyPnlPct.textContent = `${dailyPct.toFixed(2)}%`;
        dailyPnlPct.className = dailyPct >= 0 ? 'pnl-positive' : 'pnl-negative';

        totalPnlUsd.textContent = `$${totalUsd.toFixed(2)}`;
        totalPnlUsd.className = totalUsd >= 0 ? 'pnl-positive' : 'pnl-negative';
        totalPnlPct.textContent = `${totalPct.toFixed(2)}%`;
        totalPnlPct.className = totalPct >= 0 ? 'pnl-positive' : 'pnl-negative';
    };

    /**
     * Renders the list of all trades in the history table.
     * Sorts trades by date and time in descending order (newest first).
     */
    const renderTrades = () => {
        tradeBody.innerHTML = ''; // Clear current table content.

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

            /**
             * Helper function to create a table cell with optional styling.
             * This avoids using innerHTML for better security.
             */
            const createCell = (text, className = '') => {
                const td = document.createElement('td');
                td.textContent = text;
                if (className) td.className = className;
                return td;
            };

            // Populate table row cells.
            row.appendChild(createCell(trade.date));
            row.appendChild(createCell(trade.time));
            row.appendChild(createCell(trade.symbol));
            row.appendChild(createCell(trade.type));
            row.appendChild(createCell(trade.confirmations.join(', ')));
            row.appendChild(createCell(`$${parseFloat(trade.tradeSize).toFixed(2)}`));
            row.appendChild(createCell(`$${parseFloat(trade.pnlUsd).toFixed(2)}`, statusClass));
            row.appendChild(createCell(`${pnlPct.toFixed(2)}%`, statusClass));
            row.appendChild(createCell(status, statusClass));

            // Create and append the action cell containing the delete button.
            const actionCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.setAttribute('data-id', trade.id);
            deleteBtn.innerHTML = '&times;'; // 'X' symbol for deletion.
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);

            tradeBody.appendChild(row);
        });

        // Add event listeners to all newly created delete buttons.
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                trades = trades.filter(t => t.id !== id);
                saveTrades();
            };
        });
    };

    /**
     * Handles the submission of the trade entry form.
     * Captures form data, creates a new trade object, and saves it.
     */
    tradeForm.onsubmit = (e) => {
        e.preventDefault(); // Prevent standard page reload.

        // Collect all selected confirmation methods from checkboxes.
        const selectedConfirmations = Array.from(document.querySelectorAll('input[name="confirmation"]:checked'))
            .map(cb => cb.value);

        // Build a new trade object with current form values.
        const newTrade = {
            id: Date.now().toString(), // Use current timestamp as a unique ID.
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
        tradeForm.reset(); // Clear the form fields.
        document.getElementById('date').valueAsDate = new Date(); // Reset date field to today.
    };

    /**
     * Exports all trade data to a CSV file for backup or external analysis.
     */
    exportBtn.onclick = () => {
        if (trades.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['id', 'date', 'time', 'symbol', 'type', 'confirmations', 'tradeSize', 'pnlUsd'];
        const csvRows = [headers.join(',')];

        // Format each trade as a CSV row string.
        trades.forEach(t => {
            const row = [
                t.id,
                t.date,
                t.time,
                t.symbol,
                t.type,
                `"${t.confirmations.join('|')}"`, // Use pipe separator for list items in a CSV cell.
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
        a.click(); // Trigger automatic file download.
    };

    /**
     * Imports trade data from a selected CSV file.
     * Merges imported data with existing local trades, avoiding duplicates.
     */
    importInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n');
            const newTrades = [];

            // Iterate through rows, skipping the header (i=1).
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue; // Skip empty lines.

                // Simple CSV parser using regex to ignore commas inside double quotes.
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

            // Ask for confirmation before merging the new data.
            if (confirm(`Import ${newTrades.length} trades? This will merge with existing data.`)) {
                trades = [...trades, ...newTrades];

                // Remove duplicates by keeping only one occurrence of each unique ID.
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
            importInput.value = ''; // Reset file input to allow re-importing the same file if needed.
        };
        reader.readAsText(file); // Start reading the file as text.
    };

    /**
     * Clears all trade history from memory and local storage.
     */
    clearBtn.onclick = () => {
        if (confirm('Are you sure you want to clear all trade data? This cannot be undone.')) {
            trades = [];
            saveTrades();
        }
    };

    // --- Chart Management ---
    let pnlChart;

    /**
     * Initializes or updates the PNL growth chart.
     * Aggregates trade data by date to show cumulative growth.
     */
    const updateChart = () => {
        // Aggregate PNL by date.
        const pnlByDate = {};
        trades.forEach(t => {
            pnlByDate[t.date] = (pnlByDate[t.date] || 0) + parseFloat(t.pnlUsd);
        });

        // Sort dates chronologically.
        const sortedDates = Object.keys(pnlByDate).sort();

        // Calculate cumulative growth.
        let cumulative = 0;
        const growthData = sortedDates.map(date => {
            cumulative += pnlByDate[date];
            return cumulative;
        });

        if (pnlChart) {
            pnlChart.destroy(); // Destroy previous instance before creating a new one.
        }

        // Create new Chart instance.
        pnlChart = new Chart(pnlChartCtx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Cumulative PNL (USD)',
                    data: growthData,
                    borderColor: '#bb86fc',
                    backgroundColor: 'rgba(187, 134, 252, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#e0e0e0' },
                        grid: { color: '#333' }
                    },
                    y: {
                        ticks: { color: '#e0e0e0' },
                        grid: { color: '#333' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e0e0e0' }
                    }
                }
            }
        });
    };

    // --- Initial Application State ---
    // Render initial data and statistics when the page is loaded for the first time.
    renderTrades();
    updateDashboard();
    updateChart();
});
