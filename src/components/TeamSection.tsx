"use client"

import { useState } from "react"
import { FiLinkedin, FiTwitter, FiInstagram, FiMail } from "react-icons/fi"

interface TeamMember {
  id: number
  name: string
  role: string
  bio: string
  image: string
  skills: string[]
  social: {
    linkedin?: string
    twitter?: string
    instagram?: string
    email?: string
  }
  gradient: string
}

export default function TeamSection() {
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)

  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: "Alex Rivera",
      role: "Creative Director",
      bio: "Visionary creative with 10+ years of experience in brand storytelling and viral campaigns.",
      image: "/api/placeholder/300/300",
      skills: ["Brand Strategy", "Creative Direction", "Campaign Design"],
      social: {
        linkedin: "#",
        twitter: "#",
        instagram: "#",
        email: "alex@nexusagency.com"
      },
      gradient: "from-purple-500 to-pink-500"
    },
    {
      id: 2,
      name: "Sarah Chen",
      role: "Performance Marketing Lead",
      bio: "Data-driven marketer who has generated over $50M in revenue for clients through strategic campaigns.",
      image: "/api/placeholder/300/300",
      skills: ["PPC Management", "Analytics", "Conversion Optimization"],
      social: {
        linkedin: "#",
        twitter: "#",
        email: "sarah@nexusagency.com"
      },
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      id: 3,
      name: "Marcus Johnson",
      role: "Social Media Strategist",
      bio: "Social media expert who has built communities of millions and created viral content across platforms.",
      image: "/api/placeholder/300/300",
      skills: ["Content Strategy", "Community Building", "Influencer Relations"],
      social: {
        linkedin: "#",
        instagram: "#",
        twitter: "#",
        email: "marcus@nexusagency.com"
      },
      gradient: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      name: "Emma Thompson",
      role: "Brand Designer",
      bio: "Award-winning designer who creates memorable visual identities that resonate with audiences.",
      image: "/api/placeholder/300/300",
      skills: ["Visual Identity", "UI/UX Design", "Brand Guidelines"],
      social: {
        linkedin: "#",
        instagram: "#",
        email: "emma@nexusagency.com"
      },
      gradient: "from-pink-500 to-rose-500"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-black to-purple-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Meet Our Team
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            The creative minds behind your success - a team of experts passionate about delivering exceptional results
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="group relative bg-gradient-to-b from-gray-900/50 to-black border border-purple-500/20 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all duration-500 hover:transform hover:scale-105"
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
            >
              {/* Profile Image */}
              <div className="relative h-64 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-20`} />
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Placeholder Avatar */}
                <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
                  <div className="text-6xl opacity-70">👤</div>
                </div>

                {/* Social Links Overlay */}
                <div className={`absolute inset-0 bg-black/80 flex items-center justify-center transition-opacity duration-300 ${
                  hoveredMember === member.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="flex space-x-4">
                    {member.social.linkedin && (
                      <a
                        href={member.social.linkedin}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <FiLinkedin className="text-white" size={18} />
                      </a>
                    )}
                    {member.social.twitter && (
                      <a
                        href={member.social.twitter}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <FiTwitter className="text-white" size={18} />
                      </a>
                    )}
                    {member.social.instagram && (
                      <a
                        href={member.social.instagram}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <FiInstagram className="text-white" size={18} />
                      </a>
                    )}
                    {member.social.email && (
                      <a
                        href={`mailto:${member.social.email}`}
                        className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <FiMail className="text-white" size={18} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                <p className={`text-sm font-semibold mb-4 bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent`}>
                  {member.role}
                </p>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">{member.bio}</p>

                {/* Skills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
              />
            </div>
          ))}
        </div>

        {/* Team Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              50+
            </div>
            <div className="text-gray-400">Years Combined Experience</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              25+
            </div>
            <div className="text-gray-400">Industry Awards</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              500M+
            </div>
            <div className="text-gray-400">Impressions Generated</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              100%
            </div>
            <div className="text-gray-400">Client Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  )
}