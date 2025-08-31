"use client";

import { motion } from "framer-motion";
import { Languages, Zap, Globe } from "lucide-react";

export function Hero() {
  return (
    <section className="text-center mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex justify-center items-center mb-6">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75"></div>
            <div className="relative bg-white p-4 rounded-full">
              <Languages className="h-12 w-12 text-blue-600" />
            </div>
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
          AI Translator
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {" "}Pro
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
          The ultimate Chrome extension for AI-powered translations using Google Gemini AI. 
          Translate any text instantly with voice-to-text capabilities and site-specific controls.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex justify-center gap-8 mb-12"
      >
        <div className="flex items-center gap-2 text-gray-600">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Instant Translation</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Globe className="h-5 w-5 text-green-500" />
          <span>30+ Languages</span>
        </div>
      </motion.div>
    </section>
  );
}