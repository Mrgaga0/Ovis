#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 뷰 컴포넌트 - 워크플로우 목록 및 관리 UI
"""

import os
import json
from PyQt6.QtCore import Qt, pyqtSignal, QSize
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QTableWidget, QTableWidgetItem, 
    QHeaderView, QAbstractItemView, QMenu, QMessageBox
)

from ovis.ui.components import (
    OvisStyle, OvisButton, OvisLabel, OvisCard
)

class WorkflowView(QWidget):
    """워크플로우 뷰 - 워크플로우 관리 및 목록 표시"""
    
    # 시그널 정의
    workflow_selected = pyqtSignal(str)
    run_workflow = pyqtSignal(str)
    edit_workflow = pyqtSignal(str)
    create_workflow = pyqtSignal()
    refresh_workflows = pyqtSignal()
    
    def __init__(self, parent=None):
        """초기화"""
        super().__init__(parent)
        self.workflows = []
        self._init_ui()
    
    def _init_ui(self):
        """UI 초기화"""
        # 메인 레이아웃
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # 카드 생성
        card = OvisCard()
        card_layout = QVBoxLayout()
        card_layout.setContentsMargins(16, 16, 16, 16)
        card_layout.setSpacing(16)
        
        # 헤더 섹션
        header_layout = QHBoxLayout()
        
        # 제목
        title = OvisLabel("워크플로우 관리", type="title")
        header_layout.addWidget(title)
        
        header_layout.addStretch(1)
        
        # 새 워크플로우 버튼
        create_btn = OvisButton("새 워크플로우", icon_name="add")
        create_btn.clicked.connect(self._on_create_clicked)
        header_layout.addWidget(create_btn)
        
        # 새로고침 버튼
        refresh_btn = OvisButton("새로고침", button_type="secondary", icon_name="refresh")
        refresh_btn.clicked.connect(self._on_refresh_clicked)
        header_layout.addWidget(refresh_btn)
        
        card_layout.addLayout(header_layout)
        
        # 설명 레이블
        desc = OvisLabel(
            "워크플로우는 자동화된 작업 시퀀스입니다. 여러 단계의 작업을 연결하여 복잡한 자동화를 구성합니다.",
            type="body"
        )
        card_layout.addWidget(desc)
        
        # 워크플로우 테이블
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["ID", "이름", "설명", "상태", "작업"])
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.cellClicked.connect(self._on_cell_clicked)
        
        # 테이블 스타일 설정
        self.table.setShowGrid(True)
        self.table.setAlternatingRowColors(True)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.verticalHeader().setVisible(False)
        
        card_layout.addWidget(self.table)
        
        # "워크플로우 없음" 메시지
        self.no_workflows_label = OvisLabel(
            "등록된 워크플로우가 없습니다. '새 워크플로우' 버튼을 클릭하여 새 워크플로우를 생성하세요.",
            type="body"
        )
        self.no_workflows_label.setVisible(False)
        card_layout.addWidget(self.no_workflows_label)
        
        card.setLayout(card_layout)
        layout.addWidget(card)
    
    def set_workflows(self, workflows):
        """워크플로우 목록 설정"""
        self.workflows = workflows
        self.update_workflow_table()
    
    def update_workflow_table(self):
        """워크플로우 테이블 업데이트"""
        self.table.clearContents()
        
        if not self.workflows:
            self.update_no_workflows_message(True)
            return
            
        self.update_no_workflows_message(False)
        
        # 행 수 설정
        self.table.setRowCount(len(self.workflows))
        
        # 데이터 추가
        for row, workflow in enumerate(self.workflows):
            # ID
            id_item = QTableWidgetItem(workflow.id)
            id_item.setData(Qt.ItemDataRole.UserRole, workflow.id)
            self.table.setItem(row, 0, id_item)
            
            # 이름
            name_item = QTableWidgetItem(workflow.name)
            self.table.setItem(row, 1, name_item)
            
            # 설명
            desc_item = QTableWidgetItem(workflow.description)
            self.table.setItem(row, 2, desc_item)
            
            # 상태
            # We should derive status from workflow object but for now just set as "준비됨"
            status_item = QTableWidgetItem("준비됨")
            self.table.setItem(row, 3, status_item)
            
            # 작업 버튼 생성
            action_cell = QWidget()
            action_layout = QHBoxLayout(action_cell)
            action_layout.setContentsMargins(4, 4, 4, 4)
            action_layout.setSpacing(4)
            
            # 실행 버튼
            run_btn = OvisButton("실행", icon_name="play")
            run_btn.clicked.connect(lambda checked, wf_id=workflow.id: self._run_workflow(wf_id))
            action_layout.addWidget(run_btn)
            
            # 편집 버튼
            edit_btn = OvisButton("편집", button_type="secondary", icon_name="edit")
            edit_btn.clicked.connect(lambda checked, wf_id=workflow.id: self._edit_workflow(wf_id))
            action_layout.addWidget(edit_btn)
            
            self.table.setCellWidget(row, 4, action_cell)
        
        self.table.resizeColumnsToContents()
        self.table.resizeRowsToContents()
    
    def update_no_workflows_message(self, visible):
        """워크플로우 없음 메시지 업데이트"""
        self.table.setVisible(not visible)
        self.no_workflows_label.setVisible(visible)
    
    def _on_cell_clicked(self, row, col):
        """테이블 셀 클릭 이벤트 핸들러"""
        if row >= 0 and row < len(self.workflows):
            workflow_id = self.workflows[row].id
            self.workflow_selected.emit(workflow_id)
            
            # 액션 컬럼이 아닌 경우 편집 화면으로 이동
            if col != 4:  # 액션 컬럼은 4번
                self.edit_workflow.emit(workflow_id)

    def _run_workflow(self, workflow_id):
        """워크플로우 실행 요청"""
        self.run_workflow.emit(workflow_id)
        
    def _edit_workflow(self, workflow_id):
        """워크플로우 편집 요청"""
        self.edit_workflow.emit(workflow_id)

    def _on_create_clicked(self):
        """새 워크플로우 버튼 클릭 처리"""
        self.create_workflow.emit()
        
    def _on_refresh_clicked(self):
        """새로고침 버튼 클릭 처리"""
        self.refresh_workflows.emit() 