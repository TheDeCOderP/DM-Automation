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
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
  };

  const menuItems = [
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
  ];

  const legalItems = [
    { title: "Privacy Policy", href: "/privacy-policy" },
    { title: "Terms of Service", href: "/terms-of-service" },
    { title: "Cookie Policy", href: "/cookie-policy" },
    { title: "Help Center", href: "/help-center" },
  ];

  const ListItem = ({ className, title, href, ...props }: { className?: string; title: string; href: string }) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <Link
            href={href}
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

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 bg-background border-b"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icons/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-semibold text-foreground">
                DM Automation
              </span>
            </Link>

            <div className="hidden h-5 w-px bg-border lg:block" />

            <div className="hidden text-sm font-medium text-muted-foreground lg:block">
              Powered by <Link className="underline" href="https://prabisha.com/"> Prabisha Consulting </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList>
                {menuItems.map((item) => (
                  <NavigationMenuItem key={item.title}>
                    <NavigationMenuTrigger className="text-sm font-medium">
                      {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {item.items.map((subItem) => (
                          <ListItem
                            key={subItem.title}
                            href={subItem.href}
                            title={subItem.title}
                          />
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="lg:hidden border-t bg-background overflow-hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileMenuVariants}
              transition={{ duration: 0.2 }}
            >
              <div className="container py-4 space-y-4">
                {/* Main menu items */}
                {menuItems.map((item) => (
                  <div key={item.title} className="space-y-2">
                    <Link
                      href={"#"}
                      className="text-base font-medium text-foreground"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </Link>
                    <div className="pl-4 space-y-2">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.title}
                          href={subItem.href}
                          className="block text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setIsOpen(false)}
                        >
                          {subItem.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <Link
                  href="/pricing"
                  className="block text-base font-medium text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  Pricing
                </Link>

                {/* Legal links */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Legal
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {legalItems.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Mobile CTA buttons */}
                <div className="pt-4 border-t space-y-2">
                  <Button className="w-full" asChild>
                    <Link href="/register" onClick={() => setIsOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      Login
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}