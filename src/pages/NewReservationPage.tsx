import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NewBookingWizard from '../components/NewBookingWizard';

export default function NewReservationPage() {
  const navigate = useNavigate();
  // We don't render a popup here, wait, NewBookingWizard is designed as a popup. 
  // Let's modify NewBookingWizard to be full-screen or just a standard component.
  // Actually, let's just make it a standard component by using the NewBookingWizard but not in fixed mode.
  // Wait, if NewBookingWizard is a popup, let's just wrap it. Wait, the user said "better for it to be a page that doenst show on the menu isntead of pop up".
  
  return (
      <div className="w-full bg-white h-full relative">
         <NewBookingWizard onClose={() => navigate('/reservations')} embedded />
      </div>
  );
}
