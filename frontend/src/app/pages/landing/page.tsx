
"use client";
import { Shield, Eye, Brain, Search, Lock, Activity, ChevronRight, Menu, X, Wifi, Camera, CreditCard, Calendar, Users, MapPin, Clock, TrendingUp, FileText, Zap, Database, Cpu, GitBranch, Mail, Github, Linkedin, CheckCircle, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Thanks for signing up with ${email}!`);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white font-serif">
                  Campus Sentinel
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  AI-Powered Campus Security
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                Features
              </a>
              <a href="#architecture" className="text-slate-300 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#use-cases" className="text-slate-300 hover:text-white transition-colors">
                Use Cases
              </a>
              <a href="#team" className="text-slate-300 hover:text-white transition-colors">
                Team
              </a>
              <a href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Login
              </a>
              <a
                href="/auth/signup"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
              >
                Get Started
              </a>
            </nav>


            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>


        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50">
            <nav className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-slate-300 hover:text-white py-2 transition-colors">
                Features
              </a>
              <a href="#architecture" className="block text-slate-300 hover:text-white py-2 transition-colors">
                How It Works
              </a>
              <a href="#use-cases" className="block text-slate-300 hover:text-white py-2 transition-colors">
                Use Cases
              </a>
              <a href="#team" className="block text-slate-300 hover:text-white py-2 transition-colors">
                Team
              </a>
              <a href="/auth/login" className="block text-blue-400 hover:text-blue-300 py-2 transition-colors font-medium">
                Login
              </a>
              <a
                href="/auth/signup"
                className="block text-center bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all"
              >
                Get Started
              </a>
            </nav>
          </div>
        )}
      </header>


      <section className="pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-8">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-400 font-medium">Next-Gen Campus Security</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Secure Your Campus with
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> AI Intelligence</span>
          </h2>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Multi-modal entity tracking with AI-powered predictions, real-time monitoring, and explainable intelligence. Built for speed, accuracy, and privacy.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">95%</div>
              <div className="text-sm text-slate-400">Face Match Accuracy</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-3xl font-bold text-cyan-400 mb-2">&lt;2s</div>
              <div className="text-sm text-slate-400">Query Response Time</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">98%</div>
              <div className="text-sm text-slate-400">Timeline Accuracy</div>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">85%</div>
              <div className="text-sm text-slate-400">Prediction Accuracy</div>
            </div>
          </div>
        </div>
      </section>


      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Core Features — Built for Intelligence & Speed
            </h3>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Comprehensive security suite with AI-powered analytics and multi-modal tracking
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Multi-Modal Entity Tracking</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Unified tracking via Wi-Fi, CCTV, card swipes, lab bookings
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    360° visibility
                  </div>
                </div>
              </div>
            </div>

    
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-3 rounded-lg flex-shrink-0">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Entity Resolution Engine</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Vector-based similarity (face, device, card)
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    Accurate ID matching
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-green-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-lg flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Timeline Reconstruction</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Chronological activity history of individuals
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    Instant situational awareness
                  </div>
                </div>
              </div>
            </div>


            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Predictive Monitoring</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    ML models forecast future locations & patterns
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    Proactive intervention
                  </div>
                </div>
              </div>
            </div>


            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-orange-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-lg flex-shrink-0">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Explainable AI</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Natural language reasoning for predictions
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    Transparency & trust
                  </div>
                </div>
              </div>
            </div>


            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-red-500/50 transition-all">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-red-500 to-pink-500 p-3 rounded-lg flex-shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Privacy & Security Controls</h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Role-based access, encryption, compliance
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-cyan-400">
                    <CheckCircle className="w-4 h-4" />
                    Secure operations
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works — Architecture Snapshot
            </h3>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Seamless data flow from collection to intelligence
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 sm:p-12">
            <div className="grid md:grid-cols-5 gap-6 items-center">
  
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl inline-block mb-4">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">Data Sources</h4>
                <p className="text-xs text-slate-400">Wi-Fi, CCTV, Cards, Bookings</p>
              </div>

              <div className="hidden md:flex justify-center">
                <ArrowRight className="w-6 h-6 text-slate-600" />
              </div>

        
              <div className="text-center">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-4 rounded-xl inline-block mb-4">
                  <GitBranch className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">Entity Resolution</h4>
                <p className="text-xs text-slate-400">FaceNet + pgvector</p>
              </div>

              <div className="hidden md:flex justify-center">
                <ArrowRight className="w-6 h-6 text-slate-600" />
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-xl inline-block mb-4">
                  <Cpu className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">AI Processing</h4>
                <p className="text-xs text-slate-400">Random Forest + Gemini</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <h4 className="text-lg font-semibold text-white">Performance</h4>
                </div>
                <p className="text-slate-300 text-sm">
                  Sub-2s query time with 95% precision at 0.4 cosine threshold
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>


      <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Real Use Cases — Show, Don't Just Tell
            </h3>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Proven solutions for campus safety and operational efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="bg-gradient-to-br from-blue-900/30 to-slate-800/30 border border-blue-700/50 rounded-xl p-8">
              <div className="bg-blue-500/20 p-3 rounded-lg w-fit mb-6">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Campus Security</h4>
              <p className="text-slate-300 mb-4">
                Locate missing students fast with multi-modal tracking and timeline reconstruction
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Instant location tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Historical movement analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Emergency response coordination</span>
                </li>
              </ul>
            </div>

        
            <div className="bg-gradient-to-br from-cyan-900/30 to-slate-800/30 border border-cyan-700/50 rounded-xl p-8">
              <div className="bg-cyan-500/20 p-3 rounded-lg w-fit mb-6">
                <MapPin className="w-8 h-8 text-cyan-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Admin Intelligence</h4>
              <p className="text-slate-300 mb-4">
                Detect unusual crowd flow patterns and optimize campus operations
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Crowd density monitoring</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Anomaly detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Event planning insights</span>
                </li>
              </ul>
            </div>


            <div className="bg-gradient-to-br from-green-900/30 to-slate-800/30 border border-green-700/50 rounded-xl p-8">
              <div className="bg-green-500/20 p-3 rounded-lg w-fit mb-6">
                <Calendar className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">Facility Management</h4>
              <p className="text-slate-300 mb-4">
                Optimize lab and classroom usage based on real occupancy data
              </p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Space utilization analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Resource allocation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Energy efficiency</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8 sm:p-12">
            <div className="text-center mb-10">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl inline-block mb-6">
                <Shield className="w-12 h-12 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Privacy & Security First
              </h3>
              <p className="text-lg text-slate-400">
                Built with enterprise-grade security and privacy controls
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Security-First Architecture</h4>
                  <p className="text-sm text-slate-400">
                    RBAC, audit trails, encryption at rest and in transit
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Compliance Ready</h4>
                  <p className="text-sm text-slate-400">
                    Adheres to campus data governance norms and standards
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Eye className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Transparent Operations</h4>
                  <p className="text-sm text-slate-400">
                    Complete audit logs and explainable AI decisions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Data Protection</h4>
                  <p className="text-sm text-slate-400">
                    Minimal data retention with anonymization options
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a href="#" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-2">
                View Privacy Policy
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>


      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
         
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white font-serif">Campus Sentinel</span>
              </div>
              <p className="text-slate-400 text-sm mb-4 max-w-sm">
                AI-powered campus security platform with multi-modal tracking, predictive analytics, and explainable intelligence.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="mailto:team@campussentinel.com" className="text-slate-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>


            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
                </li>
                <li>
                  <a href="#architecture" className="text-slate-400 hover:text-white transition-colors">How It Works</a>
                </li>
                <li>
                  <a href="#use-cases" className="text-slate-400 hover:text-white transition-colors">Use Cases</a>
                </li>

              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#team" className="text-slate-400 hover:text-white transition-colors">Team</a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
                </li>
                <li>
                  <a href="mailto:team@campussentinel.com" className="text-slate-400 hover:text-white transition-colors">Contact</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-400 text-sm text-center md:text-left">
                &copy; 2025 Campus Sentinel by Team ChaosCoded, NIT Rourkela. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-4 h-4" />
                <span>Built with security & privacy in mind</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}