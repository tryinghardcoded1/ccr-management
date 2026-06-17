import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Customer } from '../types';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

export default function Customers() {
  const { customers, addCustomer, deleteCustomers } = useStore();
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'All' | 'NeedCheck'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Input states for New Customer
  const [formData, setFormData] = useState<Partial<Customer>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    driverLicenseNumber: '',
    driverLicenseExpiration: '',
    notes: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setValidationError('First Name, Last Name and Email are strictly required fields.');
      return;
    }
    
    addCustomer({
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      phone: formData.phone || '',
      street: formData.street || '',
      street2: formData.street2 || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zip || '',
      country: formData.country || 'United States',
      driverLicenseNumber: formData.driverLicenseNumber || '',
      driverLicenseExpiration: formData.driverLicenseExpiration || '',
      notes: formData.notes || '',
    });

    setShowDrawer(false);
    setValidationError('');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States',
      driverLicenseNumber: '',
      driverLicenseExpiration: '',
      notes: '',
    });
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.phone.includes(searchQuery);
      
      if (activeSubTab === 'NeedCheck') {
        return matchesSearch && !c.driverLicenseNumber;
      }
      return matchesSearch;
    });
  }, [customers, searchQuery, activeSubTab]);

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
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredCustomers.forEach(c => next.add(c.id));
      setSelectedIds(next);
    }
  };

  const handleDeleteSelected = () => {
    deleteCustomers(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Customers</h2>
          <p className="text-xs text-gray-400 mt-1">Car rental active customer contact register database.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowDrawer(true)} 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#001D4A] hover:bg-opacity-95 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            style={{ backgroundColor: '#1e3a8a' }}
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Sub tabs matching Image 2 */}
      <div className="flex border-b border-gray-200 text-sm">
        <button 
          onClick={() => setActiveSubTab('All')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-all ${activeSubTab === 'All' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          All
        </button>
        <button 
          onClick={() => setActiveSubTab('NeedCheck')}
          className={`pb-3 px-4 font-semibold border-b-2 transition-all ${activeSubTab === 'NeedCheck' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Still need to be checked
        </button>
      </div>

      {/* Search & Filter tools row match Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 border border-gray-150 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-gray-50 w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Start typing a name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-450 text-gray-700"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.size > 0 && (
            <button 
              type="button" 
              onClick={handleDeleteSelected} 
              className="px-3.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold text-red-600 shadow-xs transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            type="button" 
            onClick={() => alert('Search layout saved.')} 
            className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 shadow-xs transition"
          >
            Save this search
          </button>
        </div>
      </div>

      {/* Wide table display matching Image 2 columns */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer" 
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3 hidden md:table-cell">Email Address</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3 hidden lg:table-cell">Street</th>
                <th className="px-4 py-3 hidden xl:table-cell">Street 2</th>
                <th className="px-4 py-3 hidden lg:table-cell">City</th>
                <th className="px-4 py-3 hidden xl:table-cell">State</th>
                <th className="px-4 py-3 hidden xl:table-cell">Zip</th>
                <th className="px-4 py-3 hidden lg:table-cell">Country</th>
                <th className="px-4 py-3 hidden sm:table-cell">DL Number</th>
                <th className="px-4 py-3 hidden xl:table-cell">Expiration Date</th>
                <th className="px-4 py-3 hidden sm:table-cell">File Upload</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Booking Count</th>
                <th className="px-4 py-3 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredCustomers.map(c => {
                const isNoDl = !c.driverLicenseNumber;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 cursor-pointer" 
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelection(c.id)}
                      />
                    </td>
                    <td className="px-4 py-4 font-bold">
                      <Link to={`/customers/${c.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-650 hidden md:table-cell">{c.email}</td>
                    <td className="px-4 py-4 text-gray-650">{c.phone}</td>
                    <td className="px-4 py-4 text-gray-650 truncate max-w-[150px] hidden lg:table-cell">{c.street || '—'}</td>
                    <td className="px-4 py-4 text-gray-650 hidden xl:table-cell">{c.street2 || '—'}</td>
                    <td className="px-4 py-4 text-gray-650 hidden lg:table-cell">{c.city || '—'}</td>
                    <td className="px-4 py-4 text-gray-650 hidden xl:table-cell">{c.state || '—'}</td>
                    <td className="px-4 py-4 text-gray-650 hidden xl:table-cell">{c.zip || '—'}</td>
                    <td className="px-4 py-4 text-gray-650 hidden lg:table-cell">{c.country || '—'}</td>
                    <td className="px-4 py-4 font-mono text-gray-900 hidden sm:table-cell">{c.driverLicenseNumber || <span className="text-orange-500 italic text-[10px]">Pending</span>}</td>
                    <td className="px-4 py-4 text-gray-600 hidden xl:table-cell">{c.driverLicenseExpiration || '—'}</td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-gray-450">0 images</span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-gray-800 hidden md:table-cell">{c.totalRentals}</td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">
                      ${c.outstandingBalance ? (c.outstandingBalance * -1).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-gray-400 italic">No customer records matching criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer slide panel for registering new customer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/40 backdrop-blur-xs">
          <div className="w-full sm:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
            <div className="px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-gray-900 text-lg">Add New Customer</h3>
              <button onClick={() => setShowDrawer(false)} className="text-gray-400 hover:text-gray-700 font-extrabold text-xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm scrollbar-thin">
              {validationError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">First Name *</label>
                  <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name *</label>
                  <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address *</label>
                <input required type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Phone Number *</label>
                <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street 2</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.street2} onChange={e => setFormData({...formData, street2: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Zip</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Country</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
              </div>

              <div className="border-t border-gray-150 pt-3 mt-4 space-y-4">
                <h4 className="font-bold text-gray-800 text-sm">Identity Verification</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Driver's License Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.driverLicenseNumber} onChange={e => setFormData({...formData, driverLicenseNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Expiration Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.driverLicenseExpiration} onChange={e => setFormData({...formData, driverLicenseExpiration: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-bold hover:bg-indigo-700 transition shadow-md">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
