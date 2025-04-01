import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function RecentProjects() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>프로젝트명</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>마케팅 콘텐츠 생성</TableCell>
          <TableCell>진행중</TableCell>
          <TableCell>
            <Button variant="outline" size="sm">보기</Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>제품 설명서 작성</TableCell>
          <TableCell>완료</TableCell>
          <TableCell>
            <Button variant="outline" size="sm">보기</Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>소셜 미디어 캠페인</TableCell>
          <TableCell>진행중</TableCell>
          <TableCell>
            <Button variant="outline" size="sm">보기</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
} 