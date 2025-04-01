import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Room } from "@/lib/projects/types"
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

const roomFormSchema = z.object({
  name: z.string().min(1, "룸 이름을 입력해주세요"),
  description: z.string().min(1, "룸 설명을 입력해주세요"),
})

type RoomFormValues = z.infer<typeof roomFormSchema>

interface RoomFormProps {
  projectId: string
  onSubmit?: (data: RoomFormValues) => Promise<void>
  onCancel?: () => void
}

export function RoomForm({ projectId, onSubmit, onCancel }: RoomFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const handleSubmit = async (data: RoomFormValues) => {
    try {
      setIsSubmitting(true)
      if (onSubmit) {
        await onSubmit(data)
      }
    } catch (error) {
      console.error("룸 생성 중 오류 발생:", error)
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
              <FormLabel>룸 이름</FormLabel>
              <FormControl>
                <Input placeholder="룸 이름을 입력하세요" {...field} />
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
              <FormLabel>룸 설명</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="룸에 대한 설명을 입력하세요"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              취소
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "룸 생성"}
          </Button>
        </div>
      </form>
    </Form>
  )
} 