"use client"

import { useState } from "react"
import { FiExternalLink, FiTrendingUp, FiUsers, FiDollarSign } from "react-icons/fi"

interface PortfolioItem {
  id: number
  title: string
  category: string
  description: string
  image: string
  metrics: {
    growth: string
    users: string
    revenue: string
  }
  tags: string[]
  color: string
}

export default function PortfolioShowcase() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)

  const portfolioItems: PortfolioItem[] = [
    {
      id: 1,
      title: "TechStart Revolution",
      category: "startup",
      description: "Complete digital transformation for a B2B SaaS startup, resulting in explosive growth",
      image: "/api/placeholder/400/300",
      metrics: {
        growth: "+340%",
        users: "50K+",
        revenue: "$2.5M"
      },
      tags: ["SaaS", "B2B", "Growth Hacking"],
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 2,
      title: "E-commerce Empire",
      category: "ecommerce",
      description: "Viral social media campaigns that transformed a small shop into an industry leader",
      image: "/api/placeholder/400/300",
      metrics: {
        growth: "+280%",
        users: "125K+",
        revenue: "$5.2M"
      },
      tags: ["E-commerce", "Social Media", "Viral Marketing"],
      color: "from-cyan-500 to-blue-500"
    },
    {
      id: 3,
      title: "Fashion Forward",
      category: "fashion",
      description: "Influencer partnerships and content strategy that made this brand go viral",
      image: "/api/placeholder/400/300",
      metrics: {
        growth: "+450%",
        users: "200K+",
        revenue: "$3.8M"
      },
      tags: ["Fashion", "Influencer Marketing", "Content Strategy"],
      color: "from-pink-500 to-rose-500"
    },
    {
      id: 4,
      title: "FinTech Innovation",
      category: "fintech",
      description: "Performance marketing campaigns that drove massive user acquisition",
      image: "/api/placeholder/400/300",
      metrics: {
        growth: "+520%",
        users: "300K+",
        revenue: "$8.1M"
      },
      tags: ["FinTech", "Performance Marketing", "User Acquisition"],
      color: "from-green-500 to-emerald-500"
    }
  ]

  const categories = ["all", "startup", "ecommerce", "fashion", "fintech"]

  const filteredItems = activeFilter === "all" 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeFilter)

  return (
    <section className="py-20 bg-gradient-to-b from-black to-purple-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Success Stories
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Real results from real clients - see how we've transformed businesses across industries
          </p>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  activeFilter === category
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative bg-gradient-to-b from-gray-900/50 to-black border border-purple-500/20 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all duration-500 hover:transform hover:scale-105"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20`} />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
                    <FiExternalLink className="text-white" size={20} />
                  </div>
                </div>
                
                {/* Placeholder for image */}
                <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
                  <div className="text-6xl opacity-50">🚀</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-300 mb-6">{item.description}</p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <FiTrendingUp className="text-green-400 mr-1" size={16} />
                    </div>
                    <div className="text-2xl font-bold text-green-400">{item.metrics.growth}</div>
                    <div className="text-xs text-gray-400">Growth</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <FiUsers className="text-blue-400 mr-1" size={16} />
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{item.metrics.users}</div>
                    <div className="text-xs text-gray-400">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <FiDollarSign className="text-yellow-400 mr-1" size={16} />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{item.metrics.revenue}</div>
                    <div className="text-xs text-gray-400">Revenue</div>
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              />
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-xl text-gray-300 mb-8">
            Ready to become our next success story?
          </p>
          <button className="bg-gradient-to-r from-purple-500 to-cyan-500 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300">
            Start Your Project
          </button>
        </div>
      </div>
    </section>
  )
}