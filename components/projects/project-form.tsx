import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Project, ProjectStatus } from "@/lib/projects/types"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const projectFormSchema = z.object({
  name: z.string().min(1, "프로젝트 이름을 입력해주세요"),
  description: z.string().min(1, "프로젝트 설명을 입력해주세요"),
  status: z.enum(["planning", "active", "paused", "completed"] as const),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormProps {
  onSubmit: (data: ProjectFormValues) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ onSubmit, onCancel }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      startDate: "",
      endDate: "",
    },
  })

  const handleSubmit = async (data: ProjectFormValues) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
    } catch (error) {
      console.error("프로젝트 생성 중 오류 발생:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>프로젝트 이름</FormLabel>
              <FormControl>
                <Input placeholder="프로젝트 이름을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>프로젝트 설명</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="프로젝트에 대한 설명을 입력하세요"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>상태</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="프로젝트 상태를 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="planning">계획 중</SelectItem>
                  <SelectItem value="active">진행 중</SelectItem>
                  <SelectItem value="paused">일시 중지</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>시작일</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>종료일</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "프로젝트 생성"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 