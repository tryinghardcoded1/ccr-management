import React, { useState } from 'react';
import { useStore } from '../store';
import { Vehicle } from '../types';
import { Trash2 } from 'lucide-react';

export default function Vehicles() {
  const { vehicles, addVehicle, deleteVehicles } = useStore();
  const [showDrawer, setShowDrawer] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({ status: 'Available' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.make && formData.model && formData.licensePlate && formData.dailyRate) {
      addVehicle(formData as any);
      setShowDrawer(false);
      setFormData({ status: 'Available' });
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

  const handleDeleteSelected = () => {
    deleteVehicles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Fleet Management</h2>
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
            Add Vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className={`bg-white border text-sm rounded-xl overflow-hidden shadow-sm flex flex-col relative transition-all ${selectedIds.has(v.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100'}`}>
            <div className="absolute top-3 left-3 bg-white/80 rounded block">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 w-4 h-4 cursor-pointer" 
                checked={selectedIds.has(v.id)}
                onChange={() => toggleSelection(v.id)}
              />
            </div>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center pl-10">
              <span className="font-bold text-gray-900">{v.licensePlate}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium 
                ${v.status === 'Available' ? 'bg-green-100 text-green-700' : 
                  (v.status === 'Reserved' || v.status === 'Rented') ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`
              }>{v.status}</span>
            </div>
            <div className="p-4 flex-1">
              <h3 className="font-bold text-lg mb-1">{v.year} {v.make} {v.model}</h3>
              <p className="text-gray-500 mb-4">{v.category} • {v.color}</p>
              <div className="flex justify-between items-end mt-auto">
                <div>
                  <p className="text-xs text-gray-400">Daily Rate</p>
                  <p className="font-medium text-gray-900">${v.dailyRate}/day</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Mileage</p>
                  <p className="font-medium text-gray-900">{v.mileage || 0} mi</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No vehicles in fleet.
          </div>
        )}
      </div>

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">New Vehicle</h3>
              <button onClick={() => setShowDrawer(false)} className="text-gray-500 hover:text-gray-900">Close</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Make</label><input required className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, make: e.target.value})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Model</label><input required className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, model: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Year</label><input required type="number" className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">License Plate</label><input required className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, licensePlate: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Daily Rate ($)</label><input required type="number" className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, dailyRate: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select required className="w-full border rounded-md px-3 py-2 text-sm bg-white" onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Economy">Economy</option>
                    <option value="Compact">Compact</option>
                    <option value="Midsize">Midsize</option>
                    <option value="Standard">Standard</option>
                    <option value="Full Size">Full Size</option>
                    <option value="SUV">SUV</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-xs font-medium text-gray-700 mb-1">VIN</label><input className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, VIN: e.target.value})} /></div>
               <div><label className="block text-xs font-medium text-gray-700 mb-1">Color</label><input className="w-full border rounded-md px-3 py-2 text-sm" onChange={e => setFormData({...formData, color: e.target.value})} /></div>
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
