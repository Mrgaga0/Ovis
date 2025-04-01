import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/hooks/use-toast';
import { useAgents } from '@/hooks/use-agents';

// 태스크 폼 검증 스키마
const taskFormSchema = z.object({
  agentId: z.string().min(1, { message: '에이전트 ID는 필수입니다.' }),
  type: z.string().min(1, { message: '태스크 타입은 필수입니다.' }),
  priority: z.coerce
    .number()
    .int()
    .min(0, { message: '우선순위는 0 이상이어야 합니다.' })
    .max(10, { message: '우선순위는 10 이하이어야 합니다.' })
    .default(0),
  data: z.string()
    .min(2, { message: '태스크 데이터는 필수입니다.' })
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch (e) {
          return false;
        }
      },
      { message: '올바른 JSON 형식이어야 합니다.' }
    ),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// 지원되는 태스크 타입 목록
const TASK_TYPES = [
  { value: 'data_processing', label: '데이터 처리' },
  { value: 'content_generation', label: '콘텐츠 생성' },
  { value: 'notification', label: '알림' },
  { value: 'analysis', label: '분석' },
  { value: 'custom', label: '커스텀' },
];

interface Agent {
  id: string;
  name: string;
  type: string;
}

interface TaskFormProps {
  agents?: Agent[];
  onSubmit?: (values: any) => Promise<void>;
  isSubmitting?: boolean;
  defaultValues?: Partial<TaskFormValues>;
  selectedAgentId?: string;
  onSuccess?: () => void;
}

export function TaskForm({
  agents: propAgents,
  onSubmit: propOnSubmit,
  isSubmitting: propIsSubmitting = false,
  defaultValues,
  selectedAgentId,
  onSuccess,
}: TaskFormProps) {
  const { toast } = useToast();
  const { agents, isLoading: isLoadingAgents } = useAgents();
  const { createTask } = useTasks();
  const [isSubmitting, setIsSubmitting] = useState(propIsSubmitting);
  
  // 에이전트 데이터 처리
  const availableAgents = propAgents || agents;
  
  // 폼 초기값 설정
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      agentId: selectedAgentId || defaultValues?.agentId || '',
      type: defaultValues?.type || 'data_processing',
      priority: defaultValues?.priority || 0,
      data: defaultValues?.data || '{\n  "key": "value"\n}',
    },
  });

  // 폼 제출 핸들러
  const handleSubmit = async (values: TaskFormValues) => {
    setIsSubmitting(true);
    
    try {
      // JSON 문자열을 객체로 변환
      const parsedData = JSON.parse(values.data);
      
      // 실제 제출 데이터 구성
      const submitData = {
        ...values,
        data: parsedData,
      };
      
      if (propOnSubmit) {
        // 외부에서 제공된 onSubmit 사용
        await propOnSubmit(submitData);
      } else {
        // 내장 createTask 사용
        const result = await createTask(submitData);
        
        if (result) {
          toast({
            title: "성공",
            description: "새 태스크가 생성되었습니다.",
          });
          
          form.reset();
          
          // 성공 콜백 호출
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (error) {
      console.error('태스크 폼 제출 오류:', error);
      toast({
        title: "오류",
        description: "태스크 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 에이전트 선택 필드 */}
        <FormField
          control={form.control}
          name="agentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>에이전트</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || !!selectedAgentId || isLoadingAgents}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="에이전트 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingAgents ? (
                    <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                  ) : availableAgents.length === 0 ? (
                    <SelectItem value="none" disabled>사용 가능한 에이전트 없음</SelectItem>
                  ) : (
                    availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                태스크를 처리할 에이전트를 선택하세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 태스크 타입 선택 필드 */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>태스크 타입</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="태스크 타입 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                처리할 태스크의 유형을 선택하세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 우선순위 입력 필드 */}
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>우선순위</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  max={10}
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                태스크의 우선순위 (0-10). 높을수록 먼저 처리됩니다.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 데이터 입력 필드 */}
        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem>
              <FormLabel>태스크 데이터 (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{\n  "key": "value"\n}'
                  className="font-mono min-h-[200px]"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                태스크 실행에 필요한 데이터를 JSON 형식으로 입력하세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            '태스크 생성'
          )}
        </Button>
      </form>
    </Form>
  );
} 