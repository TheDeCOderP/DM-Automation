"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ChevronDown, ChevronsRight } from "lucide-react";
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

/* ---------------- TYPES ---------------- */

interface SubItem {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  items: SubItem[];
}

/* ---------------- MOBILE MENU ITEM ---------------- */

const MobileMenuItem = ({
  item,
  onCloseMenu,
}: {
  item: MenuItem;
  onCloseMenu: () => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="border-b last:border-b-0">
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-accent/50"
        onClick={toggleCollapse}
      >
        <span className="text-base font-semibold">{item.title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )}
        />
      </div>

      <AnimatePresence>
        {isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2 pl-6 space-y-2 bg-accent/20">
              {item.items.map((sub) => (
                <Link
                  key={sub.title}
                  href={sub.href}
                  className="block text-sm text-muted-foreground hover:text-primary"
                  onClick={onCloseMenu}
                >
                  {sub.title}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------------- DESKTOP LIST ITEM ---------------- */

const ListItem = ({
  title,
  href,
}: {
  title: string;
  href: string;
}) => {
  const isExternal = href.startsWith("http");

  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          target={isExternal ? "_blank" : "_self"}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="block rounded-md p-3 text-sm hover:bg-accent"
        >
          {title}
        </Link>
      </NavigationMenuLink>
    </li>
  );
};

/* ---------------- HEADER ---------------- */

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

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
    <nav className="fixed top-4 left-4 right-4 z-50">
      <div className="flex items-center justify-between">
        {/* LEFT */}
        <div className="flex gap-6 p-4 border bg-background rounded-full items-center">
          <Link href="/">
            <Image src="/icons/logo1.png" alt="logo" width={40} height={40} />
          </Link>

          <span className="hidden lg:block font-bold text-primary">DM-Automation</span>

          {/* CHEVRON */}
          <ChevronsRight
            onClick={() => setIsDesktopExpanded((p) => !p)}
            className={cn(
              "hidden lg:block h-5 w-5 cursor-pointer transition-transform",
              isDesktopExpanded ? "rotate-180" : "rotate-0"
            )}
          />

          {/* DESKTOP NAV */}
          <AnimatePresence initial={false}>
            {isDesktopExpanded && (
              <motion.div
                className="hidden lg:flex"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <NavigationMenu>
                  <NavigationMenuList>
                    {menuItems.map((item) => (
                      <NavigationMenuItem key={item.title}>
                        <NavigationMenuTrigger>
                          {item.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-[500px] grid-cols-2 gap-3 p-4">
                            {item.items.map((sub) => (
                              <ListItem
                                key={sub.title}
                                title={sub.title}
                                href={sub.href}
                              />
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 p-4 border bg-background rounded-full">
          <ThemeToggle />

          <div className="hidden lg:flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setIsOpen((p) => !p)}
          >
            {isOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="lg:hidden mt-2 bg-background border rounded-xl overflow-hidden"
          >
            {menuItems.map((item) => (
              <MobileMenuItem
                key={item.title}
                item={item}
                onCloseMenu={() => setIsOpen(false)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
