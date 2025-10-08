//frontend/src/components/create-events/formSteps/paymentStep.js

import { createInputField } from "@/components/common/createInputFields";

export default function PaymentStep({ formData, errors, handleInputChange }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-4">Payment Setup</h3>

      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-blue-300 font-semibold mb-1">
              Paystack Integration Required
            </h4>
            <p className="text-blue-200 text-sm">
              You&apos;ll need a Paystack subaccount to receive payments directly. If
              you don&apos;t have one,{" "}
              <a
                href="https://paystack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-100"
              >
                create one here
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {createInputField({
        label: "Paystack Subaccount Code",
        type: "text",
        name: "paystackSubaccountCode",
        value: formData.paystackSubaccountCode,
        onChange: (e) =>
          handleInputChange("paystackSubaccountCode", e.target.value),
        placeholder: "ACCT_xxxxxxxxxx",
        error: errors.paystackSubaccountCode,
        required: true,
      })}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-semibold mb-4">Revenue Breakdown</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Platform Fee</span>
            <span className="text-white font-semibold">5%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Your Earnings</span>
            <span className="text-green-400 font-semibold">95%</span>
          </div>
          <div className="pt-3 border-t border-gray-700">
            <p className="text-gray-400 text-xs">
              Payments are processed instantly via Paystack and deposited
              directly to your account.
            </p>
          </div>
        </div>
      </div>

      {createInputField({
        label: "Maximum Attendees (Optional)",
        type: "number",
        name: "maxAttendees",
        value: formData.maxAttendees,
        onChange: (e) => handleInputChange("maxAttendees", e.target.value),
        placeholder: "Leave blank for unlimited",
      })}
    </div>
  );
}
