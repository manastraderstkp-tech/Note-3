import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Trash2,
  Search,
  Filter,
  Calendar,
  Calculator,
  BookOpen,
  LineChart,
  RefreshCw,
  Briefcase,
  PlusCircle,
  TrendingDown as TrendingDownIcon,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Activity,
  Heart
} from 'lucide-react';
import { StockHoldings, TradeLog } from '../types';
import { getSupabase } from '../lib/supabase';
import {
  fetchPortfolio,
  savePortfolioItem,
  deletePortfolioItem,
  fetchTrades,
  saveTradeLog,
  deleteTradeLog,
  fetchWatchlist,
  saveWatchlist
} from '../lib/shareMarketDb';

// Real-looking simulated Nepalese stock data
interface MarketStock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  high: number;
  low: number;
  volume: number;
  sector: string;
}

const INITIAL_NEPSE_STOCKS: MarketStock[] = [
  { symbol: 'NABIL', name: 'Nabil Bank Limited', ltp: 610.5, change: 1.25, high: 615.0, low: 602.0, volume: 145000, sector: 'Commercial Banks' },
  { symbol: 'NMB', name: 'NMB Bank Limited', ltp: 235.0, change: -0.85, high: 239.0, low: 232.0, volume: 85000, sector: 'Commercial Banks' },
  { symbol: 'GBIME', name: 'Global IME Bank Limited', ltp: 220.0, change: 2.15, high: 224.0, low: 215.0, volume: 112000, sector: 'Commercial Banks' },
  { symbol: 'EBL', name: 'Everest Bank Limited', ltp: 540.0, change: 0.55, high: 545.0, low: 536.0, volume: 43000, sector: 'Commercial Banks' },
  { symbol: 'HIDCL', name: 'Hydroelectricity Investment and Dev. Co.', ltp: 198.0, change: -1.20, high: 202.0, low: 195.0, volume: 220000, sector: 'Investment' },
  { symbol: 'NIFRA', name: 'Nepal Infrastructure Bank Limited', ltp: 255.0, change: 0.00, high: 258.0, low: 253.0, volume: 180000, sector: 'Development Banks' },
  { symbol: 'AHPC', name: 'Arun Valley Hydropower Development Co.', ltp: 290.0, change: 4.85, high: 295.0, low: 275.0, volume: 310000, sector: 'Hydro Power' },
  { symbol: 'CIT', name: 'Citizen Investment Trust', ltp: 2150.0, change: -1.85, high: 2190.0, low: 2130.0, volume: 12000, sector: 'Others' },
  { symbol: 'HDL', name: 'Himalayan Distillery Limited', ltp: 1850.0, change: -3.20, high: 1910.0, low: 1835.0, volume: 15000, sector: 'Manufacturing & Processing' },
  { symbol: 'ADBL', name: 'Agricultural Development Bank Limited', ltp: 282.0, change: 1.10, high: 285.0, low: 278.0, volume: 56000, sector: 'Commercial Banks' },
  { symbol: 'SHL', name: 'Soaltee Hotel Limited', ltp: 425.0, change: 3.15, high: 432.0, low: 410.0, volume: 94000, sector: 'Hotels & Tourism' },
  { symbol: 'CHCL', name: 'Chilime Hydropower Company Limited', ltp: 415.0, change: -0.45, high: 421.0, low: 411.0, volume: 72000, sector: 'Hydro Power' },
  { symbol: 'UPCL', name: 'Union Hydropower Limited', ltp: 185.0, change: 5.10, high: 189.0, low: 174.0, volume: 154000, sector: 'Hydro Power' },
  { symbol: 'SCB', name: 'Standard Chartered Bank Nepal Limited', ltp: 585.0, change: -0.50, high: 592.0, low: 581.0, volume: 28000, sector: 'Commercial Banks' },
  { symbol: 'NLIC', name: 'Nepal Life Insurance Co. Ltd.', ltp: 690.0, change: -1.15, high: 702.0, low: 686.0, volume: 49000, sector: 'Life Insurance' },
];

const STRATEGIES = [
  'Breakout Trading',
  'Support & Resistance Bounce',
  'Trend Following (EMA 20/50)',
  'Value Investing (Low PE/High Dividend)',
  'IPO / FPO Apply',
  'Right Share Accumulation',
  'Momentum Trading',
  'Pullback Setup',
];

interface IpoEvent {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  type: 'IPO' | 'FPO' | 'Right Share';
  price: number;
  units: number;
  openingDate: string;
  closingDate: string;
  issueManager: string;
  status: 'Active' | 'Upcoming' | 'Closed';
}

const INITIAL_IPO_EVENTS: IpoEvent[] = [
  {
    id: 'ipo-1',
    symbol: 'MHL',
    name: 'Mainabagan Hydropower Limited',
    sector: 'Hydro Power',
    type: 'IPO',
    price: 100,
    units: 1400000,
    openingDate: '2026-08-15',
    closingDate: '2026-08-20',
    issueManager: 'NIBL Ace Capital Limited',
    status: 'Active',
  },
  {
    id: 'ipo-2',
    symbol: 'KRL',
    name: 'Kaligandaki River Hydropower Limited',
    sector: 'Hydro Power',
    type: 'IPO',
    price: 100,
    units: 2100000,
    openingDate: '2026-08-25',
    closingDate: '2026-08-29',
    issueManager: 'Global IME Capital Limited',
    status: 'Upcoming',
  },
  {
    id: 'ipo-3',
    symbol: 'NMBMF',
    name: 'NMB Microfinance Bittiya Sanstha Limited',
    sector: 'Microfinance',
    type: 'Right Share',
    price: 100,
    units: 800000,
    openingDate: '2026-08-10',
    closingDate: '2026-08-30',
    issueManager: 'NMB Capital Limited',
    status: 'Active',
  },
  {
    id: 'ipo-4',
    symbol: 'SMHL',
    name: 'Super Mai Hydropower Limited',
    sector: 'Hydro Power',
    type: 'IPO',
    price: 100,
    units: 1500000,
    openingDate: '2026-07-01',
    closingDate: '2026-07-05',
    issueManager: 'Sanima Capital Limited',
    status: 'Closed',
  },
];

interface ShareMarketViewProps {
  userId: string;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ShareMarketView: React.FC<ShareMarketViewProps> = ({ userId, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist' | 'journal' | 'ipo' | 'calculator'>('portfolio');

  // Database States
  const [portfolio, setPortfolio] = useState<StockHoldings[]>([]);
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Simulated Live Stocks
  const [marketStocks, setMarketStocks] = useState<MarketStock[]>(INITIAL_NEPSE_STOCKS);
  const [lastMarketUpdate, setLastMarketUpdate] = useState<Date>(new Date());

  // Input Modal / Form States
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);

  // Form Fields - Portfolio
  const [pfSymbol, setPfSymbol] = useState('');
  const [pfUnits, setPfUnits] = useState<number | ''>('');
  const [pfBuyPrice, setPfBuyPrice] = useState<number | ''>('');
  const [pfPurchaseDate, setPfPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [pfWacc, setPfWacc] = useState<number | ''>('');
  const [pfDividends, setPfDividends] = useState<number>(0);
  const [editingPfId, setEditingPfId] = useState<string | null>(null);

  // Form Fields - Trade Journal
  const [trSymbol, setTrSymbol] = useState('');
  const [trAction, setTrAction] = useState<'BUY' | 'SELL'>('BUY');
  const [trUnits, setTrUnits] = useState<number | ''>('');
  const [trPrice, setTrPrice] = useState<number | ''>('');
  const [trTradeDate, setTrTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [trStrategy, setTrStrategy] = useState(STRATEGIES[0]);
  const [trPsychologyNotes, setTrPsychologyNotes] = useState('');
  const [editingTrId, setEditingTrId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistFilter, setWatchlistFilter] = useState('');

  // Calculator States
  const [calcType, setCalcType] = useState<'buy' | 'sell'>('buy');
  const [calcPrice, setCalcPrice] = useState<number>(100);
  const [calcUnits, setCalcUnits] = useState<number>(10);
  const [cgtRate, setCgtRate] = useState<5 | 7.5>(5);

  // Live simulation effect
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketStocks((prevStocks) =>
        prevStocks.map((stock) => {
          // Keep HDL down since we want distinct patterns, but simulate gentle fluctuations
          const drift = (Math.random() - 0.48) * 0.4; // slight upward drift
          const newChange = Number((stock.change + drift).toFixed(2));
          const deltaPrice = stock.ltp * (drift / 100);
          const newLtp = Number(Math.max(10, stock.ltp + deltaPrice).toFixed(1));
          const newHigh = Number(Math.max(stock.high, newLtp).toFixed(1));
          const newLow = Number(Math.min(stock.low, newLtp).toFixed(1));
          return {
            ...stock,
            change: newChange,
            ltp: newLtp,
            high: newHigh,
            low: newLow,
            volume: stock.volume + Math.floor(Math.random() * 500),
          };
        })
      );
      setLastMarketUpdate(new Date());
    }, 10000); // simulation tick every 10 seconds

    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const pfRes = await fetchPortfolio(userId);
      const trRes = await fetchTrades(userId);
      const wlRes = await fetchWatchlist(userId);

      setPortfolio(pfRes.portfolio);
      setTrades(trRes.trades);
      setWatchlistSymbols(wlRes.watchlist);

      if (pfRes.isCloud || trRes.isCloud) {
        setSyncStatus('Supabase Cloud Synchronized');
      } else {
        setSyncStatus('Using local responsive cache');
      }
    } catch (err) {
      console.error(err);
      onShowToast('Could not fetch share market data', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [userId, onShowToast]);

  useEffect(() => {
    if (userId) {
      loadData();
    }

    const client = getSupabase();
    if (!client) return;

    // 1. Auth state change listener (onAuthStateChange)
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        loadData(true);
      }
    });

    // 2. Realtime Postgres Changes Listener for nepse_transactions
    const channelName = `nepse_tx_live_${userId.slice(0, 8)}_${Math.random().toString(36).substring(2, 6)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nepse_transactions' },
        () => {
          loadData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'share_trades' },
        () => {
          loadData(true);
        }
      )
      .subscribe();

    // 3. Focus & Visibility Change Listener
    const handleFocus = () => {
      loadData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      authListener?.subscription?.unsubscribe();
      client.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [userId, loadData]);

  // --- Calculations for Portfolio Summary ---
  const getPortfolioSummary = () => {
    let totalInvestment = 0;
    let currentValue = 0;
    let totalWaccValue = 0;
    let totalDividends = 0;

    portfolio.forEach((p) => {
      const matchStock = marketStocks.find((ms) => ms.symbol === p.symbol.toUpperCase());
      const ltp = matchStock ? matchStock.ltp : p.buyPrice;
      
      const purchaseValue = p.units * p.buyPrice;
      const waccValue = p.units * p.wacc;
      const curVal = p.units * ltp;

      totalInvestment += purchaseValue;
      totalWaccValue += waccValue;
      currentValue += curVal;
      totalDividends += p.totalDividends;
    });

    const unRealizedPL = currentValue - totalWaccValue;
    const returnPercentage = totalWaccValue > 0 ? (unRealizedPL / totalWaccValue) * 100 : 0;

    return {
      totalInvestment,
      totalWaccValue,
      currentValue,
      unRealizedPL,
      returnPercentage,
      totalDividends,
    };
  };

  const summary = getPortfolioSummary();

  // Handle Add/Edit Portfolio Item
  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pfSymbol.trim() || !pfUnits || !pfBuyPrice) {
      onShowToast('Please fill in symbol, units and buy price', 'error');
      return;
    }

    const id = editingPfId || `pf-${Date.now()}`;
    const payload = {
      id,
      symbol: pfSymbol.toUpperCase().trim(),
      units: Number(pfUnits),
      buyPrice: Number(pfBuyPrice),
      purchaseDate: pfPurchaseDate,
      wacc: Number(pfWacc || pfBuyPrice),
      totalDividends: Number(pfDividends || 0),
    };

    const res = await savePortfolioItem(userId, payload);
    if (res.success) {
      onShowToast(editingPfId ? 'Holding updated successfully!' : 'Holding added successfully!', 'success');
      setIsPortfolioModalOpen(false);
      // Reset form fields
      setPfSymbol('');
      setPfUnits('');
      setPfBuyPrice('');
      setPfWacc('');
      setPfDividends(0);
      setEditingPfId(null);
      await loadData();
    } else {
      onShowToast(res.error || 'Failed to save', 'error');
    }
  };

  // Handle Delete Portfolio Item
  const handleDeletePortfolio = async (id: string) => {
    if (confirm('Are you sure you want to remove this stock from your portfolio?')) {
      const res = await deletePortfolioItem(userId, id);
      if (res.success) {
        onShowToast('Stock removed from portfolio', 'success');
        await loadData();
      }
    }
  };

  // Populate form to edit holding
  const handleEditPortfolioClick = (item: StockHoldings) => {
    setEditingPfId(item.id);
    setPfSymbol(item.symbol);
    setPfUnits(item.units);
    setPfBuyPrice(item.buyPrice);
    setPfPurchaseDate(item.purchaseDate);
    setPfWacc(item.wacc);
    setPfDividends(item.totalDividends);
    setIsPortfolioModalOpen(true);
  };

  // Handle Add/Edit Trade Log
  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trSymbol.trim() || !trUnits || !trPrice) {
      onShowToast('Please fill in symbol, units and trade price', 'error');
      return;
    }

    const id = editingTrId || `tr-${Date.now()}`;
    const payload = {
      id,
      symbol: trSymbol.toUpperCase().trim(),
      action: trAction,
      units: Number(trUnits),
      price: Number(trPrice),
      tradeDate: trTradeDate,
      strategy: trStrategy,
      psychologyNotes: trPsychologyNotes,
    };

    const res = await saveTradeLog(userId, payload);
    if (res.success) {
      onShowToast(editingTrId ? 'Trade entry updated successfully!' : 'Trade entry logged successfully!', 'success');
      setIsJournalModalOpen(false);
      setTrSymbol('');
      setTrUnits('');
      setTrPrice('');
      setTrPsychologyNotes('');
      setEditingTrId(null);
      await loadData();
    } else {
      onShowToast(res.error || 'Failed to save', 'error');
    }
  };

  // Handle Delete Trade Log
  const handleDeleteTrade = async (id: string) => {
    if (confirm('Are you sure you want to delete this trading log entry?')) {
      const res = await deleteTradeLog(userId, id);
      if (res.success) {
        onShowToast('Trade log entry removed', 'success');
        await loadData();
      }
    }
  };

  const handleEditTradeClick = (item: TradeLog) => {
    setEditingTrId(item.id);
    setTrSymbol(item.symbol);
    setTrAction(item.action);
    setTrUnits(item.units);
    setTrPrice(item.price);
    setTrTradeDate(item.tradeDate);
    setTrStrategy(item.strategy);
    setTrPsychologyNotes(item.psychologyNotes);
    setIsJournalModalOpen(true);
  };

  // Watchlist handlers
  const handleToggleWatchlist = async (symbol: string) => {
    const cleanSymbol = symbol.toUpperCase().trim();
    let updated: string[];
    if (watchlistSymbols.includes(cleanSymbol)) {
      updated = watchlistSymbols.filter((s) => s !== cleanSymbol);
      onShowToast(`${cleanSymbol} removed from Watchlist`, 'info');
    } else {
      updated = [...watchlistSymbols, cleanSymbol];
      onShowToast(`${cleanSymbol} added to Watchlist`, 'success');
    }
    setWatchlistSymbols(updated);
    await saveWatchlist(userId, updated);
  };

  const handleAddWatchlistSymbolDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchlistFilter.trim()) return;
    const cleanSymbol = watchlistFilter.toUpperCase().trim();
    if (watchlistSymbols.includes(cleanSymbol)) {
      onShowToast('Symbol is already in watchlist', 'info');
      return;
    }
    const updated = [...watchlistSymbols, cleanSymbol];
    setWatchlistSymbols(updated);
    setWatchlistFilter('');
    await saveWatchlist(userId, updated);
    onShowToast(`${cleanSymbol} added to Watchlist`, 'success');
  };

  // Live summaries (Top Gainers/Losers/Active) from NEPSE INITIAL data
  const getGainers = () => [...marketStocks].sort((a, b) => b.change - a.change).slice(0, 3);
  const getLosers = () => [...marketStocks].sort((a, b) => a.change - b.change).slice(0, 3);
  const getMostActive = () => [...marketStocks].sort((a, b) => b.volume - a.volume).slice(0, 3);

  // --- NEPSE Calculator Formulas ---
  // Factoring in Broker Commission rates:
  // Transaction Amount up to Rs. 50,000 => 0.40%
  // Rs. 50,001 to Rs. 5,000,000 => 0.37%
  // Rs. 5,000,001 to Rs. 20,000,000 => 0.34%
  // Above Rs. 20,000,000 => 0.27%
  const getBrokerCommission = (amount: number) => {
    if (amount <= 50000) return Math.max(10, amount * 0.004); // Minimum charge Rs. 10
    if (amount <= 500000) return amount * 0.0037;
    if (amount <= 2000000) return amount * 0.0034;
    return amount * 0.0027;
  };

  const calculateNEPSETrade = () => {
    const shareValue = calcPrice * calcUnits;
    const brokerCommission = getBrokerCommission(shareValue);
    const sebonFee = shareValue * 0.00015; // 0.015%
    const dpFee = 25; // standard Rs. 25 DP charge

    if (calcType === 'buy') {
      const totalCost = shareValue + brokerCommission + sebonFee + dpFee;
      const effectiveRate = totalCost / calcUnits;
      return {
        shareValue,
        brokerCommission,
        sebonFee,
        dpFee,
        cgt: 0,
        netAmount: totalCost,
        effectiveRate,
      };
    } else {
      // For Sell, CGT is charged on profit
      // Simple assumed profit margin calculation or standard sale CGT
      const hypotheticalCost = 100 * calcUnits; // Assume 100 par value purchase cost for simplicity
      const profit = shareValue - hypotheticalCost - brokerCommission - sebonFee - dpFee;
      const cgt = profit > 0 ? profit * (cgtRate / 100) : 0;
      const totalReceivable = shareValue - brokerCommission - sebonFee - dpFee - cgt;
      return {
        shareValue,
        brokerCommission,
        sebonFee,
        dpFee,
        cgt,
        netAmount: totalReceivable,
        effectiveRate: totalReceivable / calcUnits,
      };
    }
  };

  const calcResult = calculateNEPSETrade();

  // Search filtered portfolio / logs
  const filteredPortfolio = portfolio.filter((p) =>
    p.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrades = trades.filter((t) =>
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.psychologyNotes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Share Market</h2>
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                Nepal Stock Exchange (NEPSE) Tracker & Analytics Dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
            {syncStatus}
          </span>
          <button
            onClick={() => loadData()}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-2">
        <button
          onClick={() => { setActiveTab('portfolio'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl ${
            activeTab === 'portfolio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Portfolio Tracker
        </button>
        <button
          onClick={() => { setActiveTab('watchlist'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl ${
            activeTab === 'watchlist'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <LineChart className="h-4 w-4" />
          Watchlist & Market
        </button>
        <button
          onClick={() => { setActiveTab('journal'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl ${
            activeTab === 'journal'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Trade Journal (Log)
        </button>
        <button
          onClick={() => { setActiveTab('ipo'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl ${
            activeTab === 'ipo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="h-4 w-4" />
          IPO / Right Share
        </button>
        <button
          onClick={() => { setActiveTab('calculator'); setSearchQuery(''); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-xl ${
            activeTab === 'calculator'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <Calculator className="h-4 w-4" />
          NEPSE Calculator
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: PORTFOLIO TRACKER */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Portfolio Metrics Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Investment</p>
                  <p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
                    Rs. {summary.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Based on exact buy price</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Value</p>
                  <p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">
                    Rs. {summary.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-indigo-500 mt-1">Calculated with live LTP</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unrealized profit / loss</p>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <p className={`text-xl font-black ${summary.unRealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Rs. {summary.unRealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs font-bold flex items-center ${summary.unRealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {summary.unRealizedPL >= 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
                      {summary.returnPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Compared to WACC costs</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Cash Dividends</p>
                  <p className="mt-1.5 text-xl font-black text-emerald-500">
                    Rs. {summary.totalDividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Direct bonus / payout log</p>
                </div>
              </div>

              {/* Portfolio Actions & Table */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
                  <div className="relative max-w-md w-full">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search stock symbol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingPfId(null);
                      setPfSymbol('');
                      setPfUnits('');
                      setPfBuyPrice('');
                      setPfWacc('');
                      setPfDividends(0);
                      setIsPortfolioModalOpen(true);
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Bought Stock
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500 text-xs font-bold uppercase">
                        <th className="p-4">Symbol</th>
                        <th className="p-4">Units</th>
                        <th className="p-4">Buy Price (Rs)</th>
                        <th className="p-4">WACC Cost (Rs)</th>
                        <th className="p-4">Current LTP (Rs)</th>
                        <th className="p-4">Investment</th>
                        <th className="p-4">Current Value</th>
                        <th className="p-4">Dividends (Rs)</th>
                        <th className="p-4">Unrealized P/L</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                      {filteredPortfolio.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                            No stock holdings added yet. Click 'Add Bought Stock' to populate your portfolio!
                          </td>
                        </tr>
                      ) : (
                        filteredPortfolio.map((p) => {
                          const matchStock = marketStocks.find((ms) => ms.symbol === p.symbol.toUpperCase());
                          const currentLtp = matchStock ? matchStock.ltp : p.buyPrice;
                          const ltpChange = matchStock ? matchStock.change : 0;
                          
                          const purchaseValue = p.units * p.buyPrice;
                          const currentVal = p.units * currentLtp;
                          const waccTotal = p.units * p.wacc;
                          const profitVal = currentVal - waccTotal;
                          const pPercent = waccTotal > 0 ? (profitVal / waccTotal) * 100 : 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-medium text-slate-700 dark:text-slate-300">
                              <td className="p-4 font-black text-slate-900 dark:text-white">
                                <div>
                                  <span className="text-indigo-600 dark:text-indigo-400">{p.symbol}</span>
                                  {p.purchaseDate && <span className="block text-[10px] text-slate-400 font-semibold">{p.purchaseDate}</span>}
                                </div>
                              </td>
                              <td className="p-4">{p.units.toLocaleString()}</td>
                              <td className="p-4">Rs. {p.buyPrice.toFixed(2)}</td>
                              <td className="p-4">Rs. {p.wacc.toFixed(2)}</td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span>Rs. {currentLtp.toFixed(2)}</span>
                                  {matchStock && (
                                    <span className={`text-[10px] font-bold ${ltpChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {ltpChange >= 0 ? '+' : ''}{ltpChange}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">Rs. {purchaseValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="p-4">Rs. {currentVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td className="p-4 text-emerald-500">Rs. {p.totalDividends.toFixed(2)}</td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className={`font-bold ${profitVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {profitVal >= 0 ? '+' : ''}Rs. {profitVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                  <span className={`text-[10px] font-bold ${profitVal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {pPercent.toFixed(2)}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditPortfolioClick(p)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                                    title="Edit holding details"
                                  >
                                    <TrendingUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePortfolio(p.id)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                                    title="Delete holding"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WATCHLIST & MARKET SUMMARY */}
          {activeTab === 'watchlist' && (
            <div className="space-y-6">
              {/* Top Summary Cards (Gainers / Losers / Active) */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Gainers */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 shadow-sm dark:border-emerald-950/20 dark:bg-emerald-950/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" /> Top Gainers
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded">NEPSE</span>
                  </div>
                  <div className="space-y-3">
                    {getGainers().map((s) => (
                      <div key={s.symbol} className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{s.symbol}</span>
                        <div className="flex items-center gap-3">
                          <span>Rs. {s.ltp}</span>
                          <span className="text-emerald-500 font-bold">+{s.change}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers */}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 shadow-sm dark:border-rose-950/20 dark:bg-rose-950/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingDownIcon className="h-4 w-4" /> Top Losers
                    </h4>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100/60 dark:bg-rose-950/40 px-2 py-0.5 rounded">NEPSE</span>
                  </div>
                  <div className="space-y-3">
                    {getLosers().map((s) => (
                      <div key={s.symbol} className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">{s.symbol}</span>
                        <div className="flex items-center gap-3">
                          <span>Rs. {s.ltp}</span>
                          <span className="text-rose-500 font-bold">{s.change}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Active */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 shadow-sm dark:border-indigo-950/20 dark:bg-indigo-950/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4" /> Most Active (Vol)
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded">NEPSE</span>
                  </div>
                  <div className="space-y-3">
                    {getMostActive().map((s) => (
                      <div key={s.symbol} className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{s.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Vol: {s.volume.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>Rs. {s.ltp}</span>
                          <span className={`font-bold ${s.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {s.change >= 0 ? '+' : ''}{s.change}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Market & Watchlist Section */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Side: Watchlist Customizable Table */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500 fill-rose-500" /> My Custom Watchlist
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Track and monitor chosen stocks live</p>
                    </div>

                    <form onSubmit={handleAddWatchlistSymbolDirect} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add Symbol (e.g. NABIL)"
                        value={watchlistFilter}
                        onChange={(e) => setWatchlistFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                      >
                        Add
                      </button>
                    </form>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500 text-xs font-bold uppercase">
                          <th className="p-4">Symbol</th>
                          <th className="p-4">LTP (Rs)</th>
                          <th className="p-4">Change (%)</th>
                          <th className="p-4">High / Low</th>
                          <th className="p-4">Volume</th>
                          <th className="p-4 text-center">Unwatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium">
                        {watchlistSymbols.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              Your watchlist is empty. Add a symbol above or check standard stock list below to favorite stocks!
                            </td>
                          </tr>
                        ) : (
                          watchlistSymbols.map((sym) => {
                            const match = marketStocks.find((s) => s.symbol === sym.toUpperCase());
                            if (!match) {
                              return (
                                <tr key={sym} className="text-slate-500">
                                  <td className="p-4 font-bold uppercase">{sym}</td>
                                  <td colSpan={4} className="p-4 text-xs italic">Offline/Waiting for market feed...</td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => handleToggleWatchlist(sym)}
                                      className="text-rose-500 hover:text-rose-700 font-bold"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={match.symbol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                                <td className="p-4 font-black text-slate-900 dark:text-white">{match.symbol}</td>
                                <td className="p-4">Rs. {match.ltp.toFixed(2)}</td>
                                <td className={`p-4 font-bold ${match.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {match.change >= 0 ? '+' : ''}{match.change}%
                                </td>
                                <td className="p-4 text-xs">
                                  <span className="text-emerald-500">H: {match.high}</span> / <span className="text-rose-500">L: {match.low}</span>
                                </td>
                                <td className="p-4 text-xs text-slate-400">{match.volume.toLocaleString()}</td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleToggleWatchlist(match.symbol)}
                                    className="text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1"
                                    title="Remove from Watchlist"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: Quick Market Stream Feed */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" /> NEPSE Live Feed
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Simulated live feed: Last updated {lastMarketUpdate.toLocaleTimeString()}</p>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
                    {marketStocks.map((stock) => {
                      const isFavorited = watchlistSymbols.includes(stock.symbol);
                      return (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between rounded-xl border border-slate-50 bg-slate-50/40 p-3 hover:border-indigo-100 dark:border-slate-800/40 dark:bg-slate-950/30 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900 dark:text-white">{stock.symbol}</span>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {stock.sector}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[150px] font-medium">{stock.name}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Rs. {stock.ltp}</p>
                              <span className={`text-[10px] font-bold ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {stock.change >= 0 ? '+' : ''}{stock.change}%
                              </span>
                            </div>

                            <button
                              onClick={() => handleToggleWatchlist(stock.symbol)}
                              className={`rounded-lg p-1.5 transition ${
                                isFavorited
                                  ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20'
                                  : 'text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={isFavorited ? 'Remove from watchlist' : 'Add to watchlist'}
                            >
                              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-rose-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUY/SELL JOURNAL (TRADE LOG) */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Trading Psychology & Decision Journal</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Review your entry reasons, strategy setups, and emotional states</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingTrId(null);
                      setTrSymbol('');
                      setTrAction('BUY');
                      setTrUnits('');
                      setTrPrice('');
                      setTrStrategy(STRATEGIES[0]);
                      setTrPsychologyNotes('');
                      setIsJournalModalOpen(true);
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New Journal Entry
                  </button>
                </div>

                {/* Journal Table/Grid */}
                <div className="space-y-4">
                  {filteredTrades.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl">
                      <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm">No journal entries found</p>
                      <p className="text-xs mt-1">Start recording past trades with notes and strategies to improve trading behavior!</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredTrades.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/30 p-5 dark:border-slate-800/50 dark:bg-slate-950/20 relative group"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/30 pb-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900 dark:text-white uppercase">{t.symbol}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  t.action === 'BUY'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400'
                                }`}>
                                  {t.action}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{t.tradeDate}</p>
                            </div>

                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                              {t.strategy}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-semibold text-slate-500">
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Units</p>
                              <p className="text-slate-800 dark:text-slate-200 font-bold mt-0.5">{t.units.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Price (Rs)</p>
                              <p className="text-slate-800 dark:text-slate-200 font-bold mt-0.5">Rs. {t.price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[10px] uppercase">Total Cost</p>
                              <p className="text-slate-800 dark:text-slate-200 font-bold mt-0.5">Rs. {(t.units * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100/50 dark:border-slate-800/40 text-xs">
                            <p className="text-slate-400 font-bold mb-1 flex items-center gap-1">
                              <Info className="h-3 w-3" /> Psychology & Setup Notes:
                            </p>
                            <p className="text-slate-600 dark:text-slate-300 italic whitespace-pre-wrap leading-relaxed">
                              {t.psychologyNotes || 'No notes added for this trade.'}
                            </p>
                          </div>

                          {/* Quick absolute actions */}
                          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditTradeClick(t)}
                              className="rounded-lg p-1.5 bg-white dark:bg-slate-850 hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-800"
                              title="Edit trade details"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="rounded-lg p-1.5 bg-white dark:bg-slate-850 hover:bg-rose-50 text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 dark:border-slate-800"
                              title="Delete trade journal entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IPO/FPO & RIGHT SHARE CALENDAR */}
          {activeTab === 'ipo' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <div className="mb-5">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Nepal Share Issue (IPO/FPO/Right Share) Calendar</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Track active, upcoming, and recently closed share issues in Nepal</p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500 text-xs font-bold uppercase">
                        <th className="p-4">Symbol / Company</th>
                        <th className="p-4">Sector</th>
                        <th className="p-4">Issue Type</th>
                        <th className="p-4">Price (Rs)</th>
                        <th className="p-4">Total Issue Units</th>
                        <th className="p-4">Opening Date</th>
                        <th className="p-4">Closing Date</th>
                        <th className="p-4">Issue Manager</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium">
                      {INITIAL_IPO_EVENTS.map((event) => {
                        let statusColor = '';
                        if (event.status === 'Active') {
                          statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                        } else if (event.status === 'Upcoming') {
                          statusColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
                        } else {
                          statusColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                        }

                        return (
                          <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                            <td className="p-4">
                              <div>
                                <span className="font-black text-slate-900 dark:text-white block">{event.symbol}</span>
                                <span className="text-xs text-slate-400 max-w-[200px] block truncate">{event.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-xs">{event.sector}</td>
                            <td className="p-4">
                              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                {event.type}
                              </span>
                            </td>
                            <td className="p-4">Rs. {event.price}</td>
                            <td className="p-4 text-xs">{event.units.toLocaleString()}</td>
                            <td className="p-4 text-xs">{event.openingDate}</td>
                            <td className="p-4 text-xs">{event.closingDate}</td>
                            <td className="p-4 text-xs text-slate-400">{event.issueManager}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${statusColor}`}>
                                  {event.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: NEPSE CALCULATOR */}
          {activeTab === 'calculator' && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Calculator Form */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4">NEPSE Cost & Tax Calculator</h4>

                {/* Sub Tab Buy / Sell */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setCalcType('buy')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg border transition ${
                      calcType === 'buy'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    Buy Calculator
                  </button>
                  <button
                    onClick={() => setCalcType('sell')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg border transition ${
                      calcType === 'sell'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    Sell Calculator
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Price per Share (Rs.)</label>
                    <input
                      type="number"
                      value={calcPrice}
                      onChange={(e) => setCalcPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Number of Shares (Units)</label>
                    <input
                      type="number"
                      value={calcUnits}
                      onChange={(e) => setCalcUnits(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  {calcType === 'sell' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Capital Gains Tax (CGT) Rate (%)</label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="cgt_rate"
                            checked={cgtRate === 5}
                            onChange={() => setCgtRate(5)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          5% (Individual Long-Term Holding &gt; 1 yr)
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="cgt_rate"
                            checked={cgtRate === 7.5}
                            onChange={() => setCgtRate(7.5)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          7.5% (Individual Short-Term Holding &lt; 1 yr)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculator Breakdown Results */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/20">
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Transaction Cost Breakdown</h4>

                <div className="space-y-3.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Total Share Value:</span>
                    <span className="text-slate-900 dark:text-white">Rs. {calcResult.shareValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Broker Commission:</span>
                    <span className="text-slate-900 dark:text-white">Rs. {calcResult.brokerCommission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SEBON Fee (0.015%):</span>
                    <span className="text-slate-900 dark:text-white">Rs. {calcResult.sebonFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DP Fee Charge:</span>
                    <span className="text-slate-900 dark:text-white">Rs. {calcResult.dpFee.toFixed(2)}</span>
                  </div>
                  {calcType === 'sell' && (
                    <div className="flex justify-between">
                      <span>Capital Gains Tax ({cgtRate}%):</span>
                      <span className="text-rose-500">Rs. {calcResult.cgt.toFixed(2)}</span>
                    </div>
                  )}

                  <hr className="border-slate-200 dark:border-slate-800 my-4" />

                  <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white">
                    <span>{calcType === 'buy' ? 'Total Payables (Amount Cost):' : 'Total Receivables (Net Cash):'}</span>
                    <span className="text-indigo-600 dark:text-indigo-400">Rs. {calcResult.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold italic mt-2">
                    <span>{calcType === 'buy' ? 'Effective Buying Rate per Share:' : 'Effective Selling Rate per Share:'}</span>
                    <span>Rs. {calcResult.effectiveRate.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT PORTFOLIO STOCK */}
      {isPortfolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {editingPfId ? 'Edit Stock Holding' : 'Add Stock Holding to Portfolio'}
            </h3>

            <form onSubmit={handleSavePortfolio} className="space-y-4 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div>
                <label className="block mb-1">Stock Ticker Symbol *</label>
                <input
                  type="text"
                  placeholder="e.g. NABIL, NMB, HIDCL"
                  value={pfSymbol}
                  onChange={(e) => setPfSymbol(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Units (Quantity) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={pfUnits}
                    onChange={(e) => setPfUnits(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Buy Price (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 210.5"
                    value={pfBuyPrice}
                    onChange={(e) => setPfBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">WACC Price (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Defaults to Buy Price"
                    value={pfWacc}
                    onChange={(e) => setPfWacc(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={pfPurchaseDate}
                    onChange={(e) => setPfPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Total Dividends Received (Rs.)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPfDividends(prev => Math.max(0, prev - 100))}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="100"
                    placeholder="e.g. 1500"
                    value={pfDividends}
                    onChange={(e) => setPfDividends(Number(e.target.value))}
                    className="w-full flex-1 rounded-xl border border-slate-200 p-2.5 text-center text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setPfDividends(prev => prev + 100)}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-500"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT JOURNAL ENTRY */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800/80 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {editingTrId ? 'Edit Trade Log Entry' : 'Log New Buy/Sell Decisions'}
            </h3>

            <form onSubmit={handleSaveTrade} className="space-y-4 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Stock Ticker Symbol *</label>
                  <input
                    type="text"
                    placeholder="e.g. NMB"
                    value={trSymbol}
                    onChange={(e) => setTrSymbol(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Trade Action *</label>
                  <select
                    value={trAction}
                    onChange={(e) => setTrAction(e.target.value as 'BUY' | 'SELL')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={trUnits}
                    onChange={(e) => setTrUnits(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Execution Price (Rs.) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 245.20"
                    value={trPrice}
                    onChange={(e) => setTrPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Strategy Used</label>
                  <select
                    value={trStrategy}
                    onChange={(e) => setTrStrategy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Trade Date</label>
                  <input
                    type="date"
                    value={trTradeDate}
                    onChange={(e) => setTrTradeDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Psychology & Setup Notes *</label>
                <textarea
                  placeholder="Why did you take this trade? What did you feel? Note down indicators, charts pattern, or market sentiment to build trading discipline..."
                  value={trPsychologyNotes}
                  onChange={(e) => setTrPsychologyNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white min-h-[100px]"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-500"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
