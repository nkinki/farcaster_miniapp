"use client"

import { useState } from "react"
import { FiSend, FiUser, FiMail, FiMessageSquare, FiPhone, FiBuilding } from "react-icons/fi"

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
    budget: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        message: "",
        budget: ""
      })
    }, 3000)
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto text-center animate-scale-in">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-3xl p-12">
          <div className="text-6xl mb-6">🎉</div>
          <h3 className="text-3xl font-bold text-white mb-4">Thank You!</h3>
          <p className="text-xl text-gray-300 mb-6">
            Your message has been sent successfully. We'll get back to you within 24 hours!
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Name Field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiUser className="text-purple-400 group-focus-within:text-purple-300 transition-colors" />
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your Name"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Email Field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiMail className="text-purple-400 group-focus-within:text-purple-300 transition-colors" />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Your Email"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiBuilding className="text-purple-400 group-focus-within:text-purple-300 transition-colors" />
            </div>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Company Name"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Phone Field */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiPhone className="text-purple-400 group-focus-within:text-purple-300 transition-colors" />
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* Budget Field */}
        <div className="relative group">
          <select
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            className="w-full px-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="">Select Your Budget Range</option>
            <option value="5k-10k">$5,000 - $10,000</option>
            <option value="10k-25k">$10,000 - $25,000</option>
            <option value="25k-50k">$25,000 - $50,000</option>
            <option value="50k-100k">$50,000 - $100,000</option>
            <option value="100k+">$100,000+</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Message Field */}
        <div className="relative group">
          <div className="absolute top-4 left-4 pointer-events-none">
            <FiMessageSquare className="text-purple-400 group-focus-within:text-purple-300 transition-colors" />
          </div>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Tell us about your project..."
            className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              group relative px-12 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 
              rounded-xl font-semibold text-lg text-white transition-all duration-300
              hover:shadow-2xl hover:shadow-purple-500/25 hover:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              ${isSubmitting ? 'animate-pulse' : ''}
            `}
          >
            <span className="flex items-center justify-center space-x-2">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <FiSend className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
          </button>
        </div>
      </form>

      {/* Contact Info */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
        <div className="group">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <FiMail className="text-white" size={20} />
          </div>
          <h4 className="font-semibold text-white mb-2">Email Us</h4>
          <p className="text-gray-400">hello@nexusagency.com</p>
        </div>
        
        <div className="group">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <FiPhone className="text-white" size={20} />
          </div>
          <h4 className="font-semibold text-white mb-2">Call Us</h4>
          <p className="text-gray-400">+1 (555) 123-4567</p>
        </div>
        
        <div className="group">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <FiMessageSquare className="text-white" size={20} />
          </div>
          <h4 className="font-semibold text-white mb-2">Live Chat</h4>
          <p className="text-gray-400">Available 24/7</p>
        </div>
      </div>
    </div>
  )
}