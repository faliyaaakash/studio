
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { AttemptResult, Quiz, Attempt, Question, Answer } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Timer, ShieldAlert, Download } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

export default function ResultsPage() {
    const { attemptId } = useParams<{ attemptId: string }>();
    const [result, setResult] = useState<AttemptResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!attemptId) return;

        const fetchResult = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch attempt
                const attemptRef = doc(db, "attempts", attemptId);
                const attemptSnap = await getDoc(attemptRef);

                if (!attemptSnap.exists()) {
                    throw new Error("Attempt not found.");
                }
                const attemptData = { id: attemptSnap.id, ...attemptSnap.data() } as Attempt;

                // Fetch quiz for correct answers
                const quizRef = doc(db, "quizzes", attemptData.quizId);
                const quizSnap = await getDoc(quizRef);

                if (!quizSnap.exists()) {
                    throw new Error("Associated quiz not found.");
                }
                const quizData = quizSnap.data() as Quiz;

                const questionsWithAnswers = quizData.questions.map((q: Question) => {
                    const userAnswerRec = attemptData.answers.find((a: Answer) => a.questionId === q.id);
                    const userAnswer = userAnswerRec ? userAnswerRec.value : null;
                    let isCorrect = false;

                    if (userAnswer) {
                        if (q.type === 'msq') {
                            const sortedUserAnswers = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
                            const sortedCorrectAnswers = [...q.correctAnswers].sort();
                            isCorrect = JSON.stringify(sortedUserAnswers) === JSON.stringify(sortedCorrectAnswers);
                        } else {
                            // For mcq, tf, text
                            isCorrect = q.correctAnswers[0] === userAnswer;
                        }
                    }

                    return { ...q, userAnswer, isCorrect };
                });

                setResult({ ...attemptData, questions: questionsWithAnswers });

            } catch (e: any) {
                console.error("Error fetching result", e);
                setError(e.message || "Failed to load results.");
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [attemptId]);

    if (loading) {
        return (
            <div className="container mx-auto py-12">
                <Card className="w-full max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <Skeleton className="h-8 w-1/2 mx-auto" />
                        <Skeleton className="h-6 w-1/3 mx-auto mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Skeleton className="h-20 w-32" />
                            <Skeleton className="h-8 w-48" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
                <Card className="w-full max-w-md p-6">
                    <CardTitle className="text-2xl text-destructive">Error</CardTitle>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground">{error || "Could not load your results."}</p>
                        <Button asChild className="mt-6">
                            <Link href="/dashboard">Back to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const percentage = Math.round((result.score / result.totalQuestions) * 100);

    const renderAnswer = (answer: string | string[] | null) => {
        if (answer === null) return <Badge variant="destructive">Not Answered</Badge>;
        if (Array.isArray(answer)) {
            return (
                <div className="flex flex-wrap gap-1">
                    {answer.map((a, i) => <Badge variant="secondary" key={`${i}-${a}`}>{a}</Badge>)}
                </div>
            )
        }
        return <Badge variant="secondary">{answer}</Badge>;
    }


    return (
        <div className="container mx-auto py-12">
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">Quiz Results</CardTitle>
                    <CardDescription className="text-lg">{result.quizTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <p className="text-muted-foreground">Your Score</p>
                        <h2 className="text-6xl font-bold text-primary">{result.score} / {result.totalQuestions}</h2>
                        <p className="text-2xl font-semibold">Marks Obtained</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                        <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                            <Timer className="h-8 w-8 text-primary" />
                            <h3 className="font-semibold">Time Taken</h3>
                            <p className="text-muted-foreground">{formatTime(result.timeTakenSeconds)}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                            <ShieldAlert className="h-8 w-8 text-primary" />
                            <h3 className="font-semibold">Cheating Violations</h3>
                            <p className="text-muted-foreground">{result.cheatingViolations}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-center">Answer Review</h3>
                        <div className="space-y-4">
                            {result.questions.map((q, index) => (
                                <Card key={q.id} className={`p-4 ${q.isCorrect ? 'border-green-500 bg-green-500/5' : 'border-destructive bg-destructive/5'}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold flex-1 pr-4">{index + 1}. {q.questionText}</p>
                                        {q.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                                    </div>
                                    <div className="mt-2 text-sm space-y-2">
                                        <div>
                                            <span className="font-medium mr-2">Your answer:</span>
                                            {renderAnswer(q.userAnswer)}
                                        </div>
                                        {!q.isCorrect && <div>
                                            <span className="font-medium mr-2">Correct answer:</span>
                                            {renderAnswer(q.correctAnswers)}
                                        </div>}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
                        <Button asChild size="lg">
                            <Link href="/dashboard">Back to Dashboard</Link>
                        </Button>
                        {/* <Button variant="outline" size="lg">
                            <Download className="mr-2 h-4 w-4" /> Download Report
                        </Button> */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
