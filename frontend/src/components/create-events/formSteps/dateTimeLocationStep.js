//frontend/src/components/create-events/formSteps/dateTimeLocationStep.js

import { createInputField } from "@/components/common/createInputFields";

export default function DateTimeLocationStep({
  formData,
  errors,
  handleInputChange,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-4">
        Date, Time & Location
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {createInputField({
          label: "Start Date",
          type: "date",
          name: "startDate",
          value: formData.startDate,
          onChange: (e) => handleInputChange("startDate", e.target.value),
          error: errors.startDate,
          required: true,
        })}

        {createInputField({
          label: "Start Time",
          type: "time",
          name: "startTime",
          value: formData.startTime,
          onChange: (e) => handleInputChange("startTime", e.target.value),
          error: errors.startTime,
          required: true,
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {createInputField({
          label: "End Date",
          type: "date",
          name: "endDate",
          value: formData.endDate,
          onChange: (e) => handleInputChange("endDate", e.target.value),
        })}

        {createInputField({
          label: "End Time",
          type: "time",
          name: "endTime",
          value: formData.endTime,
          onChange: (e) => handleInputChange("endTime", e.target.value),
        })}
      </div>

      {formData.eventType === "physical" ? (
        <>
          {createInputField({
            label: "Venue Name",
            type: "text",
            name: "venueName",
            value: formData.venueName,
            onChange: (e) => handleInputChange("venueName", e.target.value),
            placeholder: "e.g., Lagos Convention Centre",
            error: errors.venueName,
            required: true,
          })}

          {createInputField({
            label: "Venue Address",
            type: "text",
            name: "venueAddress",
            value: formData.venueAddress,
            onChange: (e) => handleInputChange("venueAddress", e.target.value),
            placeholder: "Full street address",
            error: errors.venueAddress,
            required: true,
          })}

          <div className="grid grid-cols-2 gap-4">
            {createInputField({
              label: "City",
              type: "text",
              name: "city",
              value: formData.city,
              onChange: (e) => handleInputChange("city", e.target.value),
              error: errors.city,
              required: true,
            })}

            {createInputField({
              label: "State",
              type: "text",
              name: "state",
              value: formData.state,
              onChange: (e) => handleInputChange("state", e.target.value),
            })}
          </div>
        </>
      ) : (
        <>
          {createInputField({
            label: "Virtual Platform",
            type: "text",
            name: "virtualPlatform",
            value: formData.virtualPlatform,
            onChange: (e) =>
              handleInputChange("virtualPlatform", e.target.value),
            placeholder: "e.g., Zoom, Google Meet, Teams",
            error: errors.virtualPlatform,
            required: true,
          })}

          {createInputField({
            label: "Meeting Link",
            type: "url",
            name: "meetingLink",
            value: formData.meetingLink,
            onChange: (e) => handleInputChange("meetingLink", e.target.value),
            placeholder: "https://zoom.us/j/...",
            error: errors.meetingLink,
            required: true,
          })}
        </>
      )}
    </div>
  );
}