"use client"

import { useState } from "react"
import { FiCheck, FiStar, FiZap, FiTrendingUp, FiTarget } from "react-icons/fi"

interface PricingPlan {
  id: string
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  highlighted: boolean
  icon: React.ElementType
  gradient: string
  popular?: boolean
}

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)

  const pricingPlans: PricingPlan[] = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for small businesses looking to establish their digital presence",
      price: {
        monthly: 2500,
        yearly: 2000
      },
      features: [
        "Social Media Management",
        "Basic Content Creation",
        "Monthly Analytics Report",
        "Email Support",
        "2 Campaigns per Month"
      ],
      highlighted: false,
      icon: FiTarget,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      id: "growth",
      name: "Growth",
      description: "Ideal for growing companies ready to scale their marketing efforts",
      price: {
        monthly: 5000,
        yearly: 4200
      },
      features: [
        "Everything in Starter",
        "Advanced Content Strategy",
        "PPC Campaign Management",
        "Weekly Analytics Reports",
        "Priority Support",
        "5 Campaigns per Month",
        "A/B Testing",
        "Conversion Optimization"
      ],
      highlighted: true,
      icon: FiTrendingUp,
      gradient: "from-purple-500 to-pink-500",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Comprehensive solution for established businesses seeking market dominance",
      price: {
        monthly: 10000,
        yearly: 8500
      },
      features: [
        "Everything in Growth",
        "Custom Strategy Development",
        "Dedicated Account Manager",
        "Real-time Analytics Dashboard",
        "24/7 Priority Support",
        "Unlimited Campaigns",
        "Advanced Attribution Modeling",
        "Custom Integrations",
        "Quarterly Strategy Reviews"
      ],
      highlighted: false,
      icon: FiZap,
      gradient: "from-green-500 to-emerald-500"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-purple-900/10 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Choose Your Growth Plan
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Transparent pricing with no hidden fees. Scale your investment as your business grows.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-lg ${!isYearly ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
                isYearly ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                  isYearly ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-lg ${isYearly ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Yearly
            </span>
            {isYearly && (
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Save 20%
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-b from-gray-900/50 to-black rounded-3xl p-8 transition-all duration-500 hover:transform hover:scale-105 ${
                plan.highlighted
                  ? 'border-2 border-purple-500 shadow-2xl shadow-purple-500/25'
                  : 'border border-purple-500/20 hover:border-purple-500/50'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <FiStar size={16} />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className={`w-16 h-16 bg-gradient-to-r ${plan.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon size={28} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-white">
                    ${isYearly ? plan.price.yearly.toLocaleString() : plan.price.monthly.toLocaleString()}
                  </span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>
                {isYearly && (
                  <div className="text-sm text-green-400 mt-2">
                    Save ${((plan.price.monthly - plan.price.yearly) * 12).toLocaleString()} per year
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-5 h-5 bg-gradient-to-r ${plan.gradient} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <FiCheck size={12} className="text-white" />
                    </div>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  plan.highlighted
                    ? `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-2xl hover:shadow-purple-500/25`
                    : `border-2 border-gray-600 text-gray-300 hover:border-purple-500 hover:text-white`
                }`}
              >
                {plan.highlighted ? 'Start Growing Now' : 'Get Started'}
              </button>

              {/* Background Gradient */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-0 hover:opacity-5 transition-opacity duration-500 rounded-3xl pointer-events-none`}
              />
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-6">
            All plans include a 30-day money-back guarantee and can be cancelled anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-gradient-to-r from-purple-500 to-cyan-500 px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
              Schedule Free Consultation
            </button>
            <button className="text-purple-400 hover:text-purple-300 transition-colors">
              Compare All Features →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}