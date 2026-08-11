import { useState, type SubmitEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

// Sign up free at formspree.io, create a form, and put its ID here (or set
// VITE_FORMSPREE_ID in a .env file / your Vercel project's env vars) to wire
// this up. Until then, submissions fall back to a friendly "email me
// directly" message instead of silently failing.
const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID as string | undefined;

type Status = "idle" | "sending" | "success" | "error" | "unconfigured";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!FORMSPREE_ID) {
      setStatus("unconfigured");
      return;
    }

    setStatus("sending");
    const form = e.currentTarget;
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center">
        <CheckCircle2 size={28} className="text-emerald-400" />
        <p className="font-display text-base font-semibold text-white">
          Message sent
        </p>
        <p className="text-sm text-mist">
          Thanks — I'll get back to you within a day.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-2 text-sm text-cyan underline-offset-2 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative text-left">
      {/* honeypot — invisible to real visitors, filters basic spam bots */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />
      <input type="hidden" name="_subject" value="New project inquiry — portfolio site" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-mist">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-mist/60 focus:border-violet/50 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-mist">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="w-full rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-mist/60 focus:border-violet/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="message" className="mb-1.5 block text-xs font-medium text-mist">
          Project description
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="What are you building? Rough scope, timeline, budget range — whatever you've got."
          className="w-full resize-none rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-mist/60 focus:border-violet/50 focus:outline-none"
        />
      </div>

      {(status === "error" || status === "unconfigured") && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {status === "unconfigured"
            ? "The contact form isn't wired up to an inbox yet — please email me directly below instead."
            : "Something went wrong sending that — please email me directly below instead."}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 sm:w-auto"
      >
        {status === "sending" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={16} />
            Send message
          </>
        )}
      </button>
    </form>
  );
}
