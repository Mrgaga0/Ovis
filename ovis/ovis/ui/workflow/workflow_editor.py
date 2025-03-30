#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 편집기 컴포넌트 - 워크플로우 생성 및 편집 UI
"""

import os
import json
import uuid
from PyQt6.QtCore import Qt, pyqtSignal, QSize
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QTableWidget, QTableWidgetItem, 
    QHeaderView, QAbstractItemView, QMenu, QMessageBox,
    QDialog, QComboBox, QLineEdit, QFormLayout
)

from ovis.ui.components import (
    OvisStyle, OvisButton, OvisLabel, OvisCard,
    OvisTextField, OvisTextArea
)

class TaskEditorDialog(QDialog):
    """작업 편집 다이얼로그"""
    
    def __init__(self, parent=None, task_types=None, task=None):
        super().__init__(parent)
        self.task_types = task_types or []
        self.task = task or {"id": str(uuid.uuid4()), "type": "", "params": {}}
        self._init_ui()
    
    def _init_ui(self):
        """UI 초기화"""
        self.setWindowTitle("작업 편집")
        self.setMinimumSize(400, 300)
        
        # 메인 레이아웃
        layout = QVBoxLayout(self)
        
        # 폼 레이아웃
        form_layout = QFormLayout()
        form_layout.setSpacing(10)
        
        # 작업 ID
        self.id_field = OvisTextField()
        self.id_field.setText(self.task["id"])
        form_layout.addRow("작업 ID:", self.id_field)
        
        # 작업 유형
        self.type_combo = QComboBox()
        self.type_combo.addItems(self.task_types)
        if self.task["type"] and self.task["type"] in self.task_types:
            self.type_combo.setCurrentText(self.task["type"])
        form_layout.addRow("작업 유형:", self.type_combo)
        
        # 매개변수 (키-값 쌍)
        self.params_layout = QVBoxLayout()
        self.param_fields = []
        
        # 기존 매개변수 추가
        for key, value in self.task["params"].items():
            self._add_param_field(key, str(value))
        
        # 새 매개변수 추가 버튼
        add_param_btn = OvisButton("매개변수 추가", button_type="secondary", icon_name="plus")
        add_param_btn.clicked.connect(self._add_param_field)
        
        # 매개변수 영역
        params_card = OvisCard()
        params_layout = QVBoxLayout(params_card)
        params_layout.addLayout(self.params_layout)
        params_layout.addWidget(add_param_btn)
        
        form_layout.addRow("매개변수:", params_card)
        layout.addLayout(form_layout)
        
        # 버튼 영역
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        cancel_btn = OvisButton("취소", button_type="secondary")
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(cancel_btn)
        
        save_btn = OvisButton("저장")
        save_btn.clicked.connect(self.accept)
        button_layout.addWidget(save_btn)
        
        layout.addLayout(button_layout)
    
    def _add_param_field(self, key="", value=""):
        """매개변수 필드 추가"""
        param_layout = QHBoxLayout()
        
        key_field = QLineEdit()
        key_field.setPlaceholderText("키")
        key_field.setText(key)
        param_layout.addWidget(key_field, 1)
        
        value_field = QLineEdit()
        value_field.setPlaceholderText("값")
        value_field.setText(value)
        param_layout.addWidget(value_field, 2)
        
        remove_btn = OvisButton("삭제", button_type="danger", icon_name="trash")
        remove_btn.setMaximumWidth(60)
        remove_btn.clicked.connect(lambda: self._remove_param_field(param_layout))
        param_layout.addWidget(remove_btn)
        
        self.param_fields.append((key_field, value_field))
        self.params_layout.addLayout(param_layout)
    
    def _remove_param_field(self, layout):
        """매개변수 필드 제거"""
        # 레이아웃의 모든 위젯 제거
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
            else:
                layout_item = item.layout()
                if layout_item:
                    while layout_item.count():
                        child = layout_item.takeAt(0)
                        widget = child.widget()
                        if widget:
                            widget.deleteLater()
        
        # 필드 목록에서 제거
        for i, (key_field, value_field) in enumerate(self.param_fields):
            if key_field.parent() is None or value_field.parent() is None:
                self.param_fields.pop(i)
                break
        
        # 레이아웃 제거
        self.params_layout.removeItem(layout)
    
    def get_task(self):
        """사용자가 입력한 작업 데이터 반환"""
        params = {}
        for key_field, value_field in self.param_fields:
            key = key_field.text().strip()
            value = value_field.text().strip()
            if key:
                params[key] = value
        
        return {
            "id": self.id_field.text().strip(),
            "type": self.type_combo.currentText(),
            "params": params
        }


class WorkflowEditor(QWidget):
    """워크플로우 편집기 위젯"""
    
    # 시그널 정의
    save_workflow = pyqtSignal(dict)  # 워크플로우 저장 시그널
    test_workflow = pyqtSignal(dict)  # 워크플로우 테스트 시그널
    
    def __init__(self, parent=None, task_types=None):
        super().__init__(parent)
        self.task_types = task_types or ["text_generation", "image_generation", "data_processing"]
        self.workflow = None
        self.workflow_id = None
        self.engine = None
        self.is_new = True
        self._init_ui()
    
    def _init_ui(self):
        """UI 초기화"""
        # 메인 레이아웃
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)
        
        # 헤더 섹션
        header_layout = QHBoxLayout()
        
        # 제목
        self.title = OvisLabel("워크플로우 편집", size=OvisStyle.FONT_XLARGE)
        header_layout.addWidget(self.title)
        
        # 스페이서
        header_layout.addStretch()
        
        # 버튼 섹션
        test_btn = OvisButton("테스트", icon_name="play", button_type="secondary")
        test_btn.clicked.connect(self._on_test_clicked)
        header_layout.addWidget(test_btn)
        
        save_btn = OvisButton("저장", icon_name="save")
        save_btn.clicked.connect(self._on_save_clicked)
        header_layout.addWidget(save_btn)
        
        main_layout.addLayout(header_layout)
        
        # 워크플로우 정보 카드
        info_card = OvisCard()
        info_layout = QVBoxLayout(info_card)
        info_layout.setContentsMargins(15, 15, 15, 15)
        
        # 워크플로우 정보 폼
        form_layout = QFormLayout()
        form_layout.setSpacing(10)
        
        # 워크플로우 ID
        self.id_field = OvisTextField()
        self.id_field.setPlaceholderText("자동 생성")
        self.id_field.setReadOnly(True)
        form_layout.addRow("워크플로우 ID:", self.id_field)
        
        # 워크플로우 이름
        self.name_field = OvisTextField()
        self.name_field.setPlaceholderText("워크플로우 이름 입력")
        form_layout.addRow("이름:", self.name_field)
        
        # 워크플로우 설명
        self.description_field = OvisTextArea()
        self.description_field.setPlaceholderText("워크플로우 설명 입력")
        self.description_field.setMaximumHeight(80)
        form_layout.addRow("설명:", self.description_field)
        
        info_layout.addLayout(form_layout)
        main_layout.addWidget(info_card)
        
        # 작업 목록 카드
        tasks_card = OvisCard()
        tasks_layout = QVBoxLayout(tasks_card)
        tasks_layout.setContentsMargins(15, 15, 15, 15)
        
        # 작업 목록 헤더
        tasks_header_layout = QHBoxLayout()
        tasks_header = OvisLabel("작업 목록", size=OvisStyle.FONT_LARGE)
        tasks_header_layout.addWidget(tasks_header)
        tasks_header_layout.addStretch()
        
        # 작업 추가 버튼
        add_task_btn = OvisButton("작업 추가", icon_name="plus")
        add_task_btn.clicked.connect(self._on_add_task_clicked)
        tasks_header_layout.addWidget(add_task_btn)
        
        tasks_layout.addLayout(tasks_header_layout)
        
        # 작업 테이블
        self.tasks_table = QTableWidget()
        self.tasks_table.setColumnCount(4)
        self.tasks_table.setHorizontalHeaderLabels(["ID", "유형", "매개변수", "액션"])
        self.tasks_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.tasks_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.tasks_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.tasks_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.tasks_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.tasks_table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.tasks_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.tasks_table.verticalHeader().setVisible(False)
        self.tasks_table.setAlternatingRowColors(True)
        
        # 스타일 설정
        self.tasks_table.setStyleSheet(f"""
            QTableWidget {{
                background-color: {OvisStyle.CARD_BG};
                border: none;
                gridline-color: {OvisStyle.BORDER_COLOR};
            }}
            QTableWidget::item {{
                padding: 5px;
            }}
            QTableWidget::item:selected {{
                background-color: {OvisStyle.PRIMARY_COLOR_LIGHT};
            }}
            QHeaderView::section {{
                background-color: {OvisStyle.PRIMARY_COLOR_LIGHT};
                padding: 5px;
                border: 1px solid {OvisStyle.BORDER_COLOR};
                font-weight: bold;
            }}
        """)
        
        tasks_layout.addWidget(self.tasks_table)
        main_layout.addWidget(tasks_card)
    
    def set_workflow(self, workflow_id, workflow, engine):
        """워크플로우 및 엔진 설정"""
        self.workflow = workflow
        self.workflow_id = workflow_id
        self.engine = engine
        self.is_new = False
        
        # UI 업데이트
        self.title.setText(f"워크플로우 편집: {workflow.name}")
        self.id_field.setText(workflow.id)
        self.name_field.setText(workflow.name)
        self.description_field.setText(workflow.description)
        
        # 작업 테이블 업데이트
        self.update_tasks_table()
    
    def create_new_workflow(self):
        """새 워크플로우 생성"""
        from ovis.workflow.workflow import Workflow
        self.workflow = Workflow(
            id=str(uuid.uuid4()),
            name="새 워크플로우",
            description="새 워크플로우 설명",
            tasks=[]
        )
        self.workflow_id = self.workflow.id
        self.is_new = True
        
        # UI 업데이트
        self.title.setText("새 워크플로우 생성")
        self.id_field.setText(self.workflow.id)
        self.name_field.setText(self.workflow.name)
        self.description_field.setText(self.workflow.description)
        
        # 작업 테이블 초기화
        self.update_tasks_table()
    
    def update_tasks_table(self):
        """작업 테이블 업데이트"""
        self.tasks_table.clearContents()
        
        if not self.workflow or not self.workflow.tasks:
            self.tasks_table.setRowCount(0)
            return
        
        # 행 수 설정
        self.tasks_table.setRowCount(len(self.workflow.tasks))
        
        # 데이터 추가
        for row, task in enumerate(self.workflow.tasks):
            # 순서
            order_item = QTableWidgetItem(str(row + 1))
            self.tasks_table.setItem(row, 0, order_item)
            
            # 작업 유형
            type_item = QTableWidgetItem(task.handler)
            self.tasks_table.setItem(row, 1, type_item)
            
            # 작업 설명
            desc = task.description if hasattr(task, 'description') else f"{task.handler} 작업"
            desc_item = QTableWidgetItem(desc)
            self.tasks_table.setItem(row, 2, desc_item)
            
            # 파라미터
            params_text = ', '.join(f"{k}={v}" for k, v in task.parameters.items()) if task.parameters else ""
            params_item = QTableWidgetItem(params_text)
            self.tasks_table.setItem(row, 3, params_item)
            
            # 작업 버튼 생성
            action_cell = QWidget()
            action_layout = QHBoxLayout(action_cell)
            action_layout.setContentsMargins(4, 4, 4, 4)
            action_layout.setSpacing(4)
            
            # 편집 버튼
            edit_btn = OvisButton("편집", button_type="secondary", icon_name="edit")
            edit_btn.clicked.connect(lambda checked, idx=row: self._edit_task(idx))
            action_layout.addWidget(edit_btn)
            
            # 삭제 버튼
            delete_btn = OvisButton("삭제", button_type="danger", icon_name="delete")
            delete_btn.clicked.connect(lambda checked, idx=row: self._delete_task(idx))
            action_layout.addWidget(delete_btn)
            
            self.tasks_table.setCellWidget(row, 4, action_cell)
        
        self.tasks_table.resizeColumnsToContents()
        self.tasks_table.resizeRowsToContents()
    
    def _on_add_task_clicked(self):
        """작업 추가 버튼 클릭 처리"""
        dialog = TaskEditorDialog(self, self.task_types)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            task = dialog.get_task()
            if not self.workflow:
                self.create_new_workflow()
            
            self.workflow.tasks.append(task)
            self.update_tasks_table()
    
    def _edit_task(self, task_index):
        """작업 편집 버튼 클릭 처리"""
        if not self.workflow or task_index >= len(self.workflow.tasks):
            return
        
        task = self.workflow.tasks[task_index]
        dialog = TaskEditorDialog(self, self.task_types, task)
        
        if dialog.exec() == QDialog.DialogCode.Accepted:
            edited_task = dialog.get_task()
            self.workflow.tasks[task_index] = edited_task
            self.update_tasks_table()
    
    def _delete_task(self, task_index):
        """작업 삭제 버튼 클릭 처리"""
        if not self.workflow or task_index >= len(self.workflow.tasks):
            return
        
        # 삭제 확인 메시지
        confirm = QMessageBox.question(
            self,
            "작업 삭제",
            f"정말 이 작업을 삭제하시겠습니까?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if confirm == QMessageBox.StandardButton.Yes:
            self.workflow.tasks.pop(task_index)
            self.update_tasks_table()
    
    def _on_save_clicked(self):
        """저장 버튼 클릭 처리"""
        if not self.workflow:
            self.create_new_workflow()
        
        # 폼 데이터 가져오기
        name = self.name_field.text().strip()
        description = self.description_field.toPlainText().strip()
        
        # 유효성 검사
        if not name:
            QMessageBox.warning(self, "입력 오류", "워크플로우 이름을 입력해주세요.")
            self.name_field.setFocus()
            return
        
        # 워크플로우 데이터 업데이트
        self.workflow.name = name
        self.workflow.description = description
        
        # 저장 시그널 발생
        self.save_workflow.emit(self.workflow_id, self.workflow)
    
    def _on_test_clicked(self):
        """테스트 버튼 클릭 처리"""
        if not self.workflow:
            QMessageBox.warning(self, "워크플로우 없음", "테스트할 워크플로우가 없습니다.")
            return
        
        # 유효성 검사
        name = self.name_field.text().strip()
        if not name:
            QMessageBox.warning(self, "입력 오류", "워크플로우 이름을 입력해주세요.")
            self.name_field.setFocus()
            return
        
        if not self.workflow.tasks:
            QMessageBox.warning(self, "작업 없음", "테스트할 작업이 없습니다. 작업을 추가해주세요.")
            return
        
        # 현재 폼 데이터로 워크플로우 업데이트
        self.workflow.name = name
        self.workflow.description = self.description_field.toPlainText().strip()
        
        # 테스트 시그널 발생
        self.test_workflow.emit(self.workflow_id, self.workflow) 