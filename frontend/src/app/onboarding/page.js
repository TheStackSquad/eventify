//frontend/src/app/onboarding/page.js

'use client';

import { useState } from "react";
import CreateUserCTA from "@/components/events/createCTA";
import EventActions from "@/components/dashboard/eventAction";

// Assuming LogIn is an icon from a library like 'lucide-react' or 'react-icons':
import { LogIn } from "lucide-react"; 
const OnboardingPage = ({ setRoute }) => (
  <div className="flex min-h-screen items-center justify-center p-4 bg-gray-900">
    <CreateUserCTA onStartSignup={() => setRoute('signup')} />
  </div>
);

// Simulating //src/app/create-user/page.js
const CreateUserPage = ({ setRoute }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();
    // Simulate successful API call (low-friction sign up)
    console.log(`User created: ${email}`);
    // Redirect to //src/app/dashboard/page.js
    setRoute('dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-6">Create Your Profile (Attendee Role)</h1>
        <p className="text-sm text-indigo-300 mb-6">
          Just the basics for now. You&apos;ll add event creator details later when you decide to host!
        </p>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-500 transition duration-300"
          >
            Sign Up
          </button>
        </form>
        <button onClick={() => setRoute('onboarding')} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">
          ← Back
        </button>
      </div>
    </div>
  );
};

// Simulating the Event Creation Flow start (e.g., when clicking 'Create an Event')
const EventCreationPage = ({ setRoute }) => (
    <div className="flex flex-col min-h-screen p-8 bg-gray-900">
        <h1 className="text-4xl font-extrabold text-white mb-6">Start Event Setup</h1>
        <p className="text-xl text-indigo-300 mb-8">
            This is where you would use the `{`eventCreatorForm.js`}` component.
        </p>
        <div className="p-6 bg-yellow-900/30 border border-yellow-500 rounded-lg text-yellow-300 mb-8">
            <h3 className="font-bold">Progressive Onboarding Alert:</h3>
            <p className="text-sm mt-1">
                Since you chose to sell tickets, the next step (after event details) would be the secure **Stripe/Payout Verification** step to maintain platform integrity, before your event is published.
            </p>
        </div>
        
        {/* Simulating the start of the form that will lead to Stripe */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex-grow">
            <h4 className="text-white text-lg font-semibold">Event Details (Mock Form Content)</h4>
            <div className="mt-4 space-y-3 text-gray-400">
                <p>1. Event Title: Party at the Park</p>
                <p>2. Date & Time: 2026-06-01 18:00</p>
                <p>3. Ticket Type: Paid ($25)</p>
            </div>
            <button
                onClick={() => { alert("Redirecting to Stripe/Bank Setup..."); setRoute('dashboard'); }}
                className="mt-6 py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition"
            >
                Continue to Payout Setup
            </button>
        </div>
        
        <button onClick={() => setRoute('dashboard')} className="mt-8 self-start text-indigo-400 hover:text-indigo-300 flex items-center">
            <span className="mr-2">←</span> Back to Dashboard
        </button>
    </div>
);


// Simulating //src/app/dashboard/page.js
const DashboardPage = ({ setRoute }) => {
  const [userName] = useState('New User'); // Simple user state

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white font-sans">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-extrabold text-white">Welcome, {userName}!</h1>
        <button 
            onClick={() => setRoute('onboarding')} 
            className="flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
        >
            <LogIn className="w-4 h-4 mr-2" /> Log Out
        </button>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-300">What would you like to do today?</h2>
        {/* This is the new subcomponent: //src/components/dashboard/eventAction.js */}
        <EventActions
          onCreateEvent={() => setRoute('create-event')}
          onFindEvents={() => alert('Redirecting to Event Search/Feed...')}
        />
      </section>

      <section className="mb-10 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4">My Attendee History</h2>
        <p className="text-gray-400">You haven&apos;t purchased any tickets yet. Start browsing now!</p>
      </section>
    </div>
  );
};

// --- Main Application Component (App.jsx) ---
export default function App() {
  // Simple state-based routing simulation
  const [route, setRoute] = useState('onboarding'); // Initial route

  const renderRoute = () => {
    switch (route) {
      case 'onboarding':
        return <OnboardingPage setRoute={setRoute} />;
      case 'signup':
        return <CreateUserPage setRoute={setRoute} />;
      case 'dashboard':
        return <DashboardPage setRoute={setRoute} />;
      case 'create-event':
        return <EventCreationPage setRoute={setRoute} />;
      default:
        return <OnboardingPage setRoute={setRoute} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 font-inter">
      {/* Tailwind setup assumed */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
        .font-inter { font-family: 'Inter', sans-serif; }
        /* Ensure responsiveness */
        .min-h-screen { min-height: 100vh; }
      `}</style>
      {renderRoute()}
    </div>
  );
}
