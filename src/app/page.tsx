import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  Bot,
  Calendar,
  ImageIcon,
  Zap,
  CheckCircle,
  Users,
  Clock,
  Target,
  Sparkles,
  TrendingUp,
  Shield,
  Rocket,
} from "lucide-react"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative p-4 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>

        <div className="container mx-auto text-center max-w-5xl relative z-10 min-h-screen">
          <Badge className="mb-6  border-0 px-4 py-2 text-sm font-medium shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Marketing Automation
          </Badge>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 leading-[0.9] tracking-tight">
            Schedule Once,
            <br />
            <span className="bg-secondary bg-clip-text text-transparent">
              Publish Everywhere
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
            Transform your social media strategy with AI-generated content, automated scheduling, and intelligent image
            creation.
            <span className="text-gray-900 font-medium"> Let our platform handle your digital marketing</span> while you
            focus on growing your business.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button
              size="lg"
              className="bg-primary hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 h-auto shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <Link href='/register' className="flex items-center">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-4 h-auto border-2 hover:bg-gray-50 transition-all duration-200 bg-transparent"
            >
              <Link href='/login'>
                Continue
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="p-4 bg-gradient-to-b from-white to-gray-50/50">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-0">
              <Rocket className="w-4 h-4 mr-1" />
              Powerful Features
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Everything you need for
              <br />
              <span className="bg-primary bg-clip-text text-transparent">
                modern marketing
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Automate your social media presence with AI-powered intelligence and advanced automation tools
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "AI Content Generation",
                description:
                  "Generate engaging posts automatically using advanced AI models from OpenAI, Groq, and Together.ai",
                color: "blue",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description:
                  "Schedule posts across multiple platforms with intelligent timing optimization for maximum engagement",
                color: "purple",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                icon: ImageIcon,
                title: "AI Image Creation",
                description:
                  "Generate stunning visuals automatically to accompany your posts using state-of-the-art AI image models",
                color: "green",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                icon: Zap,
                title: "Multi-Platform Publishing",
                description:
                  "Publish simultaneously to Facebook, Twitter, LinkedIn, Instagram, and more with platform-specific optimization",
                color: "orange",
                gradient: "from-orange-500 to-red-500",
              },
              {
                icon: Target,
                title: "Content Planning",
                description:
                  "Create comprehensive content strategies with automated planning and topic research capabilities",
                color: "red",
                gradient: "from-red-500 to-pink-500",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Work together with approval workflows, role-based permissions, and collaborative content creation",
                color: "indigo",
                gradient: "from-indigo-500 to-purple-500",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm"
              >
                <CardHeader className="p-8">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-0">
              <TrendingUp className="w-4 h-4 mr-1" />
              How It Works
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Intelligent automation
              <br />
              <span className="bg-primary bg-clip-text text-transparent">
                from start to finish
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our intelligent system automates your entire content workflow from planning to publishing
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">System Architecture</h3>
              {[
                {
                  step: "1",
                  title: "Web Scrapers & Research",
                  description: "Gather trending topics and insights using SerpApi and advanced web scraping",
                  icon: Target,
                },
                {
                  step: "2",
                  title: "Task Scheduling",
                  description: "MongoDB and Agenda handle intelligent scheduling and task management",
                  icon: Clock,
                },
                {
                  step: "3",
                  title: "AI Content Generation",
                  description: "Multiple AI providers create engaging content and images automatically",
                  icon: Sparkles,
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-lg font-bold">{item.step}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <item.icon className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="text-xl font-bold text-gray-900">{item.title}</h4>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
                <Image
                  width={600}
                  height={400}
                  src="/images/architecture.png"
                  alt="System Architecture Diagram"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-200/20 to-blue-200/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
                <Image
                  width={600}
                  height={400}
                  src="/images/workflow.png"
                  alt="Content Workflow Diagram"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">Content Workflow</h3>
              {[
                {
                  title: "Automated Planning",
                  description: "Create content plans and schedule tasks with intelligent timing",
                  icon: Clock,
                  color: "green",
                },
                {
                  title: "Approval Workflow",
                  description: "Built-in approval system ensures quality control before publishing",
                  icon: CheckCircle,
                  color: "blue",
                },
                {
                  title: "Multi-Platform Publishing",
                  description: "Automatic posting to all your social media platforms simultaneously",
                  icon: Zap,
                  color: "purple",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4 group">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
            <Shield className="w-4 h-4 mr-1" />
            Trusted & Secure
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Ready to transform
            <br />
            your marketing?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of businesses already using AI to automate their social media success and drive real results
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-4 h-auto shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <Link href='/register' className="flex items-center">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent text-lg px-8 py-4 h-auto transition-all duration-300"
            >
              <Link href='/login'>
                Continue 
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
