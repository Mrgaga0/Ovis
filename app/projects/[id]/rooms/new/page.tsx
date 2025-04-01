import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function NewRoomPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  })

  if (!project) {
    return <div>프로젝트를 찾을 수 없습니다.</div>
  }

  async function createRoom(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const description = formData.get("description") as string

    if (!name || !description) {
      throw new Error("필수 입력값이 누락되었습니다.")
    }

    await prisma.room.create({
      data: {
        name,
        description,
        projectId: params.id,
        createdBy: "test-user", // TODO: 실제 사용자 ID로 변경
      },
    })

    redirect(`/projects/${params.id}`)
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>새 룸</CardTitle>
          <CardDescription>새로운 룸을 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createRoom} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                룸 이름
              </label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                설명
              </label>
              <Textarea id="description" name="description" required />
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" asChild>
                <a href={`/projects/${params.id}`}>취소</a>
              </Button>
              <Button type="submit">생성</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 