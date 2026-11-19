import React, { createContext, useContext } from 'react';

const TabsContext = createContext({ value: '', onValueChange: () => {} });

export function Card({ children, className = '', ...props }) {
  return <section className={`rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`} {...props}>{children}</section>;
}

export function CardHeader({ children, className = '', ...props }) {
  return <div className={`p-5 pb-3 ${className}`} {...props}>{children}</div>;
}

export function CardContent({ children, className = '', ...props }) {
  return <div className={`p-5 pt-2 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }) {
  return <h2 className={`text-lg font-bold text-gray-900 dark:text-white ${className}`} {...props}>{children}</h2>;
}

export function CardDescription({ children, className = '', ...props }) {
  return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`} {...props}>{children}</p>;
}

export function Table({ children, className = '', ...props }) {
  return <table className={`w-full caption-bottom text-sm ${className}`} {...props}>{children}</table>;
}
export function TableHeader({ children, ...props }) { return <thead {...props}>{children}</thead>; }
export function TableBody({ children, className = '', ...props }) { return <tbody className={className} {...props}>{children}</tbody>; }
export function TableRow({ children, className = '', ...props }) { return <tr className={`border-b border-gray-100 dark:border-gray-800 ${className}`} {...props}>{children}</tr>; }
export function TableHead({ children, className = '', ...props }) { return <th className={`h-11 px-3 text-left align-middle font-semibold text-gray-500 dark:text-gray-400 ${className}`} {...props}>{children}</th>; }
export function TableCell({ children, className = '', ...props }) { return <td className={`px-3 py-3 align-middle ${className}`} {...props}>{children}</td>; }

export function Badge({ children, variant = 'secondary', className = '', ...props }) {
  const colors = {
    destructive: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    default: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    outline: 'border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[variant] || colors.secondary} ${className}`} {...props}>{children}</span>;
}

export function Tabs({ children, value, onValueChange, className = '' }) {
  return <TabsContext.Provider value={{ value, onValueChange }}><div className={className}>{children}</div></TabsContext.Provider>;
}
export function TabsList({ children, className = '', ...props }) {
  return <div className={`inline-flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 ${className}`} {...props}>{children}</div>;
}
export function TabsTrigger({ children, value, className = '', ...props }) {
  const tabs = useContext(TabsContext);
  const active = tabs.value === value;
  return <button type="button" aria-pressed={active} onClick={() => tabs.onValueChange(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'} ${className}`} {...props}>{children}</button>;
}

export function Alert({ children, variant, className = '', ...props }) {
  const color = variant === 'destructive'
    ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
    : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200';
  return <div role="status" className={`rounded-xl border p-4 ${color} ${className}`} {...props}>{children}</div>;
}
export function AlertDescription({ children, className = '', ...props }) { return <p className={`text-sm ${className}`} {...props}>{children}</p>; }
export function AlertTitle({ children, className = '', ...props }) { return <h3 className={`font-bold ${className}`} {...props}>{children}</h3>; }
export function Skeleton({ className = '', ...props }) { return <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`} {...props} />; }

export function Button({ children, variant = 'outline', size = 'default', className = '', ...props }) {
  const colors = variant === 'ghost'
    ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800';
  const dimensions = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return <button className={`inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${colors} ${dimensions} ${className}`} {...props}>{children}</button>;
}
