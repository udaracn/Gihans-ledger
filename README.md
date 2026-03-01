# Trading Journal Web Program

A professional, black-themed web application for manual trade journaling.

## Features
- Manual trade entry: Date, Time, Trade Pair, Type (Buy/Sell), Confirmations, Trade Size, and PNL.
- Confirmations include: Regular divergence, Hidden divergence, CRT level, Supply demand, Volume level, QM.
- Auto-calculated Daily and Total PNL in USD and percentage.
- Professional Black UI.
- Fully responsive and auto-scalable for Android, iOS, and Windows.
- CSV data export/import for storage.
- Current date display.

## Data Schema
| Field | Type | Description |
|-------|------|-------------|
| Date | String (YYYY-MM-DD) | Date of the trade |
| Time | String (HH:MM) | Time of the trade |
| Symbol | String | Trade pair symbol (e.g., BTC/USD) |
| Type | String | Buy or Sell |
| Confirmations | Array/String | Selected confirmation methods |
| Trade Size | Number | Size of the position in USD |
| PNL USD | Number | Profit or Loss amount in USD (positive or negative) |
| PNL % | Number | Calculated percentage profit/loss relative to trade size |

## Technical Stack
- HTML5
- CSS3 (Responsive Design, Dark Theme)
- JavaScript (Vanilla)
- LocalStorage (Browser persistence)
- CSV (File export/import)
