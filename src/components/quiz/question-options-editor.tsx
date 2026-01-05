
"use client";

import { Control, Controller, useFieldArray, UseFormRegister, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash, PlusCircle } from "lucide-react";
import type { QuizFormValues } from "@/app/(app)/create-quiz/page";

interface QuestionOptionsEditorProps {
    questionIndex: number;
    control: Control<QuizFormValues>;
    register: UseFormRegister<QuizFormValues>;
}

export default function QuestionOptionsEditor({ questionIndex, control, register }: QuestionOptionsEditorProps) {
    const questionType = useWatch({
        control,
        name: `questions.${questionIndex}.type`,
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.options`,
    });

    const options = useWatch({ control, name: `questions.${questionIndex}.options` });

    if (questionType === "mcq" || questionType === "msq") {
        return (
            <div className="space-y-4">
                <Label>Options & Correct Answer(s)</Label>
                <div className="space-y-2">
                    {fields.map((field, optionIndex) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Controller
                                control={control}
                                name={`questions.${questionIndex}.correctAnswers`}
                                render={({ field: { onChange, value } }) => {
                                    if (questionType === 'mcq') {
                                        return (
                                            <RadioGroup
                                                onValueChange={(v) => onChange([v])}
                                                value={value?.[0] || ""}
                                            >
                                                <RadioGroupItem value={options?.[optionIndex]?.value || ""} id={`q-${questionIndex}-o-${optionIndex}`} />
                                            </RadioGroup>
                                        );
                                    }
                                    return (
                                        <Checkbox
                                            checked={value?.includes(options?.[optionIndex]?.value || "")}
                                            onCheckedChange={(checked) => {
                                                const currentValue = options?.[optionIndex]?.value;
                                                if (!currentValue) return;
                                                if (checked) {
                                                    onChange([...(value || []), currentValue]);
                                                } else {
                                                    onChange((value || []).filter((v) => v !== currentValue));
                                                }
                                            }}
                                        />
                                    );
                                }}
                            />
                            <Input
                                {...register(`questions.${questionIndex}.options.${optionIndex}.value`)}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="flex-grow"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(optionIndex)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                </Button>
            </div>
        );
    }

    if (questionType === "tf") {
        return (
            <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Controller
                    name={`questions.${questionIndex}.correctAnswers`}
                    control={control}
                    render={({ field }) => (
                        <RadioGroup onValueChange={(val) => field.onChange([val])} value={field.value?.[0]} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="True" id={`q${questionIndex}-true`} />
                                <Label htmlFor={`q${questionIndex}-true`}>True</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="False" id={`q${questionIndex}-false`} />
                                <Label htmlFor={`q${questionIndex}-false`}>False</Label>
                            </div>
                        </RadioGroup>
                    )}
                />
            </div>
        );
    }

    if (questionType === "text") {
        return (
            <div className="space-y-2">
                <Label>Correct Answer (Optional)</Label>
                <Input {...register(`questions.${questionIndex}.correctAnswers.0`)} />
            </div>
        );
    }

    return null;
}
