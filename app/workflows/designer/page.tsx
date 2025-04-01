'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WorkflowHeader } from '@/components/workflows/workflow-header';
import { WorkflowCanvas } from '@/components/workflows/workflow-canvas';
import { WorkflowProperties } from '@/components/workflows/workflow-properties';
import { WorkflowLibrary } from '@/components/workflows/workflow-library';
import { WorkflowSettings } from '@/components/workflows/workflow-settings';
import { Plus, Save, Play, Settings } from "lucide-react"

export default function WorkflowDesignerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">워크플로우 디자이너</h1>
          <p className="text-muted-foreground">워크플로우를 설계하고 관리하세요</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            설정
          </Button>
          <Button variant="outline">
            <Play className="mr-2 h-4 w-4" />
            실행
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            저장
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>워크플로우 캔버스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">워크플로우 캔버스가 여기에 표시됩니다.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>컴포넌트</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">기본</TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1">고급</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  텍스트 생성
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  이미지 생성
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  조건문
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  반복문
                </Button>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  API 호출
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  데이터 변환
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  병렬 처리
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  에러 처리
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 