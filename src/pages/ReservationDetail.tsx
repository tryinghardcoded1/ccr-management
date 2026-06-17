import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { ReservationStatus, ChargeCategory, PaymentStatus, Vehicle as StoreVehicle } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { 
  ArrowLeft, Car, User, Calendar, DollarSign, Clock, CreditCard, 
  Plus, CheckCircle, AlertTriangle, Shuffle, ShieldAlert, Check, FileText
} from 'lucide-react';

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  
  const reservation = store.reservations.find(r => r.id === id);
  const customer = store.customers.find(c => c.id === reservation?.customerId);
  const vehicle = store.vehicles.find(v => v.id === reservation?.vehicleId);
  const charges = store.chargeItems.filter(c => c.reservationId === id);
  const payments = store.payments.filter(p => p.reservationId === id);

  // Active floating dialog modal state
  const [activeModal, setActiveModal] = useState<null | 'payment' | 'claim' | 'fine' | 'external' | 'switch' | 'deposit'>(null);

  // Modal Form States
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Credit Card', label: 'Rental Payment' });
  const [claimForm, setClaimForm] = useState({ description: '', amount: 0, notes: '' });
  const [fineForm, setFineForm] = useState({ description: '', amount: 0, notes: '' });
  const [externalForm, setExternalForm] = useState({ description: '', amount: 0, notes: '' });
  const [switchForm, setSwitchForm] = useState({ newVehicleId: '', upgradeFee: 0, notes: '' });
  const [depositForm, setDepositForm] = useState({ amount: 500, holdUntil: '', method: 'Credit Card' });
  const [refundForm, setRefundForm] = useState({ amount: 0, method: 'Credit Card' });

  if (!reservation || !customer || !vehicle) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 shadow-sm max-w-md mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Reservation Not Found</h3>
        <p className="text-gray-500 mb-6">The requested reservation ID could not be loaded.</p>
        <Link to="/reservations" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Back to Reservations
        </Link>
      </div>
    );
  }

  // Calculate rental days
  let rentalDays = differenceInDays(parseISO(reservation.returnDate), parseISO(reservation.pickupDate));
  if (rentalDays < 1) rentalDays = 1;

  // Filters and breakdowns
  const externalCharges = charges.filter(c => c.category === 'External Charge');
  const claims = charges.filter(c => c.category === 'Claim');
  const fines = charges.filter(c => c.category === 'Fine');
  const switchFees = charges.filter(c => c.category === 'Vehicle Switch');

  // Validate completion rules
  const pendingCharges = charges.some(c => c.paymentStatus === 'Pending');
  
  const completionBlockers: string[] = [];
  if (!reservation.vehicleReturned) {
    completionBlockers.push("Vehicle must be returned (Vehicle Returned = True)");
  }
  if (reservation.status !== 'Checked In') {
    completionBlockers.push("Reservation status must be 'Checked In' before completion");
  }
  if (reservation.securityDepositStatus === 'On Hold') {
    completionBlockers.push("Security deposit is still On Hold. It must be Refunded or Completed");
  }
  if (reservation.balance > 0) {
    completionBlockers.push(`There is an outstanding balance of $${reservation.balance.toFixed(2)}`);
  }
  if (pendingCharges) {
    completionBlockers.push("All additional charges (Fines, Claims, etc.) must be Paid in full");
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ReservationStatus;
    if (newStatus === 'Completed') {
      if (completionBlockers.length > 0) {
        alert(`Cannot complete booking:\n\n${completionBlockers.join('\n')}`);
        return;
      }
    }
    store.updateReservationStatus(reservation.id, newStatus);
  };

  const handleReturnVehicle = () => {
    store.markVehicleReturned(reservation.id);
  };

  const handleCompleteReservation = () => {
    if (completionBlockers.length > 0) {
      alert(`Cannot complete booking yet:\n\n${completionBlockers.join('\n')}`);
      return;
    }
    store.updateReservationStatus(reservation.id, 'Completed');
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    store.addPayment({
      reservationId: reservation.id,
      customerId: customer.id,
      amount: paymentForm.amount,
      method: paymentForm.method,
      label: paymentForm.label || 'Payment Received',
      date: new Date().toISOString(),
      type: 'payment'
    });
    setActiveModal(null);
    setPaymentForm({ amount: 0, method: 'Credit Card', label: 'Rental Payment' });
  };

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimForm.amount <= 0 || !claimForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'Claim',
      description: claimForm.description,
      amount: claimForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: claimForm.notes
    });
    setActiveModal(null);
    setClaimForm({ description: '', amount: 0, notes: '' });
  };

  const handleAddFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (fineForm.amount <= 0 || !fineForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'Fine',
      description: fineForm.description,
      amount: fineForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: fineForm.notes
    });
    setActiveModal(null);
    setFineForm({ description: '', amount: 0, notes: '' });
  };

  const handleAddExternalCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (externalForm.amount <= 0 || !externalForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'External Charge',
      description: externalForm.description,
      amount: externalForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: externalForm.notes
    });
    setActiveModal(null);
    setExternalForm({ description: '', amount: 0, notes: '' });
  };

  const handleVehicleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicleId = switchForm.newVehicleId;
    if (!newVehicleId) {
      alert("Please select a valid vehicle to switch to.");
      return;
    }

    const oldVehicleId = reservation.vehicleId;
    const targetVehicle = store.vehicles.find(v => v.id === newVehicleId);
    if (!targetVehicle) return;

    // 1. Mark old vehicle status as Available
    store.updateVehicle(oldVehicleId, { status: 'Available' });

    // 2. Add Vehicle Switch charge item record
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: newVehicleId,
      category: 'Vehicle Switch',
      description: `Switch: ${vehicle.make} ${vehicle.model} -> ${targetVehicle.make} ${targetVehicle.model}`,
      amount: switchForm.upgradeFee,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: switchForm.notes,
      oldVehicleId,
      newVehicleId
    });

    // 3. Update reservation vehicleId (triggers sync for new vehicle state)
    store.updateReservation(reservation.id, { vehicleId: newVehicleId });

    setActiveModal(null);
    setSwitchForm({ newVehicleId: '', upgradeFee: 0, notes: '' });
  };

  const handleProcessDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositForm.amount <= 0) {
      alert("Please select a deposit amount.");
      return;
    }
    store.processSecurityDeposit(reservation.id, depositForm.amount, depositForm.holdUntil);
    setActiveModal(null);
  };

  const handleRefundDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.refundSecurityDeposit(reservation.id, refundForm.amount, refundForm.method);
    setActiveModal(null);
  };

  // Obtain available vehicles for the Switch Vehicle dropdown
  const availableSwitchVehicles = store.vehicles.filter(v => v.id !== vehicle.id && v.status === 'Available');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <Link to="/reservations" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Booking {reservation.id.substring(0, 8).toUpperCase()}
            </h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
              ${reservation.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                reservation.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 
                reservation.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                'bg-blue-50 text-blue-700 border-blue-200'}`}
            >
              {reservation.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Booking date: {format(new Date(reservation.bookingDate), 'MMM d, yyyy h:mm a')}</p>
        </div>

        {/* Sync reservation status picker */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Shift Status:</label>
          <select 
            value={reservation.status} 
            onChange={handleStatusChange}
            className="border-gray-200 rounded-lg text-sm font-semibold bg-white p-2 border shadow-sm cursor-pointer hover:border-gray-300"
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Checked In">Checked In</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Column Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COMPONENT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Reservation Information */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Booking Summary</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">ID Reference</span>
                <span className="font-mono text-gray-900 bg-gray-50 py-1 px-2 rounded inline-block text-xs">
                  {reservation.id}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Customer Representative</span>
                <span className="font-semibold text-gray-900">{customer.firstName} {customer.lastName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Assigned Unit</span>
                <span className="font-semibold text-gray-950">{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Unit Plate</span>
                <span className="font-mono uppercase text-gray-900 font-bold">{vehicle.licensePlate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-2 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Pickup Session</span>
                <span className="font-medium text-gray-900">{reservation.pickupDate}</span>
                <span className="text-xs text-gray-500 block">{reservation.pickupTime}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Target Return</span>
                <span className="font-medium text-gray-900">{reservation.returnDate}</span>
                <span className="text-xs text-gray-500 block">{reservation.returnTime}</span>
              </div>
              <div className="space-y-1 col-span-2 lg:col-span-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Rental Timeline</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
                  {rentalDays} Day{rentalDays > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {reservation.notes && (
              <div className="bg-gray-50 p-3 rounded-lg text-xs mt-2 border border-gray-100">
                <span className="font-bold text-gray-500 uppercase tracking-wide block mb-1">Reservation Comments</span>
                <p className="text-gray-700">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Section 2: Vehicle Information */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <Car className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Fleet Unit Intelligence</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Make</span>
                <span className="font-medium text-gray-900">{vehicle.make}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Model</span>
                <span className="font-medium text-gray-900">{vehicle.model}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Year</span>
                <span className="font-medium text-gray-900">{vehicle.year}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Plate Number</span>
                <span className="font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs inline-block font-bold">
                  {vehicle.licensePlate}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Unit Class</span>
                <span className="font-medium text-gray-900">{vehicle.category}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Daily Scale Rate</span>
                <span className="font-bold text-green-700">${vehicle.dailyRate.toFixed(2)}</span>
              </div>
            </div>
            
            {vehicle.notes && (
              <p className="text-xs text-gray-500 italic bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                Unit Notes: {vehicle.notes}
              </p>
            )}
          </div>

          {/* Section 3: Customer Information */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <User className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Staff Customer Registry</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Name</span>
                <span className="font-semibold text-gray-900">{customer.firstName} {customer.lastName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Mobile Device</span>
                <span className="font-medium text-gray-900">{customer.phone}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="font-medium text-gray-900">{customer.email}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Drivers Credentials</span>
                <span className="font-mono text-gray-900">{customer.driverLicenseNumber}</span>
                <span className="text-xs text-gray-500 ml-2">(Exp: {customer.driverLicenseExpiration})</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Geographic Footprint</span>
                <span className="font-medium text-gray-900">
                  {customer.street} {customer.street2 ? `, ${customer.street2}` : ''}, {customer.city}, {customer.state} {customer.zip}, {customer.country}
                </span>
              </div>
            </div>

            {customer.notes && (
              <div className="text-xs text-gray-600 italic border-l-2 border-indigo-500 pl-3">
                Customer specific warnings: {customer.notes}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT STICKY FINANCIAL SUMMARY AND ACTIONS */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col space-y-6">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg border-b border-gray-100 pb-3">
                Financial Summary
              </h3>
            </div>

            {/* ORDERED FINANCIAL BREAKDOWN */}
            <div className="space-y-6 text-sm">
              
              {/* 1. Base Rental */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">Base Rental</span>
                  <span className="font-extrabold text-gray-950">${reservation.baseRental.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {rentalDays} Day{rentalDays > 1 ? 's' : ''} × ${vehicle.dailyRate.toFixed(2)}
                </div>
              </div>

              {/* 2. External Charges */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-950 uppercase text-xs tracking-wider">External Charges</span>
                </div>
                {externalCharges.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No external charges loaded</div>
                ) : (
                  <div className="space-y-2">
                    {externalCharges.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className={`inline-block text-[10px] uppercase font-bold py-0.5 px-1 rounded ${item.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {item.paymentStatus}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {item.paymentStatus === 'Pending' && (
                            <button 
                              onClick={() => store.updateChargeItemStatus(item.id, 'Paid')} 
                              className="text-[10px] text-indigo-600 font-extrabold hover:underline uppercase"
                            >
                              Pay
                            </button>
                          )}
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Claims */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Claims</span>
                {claims.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No active claim files</div>
                ) : (
                  <div className="space-y-2">
                    {claims.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className={`inline-block text-[10px] uppercase font-bold py-0.5 px-1 rounded ${item.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {item.paymentStatus}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {item.paymentStatus === 'Pending' && (
                            <button 
                              onClick={() => store.updateChargeItemStatus(item.id, 'Paid')} 
                              className="text-[10px] text-indigo-600 font-extrabold hover:underline uppercase"
                            >
                              Pay
                            </button>
                          )}
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Fines */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Fines</span>
                {fines.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No staff fine records</div>
                ) : (
                  <div className="space-y-2">
                    {fines.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className={`inline-block text-[10px] uppercase font-bold py-0.5 px-1 rounded ${item.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {item.paymentStatus}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {item.paymentStatus === 'Pending' && (
                            <button 
                              onClick={() => store.updateChargeItemStatus(item.id, 'Paid')} 
                              className="text-[10px] text-indigo-600 font-extrabold hover:underline uppercase"
                            >
                              Pay
                            </button>
                          )}
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Vehicle Switch Fees */}
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Vehicle Switch Fees</span>
                {switchFees.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">No transition swaps logged</div>
                ) : (
                  <div className="space-y-2">
                    {switchFees.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <span className={`inline-block text-[10px] uppercase font-bold py-0.5 px-1 rounded ${item.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {item.paymentStatus}
                          </span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {item.paymentStatus === 'Pending' && (
                            <button 
                              onClick={() => store.updateChargeItemStatus(item.id, 'Paid')} 
                              className="text-[10px] text-indigo-600 font-extrabold hover:underline uppercase"
                            >
                              Pay
                            </button>
                          )}
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Security Deposit (Displayed separately, never part of calculations) */}
              <div className="space-y-2 border-t border-indigo-100 pt-4 bg-indigo-50/40 p-3 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-indigo-950 uppercase text-xs tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Security Deposit
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${reservation.securityDepositStatus === 'Refunded' ? 'bg-green-100 text-green-800' : reservation.securityDepositStatus === 'On Hold' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>
                    {reservation.securityDepositStatus}
                  </span>
                </div>
                
                {reservation.securityDepositStatus === 'None' ? (
                  <p className="text-xs text-indigo-900/60 italic">No security deposit holds active</p>
                ) : (
                  <div className="space-y-1.5 text-xs text-indigo-900">
                    <div className="flex justify-between">
                      <span className="opacity-70">Amount Held:</span>
                      <span className="font-bold">${reservation.securityDepositAmount.toFixed(2)}</span>
                    </div>
                    {reservation.securityDepositCollectedDate && (
                      <div className="flex justify-between">
                        <span className="opacity-70">Collected:</span>
                        <span>{format(new Date(reservation.securityDepositCollectedDate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {reservation.securityDepositHoldUntil && (
                      <div className="flex justify-between">
                        <span className="opacity-70">Duration:</span>
                        <span>Hold until {format(new Date(reservation.securityDepositHoldUntil), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {reservation.securityDepositStatus === 'Refunded' && (
                      <div className="border-t border-indigo-100 pt-1.5 mt-1 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-800 font-semibold">Refunded Amount:</span>
                          <span className="font-bold text-green-800">${reservation.securityDepositRefundAmount?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] opacity-75">
                          <span>Via Method:</span>
                          <span>{reservation.securityDepositRefundMethod}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* TOTALS SECTION */}
            <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-650 font-medium">Subtotal Charges</span>
                <span className="text-gray-900 font-bold">${reservation.totalAmount.toFixed(2)}</span>
              </div>

              {/* Payments Received Breakdown */}
              <div className="space-y-1 bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Receipt Log</span>
                {payments.filter(p => p.type === 'payment').map(p => (
                  <div key={p.id} className="flex justify-between text-xs text-green-700">
                    <span>Payment ({format(new Date(p.date), 'MM/dd')})</span>
                    <span className="font-semibold">-${p.amount.toFixed(2)}</span>
                  </div>
                ))}
                {payments.filter(p => p.type === 'payment').length === 0 && (
                  <span className="text-xs text-gray-400 italic block">No standard payments recorded</span>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-800 font-bold text-base">Outstanding Balance</span>
                <span className={`text-lg font-extrabold ${reservation.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  ${reservation.balance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* QUICK ACTIONS BELOW THE SUMMARY */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Staff Operations</span>
              
              <div className="grid grid-cols-2 gap-2">
                {reservation.balance > 0 && (
                  <button 
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, amount: reservation.balance }));
                      setActiveModal('payment');
                    }}
                    className="w-full bg-indigo-650 text-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                    style={{ backgroundColor: '#4f46e5' }}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
                
                <button 
                  onClick={() => setActiveModal('claim')}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> Add Claim
                </button>

                <button 
                  onClick={() => setActiveModal('fine')}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> Add Fine
                </button>

                <button 
                  onClick={() => setActiveModal('external')}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> External Charge
                </button>

                <button 
                  onClick={() => {
                    const firstAvail = availableSwitchVehicles[0]?.id || '';
                    setSwitchForm({ newVehicleId: firstAvail, upgradeFee: 0, notes: '' });
                    setActiveModal('switch');
                  }}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-500" /> Switch Vehicle
                </button>

                <button 
                  onClick={() => {
                    setRefundForm({ amount: reservation.securityDepositAmount, method: 'Credit Card' });
                    setActiveModal('deposit');
                  }}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Security Deposit
                </button>
              </div>

              <div className="pt-2 space-y-2">
                {!reservation.vehicleReturned ? (
                  <button 
                    onClick={handleReturnVehicle}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 px-4 text-xs font-bold shadow transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Return Vehicle Checklist
                  </button>
                ) : (
                  <div className="bg-green-50 text-green-850 p-2.5 rounded-lg border border-green-200 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-600" /> Vehicle Returned
                  </div>
                )}

                {reservation.status !== 'Completed' && (
                  <button 
                    onClick={handleCompleteReservation}
                    disabled={completionBlockers.length > 0}
                    className="w-full bg-indigo-650 hover:bg-indigo-750 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-650 text-white rounded-lg py-2.5 px-4 text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#4f46e5' }}
                  >
                    <CheckCircle className="w-4 h-4" /> Complete Booking File
                  </button>
                )}
              </div>

              {/* Completion Rules Warning panel */}
              {completionBlockers.length > 0 && reservation.status !== 'Completed' && (
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg text-xs space-y-1 text-orange-850 mt-1">
                  <span className="font-extrabold uppercase tracking-wide text-orange-950 block">Missing Requirements:</span>
                  <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                    {completionBlockers.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* FLOATING ACTION DIALOGS / INLINE MODAL OVERLAYS */}
      
      {/* 1. Record Payment Modal */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Record Standard Payment</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Prepayment Balance</label>
                <div className="bg-gray-100 p-2 text-xs font-bold rounded">
                  Max: ${reservation.balance.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Method</label>
                <select 
                  className="w-full border rounded-lg p-2 bg-white"
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  max={reservation.balance}
                  className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none text-base font-semibold"
                  value={paymentForm.amount || ''}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Reference Tag (Label)</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2 outline-none text-xs text-gray-650"
                  value={paymentForm.label}
                  onChange={e => setPaymentForm({ ...paymentForm, label: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Payment
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-205 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Claim Modal */}
      {activeModal === 'claim' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add Damage Claim</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddClaim} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Claim Title / Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Scratch Damage Rear bumper"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={claimForm.description}
                  onChange={e => setClaimForm({ ...claimForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Claim Value / Rate ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={claimForm.amount || ''}
                  onChange={e => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Confidential Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Describe damage evidence here..."
                  value={claimForm.notes}
                  onChange={e => setClaimForm({ ...claimForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Add Claim
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-205 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Fine Modal */}
      {activeModal === 'fine' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add Staff Fine Record</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddFine} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fine Trigger / Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Inside Smoking Fee"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={fineForm.description}
                  onChange={e => setFineForm({ ...fineForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Rate Charge ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={fineForm.amount || ''}
                  onChange={e => setFineForm({ ...fineForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Audit Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Evidence or comments..."
                  value={fineForm.notes}
                  onChange={e => setFineForm({ ...fineForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Fine
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add External Charge Modal */}
      {activeModal === 'external' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add External Charge</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddExternalCharge} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Charge Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Premium Tollways Pass"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={externalForm.description}
                  onChange={e => setExternalForm({ ...externalForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Flat Charged Amount ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={externalForm.amount || ''}
                  onChange={e => setExternalForm({ ...externalForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Line Item Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Details..."
                  value={externalForm.notes}
                  onChange={e => setExternalForm({ ...externalForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Charge
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Switch Vehicle Modal */}
      {activeModal === 'switch' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Switch Vehicle Unit</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleVehicleSwitchSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">
                  Switching from <span className="font-bold">{vehicle.make} {vehicle.model} ({vehicle.licensePlate})</span>.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">New Unit Candidate</label>
                {availableSwitchVehicles.length === 0 ? (
                  <p className="text-xs text-red-500 italic bg-red-50 p-2 rounded">
                    No available replacement units in the fleet.
                  </p>
                ) : (
                  <select 
                    required
                    className="w-full border rounded-lg p-2 bg-white text-xs border-gray-300"
                    value={switchForm.newVehicleId}
                    onChange={e => setSwitchForm({ ...switchForm, newVehicleId: e.target.value })}
                  >
                    <option value="">Select available unit...</option>
                    {availableSwitchVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} - Plate: {v.licensePlate} (${v.dailyRate}/day)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Swap Upgrade Fee ($)</label>
                <input 
                  type="number" 
                  step="1"
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={switchForm.upgradeFee}
                  onChange={e => setSwitchForm({ ...switchForm, upgradeFee: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Swap Notes / Details</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Reason for upgrade or unit swap..."
                  value={switchForm.notes}
                  onChange={e => setSwitchForm({ ...switchForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={!switchForm.newVehicleId}
                  className="flex-1 py-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs shadow-sm py-2"
                >
                  Confirm Switch
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Manage Security Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Manage Security Deposit</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            
            <div className="p-6">
              {/* CURRENT DEPOSIT IS NONE -> PROCESS HOLD */}
              {reservation.securityDepositStatus === 'None' && (
                <form onSubmit={handleProcessDeposit} className="space-y-4 text-sm">
                  <p className="text-xs text-gray-505">
                    No active hold found. Setup a preauthorized security deposit.
                  </p>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Authorized Hold ($)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full border rounded-lg p-2 font-semibold text-base"
                      value={depositForm.amount}
                      onChange={e => setDepositForm({ ...depositForm, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Hold Expiry Until Date</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full border rounded-lg p-2 font-medium"
                      value={depositForm.holdUntil}
                      onChange={e => setDepositForm({ ...depositForm, holdUntil: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                      Apply Preauth Hold
                    </button>
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* CURRENT DEPOSIT IS ON HOLD -> PROCESS REFUND */}
              {reservation.securityDepositStatus === 'On Hold' && (
                <form onSubmit={handleRefundDepositSubmit} className="space-y-4 text-sm">
                  <div className="bg-yellow-50 text-yellow-800 p-3 rounded border border-yellow-200">
                    <span className="font-bold block text-xs">Authorize Refund Release</span>
                    Currently On Hold: ${reservation.securityDepositAmount.toFixed(2)}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Refund Release Amount ($)</label>
                    <input 
                      type="number" 
                      required
                      max={reservation.securityDepositAmount}
                      className="w-full border rounded-lg p-2 font-semibold text-base"
                      value={refundForm.amount}
                      onChange={e => setRefundForm({ ...refundForm, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Refund Release Instrument</label>
                    <select 
                      className="w-full border rounded-lg p-2 bg-white"
                      value={refundForm.method}
                      onChange={e => setRefundForm({ ...refundForm, method: e.target.value })}
                    >
                      <option value="Credit Card">Original Credit Card</option>
                      <option value="Cash">Cash Return</option>
                      <option value="Wire Transfer">Wire Transfer</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow-sm">
                      Authorize Refund
                    </button>
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-12 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs py-2">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* CURRENT DEPOSIT IS REFUNDED */}
              {reservation.securityDepositStatus === 'Refunded' && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Refund Completed</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This deposit has already been fully refunded. No additional changes are allowed.
                    </p>
                    <p className="text-xs bg-gray-100 p-2 rounded font-mono mt-3">
                      Amount: ${reservation.securityDepositRefundAmount?.toFixed(2)} via {reservation.securityDepositRefundMethod}
                    </p>
                  </div>
                  <button type="button" onClick={() => setActiveModal(null)} className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">
                    Okay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
