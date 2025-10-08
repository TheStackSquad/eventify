//frontend/src/utils/validate/eventValidate.js

export const validateStep = (step, formData, setErrors) => {
  const newErrors = {};

  if (step === 1) {
    if (!formData.eventTitle.trim())
      newErrors.eventTitle = "Event title is required";
    if (!formData.eventDescription.trim())
      newErrors.eventDescription = "Description is required";
    if (!formData.category) newErrors.category = "Category is required";
  }

  if (step === 2) {
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";

    if (formData.eventType === "physical") {
      if (!formData.venueName) newErrors.venueName = "Venue name is required";
      if (!formData.venueAddress)
        newErrors.venueAddress = "Venue address is required";
      if (!formData.city) newErrors.city = "City is required";
    } else {
      if (!formData.virtualPlatform)
        newErrors.virtualPlatform = "Platform is required";
      if (!formData.meetingLink)
        newErrors.meetingLink = "Meeting link is required";
    }
  }

  if (step === 3) {
    formData.tickets.forEach((ticket, index) => {
      if (!ticket.tierName)
        newErrors[`ticket_${index}_tierName`] = "Tier name is required";
      if (!ticket.price)
        newErrors[`ticket_${index}_price`] = "Price is required";
      if (!ticket.quantity)
        newErrors[`ticket_${index}_quantity`] = "Quantity is required";
    });
  }

  if (step === 4) {
    if (!formData.paystackSubaccountCode) {
      newErrors.paystackSubaccountCode = "Paystack subaccount is required";
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
