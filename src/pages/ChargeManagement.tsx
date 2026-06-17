import React, { useState } from 'react';
import { useStore } from '../store';
import { ReservationStatus } from '../types';
import { Trash2 } from 'lucide-react';

export default function ChargeManagement() {
  const { chargeTemplates, addChargeTemplate, deleteChargeTemplate, deleteChargeTemplates } = useStore();
  const [showDrawer, setShowDrawer] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'External Charge', rate: 0, perDay: false });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.rate >= 0) {
      addChargeTemplate(formData as any);
      setShowDrawer(false);
      setFormData({ name: '', category: 'External Charge', rate: 0, perDay: false });
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === chargeTemplates.length && chargeTemplates.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      chargeTemplates.forEach(t => next.add(t.id));
      setSelectedIds(next);
    }
  };

  const handleDeleteSelected = () => {
    deleteChargeTemplates(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Charge Management</h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold text-red-600 shadow-sm transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setShowDrawer(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            New Template
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 w-4">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 cursor-pointer" 
                  checked={selectedIds.size === chargeTemplates.length && chargeTemplates.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Rate</th>
              <th className="px-6 py-3">Billing Type</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {chargeTemplates.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer" 
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelection(t.id)}
                  />
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{t.category}</span></td>
                <td className="px-6 py-4 font-mono">${t.rate.toFixed(2)}</td>
                <td className="px-6 py-4 text-gray-500">{t.perDay ? 'Per Day' : 'Flat Fee'}</td>
                <td className="px-6 py-4 text-right">
                    <button onClick={() => deleteChargeTemplate(t.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {chargeTemplates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No charge templates defined.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">New Charge Template</h3>
              <button onClick={() => setShowDrawer(false)} className="text-gray-500 hover:text-gray-900">Close</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Name</label><input required className="w-full border rounded-md px-3 py-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select required className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="External Charge">External Charge</option>
                  <option value="Fine">Fine</option>
                  <option value="Claim">Claim</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Rate ($)</label><input required type="number" className="w-full border rounded-md px-3 py-2 text-sm" value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})} /></div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="perDay" checked={formData.perDay} onChange={e => setFormData({...formData, perDay: e.target.checked})} className="rounded border-gray-300" />
                <label htmlFor="perDay" className="text-sm text-gray-700">Charge per day of rental</label>
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
