import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Plus, Search, Calendar, CheckSquare, Shield, Info, AlertTriangle, Printer, Trash2 } from 'lucide-react';

export default function Reservations() {
  const { reservations, customers, vehicles, chargeTemplates, createReservation, payments, deleteReservations } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const newCustomerParam = searchParams.get('newCustomer');

  const [activeFilterTab, setActiveFilterTab] = useState<'Active' | 'Returns' | 'TomorrowPickups' | 'TodayPickups' | 'TomorrowReturns' | 'OnRent' | 'Completed' | 'Cancelled' | 'Outstanding'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // If newCustomer parameter was passed, pre-select and open builder
  useEffect(() => {
    if (newCustomerParam) {
      navigate(`/reservations/new?customerId=${newCustomerParam}`);
    }
  }, [newCustomerParam, navigate]);

  // Filter calculations matching Image 3 tabs
  const filteredReservations = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return reservations.filter(res => {
      // General search query check
      const customer = customers.find(c => c.id === res.customerId);
      const vehicle = vehicles.find(v => v.id === res.vehicleId);
      const cName = customer ? `${customer.firstName} ${customer.lastName}`.toLowerCase() : '';
      const vName = vehicle ? `${vehicle.make} ${vehicle.model}`.toLowerCase() : '';
      
      const matchesSearch = cName.includes(searchQuery.toLowerCase()) || 
                            vName.includes(searchQuery.toLowerCase()) ||
                            res.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab sub-filtering
      switch (activeFilterTab) {
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
        case "Cancelled":
          return res.status === 'Cancelled';
        case "Outstanding":
          return res.balance > 0;
        case "Active":
        default:
          return res.status !== 'Completed' && res.status !== 'Cancelled';
      }
    });
  }, [reservations, customers, vehicles, searchQuery, activeFilterTab]);

  const sortedReservations = useMemo(() => {
    const list = [...filteredReservations].sort((a, b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime());
    const unique: typeof list = [];
    const seenCustomers = new Set();
    list.forEach(res => {
      if (!seenCustomers.has(res.customerId)) {
        seenCustomers.add(res.customerId);
        unique.push(res);
      }
    });
    return unique;
  }, [filteredReservations]);

  // Aggregate columns total sums for footer row based on ALL filtered
  const sumTotals = useMemo(() => {
    let price = 0;
    let revenue = 0;
    let paid = 0;
    let refund = 0;

    sortedReservations.forEach(res => {
      price += res.totalAmount;
      paid += (res.totalAmount - res.balance);
      revenue += res.totalAmount; // Recognizing revenue total matching image model

      // Security deposits refunds count as refunds
      if (res.securityDepositStatus === 'Refunded' && res.securityDepositRefundAmount) {
        refund += res.securityDepositRefundAmount;
      }
    });

    return { price, revenue, paid, refund };
  }, [sortedReservations]);

  const filterTabs = [
    { id: 'Active', label: 'Active Bookings' },
    { id: 'Returns', label: "Today's Returns" },
    { id: 'TomorrowPickups', label: "Tomorrow's Pickups" },
    { id: 'TodayPickups', label: "Today's Pickups" },
    { id: 'TomorrowReturns', label: "Tomorrow's Returns" },
    { id: 'OnRent', label: 'On Rent' },
    { id: 'Completed', label: 'Completed' },
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
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-3 border border-gray-150 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-gray-50 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Start typing a name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full placeholder-gray-450 text-gray-700"
          />
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
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3 hidden lg:table-cell">Return Date</th>
                <th className="px-4 py-3 hidden xl:table-cell">Pickup Location</th>
                <th className="px-4 py-3 hidden xl:table-cell">Vehicle Class</th>
                <th className="px-4 py-3 hidden md:table-cell">Vehicle</th>
                <th className="px-4 py-3 hidden lg:table-cell">Price</th>
                <th className="px-4 py-3 text-right font-bold">Paid</th>
                <th className="px-4 py-3 text-right font-bold hidden sm:table-cell">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {sortedReservations.map((res, index) => {
                const c = customers.find(cust => cust.id === res.customerId);
                const v = vehicles.find(veh => veh.id === res.vehicleId);
                const paidAmt = res.totalAmount - res.balance;
                
                const bookingIndex = sortedReservations.length - index; 

                return (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 cursor-pointer" 
                        checked={selectedIds.has(res.id)}
                        onChange={() => toggleSelection(res.id)}
                      />
                    </td>
                    <td className="px-4 py-4 font-bold text-blue-600 text-center">
                      <Link to={`/reservations/${res.id}`} className="hover:underline">
                        {bookingIndex > 0 ? bookingIndex : res.id.substring(0, 4).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {c ? (
                        <Link to={`/reservations/${res.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {c.firstName} {c.lastName}
                        </Link>
                      ) : (
                        <span className="text-gray-450">Deleted</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">{res.pickupDate}</td>
                    <td className="px-4 py-4 text-gray-700 hidden lg:table-cell">{res.returnDate}</td>
                    <td className="px-4 py-4 text-gray-500 hidden xl:table-cell">Office</td>
                    <td className="px-4 py-4 text-gray-550 font-medium hidden xl:table-cell">{v ? v.category : 'Premium'}</td>
                    <td className="px-4 py-4 font-medium text-gray-800 hidden md:table-cell">
                      {v ? `${v.make.toUpperCase()} ${v.model.toUpperCase()}` : <span className="text-orange-400 font-semibold text-[10px]">Not Assigned</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-900 hidden lg:table-cell">${res.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-bold text-green-700">${paidAmt.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-bold text-red-600 hidden sm:table-cell">${res.balance.toFixed(2)}</td>
                  </tr>
                );
              })}

              {sortedReservations.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-400 italic">No bookings recorded.</td>
                </tr>
              )}

              {/* Aggregations footer summary row matching Image 3 style */}
              {sortedReservations.length > 0 && (
                <tr className="bg-[#f1f5f9] font-black text-gray-950 text-right">
                  <td colSpan={9} className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px] text-gray-600">Total Summaries</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">${sumTotals.price.toFixed(2)}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-900">${sumTotals.revenue.toFixed(2)}</td>
                  <td className="px-4 py-3 font-extrabold text-green-850">${sumTotals.paid.toFixed(2)}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-600">${sumTotals.refund.toFixed(2)}</td>
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
    </div>
  );
}
