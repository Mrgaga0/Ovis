import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"

export function ProjectMembers() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">팀 멤버</h3>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          멤버 추가
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>홍길동</TableCell>
            <TableCell>프로젝트 매니저</TableCell>
            <TableCell>활성</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">관리</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>김철수</TableCell>
            <TableCell>콘텐츠 작성자</TableCell>
            <TableCell>활성</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">관리</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>이영희</TableCell>
            <TableCell>디자이너</TableCell>
            <TableCell>활성</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">관리</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
} 