import { type FormEvent, type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowDownLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  Filter,
  Home,
  Plus,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  WalletCards,
  X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import './index.css';

type Expense = {
  id: string;
  amount: number;
  categoryId: string;
  category?: string;
  date: string;
  note: string;
  createdAt: string;
};
type Category = { id: string; name: string; color: string; isDefault: boolean };
type Settings = { monthlyBudget: number; currency: string; hasSeenSampleData: boolean };
type ModalState = { mode: 'add' | 'edit'; expense?: Expense } | null;

const queryClient = new QueryClient();
const STORAGE = { expenses: 'mellow-money-expenses', categories: 'mellow-money-categories', settings: 'mellow-money-settings', seeded: 'mellow-money-seeded' };
const COLORS = ['#1e7065', '#e57f5b', '#e6b84e', '#4c8aa5', '#9e7199', '#ba6d5c', '#54735d', '#b8a45a'];
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-home', name: 'Home', color: '#1e7065', isDefault: true },
  { id: 'cat-food', name: 'Food & drink', color: '#e57f5b', isDefault: true },
  { id: 'cat-wellness', name: 'Wellness', color: '#e6b84e', isDefault: true },
  { id: 'cat-mobility', name: 'Mobility', color: '#4c8aa5', isDefault: true },
  { id: 'cat-fun', name: 'Fun', color: '#9e7199', isDefault: true },
  { id: 'cat-other', name: 'Other', color: '#b8a45a', isDefault: true },
];

const today = new Date();
const iso = (offset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};
const SAMPLE_EXPENSES: Expense[] = [
  { id: 'sample-1', amount: 42.8, categoryId: 'cat-food', date: iso(0), note: 'Saturday market and coffee', createdAt: new Date().toISOString() },
  { id: 'sample-2', amount: 68, categoryId: 'cat-home', date: iso(1), note: 'Household supplies', createdAt: new Date().toISOString() },
  { id: 'sample-3', amount: 18.5, categoryId: 'cat-mobility', date: iso(2), note: 'Train to the studio', createdAt: new Date().toISOString() },
  { id: 'sample-4', amount: 31.25, categoryId: 'cat-food', date: iso(3), note: 'Dinner with Sam', createdAt: new Date().toISOString() },
  { id: 'sample-5', amount: 24, categoryId: 'cat-wellness', date: iso(5), note: 'Pilates class', createdAt: new Date().toISOString() },
  { id: 'sample-6', amount: 12.9, categoryId: 'cat-fun', date: iso(7), note: 'Small gallery ticket', createdAt: new Date().toISOString() },
  { id: 'sample-7', amount: 76.4, categoryId: 'cat-home', date: iso(9), note: 'Plants for the window', createdAt: new Date().toISOString() },
  { id: 'sample-8', amount: 8.75, categoryId: 'cat-food', date: iso(11), note: 'Morning pastry', createdAt: new Date().toISOString() },
];

const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', JPY: '¥' };
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2 }).format(amount);
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(today);
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

type Store = {
  expenses: Expense[];
  categories: Category[];
  settings: Settings;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  setBudget: (budget: number) => void;
  setCurrency: (currency: string) => void;
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, name: string, color: string) => void;
  deleteCategory: (id: string) => void;
  clearSampleData: () => void;
  clearAllData: () => void;
  seedData: () => void;
};
const StoreContext = createContext<Store | null>(null);
function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Store must be used inside provider');
  return store;
}

function StoreProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(() => readStorage(STORAGE.expenses, localStorage.getItem(STORAGE.seeded) ? [] : SAMPLE_EXPENSES));
  const [categories, setCategories] = useState<Category[]>(() => readStorage(STORAGE.categories, DEFAULT_CATEGORIES));
  const [settings, setSettings] = useState<Settings>(() => readStorage(STORAGE.settings, { monthlyBudget: 1200, currency: 'USD', hasSeenSampleData: true }));
  useEffect(() => { localStorage.setItem(STORAGE.expenses, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE.categories, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(STORAGE.settings, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE.seeded, 'true'); }, []);
  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => setExpenses((current) => [{ ...expense, id: uid('expense'), createdAt: new Date().toISOString() }, ...current]);
  const updateExpense = (id: string, expense: Omit<Expense, 'id' | 'createdAt'>) => setExpenses((current) => current.map((item) => item.id === id ? { ...item, ...expense } : item));
  const deleteExpense = (id: string) => setExpenses((current) => current.filter((item) => item.id !== id));
  const setBudget = (budget: number) => setSettings((current) => ({ ...current, monthlyBudget: budget }));
  const setCurrency = (currency: string) => setSettings((current) => ({ ...current, currency }));
  const addCategory = (name: string, color: string) => setCategories((current) => [...current, { id: uid('category'), name, color, isDefault: false }]);
  const updateCategory = (id: string, name: string, color: string) => setCategories((current) => current.map((item) => item.id === id ? { ...item, name, color } : item));
  const deleteCategory = (id: string) => {
    const fallback = categories.find((category) => category.id === 'cat-other')?.id ?? 'cat-other';
    setExpenses((current) => current.map((item) => item.categoryId === id ? { ...item, categoryId: fallback } : item));
    setCategories((current) => current.filter((item) => item.id !== id));
  };
  const clearSampleData = () => setExpenses((current) => current.filter((item) => !item.id.startsWith('sample-')));
  const clearAllData = () => setExpenses([]);
  const seedData = () => setExpenses(SAMPLE_EXPENSES);
  return <StoreContext.Provider value={{ expenses, categories, settings, addExpense, updateExpense, deleteExpense, setBudget, setCurrency, addCategory, updateCategory, deleteCategory, clearSampleData, clearAllData, seedData }}>{children}</StoreContext.Provider>;
}

function useMonthlyExpenses() {
  const { expenses } = useStore();
  const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  return useMemo(() => expenses.filter((expense) => expense.date.startsWith(prefix)), [expenses, prefix]);
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDismiss, 3200); return () => window.clearTimeout(timer); }, [onDismiss]);
  return <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[hsl(var(--foreground))] px-4 py-3 text-sm font-semibold text-[hsl(var(--card))] shadow-xl pop-in" role="status" data-testid="status-toast"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"><Check size={13} strokeWidth={3} /></span>{message}<button onClick={onDismiss} data-testid="button-dismiss-toast" aria-label="Dismiss notification"><X size={15} /></button></div>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(183_38%_17%/.35)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true">
    <div className={`max-h-[92dvh] w-full overflow-auto rounded-t-[2rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.5rem] ${wide ? 'max-w-2xl' : 'max-w-lg'} pop-in`}>
      <div className="mb-6 flex items-center justify-between"><h2 className="serif text-2xl font-bold">{title}</h2><button className="rounded-full p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" onClick={onClose} data-testid="button-close-modal" aria-label="Close dialog"><X size={19} /></button></div>
      {children}
    </div>
  </div>;
}

function Sidebar() {
  const [location] = useLocation();
  const nav = [{ href: '/', label: 'Overview', icon: Home }, { href: '/transactions', label: 'Transactions', icon: ArrowDownLeft }, { href: '/settings', label: 'Settings', icon: SettingsIcon }];
  return <aside className="hidden w-64 shrink-0 flex-col justify-between bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))] md:flex">
    <div><Link href="/" className="mb-12 flex items-center gap-3" data-testid="link-brand"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] shadow-lg"><WalletCards size={20} /></span><span className="serif text-xl font-bold tracking-tight">mellow<span className="text-[hsl(var(--accent))]">.</span></span></Link>
      <nav className="space-y-2">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${location === href ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--accent))] shadow-inner' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={18} strokeWidth={location === href ? 2.5 : 1.8} />{label}</Link>)}</nav>
    </div>
    <div className="rounded-2xl border border-[hsl(var(--sidebar-foreground)/.13)] bg-[hsl(var(--sidebar-foreground)/.06)] p-4"><Sparkles size={17} className="mb-3 text-[hsl(var(--accent))]" /><p className="text-sm font-semibold">A little clarity goes a long way.</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.58)]">No perfect budget needed. Just a place to notice.</p></div>
  </aside>;
}

function MobileNav() {
  const [location] = useLocation();
  const nav = [{ href: '/', label: 'Home', icon: Home }, { href: '/transactions', label: 'Spend', icon: ArrowDownLeft }, { href: '/settings', label: 'Tune', icon: SettingsIcon }];
  return <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.94)] px-4 py-3 backdrop-blur-lg md:hidden">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${location === href ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid={`link-mobile-${label.toLowerCase()}`}><Icon size={19} /><span>{label}</span></Link>)}</nav>;
}

function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell paper-noise flex min-h-[100dvh]"><Sidebar /><main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main><MobileNav /></div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mono mb-3 text-[10px] font-medium uppercase tracking-[.23em] text-[hsl(var(--primary))]">{eyebrow}</p><h1 className="serif text-4xl font-bold leading-none tracking-tight text-[hsl(var(--foreground))] sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{description}</p></div>{action}</header>;
}

function Button({ children, onClick, variant = 'primary', type = 'button', testId, disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'quiet' | 'danger' | 'outline'; type?: 'button' | 'submit'; testId: string; disabled?: boolean }) {
  const styles = { primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/.16)] hover:-translate-y-0.5 hover:shadow-xl', quiet: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]', danger: 'bg-[hsl(var(--destructive))] text-white hover:brightness-95', outline: 'border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/.45)] hover:bg-[hsl(var(--secondary)/.6)]' };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`} data-testid={testId}>{children}</button>;
}

function CategoryPill({ category }: { category?: Category }) {
  return <span className="inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category?.color ?? '#9b9b8f' }} />{category?.name ?? 'Uncategorized'}</span>;
}

function ExpenseForm({ initial, onClose, onSaved }: { initial?: Expense; onClose: () => void; onSaved: (message: string) => void }) {
  const { categories, settings, addExpense, updateExpense } = useStore();
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? iso(0));
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Add an amount greater than zero.');
    if (!categoryId) return setError('Choose a category.');
    if (!date) return setError('Choose a date.');
    const category = categories.find((item) => item.id === categoryId);
    const payload = { amount: Math.round(numericAmount * 100) / 100, categoryId, category: category?.name, date, note: note.trim() || 'Everyday spending' };
    if (initial) { updateExpense(initial.id, payload); onSaved('Expense updated'); } else { addExpense(payload); onSaved('Expense added'); }
    onClose();
  };
  return <Modal title={initial ? 'Edit expense' : 'Add an expense'} onClose={onClose}><form onSubmit={submit} className="space-y-5">
    <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]" htmlFor="expense-amount">Amount</label><div className="relative"><span className="absolute left-4 top-3 text-lg font-bold text-[hsl(var(--muted-foreground))]">{currencySymbols[settings.currency] ?? '$'}</span><input autoFocus id="expense-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="0.00" className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-3 pl-9 pr-4 text-lg font-bold outline-none transition focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]" data-testid="input-expense-amount" /></div></div>
    <div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]" htmlFor="expense-category">Category</label><select id="expense-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-semibold outline-none focus:border-[hsl(var(--primary))]" data-testid="select-expense-category">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]" htmlFor="expense-date">Date</label><input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-semibold outline-none focus:border-[hsl(var(--primary))]" data-testid="input-expense-date" /></div></div>
    <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]" htmlFor="expense-note">Note <span className="font-normal normal-case tracking-normal">(optional)</span></label><input id="expense-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" maxLength={100} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]" data-testid="input-expense-note" /></div>
    {error && <p className="rounded-lg bg-[hsl(var(--destructive)/.1)] px-3 py-2 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid="error-expense-form">{error}</p>}
    <div className="flex justify-end gap-3 border-t border-[hsl(var(--border))] pt-5"><Button onClick={onClose} variant="quiet" testId="button-cancel-expense">Cancel</Button><Button type="submit" testId="button-save-expense">{initial ? 'Save changes' : 'Save expense'}</Button></div>
  </form></Modal>;
}

function DeleteModal({ expense, onClose, onDelete }: { expense: Expense; onClose: () => void; onDelete: () => void }) {
  return <Modal title="Remove this expense?" onClose={onClose}><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">This will remove <strong className="text-[hsl(var(--foreground))]">{money(expense.amount, 'USD')}</strong> from your history. This cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><Button onClick={onClose} variant="quiet" testId="button-cancel-delete">Keep it</Button><Button onClick={onDelete} variant="danger" testId="button-confirm-delete"><Trash2 size={16} />Remove expense</Button></div></Modal>;
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  const warning = percent >= 80 && !over;
  return <div><div className="mb-2 flex items-center justify-between text-xs font-bold"><span className="text-[hsl(var(--muted-foreground))]">{over ? 'Budget exceeded' : warning ? 'A gentle heads-up' : 'On a good path'}</span><span className={over ? 'text-[hsl(var(--destructive))]' : warning ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--primary))]'}>{Math.round((spent / Math.max(budget, 1)) * 100)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-[hsl(var(--destructive))]' : warning ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} style={{ width: `${percent}%` }} /></div></div>;
}

function Dashboard() {
  const { expenses, categories, settings } = useStore();
  const monthly = useMonthlyExpenses();
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState('');
  const spent = monthly.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = settings.monthlyBudget - spent;
  const byCategory = categories.map((category) => ({ category, total: monthly.filter((expense) => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const recent = [...monthly].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const status = spent > settings.monthlyBudget ? 'Over budget' : spent / Math.max(settings.monthlyBudget, 1) >= .8 ? 'Getting close' : 'Looking good';
  return <AppShell><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><PageHeader eyebrow={monthLabel} title="Make room for what matters." description="A softer view of the everyday money decisions that add up." action={<Button onClick={() => setModal({ mode: 'add' })} testId="button-add-expense"><Plus size={18} />Add expense</Button>} />
    <section className="mb-7 grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="soft-card relative overflow-hidden rounded-[1.5rem] p-6 sm:p-8"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[hsl(var(--accent)/.18)] blur-3xl" /><div className="relative"><div className="mb-8 flex items-start justify-between"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">This month</p><p className="mt-2 text-4xl font-extrabold tracking-tight">{money(spent, settings.currency)}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">of {money(settings.monthlyBudget, settings.currency)} monthly budget</p></div><div className={`rounded-full px-3 py-1.5 text-xs font-bold ${spent > settings.monthlyBudget ? 'bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]' : spent / Math.max(settings.monthlyBudget, 1) >= .8 ? 'bg-[hsl(var(--accent)/.22)] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]'}`} data-testid="status-budget">{status}</div></div><BudgetBar spent={spent} budget={settings.monthlyBudget} /><div className="mt-7 flex items-center gap-3 border-t border-[hsl(var(--border)/.75)] pt-5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--secondary))]"><TrendingDown size={17} className="text-[hsl(var(--primary))]" /></div><p className="text-sm text-[hsl(var(--muted-foreground))]">{remaining >= 0 ? <><strong className="text-[hsl(var(--foreground))]">{money(remaining, settings.currency)}</strong> left to spend this month.</> : <><strong className="text-[hsl(var(--destructive))]">{money(Math.abs(remaining), settings.currency)}</strong> over your monthly plan.</>}</p></div></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-1"><div className="soft-card rounded-[1.5rem] p-5"><div className="mb-5 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Daily average</p><BarChart3 size={17} className="text-[hsl(var(--primary))]" /></div><p className="text-2xl font-extrabold">{money(monthly.length ? spent / Math.max(today.getDate(), 1) : 0, settings.currency)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">based on {today.getDate()} days</p></div><div className="soft-card rounded-[1.5rem] bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary-foreground)/.65)]">Little wins</p><p className="mt-3 text-2xl font-extrabold">{monthly.length}</p><p className="mt-1 text-xs text-[hsl(var(--primary-foreground)/.65)]">thoughtful choices logged</p></div></div></section>
    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="soft-card rounded-[1.5rem] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">The shape of it</p><h2 className="serif mt-1 text-2xl font-bold">Where it went</h2></div><Tag size={18} className="text-[hsl(var(--accent-foreground))]" /></div>{byCategory.length ? <div className="flex flex-col gap-4">{byCategory.slice(0, 5).map(({ category, total }) => <div key={category.id} data-testid={`category-breakdown-${category.id}`}><div className="mb-1.5 flex items-center justify-between"><CategoryPill category={category} /><span className="mono text-xs font-medium">{money(total, settings.currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max((total / Math.max(spent, 1)) * 100, 4)}%`, backgroundColor: category.color }} /></div></div>)}</div> : <EmptyState compact title="Nothing here yet" text="Your categories will take shape as you log spending." />}</div><div className="soft-card rounded-[1.5rem] p-6"><div className="mb-5 flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">A recent trail</p><h2 className="serif mt-1 text-2xl font-bold">Latest expenses</h2></div><Link href="/transactions" className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))] hover:gap-2 transition-all" data-testid="link-view-all">View all <ArrowRight size={14} /></Link></div>{recent.length ? <div className="divide-y divide-[hsl(var(--border)/.7)]">{recent.map((expense, index) => <ExpenseRow key={expense.id} expense={expense} category={categories.find((item) => item.id === expense.categoryId)} currency={settings.currency} compact index={index} />)}</div> : <EmptyState title="A fresh page" text="Add your first expense and start noticing your patterns." action={<Button onClick={() => setModal({ mode: 'add' })} testId="button-add-first-expense"><Plus size={16} />Add expense</Button>} />}</div></section>
    </div>{modal && <ExpenseForm onClose={() => setModal(null)} onSaved={setToast} />}{toast && <Toast message={toast} onDismiss={() => setToast('')} />}</AppShell>;
}

function ExpenseRow({ expense, category, currency, compact = false, index = 0, onEdit, onDelete }: { expense: Expense; category?: Category; currency: string; compact?: boolean; index?: number; onEdit?: () => void; onDelete?: () => void }) {
  return <div className={`group flex items-center gap-3 py-3 ${compact ? '' : 'px-1'} fade-up`} style={{ animationDelay: `${index * 45}ms` }} data-testid={`row-expense-${expense.id}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ backgroundColor: `${category?.color ?? '#999'}18`, color: category?.color ?? '#777' }}>{(category?.name ?? '?').slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{expense.note}</p><div className="mt-0.5 flex items-center gap-2"><CategoryPill category={category} /><span className="text-xs text-[hsl(var(--muted-foreground))]">· {dateLabel(expense.date)}</span></div></div><p className="shrink-0 text-sm font-extrabold">{money(expense.amount, currency)}</p>{!compact && <div className="ml-1 flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><button onClick={onEdit} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" aria-label="Edit expense" data-testid={`button-edit-expense-${expense.id}`}><Edit3 size={15} /></button><button onClick={onDelete} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))]" aria-label="Delete expense" data-testid={`button-delete-expense-${expense.id}`}><Trash2 size={15} /></button></div>}</div>;
}

function EmptyState({ title, text, action, compact = false }: { title: string; text: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-12'}`}><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CircleDollarSign size={22} /></div><h3 className="serif text-xl font-bold">{title}</h3><p className="mt-1 max-w-xs text-sm leading-5 text-[hsl(var(--muted-foreground))]">{text}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Transactions() {
  const { expenses, categories, settings, deleteExpense } = useStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [toast, setToast] = useState('');
  const filtered = [...expenses].filter((expense) => { const query = search.toLowerCase(); return (!query || expense.note.toLowerCase().includes(query) || categories.find((c) => c.id === expense.categoryId)?.name.toLowerCase().includes(query)) && (categoryFilter === 'all' || expense.categoryId === categoryFilter); }).sort((a, b) => b.date.localeCompare(a.date));
  return <AppShell><div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><PageHeader eyebrow="Your spending story" title="Transactions" description="Every little choice, in one easy-to-browse place." action={<Button onClick={() => setModal({ mode: 'add' })} testId="button-add-transaction"><Plus size={18} />Add expense</Button>} />
    <div className="soft-card mb-5 rounded-[1.5rem] p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes or categories" className="w-full rounded-xl border border-transparent bg-[hsl(var(--background))] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[hsl(var(--primary)/.35)] focus:ring-4 focus:ring-[hsl(var(--primary)/.08)]" data-testid="input-search-transactions" /></div><div className="relative sm:w-52"><Filter size={15} className="pointer-events-none absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full appearance-none rounded-xl border border-transparent bg-[hsl(var(--background))] py-3 pl-10 pr-8 text-sm font-semibold outline-none focus:border-[hsl(var(--primary)/.35)]" data-testid="select-filter-category"><option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-[hsl(var(--muted-foreground))]" /></div></div></div>
    <div className="soft-card overflow-hidden rounded-[1.5rem] p-5 sm:p-7"><div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border)/.7)] pb-4"><div><p className="text-sm font-bold">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{search || categoryFilter !== 'all' ? 'Matching your filters' : 'All recorded spending'}</p></div>{(search || categoryFilter !== 'all') && <button className="text-xs font-bold text-[hsl(var(--primary))] hover:underline" onClick={() => { setSearch(''); setCategoryFilter('all'); }} data-testid="button-clear-filters">Clear filters</button>}</div>{filtered.length ? <div className="divide-y divide-[hsl(var(--border)/.7)]">{filtered.map((expense, index) => <ExpenseRow key={expense.id} expense={expense} category={categories.find((item) => item.id === expense.categoryId)} currency={settings.currency} index={index} onEdit={() => setModal({ mode: 'edit', expense })} onDelete={() => setDeleting(expense)} />)}</div> : <EmptyState title={search || categoryFilter !== 'all' ? 'Nothing matched' : 'Your list is clear'} text={search || categoryFilter !== 'all' ? 'Try another search or loosen the filter.' : 'Add an expense whenever you want to keep the picture current.'} action={!search && categoryFilter === 'all' ? <Button onClick={() => setModal({ mode: 'add' })} testId="button-add-empty-transaction"><Plus size={16} />Add expense</Button> : undefined} />}</div>
    </div>{modal && <ExpenseForm initial={modal.expense} onClose={() => setModal(null)} onSaved={setToast} />}{deleting && <DeleteModal expense={deleting} onClose={() => setDeleting(null)} onDelete={() => { deleteExpense(deleting.id); setDeleting(null); setToast('Expense removed'); }} />}{toast && <Toast message={toast} onDismiss={() => setToast('')} />}</AppShell>;
}

function SettingsPage() {
  const { settings, categories, expenses, setBudget, setCurrency, addCategory, updateCategory, deleteCategory, clearSampleData, clearAllData, seedData } = useStore();
  const [budget, setBudgetValue] = useState(String(settings.monthlyBudget));
  const [currency, setCurrencyValue] = useState(settings.currency);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(COLORS[0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState<'samples' | 'all' | null>(null);
  const saveBasics = (event: FormEvent) => { event.preventDefault(); const parsed = Number(budget); if (!Number.isFinite(parsed) || parsed <= 0) return setToast('Budget should be greater than zero'); setBudget(Math.round(parsed * 100) / 100); setCurrency(currency); setToast('Your plan is saved'); };
  const saveCategory = (event: FormEvent) => { event.preventDefault(); if (!categoryName.trim()) return setToast('Give your category a name'); if (editing) updateCategory(editing, categoryName.trim(), categoryColor); else addCategory(categoryName.trim(), categoryColor); setCategoryName(''); setCategoryColor(COLORS[0]); setEditing(null); setToast(editing ? 'Category updated' : 'Category added'); };
  const startEdit = (category: Category) => { setEditing(category.id); setCategoryName(category.name); setCategoryColor(category.color); };
  return <AppShell><div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><PageHeader eyebrow="Your space, your rules" title="Settings" description="Keep the foundations of your money practice feeling like you." />
    <form onSubmit={saveBasics} className="soft-card mb-5 rounded-[1.5rem] p-6 sm:p-8"><div className="mb-6 flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><WalletCards size={21} /></div><div><h2 className="serif text-2xl font-bold">Monthly rhythm</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">A simple reference point, not a rulebook.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="monthly-budget" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Monthly budget</label><div className="relative"><span className="absolute left-4 top-3.5 text-sm font-bold">{currencySymbols[currency]}</span><input id="monthly-budget" value={budget} onChange={(e) => setBudgetValue(e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-3 pl-9 pr-4 text-sm font-bold outline-none focus:border-[hsl(var(--primary))]" data-testid="input-monthly-budget" /></div></div><div><label htmlFor="currency" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Currency</label><select id="currency" value={currency} onChange={(e) => setCurrencyValue(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm font-bold outline-none focus:border-[hsl(var(--primary))]" data-testid="select-currency">{Object.keys(currencySymbols).map((code) => <option key={code} value={code}>{code} · {currencySymbols[code]}</option>)}</select></div></div><div className="mt-6 flex justify-end"><Button type="submit" testId="button-save-settings"><Check size={16} />Save preferences</Button></div></form>
    <section className="soft-card mb-5 rounded-[1.5rem] p-6 sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"><Tag size={21} /></div><div><h2 className="serif text-2xl font-bold">Categories</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Name the places your money tends to go.</p></div></div></div><form onSubmit={saveCategory} className="mb-5 flex flex-col gap-3 rounded-2xl bg-[hsl(var(--background))] p-3 sm:flex-row"><input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={editing ? 'Rename category' : 'New category name'} className="min-w-0 flex-1 rounded-xl border border-transparent bg-[hsl(var(--card))] px-4 py-3 text-sm font-semibold outline-none focus:border-[hsl(var(--primary)/.35)]" data-testid="input-category-name" /><div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--card))] px-3"><span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Color</span>{COLORS.slice(0, 6).map((color) => <button type="button" key={color} onClick={() => setCategoryColor(color)} className={`h-5 w-5 rounded-full transition-transform ${categoryColor === color ? 'scale-125 ring-2 ring-[hsl(var(--card))] ring-offset-2 ring-offset-[hsl(var(--background))]' : ''}`} style={{ backgroundColor: color }} aria-label={`Choose ${color}`} data-testid={`button-color-${color.slice(1)}`} />)}</div><Button type="submit" testId="button-save-category">{editing ? 'Update' : 'Add'}</Button>{editing && <Button onClick={() => { setEditing(null); setCategoryName(''); }} variant="quiet" testId="button-cancel-category">Cancel</Button>}</form><div className="grid gap-2 sm:grid-cols-2">{categories.map((category) => <div key={category.id} className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/.7)] px-3 py-3" data-testid={`row-category-${category.id}`}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} /><span className="flex-1 text-sm font-bold">{category.name}</span>{category.isDefault && <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Default</span>}<button onClick={() => startEdit(category)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" aria-label={`Edit ${category.name}`} data-testid={`button-edit-category-${category.id}`}><Edit3 size={15} /></button>{!category.isDefault && <button onClick={() => deleteCategory(category.id)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/.1)] hover:text-[hsl(var(--destructive))]" aria-label={`Delete ${category.name}`} data-testid={`button-delete-category-${category.id}`}><Trash2 size={15} /></button>}</div>)}</div></section>
    <section className="soft-card rounded-[1.5rem] p-6 sm:p-8"><div className="mb-6 flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><RotateCcw size={21} /></div><div><h2 className="serif text-2xl font-bold">Data controls</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">You are in charge of the information kept here.</p></div></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">Sample entries</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">A few realistic entries to help you find your footing.</p></div>{expenses.some((expense) => expense.id.startsWith('sample-')) ? <Button onClick={() => setConfirm('samples')} variant="outline" testId="button-clear-samples">Clear sample entries</Button> : <Button onClick={seedData} variant="outline" testId="button-restore-samples">Restore sample entries</Button>}</div><div className="my-5 h-px bg-[hsl(var(--border))]" /><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">All expense data</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Remove your expense history while keeping your preferences.</p></div><Button onClick={() => setConfirm('all')} variant="danger" testId="button-clear-all"><Trash2 size={15} />Clear all expenses</Button></div></section>
    </div>{confirm && <Modal title={confirm === 'all' ? 'Clear all expenses?' : 'Clear sample entries?'} onClose={() => setConfirm(null)}><p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">{confirm === 'all' ? 'This removes every expense currently saved in this browser.' : 'This removes only the starter entries. Your own additions will stay safe.'}</p><div className="mt-6 flex justify-end gap-3"><Button onClick={() => setConfirm(null)} variant="quiet" testId="button-cancel-data-clear">Cancel</Button><Button onClick={() => { if (confirm === 'all') clearAllData(); else clearSampleData(); setConfirm(null); setToast(confirm === 'all' ? 'All expense data cleared' : 'Sample entries cleared'); }} variant="danger" testId="button-confirm-data-clear">Yes, clear it</Button></div></Modal>}{toast && <Toast message={toast} onDismiss={() => setToast('')} />}</AppShell>;
}

function Router() {
  return <Switch><Route path="/" component={Dashboard} /><Route path="/transactions" component={Transactions} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><StoreProvider><Router /></StoreProvider></QueryClientProvider>;
}

export default App;