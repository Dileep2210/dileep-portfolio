import { useRef, useState, type SubmitEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-border bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-mist/80 transition-[border-color,transform,box-shadow] duration-200 focus:scale-[1.01] focus:border-violet/50 focus:outline-none aria-[invalid=true]:border-amber-400/60";

// Base URL of the FastAPI backend (see /backend). Public by design: it holds no
// secrets. SMTP credentials live only in the backend's environment.
const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:8000" : "")
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15000;

// Keep in sync with backend/app/schemas.py (the server re-validates everything).
const LIMITS = {
  name: { min: 2, max: 100 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 5000 },
} as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "sending" | "success" | "error" | "unconfigured";
type Field = "name" | "email" | "subject" | "message";
type FieldErrors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();
  if (name.length < LIMITS.name.min) errors.name = `Please enter your name (at least ${LIMITS.name.min} characters).`;
  else if (name.length > LIMITS.name.max) errors.name = `Name must be ${LIMITS.name.max} characters or fewer.`;
  if (!EMAIL_RE.test(values.email.trim())) errors.email = "Please enter a valid email address.";
  if (subject.length < LIMITS.subject.min) errors.subject = `Please add a subject (at least ${LIMITS.subject.min} characters).`;
  else if (subject.length > LIMITS.subject.max) errors.subject = `Subject must be ${LIMITS.subject.max} characters or fewer.`;
  if (message.length < LIMITS.message.min) errors.message = `Please describe your project (at least ${LIMITS.message.min} characters).`;
  else if (message.length > LIMITS.message.max) errors.message = `Message must be ${LIMITS.message.max} characters or fewer.`;
  return errors;
}

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-amber-300">
      {text}
    </p>
  );
}

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Ref (not state) so a fast double-click can't slip in before a re-render.
  const inFlight = useRef(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const values = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    };

    const errors = validate(values);
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(errors) as Field[])[0];
    if (firstInvalid) {
      setStatus("idle");
      setErrorText("");
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    if (!API_URL) {
      setStatus("unconfigured");
      return;
    }

    inFlight.current = true;
    setStatus("sending");
    setErrorText("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          website: String(fd.get("website") ?? ""), // honeypot
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        setStatus("success");
        form.reset(); // only after the server confirmed
        return;
      }

      let serverError = "";
      try {
        const body = (await res.json()) as { error?: string };
        serverError = typeof body.error === "string" ? body.error : "";
      } catch {
        // non-JSON error body: fall through to the generic text
      }
      setErrorText(
        res.status === 429
          ? "You've sent a few messages in a row. Please wait a bit and try again."
          : res.status === 422
            ? "Some fields didn't pass validation. Please check them and try again."
            : serverError ||
                "Something went wrong sending that. Please email me directly below instead.",
      );
      setStatus("error");
    } catch {
      setErrorText(
        controller.signal.aborted
          ? "The server took too long to respond. Please try again, or email me directly below."
          : "Couldn't reach the server. Check your connection, or email me directly below.",
      );
      setStatus("error");
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        role="status"
        className="relative flex flex-col items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
        >
          <CheckCircle2 size={28} className="text-emerald-400" />
        </motion.div>
        <p className="font-display text-base font-semibold text-white">
          Message sent
        </p>
        <p className="text-sm text-mist">
          Thanks — I'll get back to you within a day.
        </p>
        <button
          type="button"
          onClick={() => {
            setFieldErrors({});
            setStatus("idle");
          }}
          className="mt-2 text-sm text-cyan underline-offset-2 hover:underline"
        >
          Send another message
        </button>
      </motion.div>
    );
  }

  const sending = status === "sending";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={sending}
      className="relative text-left"
    >
      {/* Honeypot: off-screen and hidden from assistive tech; the server drops any submission that fills it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

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
            autoComplete="name"
            maxLength={LIMITS.name.max}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            placeholder="Your name"
            className={inputClass}
          />
          <FieldError id="name-error" text={fieldErrors.name} />
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
            autoComplete="email"
            maxLength={254}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            placeholder="you@company.com"
            className={inputClass}
          />
          <FieldError id="email-error" text={fieldErrors.email} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="subject" className="mb-1.5 block text-xs font-medium text-mist">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={LIMITS.subject.max}
          aria-invalid={fieldErrors.subject ? true : undefined}
          aria-describedby={fieldErrors.subject ? "subject-error" : undefined}
          placeholder="e.g. Business website, AI chatbot, API integration"
          className={inputClass}
        />
        <FieldError id="subject-error" text={fieldErrors.subject} />
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
          maxLength={LIMITS.message.max}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
          placeholder="What are you building? Rough scope, timeline, budget range — whatever you've got."
          className={`resize-none ${inputClass}`}
        />
        <FieldError id="message-error" text={fieldErrors.message} />
      </div>

      <AnimatePresence>
        {(status === "error" || status === "unconfigured") && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {status === "unconfigured"
              ? "The contact form isn't connected to a server yet. Please email me directly below instead."
              : errorText}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={sending}
        aria-disabled={sending}
        whileHover={{ scale: sending ? 1 : 1.02 }}
        whileTap={{ scale: sending ? 1 : 0.96 }}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {sending ? (
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
      </motion.button>
    </form>
  );
}
