import { useState } from 'react';
import { useStore } from '../store';
import { Archive as ArchiveIcon, Users, Car, Calendar, Settings } from 'lucide-react';

export default function Archive() {
  const { archivedCustomers, archivedVehicles, archivedReservations, archivedChargeTemplates } = useStore();
  const [activeTab, setActiveTab] = useState<'Customers' | 'Vehicles' | 'Reservations' | 'Charge Templates'>('Customers');

  const formatDate = (dateStr: any) => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString();
    } catch (e) {
      return String(dateStr || 'N/A');
    }
  };

  const tabs = [
    { id: 'Customers', icon: Users, count: archivedCustomers.length },
    { id: 'Vehicles', icon: Car, count: archivedVehicles.length },
    { id: 'Reservations', icon: Calendar, count: archivedReservations.length },
    { id: 'Charge Templates', icon: Settings, count: archivedChargeTemplates.length },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <ArchiveIcon className="w-8 h-8 text-indigo-500" />
            Archive
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Review deleted items safely stored in the system archive.</p>
        </div>
      </div>

      <div className="flex space-x-1 p-1 bg-slate-100/50 rounded-xl max-w-max border border-slate-200/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.id}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'Customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{c.firstName} {c.lastName}</td>
                    <td className="px-6 py-4 text-slate-500">{c.email}</td>
                    <td className="px-6 py-4 text-slate-500">{c.phone}</td>
                  </tr>
                ))}
                {archivedCustomers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">No archived customers.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Vehicles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">License Plate</th>
                  <th className="px-6 py-4">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{v.make} {v.model} ({v.year})</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{v.licensePlate}</td>
                    <td className="px-6 py-4 text-slate-500">{v.category}</td>
                  </tr>
                ))}
                {archivedVehicles.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">No archived vehicles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Reservations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Reservation ID</th>
                  <th className="px-6 py-4">Pick-up</th>
                  <th className="px-6 py-4">Return</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedReservations.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{r.id.split('-')[0]}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(r.pickupDate)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(r.returnDate)}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{r.status}</td>
                  </tr>
                ))}
                {archivedReservations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">No archived reservations.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Charge Templates' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedChargeTemplates.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{t.name}</td>
                    <td className="px-6 py-4 text-slate-500">{t.category}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">${t.rate.toFixed(2)}{t.perDay ? '/day' : ''}</td>
                  </tr>
                ))}
                {archivedChargeTemplates.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-400 font-medium">No archived templates.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
