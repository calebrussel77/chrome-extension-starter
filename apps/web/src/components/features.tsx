"use client";

import { motion } from "framer-motion";
import { Mic, Settings, Zap, Shield, Globe2, MousePointer } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Translation",
    description: "Translate any text instantly using Google Gemini AI with just a right-click or selection.",
    color: "text-yellow-500"
  },
  {
    icon: Mic,
    title: "Voice-to-Text",
    description: "Convert speech to text using OpenAI Whisper, then translate to any language seamlessly.",
    color: "text-blue-500"
  },
  {
    icon: Globe2,
    title: "30+ Languages",
    description: "Support for over 30 languages with automatic detection and high-quality translations.",
    color: "text-green-500"
  },
  {
    icon: Settings,
    title: "Site Controls",
    description: "Enable or disable the extension per website with granular control over your browsing experience.",
    color: "text-purple-500"
  },
  {
    icon: MousePointer,
    title: "Context Menu",
    description: "Right-click on any text to translate instantly without interrupting your browsing flow.",
    color: "text-red-500"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your API keys are stored securely and never transmitted except to translation services.",
    color: "text-indigo-500"
  }
];

export function Features() {
  return (
    <section className="mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Powerful Features
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Everything you need for seamless translation directly in your browser
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className={`inline-flex p-3 rounded-lg bg-gray-50 mb-4`}>
              <feature.icon className={`h-6 w-6 ${feature.color}`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}