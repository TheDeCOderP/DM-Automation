"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ThemeToggle from "../features/ThemeToggle";

// --- Types for better readability and safety ---
interface SubItem {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  items: SubItem[];
}

const MobileMenuItem = ({ item, onCloseMenu }: { item: MenuItem; onCloseMenu: () => void }) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Initially closed
  
  // Toggle function for the collapse
  const toggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default link behavior
    setIsCollapsed(!isCollapsed);
  };
  
  // Variant for the Framer Motion animation of the sub-menu
  const subMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: "auto", 
      transition: { 
        duration: 0.2, 
        when: "beforeChildren" 
      } 
    },
  };

  return (
    <div className="border-b last:border-b-0">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-accent/50"
        onClick={toggleCollapse}
      >
        <div className="text-base font-semibold text-foreground">
          {item.title}
        </div>
        <ChevronDown 
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isCollapsed && "rotate-180"
          )} 
        />
      </div>
      
      {/* Collapsible Sub-menu Content with Framer Motion */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={subMenuVariants}
            className="overflow-hidden"
          >
            <div className="py-2 pl-6 space-y-2 bg-accent/20">
              {item.items.map((subItem) => (
                <Link
                  key={subItem.title}
                  href={subItem.href}
                  target={subItem.href.startsWith('http') ? "_blank" : "_self"} // Open external links in new tab
                  rel={subItem.href.startsWith('http') ? "noopener noreferrer" : undefined}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors duration-150"
                  onClick={onCloseMenu} // Close the whole mobile menu on sub-item click
                >
                  {subItem.title}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Desktop List Item Component (Kept for desktop navigation) ---

const ListItem = ({ className, title, href, ...props }: { className?: string; title: string; href: string }) => {
  // Determine if the link is external for target/rel attributes
  const isExternal = href.startsWith('http');
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          target={isExternal ? "_blank" : "_self"}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMobileMenu = () => setIsOpen(false)

  // Framer Motion variants for the overall mobile menu
  const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0, transition: { duration: 0.2 } },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.2 } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  };

  const menuItems: MenuItem[] = [
    {
      title: "Services",
      items: [
        { title: "SEO Optimization", href: "https://prabisha.com/seo/" },
        { title: "Social Media Marketing", href: "https://prabisha.com/social-media-marketing/" },
        { title: "Content Marketing", href: "https://prabisha.com/content-marketing/" },
        { title: "Email Marketing", href: "https://prabisha.com/email-marketing/" },
        { title: "PPC Advertising", href: "https://prabisha.com/ppc/" },
      ],
    },
    {
      title: "Products",
      items: [
        { title: "SEO Solutions", href: "https://seo.prabisha.com/" },
        { title: "Intranet", href: "https://intranet.prabisha.com/" },
        { title: "Project Management", href: "https://projects.prabisha.com/" },
        { title: "HR Management", href: "https://hrms.prabisha.com/" },
        { title: "LMS Portal", href: "https://lms.prabisha.com/" },
        { title: "UKBiz Network", href: "https://ukbiznetwork.com/" },
        { title: "EcoKartUK", href: "https://www.ecokartuk.com/" },
      ]
    },
    {
      title: "Legal",
      items: [
        { title: "Privacy Policy", href: "/privacy-policy" },
        { title: "Terms of Service", href: "/terms-of-service" },
        { title: "Cookie Policy", href: "/cookie-policy" },
        { title: "Help Center", href: "/help-center" },
      ],
    },
    {
      title: "Company",
      items: [
        { title: "About Us", href: "https://prabisha.com/about/" },
        { title: "Careers", href: "https://hr.prabisha.com/" },
        { title: "Contact", href: "https://prabisha.com/contact/" },
      ],
    },
    {
      title: "Resources",
      items: [
        { title: "Blogs", href: "/blogs" },
      ]
    }
  ];

  return (
    <nav className="fixed top-4 left-4 right-4 z-50 border bg-background rounded-full">
      <div className="p-4 flex items-center justify-between">
        {/* Logo Section with Navigation Menu */}
        <div className="flex gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <Link href="/" onClick={closeMobileMenu}>
              <Image
                src="/icons/logo1.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
                priority
              />
            </Link>
            {/* Site Name */}
            <div className="text-lg font-bold text-primary">
              <span className="font-bold">DM</span>-Automation
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <NavigationMenu>
              <NavigationMenuList>
                {menuItems.map((item) => (
                  <NavigationMenuItem key={item.title}>
                    <NavigationMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {item.items.map((subItem) => (
                          <ListItem key={subItem.title} href={subItem.href} title={subItem.title} />
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* Desktop CTA Buttons & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
            
            {/* Mobile Menu Button - Moved to the far right for better layout */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden ml-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
      </div>
      
      {/* Mobile Navigation - Now collapsible (accordion-style) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="lg:hidden mt-1 border bg-background absolute left-0 w-full shadow-lg max-h-[80vh] overflow-y-auto rounded-2xl"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileMenuVariants}
          >
            {/* Menu items will now be collapsible inside MobileMenuItem */}
            <div className="divide-y divide-border">
              {menuItems.map((item) => (
                <MobileMenuItem 
                  key={item.title} 
                  item={item} 
                  onCloseMenu={closeMobileMenu} 
                />
              ))}
            </div>

            {/* Mobile CTA buttons */}
            <div className="container p-4 space-y-2 border-t">
              <Button className="w-full" asChild>
                <Link href="/register" onClick={closeMobileMenu}>
                  Get Started
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login" onClick={closeMobileMenu}>
                  Login
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
