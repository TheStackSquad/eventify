//frontend/src/components/dashboard/eventAction.js

import { PlusCircle, Search } from "lucide-react";

const EventActions = ({ onCreateEvent, onFindEvents }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {/* CTA for Creator Role - Starts Progressive Onboarding */}
      <div className="bg-white/10 p-6 rounded-xl border border-indigo-400 shadow-xl flex flex-col justify-between transition duration-300 hover:bg-indigo-900/20">
        <div className="flex items-center mb-4">
          <PlusCircle className="w-8 h-8 text-indigo-400 mr-3 p-1 rounded-full bg-indigo-900/50"/>
          <h3 className="text-xl font-bold text-white">I Want to Host</h3>
        </div>
        <p className="text-indigo-200 mb-6">
          Ready to sell tickets? Start creating your event now. We&apos;ll guide you through setting up payments securely.
        </p>
        <button
          onClick={onCreateEvent}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 transition duration-300"
        >
          Create an Event
        </button>
      </div>

      {/* CTA for Attendee Role */}
      <div className="bg-white/10 p-6 rounded-xl border border-white/20 shadow-xl flex flex-col justify-between transition duration-300 hover:bg-white/20">
        <div className="flex items-center mb-4">
          <Search className="w-8 h-8 text-white mr-3 p-1 rounded-full bg-white/20"/>
          <h3 className="text-xl font-bold text-white">I Want to Attend</h3>
        </div>
        <p className="text-indigo-200 mb-6">
          Search the marketplace, view your ticket history, and save events to your favorites list.
        </p>
        <button
          onClick={onFindEvents}
          className="w-full py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition duration-300"
        >
          Find Events
        </button>
      </div>
    </div>
  );
};
export default EventActions;
