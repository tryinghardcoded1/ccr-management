export type VehicleStatus = 'Available' | 'Reserved' | 'Rented' | 'Maintenance' | 'Repair';
export type ReservationStatus = 'Pending' | 'Confirmed' | 'Checked Out' | 'Checked In' | 'Completed' | 'Cancelled' | 'Closed';
export type PaymentStatus = 'Pending' | 'Paid';
export type PaymentType = 'payment' | 'deposit' | 'refund';
export type ChargeCategory = 'External Charge' | 'Fine' | 'Claim';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  status: 'Active' | 'Inactive';
  password?: string; // For mock login purposes
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  driverLicenseNumber: string;
  driverLicenseExpiration: string;
  documents?: string;
  notes?: string;

  // Auto Calculated
  totalRentals: number;
  activeReservations: number;
  totalPaid: number;
  outstandingBalance: number;
  totalClaims: number;
  totalFines: number;
  lifetimeRevenue: number;
  lastRentalDate?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: VehicleStatus;
  dailyRate: number;
  category: string;
  color: string;
  VIN: string;
  mileage: number;
  notes?: string;
}

export type DepositStatus = 'None' | 'Pending' | 'On Hold' | 'Refunded' | 'Completed';

export interface Reservation {
  id: string;
  customerId: string;
  vehicleId: string;
  status: ReservationStatus;
  
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;

  baseRental: number;
  totalAmount: number;
  balance: number;

  bookingDate: string;
  notes?: string;
  vehicleReturned: boolean;

  securityDepositAmount: number;
  securityDepositStatus: DepositStatus;
  securityDepositCollectedDate?: string;
  securityDepositHoldUntil?: string;
  securityDepositRefundAmount?: number;
  securityDepositRefundMethod?: string;
  securityDepositRefundDate?: string;
  securityDepositRefunded: boolean;
  includeDepositInTotal?: boolean;
  agreementStatus?: 'Pending' | 'Signed';
  agreementSentDate?: string;
  agreementSignedDate?: string;
}

export interface Payment {
  id: string;
  reservationId: string;
  customerId: string;
  amount: number;
  date: string;
  method: string;
  notes?: string;
  label?: string;
  type: PaymentType;
}

export interface ChargeItem {
  id: string;
  reservationId: string;
  customerId: string;
  vehicleId?: string; // Optional depending on category
  category: ChargeCategory | 'Vehicle Switch';
  description: string;
  amount: number;
  paymentStatus: PaymentStatus;
  date: string;
  notes?: string;
  // For Vehicle Switch
  oldVehicleId?: string;
  newVehicleId?: string;
}

export interface ChargeTemplate {
  id: string;
  name: string;
  category: ChargeCategory;
  rate: number;
  perDay: boolean;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  type: string;
  startDate: string;
  endDate: string;
  notes?: string;
  cost: number;
}

export interface RentalContract {
  id: string;
  name: string;
  type: string;
  content: string;
  status: 'Active' | 'Inactive';
  uploadedAt: string;
  uploadedBy: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

export interface GeneratedContract {
  contractId: string;
  reservationId: string;
  customerId: string;
  vehicleId: string;
  templateName: string;
  pdfUrl: string;
  createdAt: string;
  status: 'GENERATED';
}

export interface EmailTemplateConfig {
  id: string;
  name: string;
  isActive: boolean;
  businessInfo: string;
  signature: string;
  customMessage: string;
  logo: string | null;
  templateType: string;
}
