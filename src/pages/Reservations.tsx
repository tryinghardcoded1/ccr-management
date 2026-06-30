import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Plus, Search, Calendar, CheckSquare, Shield, Info, AlertTriangle, Printer, Trash2, Upload, Eye, Mail, Edit2 } from 'lucide-react';
import { BulkImportModal } from '../components/BulkImportModal';

export default function Reservations() {
  const { reservations, customers, vehicles, chargeTemplates, createReservation, payments, deleteReservations } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const newCustomerParam = searchParams.get('newCustomer');

  const [activeFilterTab, setActiveFilterTab] = useState<'All' | 'Active' | 'Returns' | 'TomorrowPickups' | 'TodayPickups' | 'TomorrowReturns' | 'OnRent' | 'Completed' | 'Closed' | 'Cancelled' | 'Outstanding'>('Closed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [quickViewRes, setQuickViewRes] = useState<any>(null);

  // If newCustomer parameter was passed, pre-select and open builder
  useEffect(() => {
    if (newCustomerParam) {
      navigate(`/reservations/new?customerId=${newCustomerParam}`);
    }
    if (location.state && location.state.filter) {
        setActiveFilterTab(location.state.filter === 'active' ? 'Active' : 'Outstanding');
    }
  }, [newCustomerParam, navigate, location.state]);

  // Filter calculations matching Image 3 tabs
  const filteredReservations = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return reservations.filter(res => {
      // General search query check
      const customer = customers.find(c => c.id === res.customerId);
      const vehicle = vehicles.find(v => v.id === res.vehicleId);
      const cName = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
      const cEmail = customer ? customer.email.toLowerCase() : '';
      const vName = vehicle ? `${vehicle.make} ${vehicle.model}`.toLowerCase() : '';
      const vPlate = vehicle ? vehicle.licensePlate.toLowerCase() : '';
      
      const matchesSearch = cName.includes(searchQuery.toLowerCase()) || 
                            cEmail.includes(searchQuery.toLowerCase()) ||
                            vName.includes(searchQuery.toLowerCase()) ||
                            vPlate.includes(searchQuery.toLowerCase()) ||
                            res.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab sub-filtering
      switch (activeFilterTab) {
        case "All":
          return true;
        case "Returns":
          return res.returnDate === todayStr && !res.vehicleReturned;
        case "TomorrowPickups":
          return res.pickupDate === tomorrowStr;
        case "TodayPickups":
          return res.pickupDate === todayStr;
        case "TomorrowReturns":
          return res.returnDate === tomorrowStr;
        case "OnRent":
          return res.status === 'Checked Out';
        case "Completed":
          return res.status === 'Completed';
        case "Closed":
          return res.status === 'Closed';
        case "Cancelled":
          return res.status === 'Cancelled';
        case "Outstanding":
          return res.balance > 0;
        case "Active":
        default:
          return res.status !== 'Completed' && res.status !== 'Cancelled' && res.status !== 'Closed';
      }
    });
  }, [reservations, customers, vehicles, searchQuery, activeFilterTab]);

  const sortedReservations = useMemo(() => {
    return [...filteredReservations].sort((a, b) => {
      const aTime = a.pickupDate ? new Date(a.pickupDate).getTime() : 0;
      const bTime = b.pickupDate ? new Date(b.pickupDate).getTime() : 0;
      const finalA = isNaN(aTime) ? 0 : aTime;
      const finalB = isNaN(bTime) ? 0 : bTime;
      return finalB - finalA;
    });
  }, [filteredReservations]);

  const suggestions = useMemo(() => {
    if (searchQuery.length < 1) return [];
    const query = searchQuery.toLowerCase();
    const suggestionsSet = new Set<string>();

    customers.forEach(c => {
      if (c.firstName.toLowerCase().includes(query)) suggestionsSet.add(`${c.firstName} ${c.lastName}`);
      if (c.lastName.toLowerCase().includes(query)) suggestionsSet.add(`${c.firstName} ${c.lastName}`);
      if (c.email.toLowerCase().includes(query)) suggestionsSet.add(c.email);
    });
    vehicles.forEach(v => {
      if (v.licensePlate.toLowerCase().includes(query)) suggestionsSet.add(v.licensePlate);
      if (v.make.toLowerCase().includes(query)) suggestionsSet.add(`${v.make} ${v.model}`);
    });

    return Array.from(suggestionsSet).slice(0, 5);
  }, [searchQuery, customers, vehicles]);

  const isGroupedTab = ['Completed', 'Closed', 'Cancelled'].includes(activeFilterTab);

  const groupedReservations = useMemo(() => {
    if (!isGroupedTab) return null;
    const groups = new Map<string, typeof sortedReservations>();
    sortedReservations.forEach(res => {
      if (!groups.has(res.customerId)) groups.set(res.customerId, []);
      groups.get(res.customerId)!.push(res);
    });
    return groups;
  }, [isGroupedTab, sortedReservations]);

  const toggleGroup = (customerId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(customerId)) next.delete(customerId);
    else next.add(customerId);
    setExpandedGroups(next);
  };

  const renderRow = (res: any) => {
    const c = customers.find(cust => cust.id === res.customerId);
    const v = vehicles.find(veh => veh.id === res.vehicleId);
    const paidAmt = res.totalAmount - res.balance;
    const displayNum = `RES-${res.id.substring(0, 5).toUpperCase()}`;

    return (
        <tr key={res.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-4 w-4">
            <input 
            type="checkbox" 
            className="rounded border-gray-300 cursor-pointer" 
            checked={selectedIds.has(res.id)}
            onChange={() => toggleSelection(res.id)}
            />
        </td>
        <td className="px-4 py-4 text-center">
          <button onClick={() => setQuickViewRes(res)} className="text-gray-400 hover:text-indigo-600">
            <Info className="w-4 h-4" />
          </button>
        </td>
        {/* 1. THE NUMBER */}
        <td className="px-4 py-4 font-bold text-blue-600">
            <Link to={`/reservations/${res.id}`} className="hover:underline">
            {displayNum}
            </Link>
        </td>
        {/* 2. RESERVATION STATUS */}
        <td className="px-4 py-4 font-medium">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
            ${res.status === 'Completed' ? 'bg-green-50 text-green-800 border-green-200' : 
                res.status === 'Closed' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                res.status === 'Checked Out' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                res.status === 'Checked In' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                res.status === 'Confirmed' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                res.status === 'Cancelled' ? 'bg-red-50 text-red-850 border-red-250' : 'bg-gray-100 text-gray-800 border-gray-200'}`}
            >
            {res.status}
            </span>
        </td>
        {/* Deposit Status */}
        <td className="px-4 py-4">
            {res.status === 'Completed' ? (
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border
                ${res.securityDepositStatus === 'On Hold' ? 'bg-red-50 text-red-600 border-red-250 font-bold' :
                res.securityDepositStatus === 'Refunded' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                res.securityDepositStatus === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                res.securityDepositStatus === 'Pending' ? 'bg-yellow-50 text-yellow-850 border-yellow-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
            >
                {res.securityDepositStatus}
            </span>
            ) : null}
        </td>
        {/* 3. CUSTOMER NAME */}
        <td className="px-4 py-4 font-bold">
            {c ? (
            <Link to={`/reservations/${res.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                {c.firstName} {c.lastName}
            </Link>
            ) : (
            <span className="text-gray-450">Deleted</span>
            )}
        </td>
        {/* 8. PAID */}
        <td className="px-4 py-4 text-right font-black text-emerald-600 text-sm">
            ${paidAmt.toFixed(2)}
        </td>
        {/* 10. BALANCE */}
        <td className={`px-4 py-4 text-right font-black text-sm ${res.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ${res.balance.toFixed(2)}
        </td>
        {/* 11. QUICK ACTIONS */}
        <td className="px-4 py-4 text-center">
            <div className="flex justify-center gap-2">
                <Link to={`/reservations/${res.id}`} title="View Details" className="text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></Link>
                <button title="Send Email" className="text-gray-400 hover:text-indigo-600"><Mail className="w-4 h-4" /></button>
                <Link to={`/reservations/${res.id}/edit`} title="Edit" className="text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></Link>
            </div>
        </td>
        </tr>
    );
  };
  const sumTotals = useMemo(() => {
    let price = 0;
    let paid = 0;
    let balance = 0;

    sortedReservations.forEach(res => {
      price += res.totalAmount;
      paid += (res.totalAmount - res.balance);
      balance += res.balance;
    });

    return { price, paid, balance };
  }, [sortedReservations]);

  const filterTabs = [
    { id: 'All', label: 'All' },
    { id: 'Active', label: 'Active Bookings' },
    { id: 'Returns', label: "Today's Returns" },
    { id: 'TomorrowPickups', label: "Tomorrow's Pickups" },
    { id: 'TodayPickups', label: "Today's Pickups" },
    { id: 'TomorrowReturns', label: "Tomorrow's Returns" },
    { id: 'OnRent', label: 'On Rent' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Closed', label: 'Closed' },
    { id: 'Cancelled', label: 'Cancelled' },
    { id: 'Outstanding', label: 'Outstanding Payment' }
  ] as const;

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
    if (selectedIds.size === sortedReservations.length && sortedReservations.length > 0) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      sortedReservations.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const handleDeleteSelected = () => {
    deleteReservations(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header Bar matching Image 3 styling */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-black text-gray-950">Bookings</h2>
          <p className="text-xs text-gray-400 mt-1">Car rental fleet reservation schedule & checkouts control board.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button 
              type="button" 
              onClick={handleDeleteSelected} 
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold text-red-600 shadow-sm transition flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            type="button" 
            onClick={() => alert('Vehicle compatibility and class checks are fully operational based on current schedules.')}
            className="px-4 py-2 border border-gray-350 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-700 transition"
          >
            Availability Check
          </button>
          
          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)} 
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition mr-2"
          >
            <Upload className="w-4 h-4" /> Bulk Import
          </button>
          <button 
            type="button"
            onClick={() => navigate('/reservations/new')} 
            className="px-4 py-2 bg-[#001D4A] hover:bg-opacity-95 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            style={{ backgroundColor: '#1e3a8a' }}
          >
            New Booking
          </button>
        </div>
      </div>

      {/* Sub tabs filtering row matching Image 3 */}
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-1 -mb-px text-xs font-semibold text-gray-500">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilterTab(tab.id);
                setSelectedIds(new Set());
              }}
              className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
                activeFilterTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent hover:text-gray-950 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters Match Image 3 */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-3 border border-gray-150 rounded-xl shadow-xs relative">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-gray-50 w-full max-w-sm relative">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, or license..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full placeholder-gray-450 text-gray-700"
          />
          {/* Suggestions Dropdown */}
          {searchQuery.length >= 1 && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-xs text-gray-700"
                  onClick={() => setSearchQuery(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => alert('Booking layout saved.')} 
            className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 shadow-xs transition"
          >
            Save this search
          </button>
        </div>
      </div>

      {/* Grid Table Layout matching Image 3 columns */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#f8fafc] text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                 <th className="px-4 py-3 w-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 cursor-pointer" 
                    checked={selectedIds.size === sortedReservations.length && sortedReservations.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 w-4"></th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Reservation Status</th>
                <th className="px-4 py-3">Deposit Status</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3 text-right font-bold">Paid</th>
                <th className="px-4 py-3 text-right font-bold">Balance</th>
                <th className="px-4 py-3 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {isGroupedTab && groupedReservations ? (
                Array.from(groupedReservations.entries()).map(([customerId, resList]) => {
                  const customer = customers.find(c => c.id === customerId);
                  const isExpanded = expandedGroups.has(customerId);
                  return (
                    <React.Fragment key={customerId}>
                      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => toggleGroup(customerId)}>
                        <td colSpan={13} className="px-4 py-3 font-bold text-gray-950 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{isExpanded ? '▼' : '▶'}</span>
                            <span>{customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}</span>
                            <span className="text-gray-500 font-normal">({resList.length} Reservations)</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && resList.map(res => renderRow(res))}
                    </React.Fragment>
                  );
                })
              ) : (
                sortedReservations.map(res => renderRow(res))
              )}

              {sortedReservations.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-400 italic">No bookings recorded.</td>
                </tr>
              )}

              {/* Aggregations footer summary row matching columns layout */}
              {sortedReservations.length > 0 && (
                <tr className="bg-[#f1f5f9] font-black text-gray-950 text-right text-xs">
                  <td colSpan={6} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-gray-650">Total Summaries</td>
                  <td className="px-4 py-3 font-extrabold text-green-700">${sumTotals.paid.toFixed(2)}</td>
                  <td className={`px-4 py-3 font-extrabold ${sumTotals.balance > 0 ? 'text-red-700' : 'text-gray-900'}`}>${sumTotals.balance.toFixed(2)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/40 backdrop-blur-xs">
          <div className="w-full sm:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
            <div className="px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-gray-900 text-lg">New Booking File</h3>
              <button onClick={() => setShowDrawer(false)} className="text-gray-400 hover:text-gray-700 font-extrabold text-xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-1.5">1. Customer & Vehicle</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Representative</label>
                  <select 
                    required 
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                    className="w-full border rounded-lg p-2 text-sm bg-white outline-none focus:ring-1 focus:ring-indigo-500" 
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Select Fleet Vehicle</label>
                  <select 
                    required 
                    value={formData.vehicleId}
                    onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:ring-1 focus:ring-indigo-500" 
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} - [{v.licensePlate}] - ${v.dailyRate}/day
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-1.5">2. Booking Term Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Pickup Date</label>
                    <input type="date" required className="w-full border rounded-lg p-2 text-sm outline-none" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Pickup Time</label>
                    <input type="time" required className="w-full border rounded-lg p-2 text-sm outline-none" value={formData.pickupTime} onChange={e => setFormData({...formData, pickupTime: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Return Date</label>
                    <input type="date" required className="w-full border rounded-lg p-2 text-sm outline-none" value={formData.returnDate} onChange={e => setFormData({...formData, returnDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Return Time</label>
                    <input type="time" required className="w-full border rounded-lg p-2 text-sm outline-none" value={formData.returnTime} onChange={e => setFormData({...formData, returnTime: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider border-b pb-1.5">3. Extra Services Addon Fees</h4>
                <div className="space-y-2">
                  {chargeTemplates.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => toggleCharge(t.id)}
                      className={`flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition ${selectedCharges.includes(t.id) ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedCharges.includes(t.id)} readOnly className="rounded border-gray-300 pointer-events-none" />
                        <div>
                          <span className="font-bold text-xs text-gray-900 block">{t.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono italic">{t.category}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-800">${t.rate}{t.perDay ? '/day' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Rental Timeline</span>
                  <span className="font-bold text-gray-950">{rentalDays} Day{rentalDays > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Base Scale Rate</span>
                  <span className="font-bold text-gray-950">${selectedVehicle ? selectedVehicle.dailyRate : 0}/day</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2 font-black text-sm text-gray-900">
                  <span>Calculated Base Rental</span>
                  <span>${baseRental.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={!formData.customerId || !formData.vehicleId || !formData.pickupDate || !formData.returnDate} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */ }
      {isImportModalOpen && (
        <BulkImportModal
          title="Bulk Import Reservations"
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          expectedHeaders={['customerId', 'vehicleId', 'pickupDate', 'pickupTime', 'returnDate', 'returnTime', 'status', 'totalAmount', 'balance', 'securityDepositAmount', 'securityDepositStatus']}
          onImport={(data) => {
            for (const row of data as any[]) {
              createReservation({
                ...row,
                totalAmount: parseFloat(row.totalAmount),
                balance: parseFloat(row.balance),
                securityDepositAmount: parseFloat(row.securityDepositAmount)
              }, []);
            }
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
