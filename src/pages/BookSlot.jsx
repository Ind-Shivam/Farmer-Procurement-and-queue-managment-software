import FarmerBookingForm from '../components/FarmerBookingForm.jsx'

function BookSlot() {
  return (
    <FarmerBookingForm
      eyebrow="Direct Slot Reservation"
      title="Book a Procurement Time Window"
      lede="Check open capacity across all procurement centres. Slots marked Full cannot be reserved to prevent mandi congestion."
      submitLabel="Confirm Mandi Slot & Generate Token"
    />
  )
}

export default BookSlot
