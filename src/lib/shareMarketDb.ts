import { getSupabase, fetchTransactions, saveTransaction, deleteTransaction, diagnoseNepseTransactionsTable } from './supabase';
import { StockHoldings, TradeLog } from '../types';

export { diagnoseNepseTransactionsTable };

// Storage keys for local fallback
const getPortfolioKey = (userId: string) => `ws_share_portfolio_${userId}`;
const getTradesKey = (userId: string) => `ws_share_trades_${userId}`;
const getWatchlistKey = (userId: string) => `ws_share_watchlist_${userId}`;

// --- PORTFOLIO OPERATIONS ---

export async function fetchPortfolio(userId: string): Promise<{ portfolio: StockHoldings[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getPortfolioKey(userId);

  if (client) {
    try {
      const { data, error } = await client
        .from('share_portfolio')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const portfolio: StockHoldings[] = data.map((item: any) => ({
          id: item.id,
          symbol: item.symbol || '',
          units: Number(item.units) || 0,
          buyPrice: Number(item.buy_price) || 0,
          purchaseDate: item.purchase_date || '',
          wacc: Number(item.wacc) || Number(item.buy_price) || 0,
          totalDividends: Number(item.total_dividends) || 0,
          createdAt: item.created_at || new Date().toISOString(),
        }));

        localStorage.setItem(localKey, JSON.stringify(portfolio));
        return { portfolio, isCloud: true };
      } else {
        if (error && error.code === '42P01') {
          console.warn('share_portfolio table does not exist in Supabase yet. Using local fallback.');
        }
      }
    } catch (err) {
      console.warn('Error fetching portfolio from Supabase:', err);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { portfolio: JSON.parse(raw), isCloud: false };
  } catch (e) {
    console.error('Error parsing local portfolio', e);
  }

  return { portfolio: [], isCloud: false };
}

export async function savePortfolioItem(
  userId: string,
  item: Omit<StockHoldings, 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const localKey = getPortfolioKey(userId);

  // Read current local state to update it
  let currentPortfolio: StockHoldings[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) currentPortfolio = JSON.parse(raw);
  } catch {}

  const nowStr = new Date().toISOString();
  const existingIndex = currentPortfolio.findIndex((p) => p.id === item.id);
  const newItem: StockHoldings = {
    ...item,
    createdAt: existingIndex >= 0 ? currentPortfolio[existingIndex].createdAt : nowStr,
  };

  if (existingIndex >= 0) {
    currentPortfolio[existingIndex] = newItem;
  } else {
    currentPortfolio.unshift(newItem);
  }
  localStorage.setItem(localKey, JSON.stringify(currentPortfolio));

  if (client) {
    try {
      const dbPayload = {
        id: newItem.id,
        user_id: userId,
        symbol: newItem.symbol.toUpperCase(),
        units: newItem.units,
        buy_price: newItem.buyPrice,
        purchase_date: newItem.purchaseDate,
        wacc: newItem.wacc,
        total_dividends: newItem.totalDividends,
      };

      const { error } = await client.from('share_portfolio').upsert(dbPayload);
      if (error) {
        console.warn('Could not save portfolio item to Supabase, cached locally:', error);
        return { success: true, error: 'Saved locally. (Supabase sync failed: table might not exist)' };
      }
      return { success: true };
    } catch (err) {
      console.warn('Supabase exception saving portfolio item, cached locally:', err);
      return { success: true, error: 'Saved locally' };
    }
  }

  return { success: true, error: 'Saved locally' };
}

export async function deletePortfolioItem(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const localKey = getPortfolioKey(userId);

  let currentPortfolio: StockHoldings[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) currentPortfolio = JSON.parse(raw);
  } catch {}

  const filtered = currentPortfolio.filter((p) => p.id !== itemId);
  localStorage.setItem(localKey, JSON.stringify(filtered));

  if (client) {
    try {
      const { error } = await client.from('share_portfolio').delete().eq('id', itemId).eq('user_id', userId);
      if (error) {
        console.warn('Could not delete portfolio item from Supabase, updated locally:', error);
      }
    } catch (err) {
      console.warn('Supabase exception deleting portfolio item:', err);
    }
  }

  return { success: true };
}

// --- TRADE LOGS OPERATIONS ---

export async function fetchTrades(userId: string): Promise<{ trades: TradeLog[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getTradesKey(userId);

  if (client) {
    // Primary: fetch from nepse_transactions table
    const nepseRes = await fetchTransactions(userId);
    if (!nepseRes.error && nepseRes.data) {
      const trades: TradeLog[] = nepseRes.data.map((item) => ({
        id: item.id,
        symbol: item.symbol || '',
        action: item.transaction_type === 'SELL' ? 'SELL' : 'BUY',
        units: Number(item.units) || 0,
        price: Number(item.price) || 0,
        tradeDate: item.transaction_date || '',
        strategy: 'Nepse Trade',
        psychologyNotes: '',
        createdAt: item.created_at || new Date().toISOString(),
      }));

      localStorage.setItem(localKey, JSON.stringify(trades));
      return { trades, isCloud: true };
    } else {
      if (nepseRes.error) {
        diagnoseNepseTransactionsTable().catch(() => {});
      }
      // Secondary fallback: share_trades table
      try {
        const { data, error } = await client
          .from('share_trades')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const trades: TradeLog[] = data.map((item: any) => ({
            id: item.id,
            symbol: item.symbol || '',
            action: item.action === 'SELL' ? 'SELL' : 'BUY',
            units: Number(item.units) || 0,
            price: Number(item.price) || 0,
            tradeDate: item.trade_date || '',
            strategy: item.strategy || '',
            psychologyNotes: item.psychology_notes || '',
            createdAt: item.created_at || new Date().toISOString(),
          }));

          localStorage.setItem(localKey, JSON.stringify(trades));
          return { trades, isCloud: true };
        }
      } catch (err) {
        console.warn('Error fetching share_trades from Supabase:', err);
      }
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { trades: JSON.parse(raw), isCloud: false };
  } catch (e) {
    console.error('Error parsing local trades', e);
  }

  return { trades: [], isCloud: false };
}

export async function saveTradeLog(
  userId: string,
  item: Omit<TradeLog, 'createdAt'>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const localKey = getTradesKey(userId);

  let currentTrades: TradeLog[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) currentTrades = JSON.parse(raw);
  } catch {}

  const nowStr = new Date().toISOString();
  const existingIndex = currentTrades.findIndex((t) => t.id === item.id);
  const newItem: TradeLog = {
    ...item,
    createdAt: existingIndex >= 0 ? currentTrades[existingIndex].createdAt : nowStr,
  };

  if (existingIndex >= 0) {
    currentTrades[existingIndex] = newItem;
  } else {
    currentTrades.unshift(newItem);
  }
  localStorage.setItem(localKey, JSON.stringify(currentTrades));

  if (client) {
    // 1. Save to nepse_transactions table
    const saveRes = await saveTransaction(userId, {
      id: newItem.id,
      symbol: newItem.symbol,
      transaction_type: newItem.action,
      units: newItem.units,
      price: newItem.price,
      transaction_date: newItem.tradeDate,
    });

    if (saveRes.success && saveRes.data) {
      newItem.id = saveRes.data.id; // ensure saved UUID is updated
      if (existingIndex >= 0) {
        currentTrades[existingIndex] = newItem;
      } else {
        currentTrades[0] = newItem;
      }
      localStorage.setItem(localKey, JSON.stringify(currentTrades));
      return { success: true };
    } else {
      if (saveRes.error) {
        diagnoseNepseTransactionsTable().catch(() => {});
      }
      // Try secondary table fallback: share_trades
      try {
        const dbPayload = {
          id: newItem.id,
          user_id: userId,
          symbol: newItem.symbol.toUpperCase(),
          action: newItem.action,
          units: newItem.units,
          price: newItem.price,
          trade_date: newItem.tradeDate,
          strategy: newItem.strategy,
          psychology_notes: newItem.psychologyNotes,
        };

        const { error } = await client.from('share_trades').upsert(dbPayload);
        if (!error) return { success: true };
      } catch (err) {
        console.warn('Fallback share_trades save error:', err);
      }

      return {
        success: true,
        error: saveRes.error ? `Saved locally. Supabase error: ${saveRes.error}` : 'Saved locally',
      };
    }
  }

  return { success: true, error: 'Saved locally' };
}

export async function deleteTradeLog(
  userId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const localKey = getTradesKey(userId);

  let currentTrades: TradeLog[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) currentTrades = JSON.parse(raw);
  } catch {}

  const filtered = currentTrades.filter((t) => t.id !== itemId);
  localStorage.setItem(localKey, JSON.stringify(filtered));

  if (client) {
    const delRes = await deleteTransaction(itemId);
    if (!delRes.error) {
      // Also cleanup secondary table if present
      try {
        await client.from('share_trades').delete().eq('id', itemId).eq('user_id', userId);
      } catch {}
      return { success: true };
    } else {
      try {
        await client.from('share_trades').delete().eq('id', itemId).eq('user_id', userId);
        return { success: true };
      } catch (err) {
        console.warn('Delete trade log error:', err);
      }
      return { success: true, error: delRes.error };
    }
  }

  return { success: true };
}

// --- WATCHLIST OPERATIONS ---

export async function fetchWatchlist(userId: string): Promise<{ watchlist: string[]; isCloud: boolean }> {
  const client = getSupabase();
  const localKey = getWatchlistKey(userId);

  if (client) {
    try {
      const { data, error } = await client
        .from('share_watchlist')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        const watchlist = data.map((item: any) => item.symbol || '');
        localStorage.setItem(localKey, JSON.stringify(watchlist));
        return { watchlist, isCloud: true };
      } else {
        if (error && error.code === '42P01') {
          console.warn('share_watchlist table does not exist in Supabase yet. Using local fallback.');
        }
      }
    } catch (err) {
      console.warn('Error fetching watchlist from Supabase:', err);
    }
  }

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return { watchlist: JSON.parse(raw), isCloud: false };
  } catch (e) {
    console.error('Error parsing local watchlist', e);
  }

  // Default watchlist symbols if completely empty and new
  const defaultWatchlist = ['NMB', 'HIDCL', 'GBIME', 'AHPC', 'NIFRA'];
  localStorage.setItem(localKey, JSON.stringify(defaultWatchlist));
  return { watchlist: defaultWatchlist, isCloud: false };
}

export async function saveWatchlist(
  userId: string,
  symbols: string[]
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  const localKey = getWatchlistKey(userId);

  localStorage.setItem(localKey, JSON.stringify(symbols));

  if (client) {
    try {
      // First, clear existing watchlist for the user
      const { error: deleteError } = await client.from('share_watchlist').delete().eq('user_id', userId);
      
      if (!deleteError && symbols.length > 0) {
        const dbPayloads = symbols.map((symbol) => ({
          id: `wl-${symbol}-${userId}`,
          user_id: userId,
          symbol: symbol.toUpperCase(),
        }));

        const { error: insertError } = await client.from('share_watchlist').insert(dbPayloads);
        if (insertError) {
          console.warn('Could not save watchlist to Supabase, cached locally:', insertError);
          return { success: true, error: 'Saved locally' };
        }
      }
      return { success: true };
    } catch (err) {
      console.warn('Supabase exception saving watchlist, cached locally:', err);
      return { success: true, error: 'Saved locally' };
    }
  }

  return { success: true, error: 'Saved locally' };
}
