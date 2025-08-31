"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, always succeed
      setStatus("success");
      setMessage("Thanks for joining our waitlist! We'll notify you when AI Translator Pro is available.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl p-8 shadow-xl"
      >
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Join the Waitlist
          </h2>
          <p className="text-gray-600">
            Be the first to experience AI Translator Pro when it launches. 
            Get early access and exclusive updates.
          </p>
        </div>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              You're on the list!
            </h3>
            <p className="text-gray-600">{message}</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-base"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={status === "loading" || !email}
                className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {status === "loading" ? "Joining..." : "Join Waitlist"}
              </Button>
            </div>
            
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                {message}
              </motion.div>
            )}
          </form>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p>
            We respect your privacy. Your email will only be used for AI Translator Pro updates.
          </p>
        </div>
      </motion.div>
    </section>
  );
}