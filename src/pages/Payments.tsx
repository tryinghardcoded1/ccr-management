import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';

export default function Payments() {
  const { payments, customers, reservations } = useStore();
  const [filterType, setFilterType] = useState('all');

  const filteredPayments = useMemo(() => {
    let sorted = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterType !== 'all') {
      sorted = sorted.filter(p => p.type === filterType);
    }
    return sorted;
  }, [payments, filterType]);

  const collected = payments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
  const refunded = payments.filter(p => p.type === 'refund').reduce((sum, p) => sum + p.amount, 0);
  const depositHeld = payments.filter(p => p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0);
  const outstanding = reservations.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payments & Transactions</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Collected Revenue</p>
          <p className="text-3xl font-bold text-green-600 mt-2">${collected.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">${outstanding.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Deposits Held</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">${depositHeld.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Refunded</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">${refunded.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <select className="border rounded-md px-3 py-1.5 text-sm bg-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Transactions</option>
            <option value="payment">Payments</option>
            <option value="deposit">Deposits</option>
            <option value="refund">Refunds</option>
          </select>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Type / Label</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Reservation ID</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.map(p => {
              const c = customers.find(c => c.id === p.customerId);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{format(new Date(p.date), 'MMM d, yyyy HH:mm')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase
                      ${p.type === 'payment' ? 'bg-green-100 text-green-700' : 
                        (p.type === 'refund' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}`
                    }>
                      {p.type}
                    </span>
                    {p.label && <span className="ml-2 text-xs text-gray-500">{p.label}</span>}
                  </td>
                  <td className="px-6 py-4">{c?.firstName} {c?.lastName}</td>
                  <td className="px-6 py-4 text-indigo-600 font-mono text-xs">{p.reservationId.substring(0,8).toUpperCase()}</td>
                  <td className="px-6 py-4">{p.method}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    ${p.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
