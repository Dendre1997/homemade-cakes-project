"use client";

import { useState } from "react";import Link from "next/link";
import { Instagram, Facebook, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    company: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        company: "",
      });
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send message."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-card-background rounded-large shadow-xl overflow-hidden">
          {/* Left Section: Info & Socials */}
          <div className="bg-primary text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative circle backdrop */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />

            <div>
              <h1 className="font-heading text-4xl md:text-5xl mb-6 drop-shadow-sm">
                Get in Touch
              </h1>
              <p className="font-body text-lg text-white/90 mb-8 leading-relaxed">
                We'd love to hear from you! Whether you have a question about
                our cakes, need a custom order, or just want to say hi, send us
                a message.
              </p>

              <div className="flex flex-col gap-4 mb-8">
                <p className="text-white/80 text-sm">
                  We usually respond within 24 hours.
                </p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <h3 className="font-heading text-2xl mb-4">Follow Us</h3>
              <div className="flex gap-4">
                <Link
                  href="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.instagram.com%2F_u%2Fh0memade_cakes.yyc%3Figsh%3DbGZseHJvd3phdjZt%26utm_source%3Dqr%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExdU5DWjBOUHdubHBKOTBYS3NydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR49CAVHGgUqqaKqNiOFh2DuqOPKvTs4MTS7VkFwxvbptH_lvctrm05JAsS4lg_aem_1e5qLsfl-ffuVS85i_qdrw&h=AT2oTYvfjklH-gyJj9Uz9W5lZWV63h3zzktGAdqBM8wgdkV2VtDQbkpsBhT1tvjDJQsJ2ajE_TQpNV1PO3fowPozXkcaRGN05Jx961kmVaZO_ybU7dnxYz0E9xdQIFx1VxXE8jVQY5e3xTlk"
                  target="_blank"
                  className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110"
                >
                  <Instagram className="w-6 h-6 text-white" />
                  <span className="sr-only">Instagram</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Section: Contact Form */}
          <div className="p-8 md:p-12 bg-white">
            <h2 className="font-heading text-3xl text-primary mb-6">
              Send a Message
            </h2>

            {submitStatus === "success" ? (
              <div className="rounded-lg p-6 text-center animate-in fade-in zoom-in duration-300">
                <h3 className="font-heading text-2xl text-accent mb-2">
                  Thank You!
                </h3>
                <p className="text-text-primary">
                  Your message has been sent successfully. We'll get back to you
                  shortly.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => setSubmitStatus("idle")}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-bold text-text-primary mb-2"
                  >
                    Name <span className="text-error">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="bg-neutral-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-text-primary mb-2"
                  >
                    Email <span className="text-error">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    className="bg-neutral-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-bold text-text-primary mb-2"
                  >
                    Phone (Optional)
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="bg-neutral-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-bold text-text-primary mb-2"
                  >
                    Message <span className="text-error">*</span>
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="How can we help you?"
                    className="bg-neutral-50 min-h-[150px]"
                  />
                </div>

                {/* Honeypot Field - Hidden from users */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company">Company</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {submitStatus === "error" && (
                  <div className="p-3 bg-error/10 text-error rounded-md text-sm border border-error/20">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
