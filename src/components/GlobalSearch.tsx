import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const { customers, vehicles, reservations } = useStore();

  const results = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    const customerResults = customers
      .filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowerQuery) || c.email.toLowerCase().includes(lowerQuery))
      .map(c => ({ type: 'Customer', name: `${c.firstName} ${c.lastName}`, id: c.id, link: `/customers/${c.id}` }));

    const vehicleResults = vehicles
      .filter(v => `${v.make} ${v.model}`.toLowerCase().includes(lowerQuery) || v.licensePlate.toLowerCase().includes(lowerQuery))
      .map(v => ({ type: 'Vehicle', name: `${v.make} ${v.model} (${v.licensePlate})`, id: v.id, link: `/vehicles` }));

    const reservationResults = reservations
      .filter(r => r.id.toLowerCase().includes(lowerQuery))
      .map(r => ({ type: 'Reservation', name: `Res #${r.id}`, id: r.id, link: `/reservations/${r.id}` }));

    return [...customerResults, ...vehicleResults, ...reservationResults].slice(0, 5);
  }, [query, customers, vehicles, reservations]);

  return (
    <div className="relative w-64 lg:w-96">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden">
          {results.map((res, i) => (
            <Link key={i} to={res.link} className="block px-4 py-3 hover:bg-slate-50 text-sm" onClick={() => setQuery('')}>
              <span className="font-bold text-slate-900">{res.type}:</span> {res.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
