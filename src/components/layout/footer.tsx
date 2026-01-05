"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Github, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
    return (
        <footer className="bg-card border-t">
            <div className="container px-4 md:px-6 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl font-headline">
                            <Sparkles className="h-6 w-6 text-primary" />
                            <span>QuizWhiz</span>
                        </Link>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                            The ultimate platform for creating, sharing, and analyzing quizzes. Empowering learning through engagement.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <Twitter className="h-5 w-5" />
                                <span className="sr-only">Twitter</span>
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <Github className="h-5 w-5" />
                                <span className="sr-only">GitHub</span>
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                <Linkedin className="h-5 w-5" />
                                <span className="sr-only">LinkedIn</span>
                            </Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Product</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                            </li>
                            <li>
                                <Link href="/create-quiz" className="hover:text-primary transition-colors">Create Quiz</Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">Documentation</Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">Help Center</Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">Blog</Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-primary transition-colors">Community</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter / CTA */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Stay Updated</h3>
                        <p className="text-sm text-muted-foreground">
                            Subscribe to our newsletter for the latest updates and tips.
                        </p>
                        <div className="flex gap-2">
                            <Input placeholder="Enter your email" type="email" className="bg-background" />
                            <Button size="icon">
                                <Sparkles className="h-4 w-4" />
                                <span className="sr-only">Subscribe</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} QuizWhiz. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
