
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import useCheatingDetection from "@/hooks/use-cheating-detection";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Quiz, Question, QuestionOption } from "@/lib/types";
import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

export default function QuizTakePage() {
  const router = useRouter();
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(new Date());

  const handleSubmitQuiz = useCallback(async (submissionType: 'manual' | 'timeout' | 'cheating' = 'manual') => {
    if (isSubmitting || !quiz || !user) return;
    setIsSubmitting(true);

    // Validate required questions only for manual submission
    if (submissionType === 'manual') {
      const firstUnansweredRequired = quiz.questions.find(q => {
        if (!q.isRequired) return false;
        const ans = answers[q.id];
        if (!ans) return true;
        if (Array.isArray(ans) && ans.length === 0) return true;
        if (typeof ans === 'string' && ans.trim() === '') return true;
        return false;
      });

      if (firstUnansweredRequired) {
        toast({
          title: "Required Questions Missing",
          description: "Please answer all required questions before submitting.",
          variant: "destructive"
        });
        const idx = quiz.questions.findIndex(q => q.id === firstUnansweredRequired.id);
        if (idx !== -1) setCurrentQuestionIndex(idx);
        setIsSubmitting(false);
        return;
      }
    }

    // Calculate score
    let score = 0;
    if (submissionType === 'cheating') {
      score = 0;
    } else {
      const answeredQuestions = quiz.questions.map(q => {
        const userAnswer = answers[q.id] || null;
        let isCorrect = false;
        if (userAnswer) {
          if (q.type === 'msq') {
            isCorrect = Array.isArray(userAnswer) && userAnswer.length === q.correctAnswers.length && userAnswer.every(a => q.correctAnswers.includes(a));
          } else {
            isCorrect = q.correctAnswers[0] === userAnswer;
          }
        }
        if (isCorrect) score++;
        return { questionId: q.id, value: userAnswer };
      });
      // Note: answeredQuestions map was used for score calc but also constructing answers payload. 
      // We need 'answeredQuestions' for payload regardless of score override.
    }

    // Re-construct answeredQuestions for payload consistently
    const answeredQuestions = quiz.questions.map(q => {
      const userAnswer = answers[q.id] || null;
      return { questionId: q.id, value: userAnswer };
    });


    const timeTakenSeconds = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

    const sanitizeData = (data: any): any => {
      if (data === undefined) return null;
      if (data === null) return null;
      if (data instanceof Timestamp) return data;
      if (data instanceof Date) return data;
      if (Array.isArray(data)) return data.map(sanitizeData);
      if (typeof data === 'object') {
        const newObj: any = {};
        for (const key in data) {
          newObj[key] = sanitizeData(data[key]);
        }
        return newObj;
      }
      return data;
    };

    try {
      const rawAttemptData = {
        quizId: quizId,
        quizTitle: quiz.title,
        userId: user.uid,
        userName: user.displayName,
        answers: answeredQuestions,
        score: score,
        totalQuestions: quiz.questions?.length,
        cheatingViolations: violationCount.current,
        startedAt: Timestamp.fromDate(startTime),
        submittedAt: Timestamp.now(),
        timeTakenSeconds: timeTakenSeconds,
        submissionType: submissionType, // track why it was submitted
      };

      const attemptData = sanitizeData(rawAttemptData);

      console.log("Submitting sanitized attempt data:", attemptData);

      const attemptRef = await addDoc(collection(db, "attempts"), attemptData);
      router.replace(`/results/${attemptRef.id}`);

    } catch (error: any) {
      console.error("Failed to submit quiz", error);
      toast({
        title: "Submission Error",
        description: error.message || "Could not save your quiz results. Please try again.",
        variant: 'destructive'
      });
      setIsSubmitting(false);
    }
  }, [answers, quiz, router, user, quizId, isSubmitting, startTime, toast]);

  const violationCount = useRef(0);
  const onViolation = useCallback((count: number) => {
    violationCount.current = count;
    if (count === 1) {
      toast({
        title: "Warning: Cheating Detected",
        description: "You have lost focus of the quiz. One more violation will result in auto-submission.",
        variant: "destructive",
        duration: 5000,
      });
    } else if (count >= 2) {
      toast({
        title: "Quiz Auto-Submitted",
        description: "Your quiz has been submitted due to multiple cheating violations. Score will be 0.",
        variant: "destructive",
        duration: 5000,
      });
      handleSubmitQuiz('cheating');
    }
    // Log violation to firestore
    if (user) {
      addDoc(collection(db, "cheating_logs"), {
        quizId,
        userId: user.uid,
        violationNumber: count,
        timestamp: Timestamp.now(),
      });
    }
  }, [handleSubmitQuiz, toast, user, quizId]);

  useCheatingDetection({ onViolation, enabled: quiz?.cheatingProtection ?? false });

  useEffect(() => {
    if (!quizId) return;
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const quizRef = doc(db, "quizzes", quizId);
        const quizSnap = await getDoc(quizRef);
        if (quizSnap.exists()) {
          const quizDataRaw = { id: quizSnap.id, ...quizSnap.data() } as Quiz;
          // Ensure all questions have an ID (fallback to index if missing)
          const questionsWithIds = quizDataRaw.questions.map((q, idx) => ({
            ...q,
            id: q.id || `q-${idx}`
          }));

          setQuiz({ ...quizDataRaw, questions: questionsWithIds });
          setTimeLeft(quizDataRaw.durationMinutes * 60);
        } else {
          toast({ title: "Error", description: "Quiz not found.", variant: 'destructive' });
          router.push('/dashboard');
        }
      } catch (e) {
        toast({ title: "Error", description: "Failed to load quiz.", variant: 'destructive' });
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, router, toast]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      toast({
        title: "Time's Up!",
        description: "Your quiz has been automatically submitted.",
      });
      handleSubmitQuiz('timeout');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmitQuiz, toast]);

  const currentQuestion = useMemo(() => quiz?.questions[currentQuestionIndex], [quiz, currentQuestionIndex]);
  const progress = useMemo(() => quiz ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0, [quiz, currentQuestionIndex]);

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const goToNext = () => {
    if (quiz && currentQuestion) {
      if (currentQuestion.isRequired) {
        const ans = answers[currentQuestion.id];
        const isAnswered = ans && (Array.isArray(ans) ? ans.length > 0 : (typeof ans === 'string' && ans.trim() !== ''));
        if (!isAnswered) {
          toast({
            title: "Required Question",
            description: "This question is required. Please answer to proceed.",
            variant: "destructive"
          });
          return;
        }
      }
    }

    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !quiz || !currentQuestion || timeLeft === null) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <div className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-2xl font-headline">{quiz.title}</CardTitle>
            <div className={`font-bold text-lg px-3 py-1 rounded-md ${timeLeft < 60 ? 'text-destructive bg-destructive/10' : 'bg-muted'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center mt-2">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg min-h-[100px] space-y-4">
            <p className="text-lg font-semibold">
              {currentQuestion.questionText}
              {currentQuestion.isRequired && <span className="text-destructive ml-1">*</span>}
            </p>
            {currentQuestion.imageUrl && <div className="relative h-48 w-full"><Image src={currentQuestion.imageUrl} alt="Question Image" layout="fill" objectFit="contain" className="rounded-md" /></div>}
          </div>
          <div>
            {currentQuestion.type === 'mcq' && (
              <RadioGroup
                key={currentQuestion.id} // Force remount on question change
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                value={answers[currentQuestion.id] as string || ""}
                className="space-y-2"
              >
                {currentQuestion.options?.map((option: QuestionOption, index: number) => (
                  <Label key={`${currentQuestion.id}-opt-${index}`} className="flex items-center space-x-3 p-4 border rounded-lg transition-colors hover:bg-accent/50 has-[:checked]:bg-accent has-[:checked]:border-primary cursor-pointer">
                    <RadioGroupItem value={option.value} id={`${currentQuestion.id}-${index}`} />
                    <span>{option.value}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}
            {currentQuestion.type === 'tf' && (
              <RadioGroup
                key={currentQuestion.id}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                value={answers[currentQuestion.id] as string || ""}
                className="space-y-2"
              >
                {["True", "False"].map((option, index) => (
                  <Label key={`${currentQuestion.id}-tf-${index}`} className="flex items-center space-x-3 p-4 border rounded-lg transition-colors hover:bg-accent/50 has-[:checked]:bg-accent has-[:checked]:border-primary cursor-pointer">
                    <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                    <span>{option}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}
            {currentQuestion.type === 'msq' && (
              <div className="space-y-2">
                {currentQuestion.options?.map((option: QuestionOption, index: number) => (
                  <Label key={index} className="flex items-center space-x-3 p-4 border rounded-lg transition-colors hover:bg-accent/50 has-[:checked]:bg-accent has-[:checked]:border-primary cursor-pointer">
                    <Checkbox
                      id={`${currentQuestion.id}-${index}`}
                      value={option.value}
                      checked={(answers[currentQuestion.id] as string[] || []).includes(option.value)}
                      onCheckedChange={(checked) => {
                        const currentAnswers = (answers[currentQuestion.id] as string[] || []);
                        const newAnswers = checked ? [...currentAnswers, option.value] : currentAnswers.filter(a => a !== option.value);
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                    />
                    <span>{option.value}</span>
                  </Label>
                ))}
              </div>
            )}
            {currentQuestion.type === 'text' && (
              <Textarea
                placeholder="Your answer..."
                value={answers[currentQuestion.id] as string || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You cannot change your answers after submitting.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleSubmitQuiz('manual')} disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={goToNext}>
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
