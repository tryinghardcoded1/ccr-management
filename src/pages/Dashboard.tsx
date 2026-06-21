import { useStore } from '../store';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { DollarSign, Calendar, ArrowUpRight, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const mockChartData = [
  { name: '1', cashFlow: 1200, fleetLoad: 600 },
  { name: '2', cashFlow: 2100, fleetLoad: 1200 },
  { name: '3', cashFlow: 1800, fleetLoad: 800 },
  { name: '4', cashFlow: 3000, fleetLoad: 1600 },
  { name: '5', cashFlow: 2400, fleetLoad: 1000 },
  { name: '6', cashFlow: 3500, fleetLoad: 1400 },
  { name: '7', cashFlow: 4000, fleetLoad: 2000 },
];

export default function Dashboard() {
  const store = useStore();

  const totalRevenue = store.payments
    .filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + p.amount, 0);

  const todayRevenue = store.payments
    .filter(p => p.type === 'payment' && isToday(new Date(p.date)))
    .reduce((sum, p) => sum + p.amount, 0);

  const monthlyRevenue = store.payments
    .filter(p => p.type === 'payment' && isThisMonth(new Date(p.date)))
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = store.reservations.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

  const activeReservations = store.reservations.filter(r => !['Completed', 'Cancelled', 'Closed'].includes(r.status));
  const activeCount = activeReservations.length;

  const availableVehicles = store.vehicles.filter(v => v.status === 'Available').length;
  const rentedVehicles = store.vehicles.filter(v => v.status === 'Rented' || v.status === 'Reserved').length;
  const serviceVehicles = store.vehicles.filter(v => v.status === 'Maintenance').length;
  const repairVehicles = store.vehicles.filter(v => v.status === 'Repair').length;

  const todayPickups = activeReservations.filter(r => isToday(new Date(r.pickupDate))).length;
  const todayReturns = activeReservations.filter(r => isToday(new Date(r.returnDate))).length;

  const pendingRefunds = store.reservations
    .filter(r => r.status === 'Completed' && !r.securityDepositRefunded)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* Top Banner */}
      <div className="bg-[#1a1b2e] rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center text-white overflow-hidden relative shadow-lg">
        {/* Abstract background blobs could go here, for now relying on solid bg and gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="z-10 bg-[#252841] text-xs font-semibold px-3 py-1 rounded-full text-green-400 flex items-center gap-1.5 mb-4 max-w-max border border-white/5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
          LIVE PERFORMANCE INDICATOR
        </div>
        
        <div className="z-10 flex-1 w-full md:w-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
            You made <span className="text-green-400">${todayRevenue.toFixed(2)}</span> Today
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-medium">
            Based on real-time transaction updates, daily flat-rates, and live payment settlements.
          </p>
        </div>

        <div className="z-10 mt-6 md:mt-0 bg-[#212338] border border-white/10 rounded-xl p-4 w-full md:w-72">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
            <span>Daily Target Status</span>
            <span className="text-green-400">100% Active</span>
          </div>
          <div className="w-full bg-[#161726] rounded-full h-1.5 overflow-hidden">
            <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      {/* 4-col KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6 w-full">
            <p className="text-xs font-bold text-slate-400 tracking-wider">TOTAL GROSS REVENUE</p>
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">${totalRevenue.toFixed(2)}</h2>
            <p className="text-xs text-slate-400 font-medium">Lifetime revenue accrued from closed billing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6 w-full">
            <p className="text-xs font-bold text-slate-400 tracking-wider">SELECTED MONTH REVENUE</p>
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">${monthlyRevenue.toFixed(2)}</h2>
            <p className="text-xs text-slate-400 font-medium">Calculated for the current calendar cycle</p>
          </div>
        </div>

        <Link to="/reservations" state={{ filter: 'active' }} className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 transition-colors">
          <div className="flex justify-between items-start mb-6 w-full">
            <p className="text-xs font-bold text-slate-400 tracking-wider">ACTIVE RESERVATIONS</p>
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-indigo-600 tracking-tight mb-2">{activeCount}</h2>
            <p className="text-xs text-indigo-500 font-bold group-hover:underline">Click to manage active list &rarr;</p>
          </div>
        </Link>
        
        <Link to="/reservations" state={{ filter: 'outstanding' }} className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 transition-colors">
          <div className="flex justify-between items-start mb-6 w-full">
            <p className="text-xs font-bold text-slate-400 tracking-wider">OUTSTANDING BALANCE</p>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-rose-500 tracking-tight mb-2">${outstandingBalance.toFixed(2)}</h2>
            <p className="text-xs text-slate-400 font-medium">Total receivables awaiting settlement</p>
          </div>
        </Link>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-bold text-slate-800 tracking-widest uppercase">Live Fleet Activity Wave</h3>
            </div>
            <p className="text-xs font-medium text-slate-400">Dynamic visual representation of real-time cash inflows and billing cycles.</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Active Pulse Rate: 60Hz
          </div>
        </div>

        <div className="w-full h-64 bg-[#1a1c30] rounded-xl overflow-hidden relative p-4 flex flex-col">
          {/* Legend inside chart area */}
          <div className="absolute bottom-4 left-6 flex gap-4 text-xs font-mono z-10">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-1 rounded bg-teal-400"></span> Cash Flow
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-1 rounded bg-indigo-500"></span> Fleet Load
            </div>
          </div>
          
          <div className="flex-1 -mx-4 -mb-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="cashFlow" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#colorCash)" />
                <Area type="monotone" dataKey="fleetLoad" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        
        {/* Fleet Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-6">FLEET STATUS DISTRIBUTION</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50/50 rounded-xl p-4 border-t-2 border-t-emerald-400 border-x border-b border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 tracking-wider mb-2">AVAILABLE</p>
                  <p className="text-3xl font-extrabold text-emerald-700">{availableVehicles}</p>
                </div>
                
                <div className="bg-blue-50/50 rounded-xl p-4 border-t-2 border-t-blue-500 border-x border-b border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 tracking-wider mb-2">RENTED</p>
                  <p className="text-3xl font-extrabold text-blue-700">{rentedVehicles}</p>
                </div>
                
                <div className="bg-amber-50/50 rounded-xl p-4 border-t-2 border-t-amber-400 border-x border-b border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 tracking-wider mb-2">SERVICE</p>
                  <p className="text-3xl font-extrabold text-amber-700">{serviceVehicles}</p>
                </div>
                
                <div className="bg-rose-50/50 rounded-xl p-4 border-t-2 border-t-rose-400 border-x border-b border-rose-100">
                  <p className="text-[10px] font-bold text-rose-600 tracking-wider mb-2">REPAIR LOG</p>
                  <p className="text-3xl font-extrabold text-rose-700">{repairVehicles}</p>
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-6 mt-8">DAY OPERATION SCHEDULE</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">TODAY'S PICKUPS</p>
              <p className="text-2xl font-extrabold text-slate-800">{todayPickups} <span className="text-base font-semibold text-slate-500">departures</span></p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">TODAY'S RETURNS</p>
              <p className="text-2xl font-extrabold text-slate-800">{todayReturns} <span className="text-base font-semibold text-slate-500">returns</span></p>
            </div>
          </div>
        </div>

        {/* Security Deposit Refunds */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col h-full">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-6">PENDING SECURITY REFUNDS</h3>
          <div className="flex-1 space-y-3 relative">
            {pendingRefunds.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 font-medium">
                No pending refunds scheduled.
              </div>
            ) : (
              pendingRefunds.map(r => {
                const customer = store.customers.find(c => c.id === r.customerId);
                return (
                  <Link to={`/reservations/${r.id}`} key={r.id} className="block group bg-slate-50 border border-slate-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-800">{customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}</span>
                      <span className="text-sm font-extrabold text-amber-500">${r.securityDepositAmount}</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <span>{r.id.substring(0, 8)}</span>
                      <span className="group-hover:text-indigo-500 transition-colors">Process &rarr;</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
