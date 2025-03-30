#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 실행기 위젯
"""

import os
import json
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable

from PyQt6.QtCore import Qt, pyqtSignal, QSize, QThread, QObject
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QScrollArea, QFrame, QTextEdit, QMessageBox, QProgressBar
)

from ovis.ui.components import (
    OvisStyle, OvisButton, OvisLabel, OvisCard, OvisLoadingIndicator, OvisTextArea
)

from ovis.workflow.engine import Workflow, Task, WorkflowEngine

class WorkflowRunnerThread(QThread):
    """워크플로우 실행을 위한 별도 스레드"""
    
    # 시그널 정의
    taskStarted = pyqtSignal(str)  # 작업 시작 시그널 (작업 ID)
    taskCompleted = pyqtSignal(str, object)  # 작업 완료 시그널 (작업 ID, 결과)
    taskFailed = pyqtSignal(str, str)  # 작업 실패 시그널 (작업 ID, 오류 메시지)
    workflowCompleted = pyqtSignal(object)  # 워크플로우 완료 시그널 (워크플로우)
    workflowFailed = pyqtSignal(object, str)  # 워크플로우 실패 시그널 (워크플로우, 오류 메시지)
    
    def __init__(self, engine: WorkflowEngine, workflow: Workflow):
        super().__init__()
        self.engine = engine
        self.workflow = workflow
        self.running = False
        
    def run(self):
        """스레드 실행 (워크플로우 실행)"""
        self.running = True
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # 작업 시작/완료/실패 콜백 설정
            self.engine.on_task_start = lambda task_id: self.taskStarted.emit(task_id)
            self.engine.on_task_complete = lambda task_id, result: self.taskCompleted.emit(task_id, result)
            self.engine.on_task_fail = lambda task_id, error: self.taskFailed.emit(task_id, str(error))
            
            # 워크플로우 실행
            result = loop.run_until_complete(self.engine.execute_workflow(self.workflow))
            self.workflow.result = result
            
            # 워크플로우 완료 시그널 발생
            self.workflowCompleted.emit(self.workflow)
            
        except Exception as e:
            # 워크플로우 실패 시그널 발생
            self.workflowFailed.emit(self.workflow, str(e))
            
        finally:
            loop.close()
            self.running = False
            
    def stop(self):
        """워크플로우 실행 중지 요청"""
        self.running = False
        self.engine.cancel_execution = True
        self.wait()

class TaskStatusWidget(QWidget):
    """작업 상태 표시 위젯"""
    
    def __init__(self, task: Task, parent: Optional[QWidget] = None):
        super().__init__(parent)
        
        self.task = task
        
        # 레이아웃 설정
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM
        )
        self.layout.setSpacing(OvisStyle.Sizes.PADDING_SMALL)
        
        # 상태에 따른 스타일 설정
        self.setProperty("status", "pending")
        self.setStyleSheet(f"""
            TaskStatusWidget[status="pending"] {{
                background-color: {OvisStyle.Colors.BACKGROUND_DARK};
                border: 1px solid {OvisStyle.Colors.BORDER};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
            }}
            
            TaskStatusWidget[status="running"] {{
                background-color: {OvisStyle.Colors.BACKGROUND_DARK};
                border: 1px solid {OvisStyle.Colors.PRIMARY};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
            }}
            
            TaskStatusWidget[status="completed"] {{
                background-color: {OvisStyle.Colors.BACKGROUND_DARK};
                border: 1px solid {OvisStyle.Colors.SUCCESS};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
            }}
            
            TaskStatusWidget[status="failed"] {{
                background-color: {OvisStyle.Colors.BACKGROUND_DARK};
                border: 1px solid {OvisStyle.Colors.ERROR};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
            }}
        """)
        
        # 헤더 레이아웃
        header_layout = QHBoxLayout()
        
        # 작업 타이틀
        title_text = f"{task.id}: {task.type}"
        self.title_label = OvisLabel(title_text, self, "subtitle")
        header_layout.addWidget(self.title_label)
        
        # 여백
        header_layout.addStretch(1)
        
        # 상태 라벨
        self.status_label = OvisLabel("대기 중", self, "caption")
        self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.TEXT_SECONDARY};")
        header_layout.addWidget(self.status_label)
        
        self.layout.addLayout(header_layout)
        
        # 파라미터 정보
        params_text = json.dumps(task.params, ensure_ascii=False)
        if len(params_text) > 100:
            params_text = params_text[:97] + "..."
            
        self.params_label = OvisLabel(f"파라미터: {params_text}", self, "body")
        self.layout.addWidget(self.params_label)
        
        # 결과 영역
        self.result_label = OvisLabel("", self, "body")
        self.result_label.setVisible(False)
        self.layout.addWidget(self.result_label)
        
        # 오류 영역
        self.error_label = OvisLabel("", self, "body")
        self.error_label.setStyleSheet(f"color: {OvisStyle.Colors.ERROR};")
        self.error_label.setVisible(False)
        self.layout.addWidget(self.error_label)
        
        # 로딩 인디케이터
        self.loading = OvisLoadingIndicator(self)
        self.loading.setVisible(False)
        self.layout.addWidget(self.loading, alignment=Qt.AlignmentFlag.AlignCenter)
        
    def set_status(self, status: str):
        """작업 상태 설정"""
        self.setProperty("status", status)
        self.style().unpolish(self)
        self.style().polish(self)
        
        # 상태별 UI 업데이트
        if status == "pending":
            self.status_label.setText("대기 중")
            self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.TEXT_SECONDARY};")
            self.loading.setVisible(False)
            
        elif status == "running":
            self.status_label.setText("실행 중")
            self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.PRIMARY};")
            self.loading.setVisible(True)
            self.loading.start()
            
        elif status == "completed":
            self.status_label.setText("완료")
            self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.SUCCESS};")
            self.loading.setVisible(False)
            
        elif status == "failed":
            self.status_label.setText("실패")
            self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.ERROR};")
            self.loading.setVisible(False)
        
    def set_result(self, result: Any):
        """작업 결과 설정"""
        result_str = str(result)
        if len(result_str) > 200:
            result_str = result_str[:197] + "..."
            
        self.result_label.setText(f"결과: {result_str}")
        self.result_label.setVisible(True)
        
        # 상태 업데이트
        self.set_status("completed")
        
    def set_error(self, error: str):
        """작업 오류 설정"""
        self.error_label.setText(f"오류: {error}")
        self.error_label.setVisible(True)
        
        # 상태 업데이트
        self.set_status("failed")

class WorkflowRunner(QWidget):
    """워크플로우 실행기 위젯"""
    
    # 시그널 정의
    workflowCompleted = pyqtSignal(object)  # 워크플로우 완료 시그널
    workflowFailed = pyqtSignal(object, str)  # 워크플로우 실패 시그널
    
    def __init__(self, engine: WorkflowEngine, parent: Optional[QWidget] = None):
        super().__init__(parent)
        
        self.engine = engine
        self.workflow = None
        self.thread = None
        self.task_widgets = {}
        
        # UI 초기화
        self.init_ui()
        
    def init_ui(self):
        """UI 초기화"""
        # 메인 레이아웃
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(
            OvisStyle.Sizes.MARGIN_LARGE, 
            OvisStyle.Sizes.MARGIN_LARGE, 
            OvisStyle.Sizes.MARGIN_LARGE, 
            OvisStyle.Sizes.MARGIN_LARGE
        )
        self.layout.setSpacing(OvisStyle.Sizes.MARGIN_MEDIUM)
        
        # 제목 및 버튼 영역
        header_layout = QHBoxLayout()
        
        # 제목
        self.title_label = OvisLabel("워크플로우 실행", self, "title")
        header_layout.addWidget(self.title_label)
        
        # 여백
        header_layout.addStretch(1)
        
        # 상태 라벨
        self.status_label = OvisLabel("준비됨", self, "subtitle")
        header_layout.addWidget(self.status_label)
        
        # 중지 버튼
        self.stop_button = OvisButton("실행 중지", self)
        self.stop_button.clicked.connect(self.on_stop_clicked)
        self.stop_button.setVisible(False)
        header_layout.addWidget(self.stop_button)
        
        self.layout.addLayout(header_layout)
        
        # 워크플로우 정보 카드
        self.info_card = OvisCard(self, title="워크플로우 정보")
        
        info_layout = QVBoxLayout()
        
        # 워크플로우 설명
        self.desc_label = OvisLabel("", self, "body")
        info_layout.addWidget(self.desc_label)
        
        # 진행률 바
        self.progress_layout = QHBoxLayout()
        self.progress_label = OvisLabel("진행률:", self, "body")
        self.progress_bar = QProgressBar(self)
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)
        self.progress_bar.setTextVisible(True)
        self.progress_bar.setStyleSheet(f"""
            QProgressBar {{
                border: 1px solid {OvisStyle.Colors.BORDER};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_SMALL}px;
                background-color: {OvisStyle.Colors.BACKGROUND};
                text-align: center;
                padding: 1px;
                height: 20px;
            }}
            
            QProgressBar::chunk {{
                background-color: {OvisStyle.Colors.PRIMARY};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_SMALL}px;
            }}
        """)
        
        self.progress_layout.addWidget(self.progress_label)
        self.progress_layout.addWidget(self.progress_bar)
        info_layout.addLayout(self.progress_layout)
        
        self.info_card.layout.addLayout(info_layout)
        self.layout.addWidget(self.info_card)
        
        # 작업 상태 스크롤 영역
        self.tasks_card = OvisCard(self, title="작업 상태")
        
        tasks_layout = QVBoxLayout()
        
        # 작업 컨테이너
        self.tasks_container = QWidget()
        self.tasks_container_layout = QVBoxLayout(self.tasks_container)
        self.tasks_container_layout.setContentsMargins(0, 0, 0, 0)
        self.tasks_container_layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        # 스크롤 영역
        tasks_scroll = QScrollArea()
        tasks_scroll.setWidgetResizable(True)
        tasks_scroll.setWidget(self.tasks_container)
        tasks_scroll.setFrameShape(QFrame.Shape.NoFrame)
        tasks_layout.addWidget(tasks_scroll)
        
        self.tasks_card.layout.addLayout(tasks_layout)
        self.layout.addWidget(self.tasks_card)
        
        # 결과 카드
        self.result_card = OvisCard(self, title="실행 결과")
        
        result_layout = QVBoxLayout()
        
        # 결과 표시 영역
        self.result_area = OvisTextArea(self, "워크플로우 실행 결과가 여기에 표시됩니다.")
        self.result_area.setReadOnly(True)
        self.result_area.setMinimumHeight(100)
        result_layout.addWidget(self.result_area)
        
        self.result_card.layout.addLayout(result_layout)
        self.result_card.setVisible(False)
        self.layout.addWidget(self.result_card)
        
        # 여백 추가
        self.layout.addStretch(1)
        
    def set_workflow(self, workflow, engine):
        """워크플로우 및 엔진 설정"""
        self.workflow = workflow
        self.engine = engine
        
        # 워크플로우 정보 표시 업데이트
        self.title_label.setText(f"워크플로우 실행: {workflow.name}")
        self.desc_label.setText(workflow.description)
        
        # 태스크 위젯 초기화
        self._init_task_widgets()
        
        # 상태 업데이트
        self.status_label.setText("실행 중")
        self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.PRIMARY};")
        self.stop_button.setVisible(True)
        
        # 실행 스레드 생성 및 시작
        self.thread = WorkflowRunnerThread(self.engine, workflow)
        self.thread.taskStarted.connect(self._on_task_started)
        self.thread.taskCompleted.connect(self._on_task_completed)
        self.thread.taskFailed.connect(self._on_task_failed)
        self.thread.workflowCompleted.connect(self._on_workflow_completed)
        self.thread.workflowFailed.connect(self._on_workflow_failed)
        
        # 스레드 시작
        self.thread.start()
        
    def on_stop_clicked(self):
        """실행 중지 버튼 클릭 처리"""
        if self.thread and self.thread.running:
            # 중지 확인
            reply = QMessageBox.question(
                self, "워크플로우 중지", 
                "현재 실행 중인 워크플로우를 중지하시겠습니까?", 
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No, 
                QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                # 스레드 중지
                self.thread.stop()
                
                # 상태 업데이트
                self.status_label.setText("중지됨")
                self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.ERROR};")
                self.stop_button.setVisible(False)
        
    def _clear_task_widgets(self):
        """작업 상태 위젯 초기화"""
        self.task_widgets = {}
        
        # 기존 위젯 제거
        while self.tasks_container_layout.count():
            item = self.tasks_container_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
                
    def _update_progress(self, percentage: int):
        """진행률 업데이트"""
        self.progress_bar.setValue(percentage)
        
    def _on_task_started(self, task_id: str):
        """작업 시작 처리"""
        if task_id in self.task_widgets:
            self.task_widgets[task_id].set_status("running")
            
        # 진행률 업데이트
        self._update_task_progress()
        
    def _on_task_completed(self, task_id: str, result: Any):
        """작업 완료 처리"""
        if task_id in self.task_widgets:
            self.task_widgets[task_id].set_result(result)
            
        # 진행률 업데이트
        self._update_task_progress()
        
    def _on_task_failed(self, task_id: str, error: str):
        """작업 실패 처리"""
        if task_id in self.task_widgets:
            self.task_widgets[task_id].set_error(error)
            
        # 진행률 업데이트
        self._update_task_progress()
        
    def _update_task_progress(self):
        """작업 진행 상태 기반 진행률 업데이트"""
        if not self.workflow or not self.workflow.tasks:
            return
            
        total_tasks = len(self.workflow.tasks)
        completed_tasks = 0
        
        for task in self.workflow.tasks:
            if task.status == "completed" or task.status == "failed":
                completed_tasks += 1
                
        progress = int(completed_tasks / total_tasks * 100)
        self._update_progress(progress)
        
    def _on_workflow_completed(self, workflow: Workflow):
        """워크플로우 완료 처리"""
        self.workflow = workflow
        
        # 상태 업데이트
        self.status_label.setText("완료")
        self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.SUCCESS};")
        self.stop_button.setVisible(False)
        
        # 결과 표시
        if workflow.result:
            result_str = json.dumps(workflow.result, indent=2, ensure_ascii=False)
            self.result_area.setText(result_str)
            self.result_card.setVisible(True)
            
        # 진행률 100%
        self._update_progress(100)
        
        # 상위 시그널 발생
        self.workflowCompleted.emit(workflow)
        
    def _on_workflow_failed(self, workflow: Workflow, error: str):
        """워크플로우 실패 처리"""
        self.workflow = workflow
        
        # 상태 업데이트
        self.status_label.setText("실패")
        self.status_label.setStyleSheet(f"color: {OvisStyle.Colors.ERROR};")
        self.stop_button.setVisible(False)
        
        # 오류 메시지 표시
        self.result_area.setText(f"워크플로우 실행 중 오류가 발생했습니다:\n{error}")
        self.result_card.setVisible(True)
        
        # 상위 시그널 발생
        self.workflowFailed.emit(workflow, error)

    def _init_task_widgets(self):
        """작업 위젯 초기화"""
        # 진행 상태 초기화
        self._clear_task_widgets()
        
        # 작업 위젯 생성
        for task in self.workflow.tasks:
            self._add_task_widget(task)
        
        # 결과 카드 숨기기
        self.result_card.setVisible(False)
        self.result_area.clear() 