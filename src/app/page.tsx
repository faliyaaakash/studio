import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { CheckCircle, Edit, Share2, BarChart2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/layout/footer";

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === "hero-quiz");

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-card">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Create, Share, and Conquer Quizzes with QuizWhiz
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    The ultimate platform for building engaging quizzes, sharing them with the world, and tracking results with powerful analytics.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#features">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  width={600}
                  height={400}
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                  data-ai-hint={heroImage.imageHint}
                />
              )}
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Everything You Need to Succeed</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  QuizWhiz provides a comprehensive set of tools to create, distribute, and analyze quizzes for any purpose.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none pt-12">
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary p-3 rounded-full">
                    <Edit className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>Powerful Quiz Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Create quizzes with multiple question types including MCQ, MSQ, True/False, and short text answers. Add timers, attempt limits, and more.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary p-3 rounded-full">
                    <Share2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>Seamless Sharing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Generate a unique, shareable link for every quiz. Distribute it easily to your audience on any platform.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="bg-primary p-3 rounded-full">
                    <BarChart2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>In-Depth Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Get detailed reports on every attempt. View scores, time taken, and even cheating violations for each participant.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">
                Ready to Create Your First Quiz?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Sign up today and start building engaging quizzes in minutes. It's free to get started!
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button asChild size="lg" className="w-full">
                <Link href="/signup">
                  Sign Up for Free
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
