import React, { useState } from 'react';
import { Header } from './About';

export default function ContactPage() {
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
      // REPLACE "YOUR_FORMSPREE_ENDPOINT_ID" with your actual Formspree ID
      const response = await fetch('https://formspree.io/f/xeoaqdyk', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setStatus('SUCCESS');
        form.reset();
      } else {
        setStatus('ERROR');
      }
    } catch (error) {
      setStatus('ERROR');
    }
  };

  return (
    <div>
    <Header/>
    <div className="flex min-h-screen items-center justify-center bg-background px-4  sm:px-6 lg:px-8">
      {/* Card Wrapper (Shadcn styled) */}
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
        
        {/* Header */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Contact Us</h2>
          <p className="text-sm text-muted-foreground">
            Send us a message and we'll get back to you shortly.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input (Shadcn styling) */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Message Input (Shadcn styling) */}
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              placeholder="Type your message here..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Submit Button (Shadcn styling) */}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 w-full"
          >
            Send Message
          </button>
        </form>

        {/* Status Messaging */}
        {status === 'SUCCESS' && (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 text-center">
            Thanks! Your message has been sent successfully.
          </p>
        )}
        {status === 'ERROR' && (
          <p className="text-sm font-medium text-destructive text-center">
            Oops! There was a problem submitting your form.
          </p>
        )}
        
      </div>
    </div>
    </div>
  );
}
