import React from 'react'

type Props = {
    children?: string;
    onClick?(): void;
    className?: string;
    width?: string | number;
    height?: string | number;
}

export default function AnimatedButton({
    children = "Click Me!", 
    onClick,
    className = "",
    width = "140px",
    height = "50px",
} : Props) {
  return (
    <button
        type="button"
        className={`relative bg-none outline-none border-none p-0 m-0 group ${className}`}
        style={{ width, height }}
        onClick={onClick}
    >
        {/* Top layer */}
        <div className="top-layer w-full h-full bg-[rgb(255,255,238)] font-poppins text-[16px] text-[rgb(36,38,34)] flex items-center justify-center rounded-[7mm]  outline-2 outline-[rgb(36,38,34)] transition-transform duration-200 relative overflow-hidden active:translate-y-[10px]">
            {children}
            {/* Shine effect */}
            <div className="absolute w-[15px] h-full bg-black/10 skew-x-[30deg] left-[-20px] transition-all duration-250 active:left-[calc(100%+20px)]"></div>
        </div>
        
        {/* Middle shadow layer */}
        <div className="absolute w-[calc(100%+2px)] h-full bg-[rgb(140,140,140)] top-[14px] left-[-1px] rounded-[7mm]  outline-2 outline-[rgb(36,38,34)] -z-10"></div>
        
        {/* Bottom layer */}
        <div className="bottom-layer absolute w-full h-full bg-[rgb(229,229,199)] top-[10px] left-0 rounded-[7mm]  outline-2 outline-[rgb(36,38,34)] -z-10">
            {/* Left notch */}
            <div className={`absolute w-[2px] bg-[rgb(36,38,34)] bottom-0 left-[15%] h-[20%] ${height == width ? "bottom-1 -rotate-2" : "bottom-0"}`}></div>
            {/* Right notch */}
            <div className={`absolute w-[2px] bg-[rgb(36,38,34)] left-[85%] h-[20%] ${height == width ? "bottom-2 rotate-1" : "bottom-0"}`}></div>
        </div>
    </button>
  )
}
