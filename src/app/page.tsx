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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      {/* MIN-H-SCREEN ADJUSTMENT: Changed to h-auto on small screens, min-h-screen only on md and up */}
      <div className="h-auto md:min-h-screen w-full relative">
        {/* Top Fade Grid Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: "20px 30px",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
          }}
        />
        <SectionWrapper className="py-12"> {/* Added mobile padding */}
          <div className="container mx-auto text-center max-w-5xl h-full flex flex-col justify-center items-center">
            <Badge className="mb-4 md:mb-6 border-0 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Marketing Automation
            </Badge>

            {/* FONT SIZE ADJUSTMENT: Ensured mobile uses 4xl/5xl */}
            <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 md:mb-8 leading-tight tracking-tight">
              Schedule Once,
              <br />
              <span className="text-primary">Publish Everywhere</span>
            </h1>

            {/* FONT SIZE ADJUSTMENT: Ensured mobile uses base/lg */}
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 md:mb-12 leading-relaxed max-w-3xl mx-auto font-light px-2">
              Transform your social media strategy with AI-generated content, automated scheduling, and intelligent image
              creation.
              <span className="text-foreground font-medium"> Let our platform handle your digital marketing</span> while
              you focus on growing your business.
            </p>

            {/* BUTTON LAYOUT ADJUSTMENT: flex-col is default, sm:flex-row is for small screens and up */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 md:mb-16 w-full px-4 sm:w-auto">
              <Button
                size="lg"
                className="text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                asChild
              >
                <Link href="/register" className="flex items-center justify-center">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4 h-auto border-2 hover:bg-accent transition-all duration-200 bg-transparent"
                asChild
              >
                <Link href="/login" className="flex items-center justify-center">Continue to Login</Link>
              </Button>
            </div>
          </div>
        </SectionWrapper>
      </div>

      {/* Features Section */}
      <SectionWrapper>
        <div id="features" className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-20">
            <Badge className="mb-4 bg-primary/10 text-primary border-0">
              <Rocket className="w-4 h-4 mr-1" />
              Powerful Features
            </Badge>
            {/* FONT SIZE ADJUSTMENT */}
            <h2 className="text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 tracking-tight">
              Everything you need for
              <br />
              <span className="text-primary">modern marketing</span>
            </h2>
            {/* FONT SIZE ADJUSTMENT */}
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
              Automate your social media presence with AI-powered intelligence and advanced automation tools
            </p>
          </div>

          {/* GRID ADJUSTMENT: Default is 1 column, md:grid-cols-2 is for medium screens, lg:grid-cols-3 is for large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Bot,
                title: "AI Content Generation",
                description:
                  "Generate engaging posts automatically using advanced AI models from OpenAI, Groq, and Together.ai",
              },
              {
                icon: Calendar,
                title: "Smart Scheduling",
                description:
                  "Schedule posts across multiple platforms with intelligent timing optimization for maximum engagement",
              },
              {
                icon: ImageIcon,
                title: "AI Image Creation",
                description:
                  "Generate stunning visuals automatically to accompany your posts using state-of-the-art AI image models",
              },
              {
                icon: Zap,
                title: "Multi-Platform Publishing",
                description:
                  "Publish simultaneously to Facebook, Twitter, LinkedIn, Instagram, and more with platform-specific optimization",
              },
              {
                icon: Target,
                title: "Content Planning",
                description:
                  "Create comprehensive content strategies with automated planning and topic research capabilities",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Work together with approval workflows, role-based permissions, and collaborative content creation",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-card/80 backdrop-blur-sm"
              >
                <CardHeader className="p-6 md:p-8"> 
                  <div className="flex items-center space-x-4 mb-4 md:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg bg-primary/10 ring-1 ring-border rounded-lg"> 
                      <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-card-foreground m-0">
                      {feature.title}
                    </CardTitle>
                  </div>
                  
                  {/* CardDescription is still below both */}
                  <CardDescription className="text-muted-foreground leading-relaxed text-sm md:text-base mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* How It Works Section */}
      <SectionWrapper className="py-16 md:py-24">
        <div id="how-it-works" className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-20">
            <Badge className="mb-4 border-0">
              <TrendingUp className="w-4 h-4 mr-1" />
              How It Works
            </Badge>
            {/* FONT SIZE ADJUSTMENT */}
            <h2 className="text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 tracking-tight">
              Intelligent automation
              <br />
              <span className="text-primary">from start to finish</span>
            </h2>
            {/* FONT SIZE ADJUSTMENT */}
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
              Our intelligent system automates your entire content workflow from planning to publishing
            </p>
          </div>

          {/* GRID ADJUSTMENT: Changed to default 1 column, lg:grid-cols-2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center mb-16 md:mb-20">
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-8">System Architecture</h3>
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
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-primary-foreground text-base md:text-lg font-bold">{item.step}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1 md:mb-2">
                      <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary mr-2" />
                      <h4 className="text-lg md:text-xl font-bold text-foreground">{item.title}</h4>
                    </div>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative order-2">
              <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/20">
                {/* Image sizes should be adjusted for a better mobile experience if not already handled by Next.js Image component */}
                <Image
                  width={600}
                  height={400}
                  unoptimized
                  src="/images/architecture.png"
                  alt="System Architecture Diagram"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* GRID ADJUSTMENT: Changed to default 1 column, lg:grid-cols-2, and handled order change */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/20">
                <Image
                  width={600}
                  height={400}
                  unoptimized
                  src="/images/workflow.png"
                  alt="Content Workflow Diagram"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6 md:space-y-8">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-8">Content Workflow</h3>
              {[
                {
                  title: "Automated Planning",
                  description: "Create content plans and schedule tasks with intelligent timing",
                  icon: Clock,
                },
                {
                  title: "Approval Workflow",
                  description: "Built-in approval system ensures quality control before publishing",
                  icon: CheckCircle,
                },
                {
                  title: "Multi-Platform Publishing",
                  description: "Automatic posting to all your social media platforms simultaneously",
                  icon: Zap,
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4 group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 bg-primary/10 ring-1 ring-border">
                    <item.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2">{item.title}</h4>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* CTA Section */}
      {/* MIN-H-SCREEN ADJUSTMENT: Changed to h-auto on small screens, min-h-screen only on md and up */}
      <SectionWrapper className="py-16 md:py-0">
        <div className="container mx-auto text-center max-w-5xl h-full flex flex-col justify-center items-center">
          <Badge className="mb-4 md:mb-6 border-0 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <Shield className="w-4 h-4 mr-2" />
            Trusted & Secure
          </Badge>

          {/* FONT SIZE ADJUSTMENT */}
          <h2 className="text-balance text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 md:mb-8 leading-tight tracking-tight">
            Ready to transform
            <br />
            <span className="text-primary">your marketing?</span>
          </h2>

          {/* FONT SIZE ADJUSTMENT */}
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 md:mb-12 leading-relaxed max-w-3xl mx-auto font-light px-2">
            Join thousands of businesses already using AI to automate their social media success
            <span className="text-foreground font-medium"> and drive real results</span> with our platform.
          </p>

          {/* BUTTON LAYOUT ADJUSTMENT: flex-col is default, sm:flex-row is for small screens and up */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full px-4 sm:w-auto">
            <Button
              size="lg"
              className="text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              asChild
            >
              <Link href="/register" className="flex items-center justify-center">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-4 h-auto border-2 hover:bg-accent transition-all duration-200 bg-transparent"
              asChild
            >
              <Link href="/login" className="flex items-center justify-center">Continue to Login</Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      {/* Footer */}
      <Footer />
    </div>
  )
}

// Added className prop to allow for external padding control (e.g., py-16)
function SectionWrapper({ children, className = '' } : { children: React.ReactNode, className?: string }) {
  return (
    // PADDING ADJUSTMENT: Reduced default section padding from 'p-4' to allow 'py-X' class to control it. Added a default horizontal padding for inner elements.
    <section className={`relative overflow-hidden lg:px-4 ${className}`}>
      {/* Background Elements (same everywhere) */}
      <div className="absolute inset-0 bg-accent/30"></div>
      <div className="absolute top-10 left-5 w-48 h-48 sm:w-72 sm:h-72 bg-primary/10 rounded-full blur-3xl"></div> {/* Reduced size and moved on mobile */}
      <div className="absolute bottom-10 right-5 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/10 rounded-full blur-3xl"></div> {/* Reduced size and moved on mobile */}

      {/* Content */}
      <div className="relative">{children}</div>
    </section>
  )
}