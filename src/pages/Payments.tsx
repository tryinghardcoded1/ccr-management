import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Users, Clock, ArrowRightLeft, Upload } from 'lucide-react';
import { BulkImportModal } from '../components/BulkImportModal';

export default function Payments() {
  const { payments, customers, reservations, addPayment } = useStore();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const groupedCustomerPayments = useMemo(() => {
    // 1. Filter matching payments by types (payment, refund, deposit)
    let matchedPayments = [...payments];
    if (filterType !== 'all') {
      matchedPayments = matchedPayments.filter(p => p.type === filterType);
    }

    // 2. Group by unique customerId to avoid duplicated names 
    const map: Record<string, {
      customerId: string;
      latestPayment: typeof payments[0];
      allMatchingPayments: typeof payments;
      totalAmount: number;
    }> = {};

    matchedPayments.forEach(p => {
      if (!map[p.customerId]) {
         map[p.customerId] = {
           customerId: p.customerId,
           latestPayment: p,
           allMatchingPayments: [p],
           totalAmount: p.amount
         };
      } else {
         const group = map[p.customerId];
         group.allMatchingPayments.push(p);
         group.totalAmount += p.amount;
         // Select the latest transaction based on exact timestamp
         if (new Date(p.date).getTime() > new Date(group.latestPayment.date).getTime()) {
           group.latestPayment = p;
         }
      }
    });

    // 3. Convert to array and sort by the latest payment date descending
    return Object.values(map).sort(
      (a, b) => new Date(b.latestPayment.date).getTime() - new Date(a.latestPayment.date).getTime()
    );
  }, [payments, filterType]);

  const collected = payments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
  const refunded = payments.filter(p => p.type === 'refund').reduce((sum, p) => sum + p.amount, 0);
  const depositHeld = payments.filter(p => p.type === 'deposit').reduce((sum, p) => sum + p.amount, 0);
  const outstanding = reservations.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Payment Record</h2>
          <p className="text-xs text-gray-450 uppercase tracking-widest mt-0.5">Deduplicated Customer Transaction Audits</p>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Collected Revenue</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">${collected.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Outstanding</p>
          <p className="text-3xl font-black text-orange-600 mt-2">${outstanding.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Deposits Held</p>
          <p className="text-3xl font-black text-indigo-600 mt-2">${depositHeld.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Refunded</p>
          <p className="text-3xl font-black text-slate-800 mt-2">${refunded.toFixed(2)}</p>
        </div>
      </div>

      {/* Filter and Ledger Table */}
      <div className="bg-white shadow-sm border border-gray-150 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-150 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">Customer Transaction Ledger</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsImportModalOpen(true)} 
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition"
            >
              Bulk Import
            </button>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filter By Type:</label>
            <select 
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white font-semibold text-gray-700 cursor-pointer hover:border-gray-400 transition" 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Transactions</option>
              <option value="payment">Regular Payment</option>
              <option value="deposit">Security Deposit</option>
              <option value="refund">Refund / Credit</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-gray-150">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Latest Reservation</th>
                <th className="px-6 py-4">Payment Date & Time</th>
                <th className="px-6 py-4">Payment Type</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 font-medium text-slate-700">
              {groupedCustomerPayments.map(group => {
                const c = customers.find(cust => cust.id === group.customerId);
                const p = group.latestPayment;
                return (
                  <tr 
                    key={group.customerId} 
                    onClick={() => navigate(`/customers/${group.customerId}?tab=payments`)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-all duration-150 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shadow-inner group-hover:bg-indigo-100 transition-colors">
                          {c?.firstName?.[0].toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {c ? `${c.firstName} ${c.lastName}` : 'Unknown Customer'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Click to view full customer profile payments</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {p.reservationId ? (
                        <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          #{p.reservationId.substring(0, 8).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">
                      {format(new Date(p.date), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                        ${p.type === 'payment' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                          (p.type === 'refund' ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-blue-50 text-blue-800 border-blue-200')}`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-650 text-xs font-semibold">{p.method}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-sm text-slate-900 font-bold">${p.amount.toFixed(2)}</div>
                      {group.allMatchingPayments.length > 1 && (
                        <div className="text-[10px] text-indigo-650 font-mono font-bold">
                          (Total of {group.allMatchingPayments.length}: ${group.totalAmount.toFixed(2)})
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {groupedCustomerPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No customers found matching current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isImportModalOpen && (
        <BulkImportModal
          title="Bulk Import Payments"
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          expectedHeaders={['customerId', 'reservationId', 'date', 'type', 'method', 'amount']}
          onImport={(data) => {
            for (const row of data as any[]) {
              addPayment({
                ...row,
                amount: parseFloat(row.amount)
              });
            }
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
