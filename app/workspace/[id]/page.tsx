'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { ContentEditor } from '@/components/workspace/content-editor';
import { ContentPreview } from '@/components/workspace/content-preview';
import { ContentHistory } from '@/components/workspace/content-history';
import { ContentSettings } from '@/components/workspace/content-settings';
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Send, RefreshCw } from "lucide-react"

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">콘텐츠 생성</h1>
          <p className="text-muted-foreground">작업 ID: {params.id}</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>프롬프트 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">콘텐츠 유형</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="콘텐츠 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">블로그 포스트</SelectItem>
                  <SelectItem value="social">소셜 미디어</SelectItem>
                  <SelectItem value="email">이메일</SelectItem>
                  <SelectItem value="product">제품 설명</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">주제</label>
              <Input placeholder="주제를 입력하세요" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">프롬프트</label>
              <Textarea
                placeholder="프롬프트를 입력하세요"
                className="min-h-[200px]"
              />
            </div>

            <Button className="w-full">
              <Send className="mr-2 h-4 w-4" />
              생성 시작
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>생성 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="preview">미리보기</TabsTrigger>
                <TabsTrigger value="history">히스토리</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">생성된 콘텐츠</h3>
                  <p className="text-sm text-muted-foreground">
                    콘텐츠가 여기에 표시됩니다.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">이전 버전 1</h3>
                      <Button variant="outline" size="sm">복원</Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      이전에 생성된 콘텐츠가 여기에 표시됩니다.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 