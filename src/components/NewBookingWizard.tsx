import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Check, ChevronRight, Calculator, UserPlus, FileText, AlertCircle, Play, Shield, MapPin, Building, Flag, CreditCard, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NewBookingWizardProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function NewBookingWizard({ onClose, embedded = false }: NewBookingWizardProps) {
  const store = useStore();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Dates, 2: Features, 3: Customer, 4: Summary
  
  // Try to get customerId from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const initialCustomerId = urlParams.get('customerId') || '';
  
  // Form State
  const [pickupDate, setPickupDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pickupTime, setPickupTime] = useState('09:00');
  const [returnDate, setReturnDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [returnTime, setReturnTime] = useState('09:00');
  const [pickupLocation, setPickupLocation] = useState('3041 Vare Ave B, Philadelphia, PA 19145');
  const [returnLocation, setReturnLocation] = useState('3041 Vare Ave B, Philadelphia, PA 19145');
  
  const [vehicleId, setVehicleId] = useState('');
  const [selectedChargeTemplateIds, setSelectedChargeTemplateIds] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [wizardSecurityDeposit, setWizardSecurityDeposit] = useState<number>(500);
  const [includeDepositInTotal, setIncludeDepositInTotal] = useState<boolean>(false);

  // Submit states and Checkout config
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStatus, setWizardStatus] = useState<'Checked In' | 'Pending'>('Checked In');
  const [wizardPaymentMethod, setWizardPaymentMethod] = useState('Credit Card');
  const [wizardHoldUntil, setWizardHoldUntil] = useState('');
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(true);

  useEffect(() => {
    try {
      const parsed = parseISO(returnDate);
      if (!isNaN(parsed.getTime())) {
        const holdDate = new Date(parsed.getTime() + 86400000 * 3);
        setWizardHoldUntil(format(holdDate, 'yyyy-MM-dd'));
      }
    } catch (e) {}
  }, [returnDate]);

  // Quick Add Customer Form State
  const [showQuickAddForm, setShowQuickAddForm] = useState(false);
  const [qaFirstName, setQaFirstName] = useState('');
  const [qaLastName, setQaLastName] = useState('');
  const [qaEmail, setQaEmail] = useState('');
  const [qaPhone, setQaPhone] = useState('');
  const [qaStreet, setQaStreet] = useState('');
  const [qaStreet2, setQaStreet2] = useState('');
  const [qaCity, setQaCity] = useState('');
  const [qaState, setQaState] = useState('');
  const [qaZip, setQaZip] = useState('');
  const [qaCountry, setQaCountry] = useState('United States');
  const [qaDriverLicenseNumber, setQaDriverLicenseNumber] = useState('');
  const [qaDriverLicenseExpiration, setQaDriverLicenseExpiration] = useState('');
  const [qaNotes, setQaNotes] = useState('');
  const [qaError, setQaError] = useState('');

  const [error, setError] = useState('');

  // Computations
  const days = useMemo(() => {
    try {
      const start = parseISO(pickupDate);
      const end = parseISO(returnDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
      const d = differenceInDays(end, start);
      return isNaN(d) || d < 1 ? 1 : d;
    } catch (e) {
      return 1;
    }
  }, [pickupDate, returnDate]);
  
  const selectedVehicle = store.vehicles.find(v => v.id === vehicleId);
  const baseRental = useMemo(() => {
    if (!selectedVehicle) return 0;
    const rate = Number(selectedVehicle.dailyRate);
    return isNaN(rate) ? 0 : rate * days;
  }, [selectedVehicle, days]);
  
  const selectedCharges = store.chargeTemplates.filter(t => selectedChargeTemplateIds.includes(t.id));
  const totalCharges = useMemo(() => {
    return selectedCharges.reduce((sum, charge) => {
      const rate = Number(charge.rate);
      if (isNaN(rate)) return sum;
      return sum + (charge.perDay ? rate * days : rate);
    }, 0);
  }, [selectedCharges, days]);
  
  const totalAmount = baseRental + totalCharges;
  
  const selectedCustomer = store.customers.find(c => c.id === customerId);
  const customerHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    return store.reservations.filter(r => r.customerId === selectedCustomer.id).sort((a,b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime());
  }, [selectedCustomer, store.reservations]);

  const isVehicleAvailable = (vId: string) => {
    return !store.reservations.some(r => {
      if (r.vehicleId !== vId) return false;
      if (r.status === 'Cancelled' || r.status === 'Completed' || r.status === 'Closed') return false;
      
      try {
        const buildTime = (d: string, t?: string) => {
          if (!d) return 0;
          const time = t ? (t.length === 4 ? `0${t}` : t) : '00:00';
          const dt = new Date(`${d}T${time}:00`);
          return isNaN(dt.getTime()) ? 0 : dt.getTime();
        };

        const rStart = buildTime(r.pickupDate, r.pickupTime);
        const rEnd = buildTime(r.returnDate, r.returnTime) || (rStart + 86400000);
        const dStart = buildTime(pickupDate, pickupTime);
        const dEnd = buildTime(returnDate, returnTime);

        if (rStart === 0 || dStart === 0) return false;

        return rStart < dEnd && rEnd > dStart;
      } catch (e) {
        return false;
      }
    });
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaFirstName || !qaLastName || !qaEmail) {
      setQaError('First Name, Last Name, and Email are strictly required fields.');
      return;
    }
    setIsSubmitting(true);
    setQaError('');
    try {
      const newCustId = await store.addCustomer({
        firstName: qaFirstName,
        lastName: qaLastName,
        email: qaEmail,
        phone: qaPhone,
        street: qaStreet,
        street2: qaStreet2,
        city: qaCity,
        state: qaState,
        zip: qaZip,
        country: qaCountry,
        driverLicenseNumber: qaDriverLicenseNumber,
        driverLicenseExpiration: qaDriverLicenseExpiration,
        notes: qaNotes,
      });

      // Clear the input statuses
      setQaFirstName('');
      setQaLastName('');
      setQaEmail('');
      setQaPhone('');
      setQaStreet('');
      setQaStreet2('');
      setQaCity('');
      setQaState('');
      setQaZip('');
      setQaCountry('United States');
      setQaDriverLicenseNumber('');
      setQaDriverLicenseExpiration('');
      setQaNotes('');
      setQaError('');

      // Auto assign & jump straight to Confirm tab
      setCustomerId(newCustId);
      setShowQuickAddForm(false);
      setError('');
      setStep(4);
    } catch (err: any) {
      setQaError(err.message || 'Error occurred saving customer profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!vehicleId) { setError('Please select a vehicle.'); return; }
      if (pickupDate >= returnDate) { setError('Return date must be after pickup date.'); return; }
    }
    if (step === 3) {
      if (!customerId) { setError('Please select a customer.'); return; }
    }
    setError('');
    setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
  };

  const handleConfirm = async () => {
    console.log("handleConfirm customerId:", customerId);
    if (isSubmitting) return;
    
    // Verify customer exists
    if (!store.customers.find(c => c.id === customerId)) {
        setError('Error: Customer not found. Please select a customer first.');
        return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const newId = await store.createReservation({
        customerId,
        vehicleId,
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
        status: wizardStatus,
        notes: '',
        securityDepositAmount: wizardSecurityDeposit,
        includeDepositInTotal: false,
        paymentMethod: wizardPaymentMethod,
        securityDepositHoldUntil: wizardHoldUntil,
      }, selectedChargeTemplateIds, { sendEmail: sendEmailConfirmation });

      if (!embedded) {
        onClose();
      }
      // Pass state to auto-open checkout on the details page if reserved, else no popup
      navigate(`/reservations/${newId}`, { state: { openCheckout: wizardStatus === 'Pending' } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Date & Logistics' },
    { id: 2, name: 'External Charges' },
    { id: 3, name: 'Customer' },
    { id: 4, name: 'Confirm' }
  ];

  const content = (
      <div className={`bg-white w-full ${embedded ? 'h-full flex flex-col min-h-screen' : 'max-w-7xl h-full max-h-[92vh] shadow-2xl flex flex-col animate-in zoom-in-95 duration-150'}`}>
        
        {/* Header Steps */}
        <div className="bg-zinc-800 text-white px-6 py-4 flex items-center justify-between border-b border-zinc-700">
          <div className="flex items-center gap-6">
            <h2 className="font-semibold text-lg tracking-wide uppercase flex items-center gap-2"><FileText className="w-5 h-5"/> New Reservation</h2>
            <div className="hidden md:flex items-center gap-3 text-sm font-medium ml-6">
              {steps.map(s => (
                <React.Fragment key={s.id}>
                  <div className={`flex items-center gap-1.5 ${step === s.id ? 'text-blue-400' : step > s.id ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s.id ? 'bg-blue-500 text-white' : step > s.id ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-zinc-500'}`}>
                      {step > s.id ? <Check className="w-3 h-3" /> : s.id}
                    </div>
                    <span>{s.name}</span>
                  </div>
                  {s.id !== 4 && <ChevronRight className={`w-4 h-4 ${step > s.id ? 'text-zinc-600' : 'text-zinc-700'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 relative">
          
          {/* Main Form Area */}
          <div className={`${step < 4 ? 'lg:col-span-3' : 'lg:col-span-4'} overflow-y-auto p-6 md:p-8 bg-white`}>
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 border-l-4 border-red-500 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <section>
                  <h3 className="font-semibold text-zinc-800 text-base mb-3 border-b pb-2">Rental Period & Locations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Pickup Date</label>
                        <input type="date" className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Pickup Time</label>
                        <input type="time" className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Pickup Location</label>
                        <select className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)}>
                          <option value="3041 Vare Ave B, Philadelphia, PA 19145">3041 Vare Ave B, Philadelphia, PA 19145 (Default HQ)</option>
                          <option value="Lax Airport Terminal">Lax Airport Terminal</option>
                          <option value="Customer Address">Customer Address</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Return Date</label>
                        <input type="date" className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Return Time</label>
                        <input type="time" className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={returnTime} onChange={e => setReturnTime(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">Return Location</label>
                        <select className="w-full border border-zinc-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" value={returnLocation} onChange={e => setReturnLocation(e.target.value)}>
                          <option value="3041 Vare Ave B, Philadelphia, PA 19145">3041 Vare Ave B, Philadelphia, PA 19145 (Default HQ)</option>
                          <option value="Lax Airport Terminal">Lax Airport Terminal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-zinc-800 text-base mb-3 border-b pb-2 pt-4">Vehicle Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {store.vehicles.map(v => {
                      const isAvailable = isVehicleAvailable(v.id) && v.status !== 'Maintenance' && v.status !== 'Repair';
                      return (
                        <div 
                          key={v.id} 
                          onClick={() => {
                            setVehicleId(v.id);
                          }}
                          className={`border rounded-md p-3 transition-colors duration-150 cursor-pointer hover:bg-zinc-50 border-zinc-200 ${vehicleId === v.id ? 'border-blue-600 bg-blue-50 shadow-inner' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className="mt-1 w-4 h-4 rounded-full border border-zinc-300 flex items-center justify-center shrink-0">
                              {vehicleId === v.id && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-zinc-900 text-sm">{v.make} {v.model} <span className="text-zinc-500 font-normal">({v.year})</span></div>
                              <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{v.licensePlate} • {v.category.toUpperCase()}</div>
                              <div className="text-zinc-500 text-[11px] mt-1 line-clamp-1"><Flag className="w-3 h-3 inline text-green-600 mb-0.5"/> {v.status}</div>
                              {!isAvailable && (
                                <div className="text-[10px] text-amber-600 mt-1 font-semibold uppercase tracking-wider">
                                  ⚠️ {v.status === 'Maintenance' || v.status === 'Repair' ? 'Under Maintenance/Repair (Selectable)' : 'Reserved for dates (Selectable)'}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-700">${v.dailyRate}</div>
                              <div className="text-[10px] text-zinc-500">/ day</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* STEP 2: Features -> External Charges */}
            {step === 2 && (
              <div className="space-y-6">
                <section>
                  <h3 className="font-semibold text-zinc-800 text-base mb-3 border-b pb-2">External Charges & Add-ons</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {store.chargeTemplates.filter(t => t.category === 'External Charge').map(t => {
                      const isSelected = selectedChargeTemplateIds.includes(t.id);
                      return (
                        <div 
                          key={t.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedChargeTemplateIds(prev => prev.filter(id => id !== t.id));
                            } else {
                              setSelectedChargeTemplateIds(prev => [...prev, t.id]);
                            }
                          }}
                          className={`cursor-pointer border rounded p-4 flex items-center justify-between transition-colors ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-blue-600 mt-0.5 pointer-events-none" />
                            <div>
                              <div className="font-semibold text-sm text-zinc-800 flex items-center gap-1.5">
                                {t.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">{t.perDay ? 'Applied per rental day' : 'One-time application fee'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-zinc-900">${t.rate.toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-500">{t.perDay ? '/ day' : 'fixed'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* STEP 3: Customer Information */}
            {step === 3 && (
              <div className="space-y-6">
                <section>
                  <div className="flex justify-between items-end mb-3 border-b pb-2">
                    <h3 className="font-semibold text-zinc-800 text-base">Assign Customer</h3>
                    {!showQuickAddForm && (
                      <button 
                        type="button"
                        onClick={() => { setShowQuickAddForm(true); setQaError(''); }}
                        className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Quick Add
                      </button>
                    )}
                  </div>
                  
                  {showQuickAddForm ? (
                    <form onSubmit={handleQuickAddSubmit} className="bg-zinc-50 rounded-xl p-5 border border-zinc-200 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2 mb-2">
                        <h4 className="font-extrabold text-zinc-800 text-sm">Create New Customer File</h4>
                        <button 
                          type="button" 
                          onClick={() => { setShowQuickAddForm(false); setQaError(''); }}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Cancel
                        </button>
                      </div>

                      {qaError && (
                        <div className="p-2 bg-red-50 text-red-700 border-l-4 border-red-500 rounded text-xs font-semibold">
                          {qaError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">First Name *</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaFirstName} 
                            onChange={e => setQaFirstName(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Last Name *</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaLastName} 
                            onChange={e => setQaLastName(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Email *</label>
                          <input 
                            type="email" 
                            required
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaEmail} 
                            onChange={e => setQaEmail(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Phone Number</label>
                          <input 
                            type="tel" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaPhone} 
                            onChange={e => setQaPhone(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Street Address</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaStreet} 
                            onChange={e => setQaStreet(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Apt, Suite, Unit, etc.</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaStreet2} 
                            onChange={e => setQaStreet2(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">City</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaCity} 
                            onChange={e => setQaCity(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">State / Province</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaState} 
                            onChange={e => setQaState(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">ZIP / Postal Code</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaZip} 
                            onChange={e => setQaZip(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Country</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaCountry} 
                            onChange={e => setQaCountry(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Driver License Number</label>
                          <input 
                            type="text" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaDriverLicenseNumber} 
                            onChange={e => setQaDriverLicenseNumber(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">License Expiration</label>
                          <input 
                            type="date" 
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaDriverLicenseExpiration} 
                            onChange={e => setQaDriverLicenseExpiration(e.target.value)} 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">Internal Notes</label>
                          <textarea 
                            rows={2}
                            className="w-full border border-zinc-300 bg-white rounded p-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                            value={qaNotes} 
                            onChange={e => setQaNotes(e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button 
                          type="button"
                          onClick={() => { setShowQuickAddForm(false); setQaError(''); }}
                          className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Customer & Proceed
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="mb-6">
                        <select 
                          className="w-full border border-zinc-300 bg-zinc-50 rounded p-3 text-sm font-semibold text-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          value={customerId}
                          onChange={e => setCustomerId(e.target.value)}
                        >
                          <option value="">-- Select Customer File --</option>
                          {store.customers.map(c => (
                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName} | Phone: {c.phone} | {c.email}</option>
                          ))}
                        </select>
                      </div>

                      {selectedCustomer && (
                        <div className="border border-zinc-200 rounded p-5 bg-white text-sm">
                          <h4 className="font-semibold text-zinc-800 text-base mb-4 flex gap-2 items-center"><Building className="w-4 h-4 text-zinc-400" /> Customer Profile Verification</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div className="border-b border-zinc-100 pb-2">
                              <span className="block text-xs font-semibold text-zinc-500">FullName</span>
                              <span className="font-bold text-zinc-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                            </div>
                            <div className="border-b border-zinc-100 pb-2">
                              <span className="block text-xs font-semibold text-zinc-500">Contact Number</span>
                              <span className="text-zinc-800">{selectedCustomer.phone}</span>
                            </div>
                            <div className="border-b border-zinc-100 pb-2">
                              <span className="block text-xs font-semibold text-zinc-500">Email Address</span>
                              <span className="text-zinc-800">{selectedCustomer.email}</span>
                            </div>
                            <div className="border-b border-zinc-100 pb-2">
                              <span className="block text-xs font-semibold text-zinc-500">Physical Address</span>
                              <span className="text-zinc-800">{selectedCustomer.street}, {selectedCustomer.city} {selectedCustomer.zip}</span>
                            </div>
                            <div className="border-b border-zinc-100 pb-2 bg-yellow-50 p-2 rounded">
                              <span className="block text-xs font-semibold text-yellow-800">License Number</span>
                              <span className="font-mono font-bold text-yellow-900">{selectedCustomer.driverLicenseNumber}</span>
                            </div>
                            <div className="border-b border-zinc-100 pb-2 pt-2">
                               <span className="block text-xs font-semibold text-zinc-500">Status</span>
                               <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-sm">Verified</span>
                            </div>
                          </div>

                          <div className="mt-6 flex gap-4 text-xs font-medium">
                            <div className="bg-zinc-50 p-3 rounded flex-1 border border-zinc-100">
                              <div className="text-zinc-500 mb-1">Total Reservations</div>
                              <div className="text-lg font-bold text-zinc-800">{customerHistory.length}</div>
                            </div>
                            <div className="bg-zinc-50 p-3 rounded flex-1 border border-zinc-100">
                              <div className="text-zinc-500 mb-1">Outstanding Balance</div>
                              <div className="text-lg font-bold text-red-600">$0.00</div>
                            </div>
                            <div className="bg-zinc-50 p-3 rounded flex-1 border border-zinc-100">
                              <div className="text-zinc-500 mb-1">Lifetime Revenue</div>
                              <div className="text-lg font-bold text-green-700">${customerHistory.reduce((s,r) => s + r.totalAmount, 0).toFixed(2)}</div>
                            </div>
                          </div>

                          {customerHistory.length > 0 && (
                            <div className="mt-6">
                              <h4 className="font-semibold text-zinc-800 text-sm mb-2">Recent Reservation History</h4>
                              <div className="border border-zinc-200 rounded overflow-hidden">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-zinc-100 text-zinc-600">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Ref ID</th>
                                      <th className="px-3 py-2 font-medium">Period</th>
                                      <th className="px-3 py-2 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-100">
                                    {customerHistory.slice(0, 2).map((res) => (
                                      <tr key={res.id} className="hover:bg-zinc-50">
                                        <td className="px-3 py-2 font-mono text-blue-600">{res.id.substring(0,8)}</td>
                                        <td className="px-3 py-2">{res.pickupDate} to {res.returnDate}</td>
                                        <td className="px-3 py-2"><span className="uppercase text-[9px] font-bold tracking-wider">{res.status}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            )}

            {/* STEP 4: Confirmation Summary */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <h2 className="text-xl font-bold text-zinc-900 mb-4 border-b pb-2">Review Reservation Details</h2>

                 {/* Checkout & Immediate Payment Configuration */}
                 <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-blue-100 pb-2 mb-2">
                       <CreditCard className="w-5 h-5 text-blue-600" />
                       <h4 className="font-bold text-sm text-blue-900 uppercase tracking-wider">Checkout / Immediate Payment Setup</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {/* Selector */}
                       <div className="space-y-2">
                          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide">Reservation Mode</label>
                          <div className="space-y-2 mt-1">
                             <label className="flex items-center gap-2 text-sm text-zinc-800 font-semibold cursor-pointer">
                                <input 
                                   type="radio"
                                   name="wizardStatus"
                                   value="Checked In"
                                   checked={wizardStatus === 'Checked In'}
                                   onChange={() => setWizardStatus('Checked In')}
                                   className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                                />
                                Pay &amp; Check In Now
                             </label>
                             <label className="flex items-center gap-2 text-sm text-zinc-800 font-semibold cursor-pointer">
                                <input 
                                   type="radio"
                                   name="wizardStatus"
                                   value="Pending"
                                   checked={wizardStatus === 'Pending'}
                                   onChange={() => setWizardStatus('Pending')}
                                   className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                                />
                                Reserve Only (Pending Payment)
                             </label>
                          </div>
                       </div>

                       {wizardStatus === 'Checked Out' && (
                          <>
                             {/* Payment Method */}
                             <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide">Payment Method</label>
                                <select
                                   value={wizardPaymentMethod}
                                   onChange={e => setWizardPaymentMethod(e.target.value)}
                                   className="w-full border border-zinc-300 bg-white rounded p-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                   <option value="Credit Card">Credit Card</option>
                                   <option value="Debit Card">Debit Card</option>
                                   <option value="Cash">Cash / Cashier Check</option>
                                   <option value="Bank Transfer">Bank Transfer / ACH</option>
                                   <option value="Venmo/Zelle">Venmo / Zelle</option>
                                </select>
                             </div>

                             {/* Hold Unless / Until Date */}
                             <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide">Security Deposit Release Date</label>
                                <input 
                                   type="date"
                                   value={wizardHoldUntil}
                                   onChange={e => setWizardHoldUntil(e.target.value)}
                                   className="w-full border border-zinc-300 bg-white rounded p-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                                />
                                <span className="text-[10px] text-zinc-500 block leading-tight mt-1">Hold security release period</span>
                             </div>
                          </>
                       )}
                    </div>

                    {wizardStatus === 'Checked Out' && (
                       <div className="bg-blue-100/50 text-blue-800 rounded-lg p-3 text-xs flex gap-2 items-start mt-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <p className="leading-normal">
                             <strong>Immediate Payment Integration:</strong> Creating this booking in Checked In status will record an Initial Rental Payment of <strong>${totalAmount.toFixed(2)}</strong> so the Outstanding Balance is instantly <strong>$0.00</strong>. The vehicle will remain Available until Checked Out manually.
                          </p>
                       </div>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-50 p-5 rounded border border-zinc-200">
                      <h4 className="font-bold text-sm text-zinc-700 mb-4 uppercase tracking-wider flex items-center gap-2"><MapPin className="w-4 h-4"/> Logistics & Vehicle</h4>
                      <div className="text-sm space-y-3">
                         <div className="flex justify-between border-b border-zinc-100 pb-2">
                           <span className="text-zinc-500 font-medium">Pickup:</span>
                           <span className="font-semibold text-zinc-800 text-right">{pickupDate} {pickupTime}<br/><span className="text-xs font-normal text-zinc-500">{pickupLocation}</span></span>
                         </div>
                         <div className="flex justify-between border-b border-zinc-100 pb-2">
                           <span className="text-zinc-500 font-medium">Return:</span>
                           <span className="font-semibold text-zinc-800 text-right">{returnDate} {returnTime}<br/><span className="text-xs font-normal text-zinc-500">{returnLocation}</span></span>
                         </div>
                         <div className="flex justify-between border-b border-zinc-100 pb-2">
                           <span className="text-zinc-500 font-medium">Rental Duration:</span>
                           <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{days} Day(s)</span>
                         </div>
                         <div className="flex justify-between pt-1">
                           <span className="text-zinc-500 font-medium">Vehicle:</span>
                           <span className="font-semibold text-zinc-800 text-right">{selectedVehicle ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` : 'None'}</span>
                         </div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-5 rounded border border-zinc-200">
                      <h4 className="font-bold text-sm text-zinc-700 mb-4 uppercase tracking-wider flex items-center gap-2"><Calculator className="w-4 h-4"/> Financial Summary</h4>
                      
                      {/* Security Deposit Selection */}
                      <div className="mb-4 p-3 bg-white border border-zinc-200 rounded-lg space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Security Deposit Amount ($)</label>
                          <input 
                            type="number" 
                            min="0"
                            className="w-full border border-zinc-300 rounded p-1.5 text-xs font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            value={wizardSecurityDeposit}
                            onChange={e => setWizardSecurityDeposit(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="text-sm space-y-3">
                         <div className="flex justify-between border-b border-zinc-100 pb-2">
                           <span className="text-zinc-500 font-medium">Rental Fee (Base):</span>
                           <span className="font-bold text-zinc-800">${baseRental.toFixed(2)}</span>
                         </div>
                         {selectedCharges.map(c => (
                           <div key={c.id} className="flex justify-between border-b border-zinc-100 pb-2">
                             <span className="text-zinc-500">{c.name}:</span>
                             <span className="font-semibold text-zinc-800">${(c.perDay ? c.rate * days : c.rate).toFixed(2)}</span>
                           </div>
                         ))}
                         <div className="flex justify-between pt-1 text-zinc-800 font-bold border-t border-zinc-100">
                           <span className="uppercase tracking-wide text-xs">Subtotal (Actual Charges):</span>
                           <span className="text-sm">${totalAmount.toFixed(2)}</span>
                         </div>
                         {wizardSecurityDeposit > 0 && (
                           <div className="flex justify-between text-zinc-600 font-medium">
                             <span className="text-xs">Security Deposit (Refundable):</span>
                             <span className="font-bold text-zinc-800">${wizardSecurityDeposit.toFixed(2)}</span>
                           </div>
                         )}
                         <div className="flex justify-between pt-3 text-lg mt-2 font-bold text-blue-700 border-t border-zinc-200">
                           <span className="uppercase tracking-wide text-sm flex items-center">Total Amount to Collect:</span>
                           <span className="text-2xl">${(totalAmount + (wizardSecurityDeposit || 0)).toFixed(2)}</span>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>
            )}

            {step === 4 && (
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 hover:bg-blue-100 transition p-3 rounded-lg border border-blue-200 w-fit">
                  <input 
                    type="checkbox" 
                    checked={sendEmailConfirmation} 
                    onChange={e => setSendEmailConfirmation(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-blue-900">Send Booking Confirmation Email Automatically</span>
                </label>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="mt-10 flex justify-between items-center pt-4 border-t border-zinc-200">
              {step > 1 ? (
                <button 
                  onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                  className="px-5 py-2 font-semibold text-zinc-600 text-sm hover:bg-zinc-100 border border-transparent hover:border-zinc-300 rounded transition"
                >
                  Back
                </button>
              ) : <div></div>}

              {step < 4 ? (
                <button 
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded shadow-sm transition flex items-center gap-2"
                >
                  Continue to {steps.find(s => s.id === step + 1)?.name} <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className={`px-8 py-3 text-white text-sm font-bold rounded-lg shadow-md transition flex items-center gap-2 ${
                    isSubmitting ? 'bg-zinc-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>Creating Reservation...</>
                  ) : (
                    <>Confirm Reservation <Check className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* Right Summary Panel */}
          <div className={`h-full bg-zinc-50 border-l border-zinc-200 flex-col hidden ${step < 4 ? 'lg:flex' : 'hidden'}`}>
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-100/50">
              <h3 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 text-center justify-center">
                <Calculator className="w-4 h-4 text-zinc-500" />
                Live Summary Panel
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 text-sm">
              <div className="space-y-4">
                <div className="bg-white p-3 rounded border border-zinc-200 shadow-sm">
                   <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide border-b pb-1 mb-2">Rental Period</div>
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-600">Pickup</span>
                      <span className="font-semibold text-zinc-900">{pickupDate} {pickupTime}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs text-zinc-500 pb-2 border-b border-zinc-50 mb-2">
                       <span>@ {pickupLocation}</span>
                   </div>
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-600">Return</span>
                      <span className="font-semibold text-zinc-900">{returnDate} {returnTime}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs text-zinc-500">
                       <span>@ {returnLocation}</span>
                   </div>
                </div>

                <div className="bg-white p-3 rounded border border-zinc-200 shadow-sm">
                   <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide border-b pb-1 mb-2">Vehicle Rate</div>
                   <div className="flex justify-between items-center">
                     <span className="text-zinc-700 font-medium">{selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Unassigned'}</span>
                   </div>
                   <div className="flex justify-between items-center mt-1 text-xs text-zinc-500">
                      <span>${selectedVehicle?.dailyRate || 0} / day &times; {days} Days</span>
                      <span className="font-bold text-zinc-900 text-sm whitespace-nowrap">${baseRental.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-end items-center mt-2 pt-2 border-t border-zinc-100">
                     <span className="font-semibold text-zinc-500 mr-2">Rental Fee Subtotal:</span>
                     <span className="font-bold text-zinc-800">${baseRental.toFixed(2)}</span>
                   </div>
                </div>

                {selectedCharges.length > 0 && (
                  <div className="bg-white p-3 rounded border border-zinc-200 shadow-sm">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide border-b pb-1 mb-2">External Charges</div>
                    <div className="space-y-2">
                      {selectedCharges.map(charge => (
                        <div key={charge.id} className="flex justify-between items-start text-xs border-b border-zinc-50 pb-1">
                          <span className="text-zinc-600">
                            {charge.name}
                            {charge.perDay && <span className="block text-[10px] text-zinc-400 font-mono mt-0.5">${charge.rate}/day &times; {days}</span>}
                          </span>
                          <span className="font-semibold text-zinc-800">${(charge.perDay ? charge.rate * days : charge.rate).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Balance */}
              <div className="mt-6 bg-zinc-800 rounded p-4 text-white shadow-lg">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-zinc-300 font-medium text-xs">Total Charges</span>
                   <span className="text-xl font-bold">${totalAmount.toFixed(2)}</span>
                 </div>
                 <div className="w-full h-px bg-zinc-700 my-2" />
                 <div className="flex justify-between items-center font-bold">
                   <span className="text-blue-300 text-sm uppercase tracking-wide">Grand Total</span>
                   <span className="text-2xl text-blue-400">${totalAmount.toFixed(2)}</span>
                 </div>
              </div>

            </div>
          </div>

        </div>
      </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-2 sm:p-4">
      {content}
    </div>
  );
}
