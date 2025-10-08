//frontend/src/components/create-events/formSteps/ticketingStep.js

// import { createInputField } from "@/components/common/createInputFields";
import TicketTier from "@/components/create-events/components/ticketTier";

export default function TicketingStep({
  formData,
  errors,
  handleTicketChange,
  addTicketTier,
  removeTicketTier,
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-white">Ticket Tiers</h3>
        <button
          type="button"
          onClick={addTicketTier}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          + Add Tier
        </button>
      </div>

      {formData.tickets.map((ticket, index) => (
        <TicketTier
          key={index}
          index={index}
          ticket={ticket}
          errors={errors}
          onChange={handleTicketChange}
          onRemove={removeTicketTier}
          showRemove={formData.tickets.length > 1}
        />
      ))}
    </div>
  );
}

