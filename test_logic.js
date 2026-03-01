// Mocking the PNL calculation logic from script.js

const calculatePnlPct = (pnl, size) => {
    if (!size || size === 0) return 0;
    return (pnl / size) * 100;
};

const updateDashboardLogic = (trades, todayStr) => {
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

    return {
        dailyUsd,
        dailyPct,
        totalUsd,
        totalPct
    };
};

// Test Cases
const testTrades = [
    { date: '2023-10-27', tradeSize: 1000, pnlUsd: 100 }, // +10%
    { date: '2023-10-27', tradeSize: 500, pnlUsd: -50 },  // -10%
    { date: '2023-10-26', tradeSize: 2000, pnlUsd: 400 }  // +20% (Not today)
];

const today = '2023-10-27';
const stats = updateDashboardLogic(testTrades, today);

console.log('Testing PNL Calculations:');
console.log(`Daily USD: Expected 50, Got ${stats.dailyUsd}`);
console.log(`Daily Pct: Expected 3.33, Got ${stats.dailyPct.toFixed(2)}`);
console.log(`Total USD: Expected 450, Got ${stats.totalUsd}`);
console.log(`Total Pct: Expected 12.86, Got ${stats.totalPct.toFixed(2)}`);

if (stats.dailyUsd === 50 &&
    stats.dailyPct.toFixed(2) === '3.33' &&
    stats.totalUsd === 450 &&
    stats.totalPct.toFixed(2) === '12.86') {
    console.log('--- TEST PASSED ---');
    process.exit(0);
} else {
    console.log('--- TEST FAILED ---');
    process.exit(1);
}
