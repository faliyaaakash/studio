"use client";

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash, PlusCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import QuestionOptionsEditor from '@/components/quiz/question-options-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { Quiz } from '@/lib/types';

const optionSchema = z.object({
    value: z.string().min(1, "Option text cannot be empty"),
});

const questionSchema = z.object({
    questionText: z.string().min(1, 'Question text is required'),
    imageUrl: z.string().url().optional(),
    imageFile: z.instanceof(File).optional(),
    type: z.enum(['mcq', 'msq', 'tf', 'text']),
    options: z.array(optionSchema).optional(),
    correctAnswers: z.array(z.string()).min(1, 'At least one correct answer is required'),
});

const quizSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
    maxAttempts: z.coerce.number().optional().nullable(),
    cheatingProtection: z.boolean().default(false),
    expiresAt: z.date().optional().nullable(),
    questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

export type QuizFormValues = z.infer<typeof quizSchema>;

export default function EditQuizPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { quizId } = useParams<{ quizId: string }>();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);


    const { register, control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<QuizFormValues>({
        resolver: zodResolver(quizSchema),
        defaultValues: {
            title: '',
            description: '',
            durationMinutes: 10,
            cheatingProtection: true,
            maxAttempts: null,
            expiresAt: null,
            questions: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'questions',
    });

    const watchedQuestions = watch('questions');

    useEffect(() => {
        if (!process.browser) return; // Only run on client
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchQuiz = async () => {
            if (!quizId) return;
            try {
                const docRef = doc(db, "quizzes", quizId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Quiz;
                    if (data.createdBy !== user.uid) {
                        toast({
                            title: "Unauthorized",
                            description: "You do not have permission to edit this quiz.",
                            variant: "destructive",
                        });
                        router.push('/dashboard');
                        return;
                    }

                    reset({
                        title: data.title,
                        description: data.description,
                        durationMinutes: data.durationMinutes,
                        maxAttempts: data.maxAttempts,
                        cheatingProtection: data.cheatingProtection,
                        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
                        questions: data.questions.map(q => ({
                            questionText: q.questionText,
                            imageUrl: q.imageUrl,
                            type: q.type,
                            options: q.options,
                            correctAnswers: q.correctAnswers,
                        })),
                    });
                } else {
                    toast({
                        title: "Not Found",
                        description: "Quiz not found.",
                        variant: "destructive",
                    });
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error("Error fetching quiz:", error);
                toast({
                    title: "Error",
                    description: "Failed to load quiz data.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuiz();
    }, [quizId, user, authLoading, router, reset, toast]);



    const onSubmit = async (data: QuizFormValues) => {
        if (!user || !quizId) return;
        setIsSubmitting(true);

        try {
            const quizData = {
                title: data.title,
                description: data.description,
                durationMinutes: data.durationMinutes,
                maxAttempts: data.maxAttempts || null,
                cheatingProtection: data.cheatingProtection,
                expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
                questionCount: data.questions.length,
                questions: data.questions.map(q => {
                    const { imageFile, ...rest } = q;
                    // In a real app we might want to preserve IDs if they existed, but re-generating them ensures freshness and avoids duplicates if copied. 
                    // However, for editing, we ideally want to keep IDs if possible to track stats. 
                    // For simplicity in this `edit` flow which re-creates the array, we'll generate new IDs or relies on logic that doesn't strictly depend on persistent QIDs for historical stats yet.
                    // A better approach would be to store ID in the form, but let's stick to the generated one for now or simply add a hidden ID field if we wanted strict persistence.
                    return { ...rest, id: uuidv4() };
                }),
                updatedAt: Timestamp.now(),
            };

            await updateDoc(doc(db, "quizzes", quizId), quizData);

            toast({
                title: "Quiz Updated",
                description: "Your quiz has been successfully updated.",
            });
            router.push(`/quiz/${quizId}`);
        } catch (error) {
            console.error("Quiz update failed", error);
            toast({ title: "Error", description: "Failed to update quiz. Please try again.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6 font-headline">Edit Quiz</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details</CardTitle>
                        <CardDescription>Update the information for your quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Quiz Title</Label>
                            <Input id="title" {...register('title')} />
                            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...register('description')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                                <Input id="durationMinutes" type="number" {...register('durationMinutes')} />
                                {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxAttempts">Max Attempts (0 or empty for unlimited)</Label>
                                <Input id="maxAttempts" type="number" {...register('maxAttempts')} onChange={(e) => setValue('maxAttempts', e.target.value === '' ? null : Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Expiration Date & Time (optional)</Label>
                                <div className="grid gap-4">
                                    <Controller
                                        control={control}
                                        name="expiresAt"
                                        render={({ field }) => (
                                            <>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ?? undefined}
                                                            onSelect={(date) => {
                                                                if (!date) {
                                                                    field.onChange(null);
                                                                    return;
                                                                }
                                                                if (field.value) {
                                                                    date.setHours(field.value.getHours());
                                                                    date.setMinutes(field.value.getMinutes());
                                                                } else {
                                                                    date.setHours(23);
                                                                    date.setMinutes(59);
                                                                }
                                                                field.onChange(date);
                                                            }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Time:</Label>
                                                    <Input
                                                        type="time"
                                                        className="w-full"
                                                        disabled={!field.value}
                                                        value={field.value ? format(field.value, "HH:mm") : ""}
                                                        onChange={(e) => {
                                                            if (field.value && e.target.value) {
                                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                const newDate = new Date(field.value);
                                                                newDate.setHours(hours);
                                                                newDate.setMinutes(minutes);
                                                                field.onChange(newDate);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-4">
                            <Controller
                                control={control}
                                name="cheatingProtection"
                                render={({ field }) => (
                                    <Switch
                                        id="cheatingProtection"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="cheatingProtection">Enable Cheating Protection</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Questions</CardTitle>
                        <CardDescription>Update questions for your quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 relative bg-card-alt">
                                <CardHeader className="p-2">
                                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => remove(index)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4 p-2">
                                    <div className="space-y-2">
                                        <Label>Question Type</Label>
                                        <Controller
                                            control={control}
                                            name={`questions.${index}.type`}
                                            render={({ field }) => (
                                                <Select onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setValue(`questions.${index}.options`, []);
                                                    setValue(`questions.${index}.correctAnswers`, []);
                                                }} defaultValue={field.value}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a question type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="mcq">Multiple Choice (Single Answer)</SelectItem>
                                                        <SelectItem value="msq">Multiple Select (Multiple Answers)</SelectItem>
                                                        <SelectItem value="tf">True / False</SelectItem>
                                                        <SelectItem value="text">Short Text</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Question Text</Label>
                                        <Textarea {...register(`questions.${index}.questionText`)} />
                                        {errors.questions?.[index]?.questionText && <p className="text-sm text-destructive">{errors.questions?.[index]?.questionText?.message}</p>}
                                    </div>



                                    <QuestionOptionsEditor questionIndex={index} control={control} register={register} />
                                    {errors.questions?.[index]?.correctAnswers && <p className="text-sm text-destructive">{errors.questions?.[index]?.correctAnswers?.message}</p>}
                                </CardContent>
                            </Card>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ questionText: '', type: 'mcq', options: [{ value: "Option 1" }, { value: "Option 2" }], correctAnswers: [] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                        {errors.questions && typeof errors.questions === 'object' && 'message' in errors.questions && <p className="text-sm text-destructive">{errors.questions.message}</p>}
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Updating Quiz..." : "Update Quiz"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
