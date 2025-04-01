import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function NewProjectPage() {
  const teams = await prisma.team.findMany()

  async function createProject(formData: FormData) {
    "use server"

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const teamId = formData.get("teamId") as string

    if (!name || !description || !teamId) {
      throw new Error("필수 입력값이 누락되었습니다.")
    }

    await prisma.project.create({
      data: {
        name,
        description,
        status: "planning",
        startDate: new Date(),
        teamId,
      },
    })

    redirect("/projects")
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트</CardTitle>
          <CardDescription>새로운 프로젝트를 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProject} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                프로젝트 이름
              </label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                설명
              </label>
              <Textarea id="description" name="description" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="teamId" className="text-sm font-medium">
                팀
              </label>
              <Select name="teamId" required>
                <SelectTrigger>
                  <SelectValue placeholder="팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" asChild>
                <a href="/projects">취소</a>
              </Button>
              <Button type="submit">생성</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 