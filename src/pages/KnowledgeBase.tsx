import { FileText, BookOpen, Calculator, Play, DollarSign } from 'lucide-react';

export default function KnowledgeBase() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans pb-16">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Official Knowledge Base</h1>
        <p className="text-slate-500 font-medium max-w-lg">Everything you need to know about Vehicle Rental Sys, from basic operations to complex billing and revenue calculations.</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Billing & Revenue Calculations</h2>
              <p className="text-sm font-medium text-slate-500">How the system computes totals and balances.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Base Rental Calculation</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The base rental cost is determined by multiplying the selected vehicle's daily rate by the number of days in the reservation period.
              </p>
              <div className="bg-[#1e293b] p-4 rounded-xl font-mono text-sm text-emerald-400 overflow-x-auto border border-slate-800">
                Days = DifferenceInDays(ReturnDate, PickupDate) || 1<br/>
                BaseRental = Days * Vehicle.dailyRate
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Outstanding Balance</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Outstanding balance represents the remaining amount a customer owes for a specific reservation. It is dynamically calculated by subtracting all recorded payments from the total reservation amount.
              </p>
              <div className="bg-[#1e293b] p-4 rounded-xl font-mono text-sm text-emerald-400 overflow-x-auto border border-slate-800">
                TotalPaid = sum(Payment.amount where Payment.reservationId == ID)<br/>
                OutstandingBalance = TotalAmount - TotalPaid
              </div>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Dashboard Revenue Rollup</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The gross revenue figures shown on the dashboard aggregate all <span className="font-bold">Payments</span> (excluding security deposits).
                "Today's Revenue" strictly filters payments where <code className="bg-white px-1 py-0.5 rounded text-xs border border-slate-200">Payment.date === Today</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Fleet Operations</h2>
              <p className="text-sm font-medium text-slate-500">Managing vehicle statuses and availability.</p>
            </div>
          </div>
          <div className="prose prose-sm prose-slate max-w-none prose-headings:font-bold prose-a:text-indigo-600">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Available:</strong> Vehicle is ready for rent and clean.</li>
              <li><strong>Rented:</strong> Vehicle is currently out with a customer. It will automatically prevent new overlaps.</li>
              <li><strong>Reserved:</strong> Scheduled for an upcoming pickup.</li>
              <li><strong>Maintenance:</strong> Routine servicing. Hidden from standard availability lists.</li>
              <li><strong>Repair:</strong> Requires extensive work. Hidden from standard availability lists.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
