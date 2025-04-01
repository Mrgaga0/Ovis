# UI 컴포넌트 라이브러리

## 개요

Ovis 시스템은 ShadCN UI와 Tailwind CSS를 기반으로 한 컴포넌트 라이브러리를 사용합니다. 모든 컴포넌트는 TypeScript로 작성되어 있으며, 접근성과 재사용성을 고려하여 설계되었습니다.

## 기본 컴포넌트

### Button

버튼 컴포넌트는 다양한 스타일과 크기를 지원합니다.

```tsx
import { Button } from "@/components/ui/button"

// 기본 버튼
<Button>기본 버튼</Button>

// 변형된 버튼
<Button variant="secondary">보조 버튼</Button>
<Button variant="destructive">삭제 버튼</Button>
<Button variant="outline">외곽 버튼</Button>

// 크기 변형
<Button size="sm">작은 버튼</Button>
<Button size="default">기본 크기</Button>
<Button size="lg">큰 버튼</Button>
```

### Card

카드 컴포넌트는 콘텐츠를 그룹화하고 구조화하는데 사용됩니다.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    내용
  </CardContent>
  <CardFooter>
    푸터
  </CardFooter>
</Card>
```

### Input

입력 필드 컴포넌트입니다.

```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="입력하세요" />
```

### Label

라벨 컴포넌트는 입력 필드와 함께 사용됩니다.

```tsx
import { Label } from "@/components/ui/label"

<Label htmlFor="email">이메일</Label>
```

### Textarea

다중 줄 입력 필드 컴포넌트입니다.

```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="여러 줄 입력이 가능합니다." />
```

### Switch

토글 스위치 컴포넌트입니다.

```tsx
import { Switch } from "@/components/ui/switch"

<Switch />
```

### Select

선택 드롭다운 컴포넌트입니다.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select>
  <SelectTrigger>
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">옵션 1</SelectItem>
    <SelectItem value="option2">옵션 2</SelectItem>
  </SelectContent>
</Select>
```

### Avatar

사용자 아바타 컴포넌트입니다.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatar.png" alt="사용자" />
  <AvatarFallback>U</AvatarFallback>
</Avatar>
```

### Badge

상태나 라벨을 표시하는 컴포넌트입니다.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>기본</Badge>
<Badge variant="secondary">보조</Badge>
<Badge variant="destructive">삭제</Badge>
<Badge variant="outline">외곽</Badge>
```

### Progress

진행률을 표시하는 컴포넌트입니다.

```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={60} />
```

### ScrollArea

스크롤 가능한 영역을 제공하는 컴포넌트입니다.

```tsx
import { ScrollArea } from "@/components/ui/scroll-area"

<ScrollArea className="h-[200px]">
  <div>스크롤 가능한 내용</div>
</ScrollArea>
```

### Tabs

탭 네비게이션을 제공하는 컴포넌트입니다.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">탭 1</TabsTrigger>
    <TabsTrigger value="tab2">탭 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">탭 1 내용</TabsContent>
  <TabsContent value="tab2">탭 2 내용</TabsContent>
</Tabs>
```

## 기능 컴포넌트

### ProjectHeader

프로젝트 헤더 컴포넌트는 프로젝트의 제목, 설명, 설정 버튼 등을 포함합니다.

```tsx
import { ProjectHeader } from "@/components/projects/project-header"

<ProjectHeader projectId="123" />
```

### ProjectOverview

프로젝트 개요 컴포넌트는 프로젝트의 진행 상황, 통계 등을 표시합니다.

```tsx
import { ProjectOverview } from "@/components/projects/project-overview"

<ProjectOverview projectId="123" />
```

### ProjectSettings

프로젝트 설정 컴포넌트는 프로젝트의 기본 정보, 알림 설정 등을 관리합니다.

```tsx
import { ProjectSettings } from "@/components/projects/project-settings"

<ProjectSettings projectId="123" />
```

### TeamManagement

팀 관리 컴포넌트는 팀원 초대, 팀원 목록 관리 등을 제공합니다.

```tsx
import { TeamManagement } from "@/components/projects/team-management"

<TeamManagement projectId="123" />
```

### ActivityFeed

활동 내역 컴포넌트는 프로젝트의 최근 활동을 표시합니다.

```tsx
import { ActivityFeed } from "@/components/projects/activity-feed"

<ActivityFeed projectId="123" />
```

### ContentEditor

콘텐츠 편집기 컴포넌트는 콘텐츠 작성과 편집을 제공합니다.

```tsx
import { ContentEditor } from "@/components/workspace/content-editor"

<ContentEditor contentId="123" />
```

### ContentPreview

콘텐츠 미리보기 컴포넌트는 작성된 콘텐츠의 미리보기를 제공합니다.

```tsx
import { ContentPreview } from "@/components/workspace/content-preview"

<ContentPreview contentId="123" />
```

### WorkflowCanvas

워크플로우 캔버스 컴포넌트는 워크플로우를 시각적으로 설계할 수 있는 도구를 제공합니다.

```tsx
import { WorkflowCanvas } from "@/components/workflows/workflow-canvas"

<WorkflowCanvas />
```

### NodeLibrary

노드 라이브러리 컴포넌트는 워크플로우에 사용할 수 있는 노드들을 표시합니다.

```tsx
import { NodeLibrary } from "@/components/workflows/node-library"

<NodeLibrary nodes={nodes} />
```

### NodeSettings

노드 설정 컴포넌트는 선택된 노드의 속성을 설정할 수 있는 도구를 제공합니다.

```tsx
import { NodeSettings } from "@/components/workflows/node-settings"

<NodeSettings node={node} onUpdate={handleUpdate} />
```

### ExecutionLog

실행 로그 컴포넌트는 워크플로우 실행 중 발생하는 로그를 표시합니다.

```tsx
import { ExecutionLog } from "@/components/workflows/execution-log"

<ExecutionLog logs={logs} />
``` 