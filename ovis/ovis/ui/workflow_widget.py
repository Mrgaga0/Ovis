from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QLabel, QPushButton, 
                           QListWidget, QListWidgetItem, QHBoxLayout,
                           QComboBox, QDialog, QDialogButtonBox, QFormLayout,
                           QMessageBox, QLineEdit, QTextEdit, QMenu)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QAction, QColor

from ovis.workflow.manager import WorkflowManager
from ovis.workflow.engine import Workflow

from ovis.ui.components import OvisButton, OvisLabel, OvisCard

class WorkflowListWidget(QWidget):
    """워크플로우 목록 및 관리 위젯"""
    
    workflowSelected = pyqtSignal(str)  # 워크플로우 ID 전달
    workflowStarted = pyqtSignal(Workflow)
    
    def __init__(self, workflow_manager: WorkflowManager, parent=None):
        super().__init__(parent)
        self.workflow_manager = workflow_manager
        self.selected_workflow_id = None
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # 워크플로우 템플릿 섹션
        template_card = OvisCard(title="워크플로우 템플릿")
        template_layout = QVBoxLayout()
        
        # 템플릿 설명
        template_desc = OvisLabel("사용 가능한 워크플로우 템플릿 목록입니다. 템플릿을 선택하여 새 워크플로우를 생성할 수 있습니다.", type="body")
        template_layout.addWidget(template_desc)
        
        # 템플릿 목록
        self.template_list = QListWidget()
        self.template_list.itemDoubleClicked.connect(self.create_from_template)
        self.template_list.itemClicked.connect(self.on_template_clicked)
        self.template_list.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.template_list.customContextMenuRequested.connect(self.show_template_context_menu)
        template_layout.addWidget(self.template_list)
        
        # 템플릿 관련 버튼
        template_buttons = QHBoxLayout()
        self.create_btn = OvisButton("템플릿으로 생성", icon_name="add")
        self.create_btn.clicked.connect(self.create_from_selected_template)
        template_buttons.addWidget(self.create_btn)
        template_buttons.addStretch(1)
        
        template_layout.addLayout(template_buttons)
        template_card.layout.addLayout(template_layout)
        layout.addWidget(template_card)
        
        # 인스턴스 섹션
        instance_card = OvisCard(title="워크플로우 인스턴스")
        instance_layout = QVBoxLayout()
        
        # 인스턴스 설명
        instance_desc = OvisLabel("생성된 워크플로우 인스턴스 목록입니다. 인스턴스를 선택하여 실행하거나 관리할 수 있습니다.", type="body")
        instance_layout.addWidget(instance_desc)
        
        # 인스턴스 목록
        self.instance_list = QListWidget()
        self.instance_list.itemDoubleClicked.connect(self.select_instance)
        self.instance_list.itemClicked.connect(self.on_workflow_clicked)
        self.instance_list.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.instance_list.customContextMenuRequested.connect(self.show_workflow_context_menu)
        instance_layout.addWidget(self.instance_list)
        
        # 인스턴스 관련 버튼
        instance_buttons = QHBoxLayout()
        self.run_btn = OvisButton("실행", icon_name="play")
        self.run_btn.clicked.connect(self.run_selected_workflow)
        instance_buttons.addWidget(self.run_btn)
        
        self.delete_btn = OvisButton("삭제", button_type="danger", icon_name="delete")
        self.delete_btn.clicked.connect(self.delete_selected_workflow)
        instance_buttons.addWidget(self.delete_btn)
        
        instance_buttons.addStretch(1)
        
        # 새로고침 버튼
        self.refresh_btn = OvisButton("새로고침", button_type="secondary", icon_name="refresh")
        self.refresh_btn.clicked.connect(self.refresh_lists)
        instance_buttons.addWidget(self.refresh_btn)
        
        instance_layout.addLayout(instance_buttons)
        instance_card.layout.addLayout(instance_layout)
        layout.addWidget(instance_card)
        
        # 초기 데이터 로드
        self.refresh_lists()
        
    def refresh_lists(self):
        """템플릿과 인스턴스 목록 새로고침"""
        # 템플릿 목록 새로고침
        self.template_list.clear()
        for template in self.workflow_manager.get_templates():
            item = QListWidgetItem(f"{template['name']}")
            item.setData(Qt.ItemDataRole.UserRole, template['id'])
            item.setToolTip(template['description'])
            self.template_list.addItem(item)
            
        # 인스턴스 목록 새로고침
        self.instance_list.clear()
        for instance in self.workflow_manager.get_instances():
            status_icon = "✅" if instance["status"] == "completed" else "⏳" if instance["status"] == "running" else "❌" if instance["status"] == "failed" else "⏸️"
            item = QListWidgetItem(f"{status_icon} {instance['name']}")
            item.setData(Qt.ItemDataRole.UserRole, instance['id'])
            self.instance_list.addItem(item)
            
        # 버튼 상태 초기화
        self.create_btn.setEnabled(False)
        self.run_btn.setEnabled(False)
        self.delete_btn.setEnabled(False)
        self.selected_workflow_id = None
    
    def create_from_template(self, item):
        """템플릿 항목 더블클릭 시 처리"""
        template_id = item.data(Qt.ItemDataRole.UserRole)
        self.create_workflow_from_template(template_id)
    
    def create_from_selected_template(self):
        """템플릿으로 생성 버튼 클릭 시 처리"""
        selected_items = self.template_list.selectedItems()
        if not selected_items:
            QMessageBox.warning(self, "선택 오류", "템플릿을 선택해주세요.")
            return
            
        template_id = selected_items[0].data(Qt.ItemDataRole.UserRole)
        self.create_workflow_from_template(template_id)
    
    def create_workflow_from_template(self, template_id):
        """템플릿으로부터 워크플로우 생성"""
        try:
            workflow = self.workflow_manager.create_workflow_from_template(template_id)
            self.refresh_lists()
            QMessageBox.information(self, "워크플로우 생성", f"'{workflow.name}' 워크플로우가 생성되었습니다.")
        except Exception as e:
            QMessageBox.critical(self, "오류", f"워크플로우 생성 실패: {e}")
    
    def select_instance(self, item):
        """인스턴스 항목 더블클릭 시 처리"""
        workflow_id = item.data(Qt.ItemDataRole.UserRole)
        self.workflowSelected.emit(workflow_id)
    
    def run_selected_workflow(self):
        """선택된 워크플로우 실행"""
        selected_items = self.instance_list.selectedItems()
        if not selected_items:
            QMessageBox.warning(self, "선택 오류", "실행할 워크플로우를 선택해주세요.")
            return
            
        workflow_id = selected_items[0].data(Qt.ItemDataRole.UserRole)
        workflow = self.workflow_manager.load_workflow_instance(workflow_id)
        
        if not workflow:
            QMessageBox.critical(self, "오류", "워크플로우를 로드할 수 없습니다.")
            return
            
        if workflow.status == "running":
            QMessageBox.warning(self, "실행 중", "이미 실행 중인 워크플로우입니다.")
            return
            
        # 실행 전 상태 초기화
        workflow.status = "pending"
        for task in workflow.tasks:
            task.status = "pending"
            task.result = None
            task.error = None
            task.start_time = None
            task.end_time = None
        
        self.workflowStarted.emit(workflow)
    
    def delete_selected_workflow(self):
        """선택된 워크플로우 삭제"""
        selected_items = self.instance_list.selectedItems()
        if not selected_items:
            QMessageBox.warning(self, "선택 오류", "삭제할 워크플로우를 선택해주세요.")
            return
            
        workflow_id = selected_items[0].data(Qt.ItemDataRole.UserRole)
        
        # 삭제 확인
        reply = QMessageBox.question(
            self, 
            "워크플로우 삭제", 
            "정말 이 워크플로우를 삭제하시겠습니까?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            if self.workflow_manager.delete_workflow_instance(workflow_id):
                self.refresh_lists()
                QMessageBox.information(self, "삭제 완료", "워크플로우가 삭제되었습니다.")
            else:
                QMessageBox.critical(self, "삭제 실패", "워크플로우 삭제 중 오류가 발생했습니다.")
    
    def on_template_clicked(self, item):
        """템플릿 항목 클릭 처리"""
        template_id = item.data(Qt.ItemDataRole.UserRole)
        self.create_btn.setEnabled(True)
        
    def on_workflow_clicked(self, item):
        """워크플로우 항목 클릭 처리"""
        workflow_id = item.data(Qt.ItemDataRole.UserRole)
        self.selected_workflow_id = workflow_id
        
        # 워크플로우 선택 시그널 발생
        self.workflowSelected.emit(workflow_id)
        
        # 버튼 활성화
        self.run_btn.setEnabled(True)
        self.delete_btn.setEnabled(True)
    
    def show_template_context_menu(self, pos):
        """템플릿 컨텍스트 메뉴 표시"""
        selected_items = self.template_list.selectedItems()
        if not selected_items:
            return
            
        menu = QMenu(self)
        create_action = QAction("워크플로우 생성", self)
        create_action.triggered.connect(self.create_from_selected_template)
        menu.addAction(create_action)
        
        menu.exec(self.template_list.mapToGlobal(pos))
    
    def show_workflow_context_menu(self, pos):
        """워크플로우 컨텍스트 메뉴 표시"""
        selected_items = self.instance_list.selectedItems()
        if not selected_items:
            return
            
        menu = QMenu(self)
        
        run_action = QAction("실행", self)
        run_action.triggered.connect(self.run_selected_workflow)
        menu.addAction(run_action)
        
        delete_action = QAction("삭제", self)
        delete_action.triggered.connect(self.delete_selected_workflow)
        menu.addAction(delete_action)
        
        menu.exec(self.instance_list.mapToGlobal(pos)) 