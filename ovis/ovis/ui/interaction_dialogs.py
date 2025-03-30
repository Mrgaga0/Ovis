#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
사용자 상호작용 다이얼로그 모듈
"""

import asyncio
import logging
from typing import Dict, Any, Optional, Union, List

from PyQt6.QtCore import Qt, QEventLoop
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QCheckBox, QApplication
)

from ovis.ui.components import OvisStyle, OvisButton, OvisLabel, OvisCard, OvisTextArea

logger = logging.getLogger(__name__)

class CheckboxListDialog(QDialog):
    """체크박스 목록 선택 대화상자"""
    
    def __init__(self, title: str, items: List[str], parent=None):
        super().__init__(parent)
        
        # 다이얼로그 설정
        self.setWindowTitle(title)
        self.setMinimumWidth(400)
        self.setMinimumHeight(300)
        
        # 레이아웃 설정
        self.layout = QVBoxLayout(self)
        
        # 안내 라벨
        self.label = OvisLabel("항목을 선택하세요:", size=OvisStyle.FONT_MEDIUM)
        self.layout.addWidget(self.label)
        
        # 체크박스 목록
        self.checkboxes = []
        for item in items:
            checkbox = QCheckBox(item)
            checkbox.setStyleSheet(f"""
                QCheckBox {{
                    font-size: {OvisStyle.Sizes.FONT_MEDIUM}px;
                    padding: {OvisStyle.Sizes.PADDING_SMALL}px;
                }}
                
                QCheckBox::indicator {{
                    width: 18px;
                    height: 18px;
                }}
                
                QCheckBox::indicator:unchecked {{
                    border: 1px solid {OvisStyle.Colors.BORDER};
                    background: {OvisStyle.Colors.BACKGROUND};
                }}
                
                QCheckBox::indicator:checked {{
                    border: 1px solid {OvisStyle.Colors.PRIMARY};
                    background: {OvisStyle.Colors.PRIMARY};
                }}
            """)
            self.checkboxes.append(checkbox)
            self.layout.addWidget(checkbox)
        
        # 버튼 레이아웃
        button_layout = QHBoxLayout()
        
        # 취소 버튼
        self.cancel_button = OvisButton("취소", button_type="secondary")
        self.cancel_button.clicked.connect(self.reject)
        button_layout.addWidget(self.cancel_button)
        
        # 확인 버튼
        self.ok_button = OvisButton("확인")
        self.ok_button.clicked.connect(self.accept)
        button_layout.addWidget(self.ok_button)
        
        # 버튼 레이아웃 추가
        self.layout.addLayout(button_layout)
    
    def get_selected_items(self) -> List[str]:
        """선택된 항목 가져오기"""
        result = []
        for i, checkbox in enumerate(self.checkboxes):
            if checkbox.isChecked():
                result.append(checkbox.text())
        return result

class TextEditorDialog(QDialog):
    """텍스트 편집 대화상자"""
    
    def __init__(self, title: str, text: str, parent=None):
        super().__init__(parent)
        
        # 다이얼로그 설정
        self.setWindowTitle(title)
        self.setMinimumWidth(600)
        self.setMinimumHeight(400)
        
        # 레이아웃 설정
        self.layout = QVBoxLayout(self)
        
        # 안내 라벨
        self.label = OvisLabel("텍스트를 편집하세요:", size=OvisStyle.FONT_MEDIUM)
        self.layout.addWidget(self.label)
        
        # 텍스트 편집기
        self.editor = OvisTextArea(self)
        self.editor.setText(text)
        self.editor.setMinimumHeight(200)
        self.layout.addWidget(self.editor)
        
        # 버튼 레이아웃
        button_layout = QHBoxLayout()
        
        # 취소 버튼
        self.cancel_button = OvisButton("취소", button_type="secondary")
        self.cancel_button.clicked.connect(self.reject)
        button_layout.addWidget(self.cancel_button)
        
        # 확인 버튼
        self.ok_button = OvisButton("확인")
        self.ok_button.clicked.connect(self.accept)
        button_layout.addWidget(self.ok_button)
        
        # 버튼 레이아웃 추가
        self.layout.addLayout(button_layout)
    
    def get_edited_text(self) -> str:
        """편집된 텍스트 가져오기"""
        return self.editor.toPlainText()

async def show_interaction_dialog(
    interaction_type: str,
    data: Any,
    title: str = "사용자 입력",
    options: Dict[str, Any] = None
) -> Dict[str, Any]:
    """사용자 상호작용 다이얼로그 표시
    
    Args:
        interaction_type: 상호작용 유형 ('checkbox_list' 또는 'text_editor')
        data: 표시할 데이터
        title: 다이얼로그 제목
        options: 추가 옵션
    
    Returns:
        사용자 입력 결과
    """
    # 옵션 기본값
    if options is None:
        options = {}
    
    # 결과 저장용 변수
    result = {'result': None, 'canceled': False}
    
    # 메인 애플리케이션 인스턴스 가져오기
    app = QApplication.instance()
    if not app:
        logger.error("QApplication 인스턴스를 찾을 수 없습니다.")
        return result
    
    # 이벤트 루프
    loop = QEventLoop()
    
    def on_dialog_finished(dialog_result):
        """다이얼로그 완료 콜백"""
        if dialog_result:
            # 성공적으로 완료됨
            if interaction_type == 'checkbox_list':
                result['result'] = dialog.get_selected_items()
            elif interaction_type == 'text_editor':
                result['result'] = dialog.get_edited_text()
        else:
            # 취소됨
            result['canceled'] = True
        
        # 이벤트 루프 종료
        loop.quit()
    
    # 메인 스레드에서 다이얼로그 생성 및 표시
    def execute_dialog():
        nonlocal dialog
        
        if interaction_type == 'checkbox_list':
            # 체크박스 목록 다이얼로그
            items = data if isinstance(data, list) else []
            dialog = CheckboxListDialog(title, items)
        elif interaction_type == 'text_editor':
            # 텍스트 편집기 다이얼로그
            text = str(data) if data is not None else ""
            dialog = TextEditorDialog(title, text)
        else:
            logger.error(f"지원되지 않는 상호작용 유형: {interaction_type}")
            result['error'] = f"지원되지 않는 상호작용 유형: {interaction_type}"
            loop.quit()
            return
        
        # 다이얼로그 완료 이벤트 연결
        dialog.finished.connect(on_dialog_finished)
        
        # 다이얼로그 표시
        dialog.show()
    
    # 다이얼로그 변수
    dialog = None
    
    # 메인 스레드에서 다이얼로그 실행
    app.callEvent(execute_dialog)
    
    # 다이얼로그가 완료될 때까지 대기
    await asyncio.to_thread(loop.exec)
    
    return result 