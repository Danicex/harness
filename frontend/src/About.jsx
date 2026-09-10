'use client'

import { motion } from 'framer-motion'
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeroGeometric } from './line-hero'
import logo from './assets/963c7620-ebc1-427c-b9c2-009612cfa83b.png';
import logo2 from './assets/9afc9890-5863-44a2-9c58-42eebfc842f4.png';
import { useMyContext } from './Context/AppContext'
import { Button } from './components/ui/button'
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const features = [
  {
    title: 'Room & Booking Management',
    description: 'Manage room availability, reservations, check-ins, and check-outs without stress.',
  },
  {
    title: 'Inventory Tracking',
    description: 'Monitor stock levels, supplies, and usage across your hotel in real time.',
  },
  {
    title: 'Staff Management',
    description: 'Organize roles, schedules, and performance to keep your team running smoothly.',
  },
  {
    title: 'Social Blog Publishing',
    description: 'Create blogs once and publish automatically to TikTok, Facebook, and Instagram.',
  },
  {
    title: 'Email & SMS Campaigns',
    description: 'Run targeted marketing campaigns and reach your guests instantly.',
  },
  {
    title: 'AI Receptionist Assistant',
    description: 'A smart AI agent that responds to guests, answers questions, and handles daily tasks.',
  },
  {
    title: 'Dashboard & Analytics',
    description: 'View sales, bookings, trends, and hotel performance at a glance.',
  },
  {
    title: 'Customer Inbox',
    description: 'Receive messages from guests directly inside the platform and respond quickly.',
  },
]


export function Header() {
  const { theme } = useMyContext();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const staff_login = () => {
    navigate('/login', { state: { role: "staff" } });
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex h-16 items-center justify-between " >
          {/* Logo */}
          <Link to={'/'} className="flex lg:flex-1 items-center">
            {theme === 'dark' ? (
              <img alt="Logo" src={logo2} className="h-8 w-auto" />
            ) : (
              <img alt="Logo" src={logo} className="h-8 w-auto" />
            )}
            <span className='px-3 font-bold' id='text'>Harness</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/subscription" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4 ms-8">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Button onClick={staff_login}>Staff Login</Button>
            <Link
              to="/signup"
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button onClick={staff_login} size="sm" variant="outline">
              Staff Login
            </Button>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between mb-8">
                    <Link to="/" className="flex items-center" onClick={closeMobileMenu}>
                      {theme === 'dark' ? (
                        <img alt="Logo" src={logo2} className="h-6 w-auto" />
                      ) : (
                        <img alt="Logo" src={logo} className="h-6 w-auto" />
                      )}
                      <span className='px-2 font-bold'>Harness</span>
                    </Link>
                  </div>

                  {/* Mobile Navigation Links */}
                  <nav className="flex flex-col gap-4">
                    <Link
                      to="/subscription"
                      className="text-base font-medium text-foreground hover:text-purple-600 transition-colors py-2 px-3 rounded-lg hover:bg-muted"
                      onClick={closeMobileMenu}
                    >
                      Pricing
                    </Link>
                    <Link
                      to="/contact"
                      className="text-base font-medium text-foreground hover:text-purple-600 transition-colors py-2 px-3 rounded-lg hover:bg-muted"
                      onClick={closeMobileMenu}
                    >
                      Contact Us
                    </Link>
                    
                    <div className="h-px bg-border my-4" />
                    
                    <Link
                      to="/login"
                      className="text-base font-medium text-foreground hover:text-purple-600 transition-colors py-2 px-3 rounded-lg hover:bg-muted"
                      onClick={closeMobileMenu}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity text-center"
                      onClick={closeMobileMenu}
                    >
                      Sign Up
                    </Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 bg-black">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Harness
          </h1>
          <p className="mt-2 text-xl font-medium text-primary">
            The Complete Hotel Management System
          </p>
          
          <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground leading-relaxed">
            Run your hotel smarter, faster, and effortlessly with an all-in-one platform that handles bookings, staff, sales, communication, and guest experience in one place.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

function FeaturesGrid() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 bg-[#111]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Features</h2>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to run your hotel efficiently</p>
        </div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 "
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative rounded-lg border border-border bg-card p-6 transition-all hover:border-purple-600 hover:border-primary/50 hover:shadow-lg bg-[#000000]"
            >
              <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function VideoSection() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8" id='video'>
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-lg border border-border shadow-xl"
        >
          <div className="aspect-video w-full bg-card">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Harness Hotel Management System"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function ClosingSection() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="rounded-lg border border-border bg-card p-8 sm:p-12"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl mb-6">
            About Harness
          </h2>
          
          <p className="text-lg text-foreground leading-relaxed mb-6">
            Harness is a modern hotel management software built to simplify daily operations and boost guest satisfaction. From managing rooms and staff to running marketing campaigns and communicating with guests, Harness handles everything
          </p>
          
          <p className="text-lg text-foreground leading-relaxed">
            Whether you're running a small lodge or a full hotel, Harness helps you stay organized, improve efficiency, and deliver an exceptional experience every day.
          </p>

          <div className="mt-8 flex gap-4">
            <Link to={'/signup'}>
            <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              Get Started
            </button>
            </Link>
            <a href="#video">
            <button className="px-6 py-3 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors">
              Learn More
            </button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header/>
      <HeroGeometric badge="Powered by Encheiron"
            title1 = "Harness,"
            title2 = "The Best Hotel Management System"
            />
      <FeaturesGrid />
      <VideoSection />
      <ClosingSection />
    </div>
  )
}
