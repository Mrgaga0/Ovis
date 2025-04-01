'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const agentFormSchema = z.object({
  name: z
    .string()
    .min(3, '이름은 최소 3자 이상이어야 합니다.')
    .max(50, '이름은 최대 50자까지 허용됩니다.'),
  type: z.enum(['base', 'task', 'custom'], {
    required_error: '에이전트 유형을 선택해주세요.',
  }),
  maxTasks: z
    .number()
    .min(1, '최소 작업 수는 1입니다.')
    .max(10, '최대 작업 수는 10입니다.')
    .optional(),
});

type FormValues = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  onSubmit: (values: FormValues) => void;
  initialValues?: FormValues;
  isSubmitting?: boolean;
}

export function AgentForm({ 
  onSubmit, 
  initialValues,
  isSubmitting: externalIsSubmitting 
}: AgentFormProps) {
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  
  // 외부에서 제공된 isSubmitting이 있으면 그것을 사용, 아니면 내부 상태 사용
  const isSubmitting = externalIsSubmitting !== undefined 
    ? externalIsSubmitting 
    : internalIsSubmitting;

  const defaultValues = initialValues || {
    name: '',
    type: 'task' as const,
    maxTasks: 3,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: FormValues) => {
    if (externalIsSubmitting !== undefined) {
      // 외부에서 제어하는 경우 내부 상태 변경 없이 콜백만 호출
      await onSubmit(values);
    } else {
      // 내부에서 제어하는 경우
      setInternalIsSubmitting(true);
      try {
        await onSubmit(values);
        form.reset();
      } catch (error) {
        console.error('에이전트 생성 실패:', error);
      } finally {
        setInternalIsSubmitting(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>에이전트 이름</FormLabel>
              <FormControl>
                <Input placeholder="이름을 입력하세요" {...field} />
              </FormControl>
              <FormDescription>
                에이전트를 식별하기 위한 고유 이름입니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>에이전트 유형</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="base">기본 에이전트</SelectItem>
                  <SelectItem value="task">작업 에이전트</SelectItem>
                  <SelectItem value="custom">커스텀 에이전트</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                에이전트가 수행할 작업의 유형을 결정합니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('type') === 'task' && (
          <FormField
            control={form.control}
            name="maxTasks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>최대 동시 작업 수</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="3"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  작업 에이전트가 동시에 처리할 수 있는 최대 작업 수입니다.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '생성 중...' : '에이전트 생성'}
        </Button>
      </form>
    </Form>
  );
} 