#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis 메인 창 UI
"""

import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any

from PyQt6.QtCore import (
    Qt, QSize, QPoint, QTimer, pyqtSignal, pyqtSlot, QUrl
)
from PyQt6.QtGui import (
    QFont, QIcon, QPixmap, QAction, QColor, QPainter, QPainterPath,
    QDesktopServices
)
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QPushButton, QVBoxLayout, QHBoxLayout,
    QStackedWidget, QTabWidget, QScrollArea, QFrame, QSplitter, QToolBar, QStatusBar,
    QMenuBar, QMenu, QToolButton, QFileDialog, QLineEdit, QMessageBox, QSizePolicy, QGridLayout,
    QTabBar
)

from ovis.ui.components import (
    OvisStyle, OvisButton, OvisIconButton, OvisLabel, OvisTextField,
    OvisTextArea, OvisCard, OvisSwitch, OvisLoadingIndicator
)

# 워크플로우 UI 구성요소
from ovis.workflow.engine import Workflow, Task, WorkflowEngine
from ovis.ui.workflow.workflow_view import WorkflowView
from ovis.ui.workflow.workflow_editor import WorkflowEditor
from ovis.ui.workflow.workflow_runner import WorkflowRunner

import logging


class SidebarPanel(QWidget):
    """사이드바 패널 위젯"""
    
    itemClicked = pyqtSignal(int)  # 항목 클릭 시그널
    
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        
        # 사이드바 스타일
        self.setObjectName("sidebarPanel")
        self.setStyleSheet(f"""
            #sidebarPanel {{
                background-color: {OvisStyle.Colors.BACKGROUND_DARK};
                border-right: 1px solid {OvisStyle.Colors.BORDER};
            }}
            
            .SidebarItem {{
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                padding: {OvisStyle.Sizes.PADDING_MEDIUM}px;
                font-weight: bold;
                text-align: left;
            }}
            
            .SidebarItem[active="true"] {{
                background-color: {OvisStyle.Colors.PRIMARY};
                color: {OvisStyle.Colors.TEXT_ON_PRIMARY};
            }}
            
            .SidebarItem[active="false"] {{
                background-color: transparent;
                color: {OvisStyle.Colors.TEXT_PRIMARY};
            }}
            
            .SidebarItem[active="false"]:hover {{
                background-color: {OvisStyle.Colors.HOVER};
            }}
        """)
        
        # 레이아웃 설정
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(
            OvisStyle.Sizes.PADDING_MEDIUM,
            OvisStyle.Sizes.PADDING_LARGE,
            OvisStyle.Sizes.PADDING_MEDIUM,
            OvisStyle.Sizes.PADDING_LARGE
        )
        self.layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        # 로고 영역
        self.logo_layout = QHBoxLayout()
        self.logo_label = OvisLabel("OVIS", self, "title")
        self.logo_label.setStyleSheet(f"font-size: {OvisStyle.Sizes.FONT_XLARGE}px; font-weight: bold;")
        self.logo_layout.addWidget(self.logo_label)
        self.layout.addLayout(self.logo_layout)
        
        # 메뉴 구분선
        self.layout.addSpacing(OvisStyle.Sizes.PADDING_LARGE)
        
        # 네비게이션 아이템 추가
        self.nav_items = []
        self.add_nav_item("대시보드", 0)
        self.add_nav_item("워크플로우", 1)
        self.add_nav_item("뉴스 관리", 2)
        self.add_nav_item("콘텐츠 제작", 3)
        self.add_nav_item("채팅", 4)
        
        # 스페이서 추가 (나머지 공간 채우기)
        self.layout.addStretch(1)
        
        # 설정 메뉴
        self.add_nav_item("설정", 5)
        
        # 다크모드 토글
        self.theme_layout = QHBoxLayout()
        self.theme_label = OvisLabel("다크 모드", self, "body")
        self.theme_switch = OvisSwitch(self)
        self.theme_layout.addWidget(self.theme_label)
        self.theme_layout.addStretch(1)
        self.theme_layout.addWidget(self.theme_switch)
        self.layout.addLayout(self.theme_layout)
        
        # 버전 정보
        self.version_label = OvisLabel("v0.1.0", self, "caption")
        self.version_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.layout.addWidget(self.version_label)
        
        # 현재 활성화된 아이템
        self.active_item = 0
        self.set_active_item(self.active_item)
    
    def add_nav_item(self, text: str, item_id: int):
        """네비게이션 아이템 추가"""
        item = QPushButton(text, self)
        item.setProperty("active", "false")
        item.setProperty("itemId", item_id)
        item.setProperty("class", "SidebarItem")
        item.setCursor(Qt.CursorShape.PointingHandCursor)
        item.clicked.connect(lambda: self.handle_item_click(item_id))
        
        # 아이템 추가
        self.layout.addWidget(item)
        self.nav_items.append(item)
    
    def handle_item_click(self, item_id: int):
        """아이템 클릭 처리"""
        self.set_active_item(item_id)
        self.itemClicked.emit(item_id)
    
    def set_active_item(self, item_id: int):
        """활성 아이템 설정"""
        self.active_item = item_id
        
        for item in self.nav_items:
            if item.property("itemId") == item_id:
                item.setProperty("active", "true")
            else:
                item.setProperty("active", "false")
            
            # 스타일 업데이트를 위해 스타일시트 다시 적용
            item.setStyle(item.style())


class MainContentArea(QWidget):
    """메인 컨텐츠 영역 위젯"""
    
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        
        # 메인 컨텐츠 스타일
        self.setObjectName("mainContentArea")
        self.setStyleSheet(f"""
            #mainContentArea {{
                background-color: {OvisStyle.Colors.BACKGROUND};
            }}
        """)
        
        # 메인 레이아웃
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)
        
        # 탭 위젯
        self.tab_widget = QTabWidget(self)
        self.tab_widget.setTabsClosable(True)
        self.tab_widget.setMovable(True)
        self.tab_widget.setStyleSheet(f"""
            QTabWidget::pane {{
                border: none;
            }}
            
            QTabBar::tab {{
                background: {OvisStyle.Colors.BACKGROUND_DARK};
                color: {OvisStyle.Colors.TEXT_PRIMARY};
                border: none;
                padding: {OvisStyle.Sizes.PADDING_MEDIUM}px;
                margin-right: 2px;
            }}
            
            QTabBar::tab:selected {{
                background: {OvisStyle.Colors.PRIMARY};
                color: {OvisStyle.Colors.TEXT_ON_PRIMARY};
            }}
            
            QTabBar::tab:hover:!selected {{
                background: {OvisStyle.Colors.HOVER};
            }}
            
            QTabBar::close-button {{
                image: url('resources/icons/close.png');
                subcontrol-position: right;
            }}
            
            QTabBar::close-button:hover {{
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
            }}
        """)
        
        # 대시보드 탭 추가
        self.dashboard_tab = self.create_dashboard_tab()
        self.tab_widget.addTab(self.dashboard_tab, "대시보드")
        
        # 레이아웃에 탭 위젯 추가
        self.layout.addWidget(self.tab_widget)
    
    def create_dashboard_tab(self) -> QWidget:
        """대시보드 탭 생성"""
        dashboard = QWidget()
        layout = QVBoxLayout(dashboard)
        layout.setContentsMargins(
            OvisStyle.Sizes.PADDING_LARGE,
            OvisStyle.Sizes.PADDING_LARGE,
            OvisStyle.Sizes.PADDING_LARGE,
            OvisStyle.Sizes.PADDING_LARGE
        )
        layout.setSpacing(OvisStyle.Sizes.PADDING_LARGE)
        
        # 환영 타이틀
        welcome_label = OvisLabel("안녕하세요, 오비스에 오신 것을 환영합니다!", dashboard, "title")
        layout.addWidget(welcome_label)
        
        # 카드 그리드 레이아웃
        grid_layout = QHBoxLayout()
        grid_layout.setSpacing(OvisStyle.Sizes.PADDING_LARGE)
        
        # 활성 워크플로우 카드
        workflow_card = OvisCard(dashboard, "활성 워크플로우", 2)
        workflow_layout = QVBoxLayout()
        workflow_layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        workflow_count = OvisLabel("3개의 워크플로우 실행 중", workflow_card, "subtitle")
        workflow_list = OvisLabel("• 뉴스 모니터링\n• 콘텐츠 요약\n• 소셜 미디어 포스팅", workflow_card, "body")
        
        workflow_card.add_widget(workflow_count)
        workflow_card.add_widget(workflow_list)
        grid_layout.addWidget(workflow_card, 1)
        
        # 뉴스 통계 카드
        news_card = OvisCard(dashboard, "뉴스 통계", 2)
        news_layout = QVBoxLayout()
        news_layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        news_count = OvisLabel("오늘 수집된 뉴스: 127개", news_card, "subtitle")
        news_stats = OvisLabel("• 기술 분야: 45개\n• 비즈니스: 32개\n• 국제: 50개", news_card, "body")
        
        news_card.add_widget(news_count)
        news_card.add_widget(news_stats)
        grid_layout.addWidget(news_card, 1)
        
        # 시스템 상태 카드
        system_card = OvisCard(dashboard, "시스템 상태", 2)
        system_layout = QVBoxLayout()
        system_layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        system_status = OvisLabel("모든 서비스 정상 작동 중", system_card, "subtitle")
        system_stats = OvisLabel("• CPU 사용량: 23%\n• 메모리 사용량: 1.2GB\n• 디스크 공간: 45.6GB 사용 가능", system_card, "body")
        
        system_card.add_widget(system_status)
        system_card.add_widget(system_stats)
        grid_layout.addWidget(system_card, 1)
        
        # 그리드 레이아웃 추가
        layout.addLayout(grid_layout)
        
        # 최근 활동 카드
        activity_card = OvisCard(dashboard, "최근 활동", 2)
        activity_layout = QVBoxLayout()
        activity_layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        activities = [
            "10:45 - 뉴스 모니터링에서 15개의 새 기사를 발견했습니다.",
            "09:30 - 콘텐츠 요약 워크플로우가 3개의 문서를 처리했습니다.",
            "09:15 - 소셜 미디어 포스팅이 자동으로 예약되었습니다.",
            "08:00 - 시스템이 정상적으로 시작되었습니다."
        ]
        
        for activity in activities:
            activity_label = OvisLabel(activity, activity_card, "body")
            activity_card.add_widget(activity_label)
        
        layout.addWidget(activity_card)
        
        # 나머지 공간 채우기
        layout.addStretch(1)
        
        return dashboard


class MainWindow(QMainWindow):
    """메인 애플리케이션 윈도우"""
    
    def __init__(self, config_manager=None, prompt_manager=None, workflow_manager=None):
        super().__init__()
        
        # 매니저 초기화
        self.config_manager = config_manager
        self.prompt_manager = prompt_manager
        self.workflow_manager = workflow_manager
        
        # 로거 설정
        self.logger = logging.getLogger(__name__)
        
        # UI 초기화
        self.setWindowTitle("Ovis AI Assistant")
        self.resize(1200, 800)
        
        # 메인 UI 구성
        self.init_ui()
        
        # 워크플로우 시스템 설정 (있는 경우)
        if self.workflow_manager:
            self.setup_workflow_system()
            
        # 기본 상태 표시
        self.statusBar().showMessage("준비됨")
        
    def init_ui(self):
        """메인 UI 구성"""
        # 스타일 적용
        self._theme_dark = True
        
        # 메인 위젯 설정
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        
        # 메인 레이아웃
        self.main_layout = QHBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)
        
        # 사이드바 생성
        self.sidebar = SidebarPanel(self)
        self.sidebar.itemClicked.connect(self.handle_sidebar_item_click)
        
        # 네비게이션 항목 추가
        self.sidebar.add_nav_item("대시보드", 0)
        self.sidebar.add_nav_item("워크플로우", 1)
        self.sidebar.add_nav_item("설정", 2)
        
        # 활성 항목 설정
        self.sidebar.set_active_item(0)
        
        # 메인 컨텐츠 영역
        self.content_area = MainContentArea(self)
        
        # 메인 레이아웃에 위젯 추가
        self.main_layout.addWidget(self.sidebar)
        self.main_layout.addWidget(self.content_area)
        
        # 메인 레이아웃 비율 설정
        self.main_layout.setStretch(0, 1)
        self.main_layout.setStretch(1, 4)
        
        # 메뉴바 생성
        self.create_menu_bar()
        
        # 워크플로우 컴포넌트 초기화
        self.setup_workflow_system()
        
        # 컨텐츠 위젯 생성
        self.create_content_widgets()
        
    def setup_workflow_system(self):
        """워크플로우 시스템 초기화"""
        from ovis.workflow import WorkflowEngine, WorkflowManager, register_default_handlers
        
        # 워크플로우 엔진 생성 및 핸들러 등록
        self.workflow_engine = WorkflowEngine()
        register_default_handlers(self.workflow_engine)
        
        # 워크플로우 매니저가 이미 전달된 경우 사용, 아니면 새로 생성
        if not hasattr(self, 'workflow_manager') or self.workflow_manager is None:
            from ovis.core.config_manager import ConfigManager
            config_manager = ConfigManager()
            self.workflow_manager = WorkflowManager(config_manager)
            self.workflow_manager.engine = self.workflow_engine
        
        # 워크플로우 관련 UI 생성
        self.create_workflow_widgets()
        
        # 샘플 워크플로우 로드
        self.load_sample_workflows()
        
    def create_content_widgets(self):
        """컨텐츠 영역 위젯 생성"""
        # 대시보드 위젯 생성
        self.dashboard_widget = self.create_dashboard_widget()
        
        # 위젯을 컨텐츠 영역에 추가
        self.content_area.tab_widget.addTab(self.dashboard_widget, "대시보드")
    
    def create_workflow_widgets(self):
        """워크플로우 위젯 생성"""
        from ovis.ui.workflow import WorkflowView, WorkflowEditor, WorkflowRunner
        
        # 워크플로우 컨테이너 위젯
        self.workflow_container = QWidget()
        workflow_layout = QVBoxLayout(self.workflow_container)
        workflow_layout.setContentsMargins(0, 0, 0, 0)
        
        # 워크플로우 탭 위젯
        self.workflow_tabs = QTabWidget()
        self.workflow_tabs.setTabsClosable(True)
        self.workflow_tabs.tabCloseRequested.connect(self.close_tab)
        
        # 워크플로우 뷰 (메인 탭)
        self.workflow_view = WorkflowView()
        self.workflow_view.workflow_selected.connect(self.handle_workflow_selected)
        self.workflow_view.run_workflow.connect(self.run_workflow)
        self.workflow_view.edit_workflow.connect(self.edit_workflow)
        self.workflow_view.create_workflow.connect(self.create_workflow)
        self.workflow_view.refresh_workflows.connect(self.refresh_workflows)
        
        # 워크플로우 탭에 뷰 추가
        self.workflow_tabs.addTab(self.workflow_view, "워크플로우 목록")
        
        # 탭 닫기 버튼 숨기기 (첫 번째 탭은 항상 표시)
        self.workflow_tabs.tabBar().setTabButton(0, QTabBar.ButtonPosition.RightSide, None)
        
        workflow_layout.addWidget(self.workflow_tabs)
        
        # 컨텐츠 영역에 워크플로우 컨테이너 추가
        self.content_area.tab_widget.addTab(self.workflow_container, "워크플로우")
    
    def load_sample_workflows(self):
        """샘플 워크플로우 로드"""
        try:
            # 워크플로우 엔진에서 가져오기
            self.workflows = self.workflow_engine.get_workflows()
            
            if not self.workflows:
                # 샘플 워크플로우 등록
                from pathlib import Path
                import yaml
                
                sample_dir = Path(__file__).parent.parent.parent / "samples" / "workflows"
                if sample_dir.exists():
                    for wf_file in sample_dir.glob("*.yaml"):
                        try:
                            with open(wf_file, "r", encoding="utf-8") as f:
                                wf_data = yaml.safe_load(f)
                                self.workflow_engine.create_workflow_from_dict(wf_data)
                        except Exception as e:
                            logging.error(f"워크플로우 로드 오류 ({wf_file}): {e}")
                
                # 다시 워크플로우 가져오기
                self.workflows = self.workflow_engine.get_workflows()
            
            # 워크플로우 뷰 업데이트
            self.workflow_view.set_workflows(self.workflows)
            
        except Exception as e:
            logging.error(f"워크플로우 로드 오류: {e}")
            
    def handle_workflow_selected(self, workflow_id):
        """워크플로우 선택 처리"""
        # 선택된 워크플로우 저장
        self.selected_workflow_id = workflow_id
    
    def handle_sidebar_item_click(self, item_id: int):
        """사이드바 항목 클릭 처리"""
        self.content_area.tab_widget.setCurrentIndex(item_id)
        
        # 항목에 따라 추가 처리
        if item_id == 1:  # 워크플로우
            # 워크플로우 목록 새로고침
            self.refresh_workflows()
    
    def find_tab_index(self, tab_title: str) -> int:
        """탭 제목으로 인덱스 찾기"""
        for i in range(self.workflow_tabs.count()):
            if self.workflow_tabs.tabText(i) == tab_title:
                return i
        return -1
    
    def add_tab(self, widget: QWidget, title: str):
        """워크플로우 탭 추가"""
        index = self.workflow_tabs.addTab(widget, title)
        self.workflow_tabs.setCurrentIndex(index)
    
    def close_tab(self, index: int):
        """탭 닫기"""
        # 첫 번째 탭(목록)은 닫을 수 없음
        if index == 0:
            return
            
        # 탭 위젯 가져오기
        widget = self.workflow_tabs.widget(index)
        
        # 탭 제거
        self.workflow_tabs.removeTab(index)
        
        # 위젯 메모리 해제
        if widget:
            widget.deleteLater()
    
    def run_workflow(self, workflow_id):
        """워크플로우 실행"""
        # 워크플로우 인스턴스 로드
        workflow = self.workflow_manager.load_workflow_instance(workflow_id)
        
        if not workflow:
            self.show_error_message("워크플로우 실행 오류", "워크플로우를 로드할 수 없습니다.")
            return
        
        # 워크플로우 러너 생성
        runner = WorkflowRunner()
        runner.set_workflow(workflow, self.workflow_manager.engine)
        
        # 메인 윈도우의 중앙 위젯으로 설정
        self.setCentralWidget(runner)
        
        # 러너 이벤트 연결
        runner.finished.connect(self.on_workflow_runner_finished)
        runner.error.connect(self.on_workflow_runner_error)
    
    def edit_workflow(self, workflow_id):
        """워크플로우 편집"""
        from ovis.ui.workflow import WorkflowEditor
        
        # 워크플로우 찾기
        workflow = next((wf for wf in self.workflows if wf.id == workflow_id), None)
        if not workflow:
            return
            
        # 편집기 탭 제목
        tab_title = f"편집: {workflow.name}"
        
        # 이미 열린 탭이 있는지 확인
        for i in range(self.workflow_tabs.count()):
            widget = self.workflow_tabs.widget(i)
            if isinstance(widget, WorkflowEditor) and widget.workflow_id == workflow_id:
                self.workflow_tabs.setCurrentIndex(i)
                return
        
        # 새 워크플로우 편집기 생성
        editor = WorkflowEditor()
        editor.save_workflow.connect(self.save_workflow)
        editor.test_workflow.connect(self.test_workflow)
        
        # 워크플로우 설정
        editor.set_workflow(workflow_id, workflow, self.workflow_engine)
        
        # 탭에 추가
        self.add_tab(editor, tab_title)
    
    def create_workflow(self):
        """새 워크플로우 생성"""
        from ovis.ui.workflow import WorkflowEditor
        
        # 새 워크플로우 편집기 생성
        editor = WorkflowEditor()
        editor.save_workflow.connect(self.save_workflow)
        editor.test_workflow.connect(self.test_workflow)
        
        # 워크플로우 생성
        editor.create_new_workflow()
        
        # 탭에 추가
        self.add_tab(editor, "새 워크플로우")
    
    def save_workflow(self, workflow_id, workflow):
        """워크플로우 저장"""
        try:
            # 워크플로우 엔진에 저장
            self.workflow_engine.update_workflow(workflow)
            
            # 워크플로우 목록 갱신
            self.workflows = self.workflow_engine.get_workflows()
            self.workflow_view.set_workflows(self.workflows)
            
            # 탭 제목 업데이트
            for i in range(self.workflow_tabs.count()):
                if isinstance(self.workflow_tabs.widget(i), WorkflowEditor):
                    editor = self.workflow_tabs.widget(i)
                    if editor.workflow_id == workflow_id:
                        self.workflow_tabs.setTabText(i, f"편집: {workflow.name}")
                        break
                        
            # 성공 메시지
            QMessageBox.information(self, "저장 완료", f"워크플로우 '{workflow.name}'이(가) 저장되었습니다.")
        
        except Exception as e:
            logging.error(f"워크플로우 저장 오류: {e}")
            QMessageBox.warning(self, "저장 오류", f"워크플로우 저장 중 오류가 발생했습니다: {e}")
            
    def test_workflow(self, workflow_id, workflow):
        """워크플로우 테스트"""
        try:
            # 워크플로우 실행 탭 생성
            self.run_workflow(workflow_id)
        except Exception as e:
            logging.error(f"워크플로우 테스트 오류: {e}")
            QMessageBox.warning(self, "테스트 오류", f"워크플로우 테스트 중 오류가 발생했습니다: {e}")
    
    def refresh_workflows(self):
        """워크플로우 목록 새로고침"""
        # 워크플로우 엔진에서 가져오기
        self.workflows = self.workflow_engine.get_workflows()
        self.workflow_view.set_workflows(self.workflows)
    
    def on_workflow_completed(self, workflow):
        """워크플로우 완료 처리"""
        # 상태 표시줄 업데이트
        self.statusBar().showMessage(f"워크플로우 '{workflow.name}' 완료")
        
        # 워크플로우 목록 업데이트
        self.workflow_view.update_workflow(workflow)
    
    def on_workflow_failed(self, workflow, error):
        """워크플로우 실패 처리"""
        # 상태 표시줄 업데이트
        self.statusBar().showMessage(f"워크플로우 '{workflow.name}' 실패: {error}")
        
        # 워크플로우 목록 업데이트
        self.workflow_view.update_workflow(workflow)
        
        # 오류 메시지 표시
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.critical(
            self,
            "워크플로우 실패",
            f"워크플로우 '{workflow.name}'이(가) 실패했습니다.\n\n오류: {error}"
        )
    
    def create_menu_bar(self):
        """메뉴바 생성"""
        menu_bar = self.menuBar()
        
        # 파일 메뉴
        file_menu = menu_bar.addMenu("파일")
        
        new_action = QAction("새 워크플로우", self)
        new_action.setShortcut("Ctrl+N")
        file_menu.addAction(new_action)
        
        open_action = QAction("워크플로우 열기", self)
        open_action.setShortcut("Ctrl+O")
        file_menu.addAction(open_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("종료", self)
        exit_action.setShortcut("Alt+F4")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 편집 메뉴
        edit_menu = menu_bar.addMenu("편집")
        
        preferences_action = QAction("환경설정", self)
        preferences_action.setShortcut("Ctrl+,")
        edit_menu.addAction(preferences_action)
        
        # 보기 메뉴
        view_menu = menu_bar.addMenu("보기")
        
        sidebar_action = QAction("사이드바 토글", self)
        sidebar_action.setShortcut("Ctrl+B")
        view_menu.addAction(sidebar_action)
        
        # 도움말 메뉴
        help_menu = menu_bar.addMenu("도움말")
        
        about_action = QAction("Ovis 정보", self)
        help_menu.addAction(about_action)
        
        docs_action = QAction("문서", self)
        help_menu.addAction(docs_action)
    
    def toggle_theme(self, is_dark: bool):
        """테마 전환"""
        # TODO: 다크 모드 구현
        theme = "다크" if is_dark else "라이트"
        self.statusBar().showMessage(f"{theme} 테마로 변경했습니다.")

    def create_dashboard_widget(self):
        """대시보드 위젯 생성"""
        dashboard = QWidget()
        layout = QVBoxLayout(dashboard)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # 환영 카드
        welcome_card = OvisCard()
        welcome_layout = QVBoxLayout(welcome_card)
        welcome_layout.setContentsMargins(15, 15, 15, 15)
        
        welcome_title = OvisLabel("Ovis에 오신 것을 환영합니다", size=OvisStyle.FONT_XLARGE)
        welcome_layout.addWidget(welcome_title)
        
        welcome_text = OvisLabel(
            "Ovis는 AI 기반 워크플로우 자동화 시스템입니다. "
            "다양한 AI 기능을 활용하여 복잡한 작업을 자동화하고 관리할 수 있습니다.",
            size=OvisStyle.FONT_MEDIUM
        )
        welcome_layout.addWidget(welcome_text)
        
        layout.addWidget(welcome_card)
        
        # 빠른 시작 카드
        quickstart_card = OvisCard()
        quickstart_layout = QVBoxLayout(quickstart_card)
        quickstart_layout.setContentsMargins(15, 15, 15, 15)
        
        # 제목
        quickstart_title = OvisLabel("빠른 시작", size=OvisStyle.FONT_LARGE)
        quickstart_layout.addWidget(quickstart_title)
        
        # 버튼 그리드
        button_grid = QGridLayout()
        button_grid.setSpacing(10)
        
        # 워크플로우 버튼
        workflow_button = OvisButton("워크플로우 관리", icon_name="list")
        workflow_button.clicked.connect(lambda: self.handle_sidebar_item_click(1))
        button_grid.addWidget(workflow_button, 0, 0)
        
        # 설정 버튼
        settings_button = OvisButton("설정", icon_name="settings", button_type="secondary")
        settings_button.clicked.connect(lambda: self.handle_sidebar_item_click(2))
        button_grid.addWidget(settings_button, 0, 1)
        
        # 새 워크플로우 버튼
        new_workflow_button = OvisButton("새 워크플로우 만들기", icon_name="plus")
        new_workflow_button.clicked.connect(self.create_workflow)
        button_grid.addWidget(new_workflow_button, 1, 0)
        
        # 도움말 버튼
        help_button = OvisButton("도움말", icon_name="help", button_type="secondary")
        help_button.clicked.connect(lambda: QDesktopServices.openUrl(QUrl("https://github.com/yourusername/ovis")))
        button_grid.addWidget(help_button, 1, 1)
        
        quickstart_layout.addLayout(button_grid)
        layout.addWidget(quickstart_card)
        
        # 최근 워크플로우 카드
        recent_card = OvisCard()
        recent_layout = QVBoxLayout(recent_card)
        recent_layout.setContentsMargins(15, 15, 15, 15)
        
        # 제목
        recent_title = OvisLabel("워크플로우", size=OvisStyle.FONT_LARGE)
        recent_layout.addWidget(recent_title)
        
        if hasattr(self, 'workflows') and self.workflows:
            for workflow in self.workflows[:3]:  # 최대 3개만 표시
                workflow_item = QWidget()
                item_layout = QHBoxLayout(workflow_item)
                item_layout.setContentsMargins(0, 0, 0, 0)
                
                name_label = OvisLabel(workflow.name, size=OvisStyle.FONT_MEDIUM)
                item_layout.addWidget(name_label)
                
                item_layout.addStretch(1)
                
                run_button = OvisButton("실행", icon_name="play", button_type="secondary")
                run_button.clicked.connect(lambda checked=False, w=workflow: self.run_workflow(w.id))
                item_layout.addWidget(run_button)
                
                edit_button = OvisButton("편집", icon_name="edit", button_type="secondary")
                edit_button.clicked.connect(lambda checked=False, w=workflow: self.edit_workflow(w.id))
                item_layout.addWidget(edit_button)
                
                recent_layout.addWidget(workflow_item)
        else:
            no_workflows = OvisLabel("워크플로우가 없습니다. 새 워크플로우를 만들어보세요.", size=OvisStyle.FONT_MEDIUM)
            recent_layout.addWidget(no_workflows)
            
            # 샘플 워크플로우 생성 버튼
            from ovis.workflow import create_sample_workflow
            sample_button = OvisButton("샘플 워크플로우 생성", icon_name="plus")
            sample_button.clicked.connect(self._create_sample_workflow)
            recent_layout.addWidget(sample_button)
        
        layout.addWidget(recent_card)
        
        # 시스템 상태 카드
        status_card = OvisCard()
        status_layout = QVBoxLayout(status_card)
        status_layout.setContentsMargins(15, 15, 15, 15)
        
        # 제목
        status_title = OvisLabel("시스템 상태", size=OvisStyle.FONT_LARGE)
        status_layout.addWidget(status_title)
        
        # API 키 상태
        from ovis.core.config_manager import ConfigManager
        config = ConfigManager().get_config()
        
        api_key_msg = "API 키가 설정되지 않았습니다. 설정에서 API 키를 구성하세요."
        api_key_color = OvisStyle.STATUS_COLOR_FAILED
        
        if config.get("api_keys", {}).get("openai"):
            api_key_msg = "OpenAI API 키가 설정되었습니다."
            api_key_color = OvisStyle.STATUS_COLOR_COMPLETED
        
        api_key_label = OvisLabel(api_key_msg, size=OvisStyle.FONT_MEDIUM)
        api_key_label.setStyleSheet(f"color: {api_key_color};")
        status_layout.addWidget(api_key_label)
        
        layout.addWidget(status_card)
        
        # 여백 추가
        layout.addStretch(1)
        
        return dashboard
        
    def _create_sample_workflow(self):
        """샘플 워크플로우 생성"""
        from ovis.workflow import create_sample_workflow
        
        # 샘플 워크플로우 생성
        workflow = create_sample_workflow()
        
        # 워크플로우 목록에 추가
        if not hasattr(self, 'workflows'):
            self.workflows = []
        
        self.workflows.append(workflow)
        
        # 워크플로우 편집기 열기
        self.edit_workflow(workflow.id)
        
        # 상태 표시줄 업데이트
        self.statusBar().showMessage("샘플 워크플로우가 생성되었습니다.")

    def show_error_message(self, title, message):
        """오류 메시지 표시"""
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.critical(self, title, message)
        
    def show_info_message(self, title, message):
        """정보 메시지 표시"""
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.information(self, title, message)

    def on_workflow_runner_finished(self):
        """워크플로우 실행 완료 시 처리"""
        # 메인 인터페이스로 복귀
        self.restore_central_widget()
        
        # 워크플로우 목록 새로고침
        self.refresh_workflows()
        
        # 알림 표시
        self.show_info_message("워크플로우 완료", "워크플로우가 성공적으로 완료되었습니다.")

    def on_workflow_runner_error(self, error_message):
        """워크플로우 실행 오류 시 처리"""
        # 메인 인터페이스로 복귀
        self.restore_central_widget()
        
        # 워크플로우 목록 새로고침
        self.refresh_workflows()
        
        # 오류 메시지 표시
        self.show_error_message("워크플로우 오류", f"워크플로우 실행 중 오류가 발생했습니다: {error_message}")

    def restore_central_widget(self):
        """중앙 위젯 복원"""
        self.setCentralWidget(self.main_splitter)


def run_app():
    """애플리케이션 실행"""
    app = QApplication(sys.argv)
    
    # 애플리케이션 스타일 설정
    app.setStyle("Fusion")
    
    # 폰트 설정
    OvisStyle.initialize_fonts()
    
    # 메인 윈도우 생성 및 표시
    window = MainWindow()
    window.show()
    
    # 애플리케이션 실행
    sys.exit(app.exec()) 