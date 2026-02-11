"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"

interface CarouselItem {
  id: number
  src: string
  alt: string
  name: string
}

const CAROUSEL_ITEMS: CarouselItem[] = [
  { id: 1, src: "/carousel/facebook.png", alt: "facebook logo", name: "Facebook" },
  { id: 2, src: "/carousel/instagram.png", alt: "instagram logo", name: "Instagram" },
  { id: 3, src: "/carousel/pinterest.png", alt: "pinterest logo", name: "Pinterest" },
  { id: 4, src: "/carousel/linkedin.png", alt: "linkedin logo", name: "LinkedIn" },
  { id: 5, src: "/carousel/reddit.png", alt: "reddit logo", name: "Reddit" },
  { id: 6, src: "/carousel/tik-tok.png", alt: "tik-tok logo", name: "TikTok" },
  { id: 7, src: "/carousel/twitter.png", alt: "twitter logo", name: "Twitter" },
  { id: 8, src: "/carousel/youtube.png", alt: "youtube logo", name: "YouTube" },
]

interface StatsItem {
  label: string
  value: string | number
}

const STATS_ITEMS: StatsItem[] = [
  { label: "Platforms", value: CAROUSEL_ITEMS.length },
  { label: "Effect", value: "3D" },
  { label: "Only", value: "CSS" },
]

interface AnimatedCarouselProps {
  title?: string
  speed?: number
  showStats?: boolean
  showControls?: boolean
  stats?: StatsItem[]
  items?: CarouselItem[]
}

export default function AnimatedCarousel({
  title = "CSS ONLY",
  speed = 20,
  showStats = true,
  showControls = true,
  stats = STATS_ITEMS,
  items = CAROUSEL_ITEMS,
}: AnimatedCarouselProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(speed)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 30)

    // Hide loader after 3 seconds
    const loaderTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(loaderTimeout)
    }
  }, [])

  const handleSpeedChange = (speed: number) => {
    setAnimationSpeed(speed)
  }

  return (
    <>
      {/* Loader */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
          <div className="flex flex-col items-center gap-8">
            {/* Animated Logo/Icon */}
            <div className="relative w-32 h-32">
              <div className="loader-ring"></div>
              <div className="loader-ring-2"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-5xl font-bold animate-pulse">3D</div>
              </div>
            </div>

            {/* Loading Text */}
            <div className="text-white/80 font-['Poppins',sans-serif] text-sm animate-pulse">
              Setting up 3D carousel...
            </div>
          </div>
        </div>
      )}

      <div className="w-full h-screen text-center overflow-hidden relative">
        {/* Controls Panel */}
        {showControls && (
          <div className="absolute top-5 right-5 flex gap-[15px] items-center z-[100] bg-white/10 backdrop-blur-[10px] px-[15px] py-2.5 rounded-[50px] border border-white/20 max-md:top-2.5 max-md:right-2.5 max-md:left-2.5 max-md:justify-center">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="bg-transparent border-none text-white text-2xl cursor-pointer px-2.5 py-1.5 rounded transition-all duration-300 hover:bg-white/10"
              aria-label={isPaused ? "Play animation" : "Pause animation"}
            >
              {isPaused ? "▶️" : "⏸️"}
            </button>

            <div className="flex gap-2 items-center text-white font-['Poppins',sans-serif] text-sm">
              <span>Speed:</span>
              {[10, 20, 30].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`bg-white/10 border border-white/30 text-white px-2 py-1 rounded cursor-pointer transition-all duration-300 text-xs hover:bg-white/20 hover:-translate-y-px ${animationSpeed === speed ? "bg-white/20 -translate-y-px" : ""}`}
                  aria-label={`Set speed to ${speed} seconds`}
                >
                  {speed}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Carousel */}
        <div
          className={`carousel ${isPaused ? "paused" : ""}`}
          style={
            {
              "--quantity": items.length,
              "--animation-duration": `${animationSpeed}s`,
            } as React.CSSProperties
          }
        >
          {/* MODEL MOVED HERE: Inside the 3D space */}
          <div className="model" role="presentation" />

          {items.map((item) => (
            <div
              key={item.id}
              className="item"
              style={{ "--position": item.id } as React.CSSProperties}
              data-name={item.name}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onClick={() => {
                console.log(`Clicked on ${item.name}`)
                // You can add navigation or modal logic here
                alert(`Connect to ${item.name}`)
              }}
            >
              <div className="relative w-full h-full transition-all duration-300 ease-in-out">
                <Image
                  src={item.src || "/placeholder.svg"}
                  alt={item.alt}
                  fill
                  sizes={isMobile ? "80px" : "100px"}
                  className="item-image"
                  quality={90}
                  priority={item.id <= 4}
                />
                <div className="absolute -bottom-[30px] left-1/2 -translate-x-1/2 text-white font-['Poppins',sans-serif] text-xs opacity-0 transition-opacity duration-300 ease-in-out whitespace-nowrap bg-black/70 px-2 py-0.5 rounded item-label">
                  {item.name}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="content">
          <h1 data-content={title} className="title">
            {title}
          </h1>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="absolute top-1/2 left-5 -translate-y-1/2 flex flex-col gap-[30px] z-[5] max-lg:flex-row max-lg:top-auto max-lg:bottom-5 max-lg:left-1/2 max-lg:-translate-x-1/2 max-lg:translate-y-0 max-lg:w-4/5 max-lg:justify-around">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-white font-['Poppins',sans-serif] bg-white/10 backdrop-blur-[10px] p-[15px] rounded-[10px] border border-white/20 min-w-[80px] max-md:p-2.5 max-md:min-w-[60px]"
              >
                <div className="text-[2rem] font-bold mb-1.5 max-md:text-2xl">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.cdnfonts.com/css/ica-rubrik-black');
        @import url('https://fonts.cdnfonts.com/css/poppins');
      `}</style>

      <style jsx>{`
        /* Carousel - Cannot be converted to Tailwind (3D transforms) */
        .carousel {
          position: absolute;
          width: 200px;
          height: 250px;
          top: 10%;
          left: calc(50% - 100px);
          transform-style: preserve-3d;
          transform: perspective(1000px) rotateX(-16deg);
          z-index: 10;
        }

        /* Model Styling - Cannot be converted (complex positioning) */
        .model {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 100vh;
          background-image: url('/carousel/model.png');
          background-size: auto 130%;
          background-repeat: no-repeat;
          background-position: top center;
          transform: translate(-50%, -5%) rotateX(16deg);
          pointer-events: none;
          z-index: 1;
        }

        /* Items Animation - Cannot be converted (keyframes with CSS variables) */
        /* moved hover event handling from carousel container to individual items */
        .carousel .item {
          position: absolute;
          width: 100px;
          height: 100px;
          top: 50%;
          left: 50%;
          cursor: pointer;
          animation: rotateItem var(--animation-duration) linear infinite;
          z-index: 10;
          transition: transform 0.3s ease;
        }
        
        .carousel .item:hover {
          transform: scale(1.1);
        }
        
        @keyframes rotateItem {
          from {
            transform: 
              rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg )) 
              translateZ(450px);
          }
          to {
            transform: 
              rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg + 360deg )) 
              translateZ(480px);
          }
        }

        .carousel.paused .item {
          animation-play-state: paused;
        }

        .item-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 5px 15px rgba(0, 0, 0, 0.3));
          transition: all 0.3s ease;
        }

        .item:hover .item-image {
          filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5)) brightness(1.2);
        }

        .item:hover .item-label {
          opacity: 1;
        }

        /* Title effect - Cannot be converted (pseudo-element with attr()) */
        .title::after {
          position: absolute;
          inset: 0;
          content: attr(data-content);
          z-index: 2;
          -webkit-text-stroke: 2px #d2d2d2;
          color: transparent;
        }

        /* Content - Cannot be converted (complex calc) */
        .content {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: min(1400px, 100vw);
          height: max-content;
          padding-bottom: 100px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          z-index: 0;
        }

        .title {
          font-family: 'ICA Rubrik', sans-serif;
          font-size: 16em;
          line-height: 1em;
          color: #25283B;
          position: relative;
          margin: 0;
          text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        /* Responsive Design - Animation adjustments */
        @media screen and (max-width: 1023px) {
          .carousel {
            width: 160px;
            height: 200px;
            left: calc(50% - 80px);
          }
          
          @keyframes rotateItem {
            from {
              transform: 
                rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg )) 
                translateZ(300px);
            }
            to {
              transform: 
                rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg + 360deg )) 
                translateZ(300px);
            }
          }
          
          .title {
            text-align: center;
            width: 100%;
            font-size: 7em;
          }
        }

        @media screen and (max-width: 767px) {
          .carousel {
            width: 100px;
            height: 150px;
            left: calc(50% - 50px);
          }
          
          @keyframes rotateItem {
            from {
              transform: 
                rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg )) 
                translateZ(180px);
            }
            to {
              transform: 
                rotateY(calc( (var(--position) - 1) * (360 / var(--quantity)) * 1deg + 360deg )) 
                translateZ(180px);
            }
          }
          
          .title {
            font-size: 5em;
          }
          
          .model {
            opacity: 0.6;
          }
        }

        /* Next.js Image fix */
        .item-image {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
        }

        /* Loader Animations */
        .loader-ring {
          position: absolute;
          inset: 0;
          border: 4px solid transparent;
          border-top-color: #ff6b6b;
          border-right-color: #ffa36c;
          border-radius: 50%;
          animation: spin 1.5s linear infinite;
        }

        .loader-ring-2 {
          position: absolute;
          inset: 8px;
          border: 4px solid transparent;
          border-bottom-color: #ff6b6b;
          border-left-color: #ffa36c;
          border-radius: 50%;
          animation: spin 2s linear infinite reverse;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
