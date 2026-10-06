// Single source of truth for current holdings — used by portfolio.html and the home page.
// When trades happen: update shares + avgCost by hand (buys re-average cost, sells keep avgCost).
// Page rule: per-share prices and percentages only, never dollar amounts or position sizes.
window.BB_FINNHUB_KEY = 'd8gavrhr01qlgcuifalgd8gavrhr01qlgcuifam0';
window.BB_HOLDINGS = [
  { ticker:'GOOGL', name:'Alphabet Inc.',             type:'stock', color:'#4285f4', purchased:'April 2026',  shares:4.903188,  avgCost:341.61, thesis:'articles/googl-thesis.html', note:'Bought in April 2026 as part of a broader AI infrastructure thesis. Alphabet\'s dominance in search, cloud, and AI tooling makes it a core long-term hold. Averaged in further in June 2026 at $346.79 again in July 2026 at $320.51, and once more in October 2026 at $342.59.' },
  { ticker:'UBER',  name:'Uber Technologies',         type:'stock', color:'#000000', purchased:'April 2026',  shares:17.817287, avgCost:74.50,  thesis:'articles/uber-thesis.html',        note:'Initiated in April 2026. The autonomous vehicle narrative is real, but Uber\'s network effects and platform dominance give it a strong moat in the near term.' },
  { ticker:'META',  name:'Meta Platforms',            type:'stock', color:'#0082fb', purchased:'April 2026',  shares:1.736761,  avgCost:602.99, thesis:'articles/meta-thesis.html',        note:'Added in April 2026. META\'s ad business is firing on all cylinders and the AI monetization story is just beginning. Averaged in further in June 2026 with additional purchases at $584.54 and $561.82, lowering the cost basis. Trimmed twice into strength in July 2026, at $665.14 and $642.36, and again in September 2026 at $744.10.' },
  { ticker:'UNH',   name:'UnitedHealth Group',        type:'stock', color:'#005eb8', purchased:'April 2026',  shares:4,         avgCost:321.72, thesis:'articles/unitedhealth-thesis.html', note:'Initiated April 2026 during a significant drawdown driven by regulatory concerns. The underlying business remained strong.' },
  { ticker:'V',     name:'Visa Inc.',                 type:'stock', color:'#1a1f71', purchased:'June 2026',   shares:3.908885,  avgCost:332.58, thesis:'articles/visa-thesis.html',                                note:'Initiated June 2026. Visa\'s toll-road business model on global payments is one of the most durable moats in the market. Added in October 2026 at $360.66.' },
  { ticker:'SCHF',  name:'Schwab Intl Equity ETF',    type:'etf',   color:'#4a90a4', purchased:'May 2026',   shares:28.763183, avgCost:26.08,  thesis:null,                                note:'Added May 2026 for international diversification. Broad exposure to developed markets outside the US.' },
  { ticker:'SCHV',  name:'Schwab US Large-Cap Value', type:'etf',   color:'#7a9a4a', purchased:'May 2026',   shares:23.525721, avgCost:31.88,  thesis:null,                                note:'Started May 2026. A value-tilt ETF to balance the growth-heavy individual stock picks.' },
  { ticker:'SCHB',  name:'Schwab US Broad Market',    type:'etf',   color:'#9a7a4a', purchased:'May 2026',   shares:27.377258, avgCost:27.40,  thesis:null,                                note:'Added May 2026 as a broad market anchor position. Tracks the total US equity market.' },
  { ticker:'CEG',   name:'Constellation Energy',      type:'stock', color:'#1f7ac4', purchased:'June 2026',  shares:6.248592,  avgCost:265.21, thesis:'articles/ceg-thesis.html',                                note:'Initiated June 2026. The largest nuclear operator in the US and a direct beneficiary of surging power demand from data centers. A way to play the AI buildout through the energy layer rather than the chips and software layer, where I think value has gotten stretched. Added in September 2026 at $259.53, nudging the average cost lower.' },
  { ticker:'VRT',   name:'Vertiv Holdings',           type:'stock', color:'#c89b3c', purchased:'June 2026',  shares:5.954,     avgCost:293.43, thesis:'articles/vrt-thesis.html',                                note:'Initiated June 2026. Vertiv builds the power and thermal management infrastructure that data centers run on. A picks and shovels position on the AI capacity buildout, capturing demand for cooling and power distribution as compute density rises. Added twice in July 2026, at $303.10 and $242.43, bringing the average cost down meaningfully.' },
];

// Trade log, newest first. Per-share execution prices only.
window.BB_ACTIVITY = [
  { date:'2026-10-03', side:'buy', ticker:'GOOGL', price:342.59 },
  { date:'2026-10-02', side:'buy', ticker:'V', price:360.66 },
  { date:'2026-09-23', side:'sell', ticker:'META', price:744.10 },
  { date:'2026-09-16', side:'buy', ticker:'CEG', price:259.53 },
  { date:'2026-07-29', side:'buy', ticker:'VRT', price:242.43 },
  { date:'2026-07-23', side:'buy', ticker:'GOOGL', price:320.51 },
  { date:'2026-07-23', side:'buy', ticker:'VRT', price:303.10 },
  { date:'2026-07-20', side:'sell', ticker:'META', price:642.36 },
  { date:'2026-07-10', side:'sell', ticker:'META', price:665.14 },
  { date:'2026-07-07', side:'buy', ticker:'VRT', price:299.37 },
  { date:'2026-07-02', side:'buy', ticker:'VRT', price:297.33 },
  { date:'2026-07-01', side:'buy', ticker:'VRT', price:315.87 },
  { date:'2026-07-01', side:'buy', ticker:'CEG', price:243.99 },
  { date:'2026-06-29', side:'buy', ticker:'CEG', price:264.84 },
  { date:'2026-06-23', side:'buy', ticker:'VRT', price:322.29 },
];
window.BB_ACTIVITY_NOTE = 'In keeping with the rest of this page, only per-share execution prices are shown — no position sizes or dollar amounts. The recent theme: taking more META off the table after its September run past $740, adding to Constellation Energy (CEG) on the mid-September dip, and building out Visa and Alphabet in early October.';

// Allocation shown on the portfolio page (percent of invested capital, set by hand).
window.BB_ALLOCATION = {
  byType: [['Stocks', 70], ['ETFs', 30]],
  bySector: [['Tech', 30], ['Healthcare', 10], ['Fintech', 10], ['Utilities', 10], ['Industrials', 10], ['Broad ETF', 30]],
  cash: 50,
  cashNote: 'I am currently holding a significant cash position after taking profits on previous investments. With tech and AI stocks having rallied substantially, I believe higher future returns may come from rotating into other sectors. I am actively looking for entries at better price points. This is not a bearish view on tech. It is a recognition that the easy money in AI has largely been made and that diversification into undervalued sectors may offer better risk adjusted returns from here.'
};
