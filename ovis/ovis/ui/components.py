#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis UI 공통 컴포넌트
"""

import os
import math
from enum import Enum
from pathlib import Path
from typing import Optional, Callable, List, Union, Dict, Any

from PyQt6.QtCore import (
    Qt, QSize, QPoint, QTimer, pyqtSignal, pyqtProperty, QPropertyAnimation, 
    QEasingCurve, QRect, QRectF
)
from PyQt6.QtGui import (
    QFont, QFontDatabase, QColor, QPainter, QPen, QBrush, QPalette, QPixmap,
    QIcon, QLinearGradient, QCursor, QPainterPath, QAction
)
from PyQt6.QtWidgets import (
    QWidget, QLabel, QPushButton, QLineEdit, QTextEdit, QVBoxLayout, QHBoxLayout,
    QStackedWidget, QScrollArea, QFrame, QMainWindow, QSizePolicy, QSpacerItem,
    QGridLayout, QToolButton, QSlider, QCheckBox, QRadioButton, QTabWidget,
    QMenu, QToolTip, QGraphicsDropShadowEffect, QComboBox, QProgressBar
)


# 크기 및 여백 정의
class _SizesDefinition:
    PADDING_SMALL = 6
    PADDING_MEDIUM = 12
    PADDING_LARGE = 24
    
    MARGIN_SMALL = 6
    MARGIN_MEDIUM = 12
    MARGIN_LARGE = 24
    
    BORDER_RADIUS_SMALL = 4
    BORDER_RADIUS_MEDIUM = 8
    BORDER_RADIUS_LARGE = 12
    
    FONT_SMALL = 10
    FONT_MEDIUM = 12
    FONT_LARGE = 16
    FONT_XLARGE = 20
    
    ICON_SMALL = 16
    ICON_MEDIUM = 24
    ICON_LARGE = 32


# 색상 정의
class _ColorsDefinition:
    PRIMARY = "#4361ee"
    PRIMARY_LIGHT = "#5f78ff"
    PRIMARY_DARK = "#3950d6"
    SECONDARY = "#3a86ff"
    ACCENT = "#36c799"
    WARNING = "#ffa62b"
    ERROR = "#ff5252"
    SUCCESS = "#4ecdc4"
    INFO = "#67baff"
    
    BACKGROUND = "#ffffff"
    BACKGROUND_DARK = "#f1f3f5"
    CARD_BACKGROUND = "#ffffff"
    
    TEXT_PRIMARY = "#2b2d42"
    TEXT_SECONDARY = "#555b6e"
    TEXT_LIGHT = "#8d99ae"
    TEXT_ON_PRIMARY = "#ffffff"
    
    BORDER = "#d8dee9"
    HOVER = "#ebeef2"
    
    # 다크 모드 색상
    DARK_BACKGROUND = "#2b2d42"
    DARK_BACKGROUND_LIGHT = "#3c3f58"
    DARK_CARD_BACKGROUND = "#363853"
    
    DARK_TEXT_PRIMARY = "#f1faee"
    DARK_TEXT_SECONDARY = "#a9b4c4"
    DARK_BORDER = "#4c4f65"
    DARK_HOVER = "#484c69"


class OvisStyle:
    """오비스 UI 스타일 정의"""
    
    # 크기 및 색상 클래스 연결
    Sizes = _SizesDefinition
    Colors = _ColorsDefinition
    
    # 직접 접근용 상수
    FONT_SMALL = _SizesDefinition.FONT_SMALL
    FONT_MEDIUM = _SizesDefinition.FONT_MEDIUM
    FONT_LARGE = _SizesDefinition.FONT_LARGE
    FONT_XLARGE = _SizesDefinition.FONT_XLARGE
    
    # 색상 상수
    PRIMARY_COLOR = _ColorsDefinition.PRIMARY
    PRIMARY_COLOR_LIGHT = _ColorsDefinition.PRIMARY_LIGHT
    PRIMARY_COLOR_DARK = _ColorsDefinition.PRIMARY_DARK
    SECONDARY_COLOR = _ColorsDefinition.SECONDARY
    ACCENT_COLOR = _ColorsDefinition.ACCENT
    WARNING_COLOR = _ColorsDefinition.WARNING
    ERROR_COLOR = _ColorsDefinition.ERROR
    SUCCESS_COLOR = _ColorsDefinition.SUCCESS
    INFO_COLOR = _ColorsDefinition.INFO
    
    # 배경 색상
    BG_COLOR = _ColorsDefinition.BACKGROUND
    BG_COLOR_DARK = _ColorsDefinition.BACKGROUND_DARK
    CARD_BG = _ColorsDefinition.CARD_BACKGROUND
    
    # 텍스트 색상
    TEXT_COLOR = _ColorsDefinition.TEXT_PRIMARY
    TEXT_COLOR_SECONDARY = _ColorsDefinition.TEXT_SECONDARY
    TEXT_COLOR_LIGHT = _ColorsDefinition.TEXT_LIGHT
    TEXT_ON_PRIMARY_COLOR = _ColorsDefinition.TEXT_ON_PRIMARY
    
    # 테두리 및 상호작용 색상
    BORDER_COLOR = _ColorsDefinition.BORDER
    HOVER_COLOR = _ColorsDefinition.HOVER
    
    # 상태 색상
    STATUS_COLOR_PENDING = _ColorsDefinition.INFO
    STATUS_COLOR_RUNNING = _ColorsDefinition.WARNING
    STATUS_COLOR_COMPLETED = _ColorsDefinition.SUCCESS
    STATUS_COLOR_FAILED = _ColorsDefinition.ERROR
    
    # 폰트
    class Fonts:
        # 기본 폰트 설정
        PRIMARY = QFont("Arial", _SizesDefinition.FONT_MEDIUM)
        SECONDARY = QFont("Arial", _SizesDefinition.FONT_MEDIUM)
        
        @staticmethod
        def title():
            font = QFont("Arial", _SizesDefinition.FONT_LARGE)
            font.setBold(True)
            return font
        
        @staticmethod
        def subtitle():
            return QFont("Arial", _SizesDefinition.FONT_MEDIUM)
        
        @staticmethod
        def body():
            return QFont("Arial", _SizesDefinition.FONT_MEDIUM)
        
        @staticmethod
        def caption():
            return QFont("Arial", _SizesDefinition.FONT_SMALL)
        
        @staticmethod
        def button():
            font = QFont("Arial", _SizesDefinition.FONT_MEDIUM)
            font.setBold(True)
            return font
    
    # 전역 스타일 초기화
    @staticmethod
    def initialize_fonts():
        """폰트 초기화"""
        # 폰트 디렉토리 찾기
        base_dir = Path(__file__).parent.parent.parent.parent  # ovis/ovis/ui/ -> ovis/
        font_dir = base_dir / "resources" / "fonts"
        
        # 폰트가 없을 경우 기본 시스템 폰트 사용 (이미 Arial로 설정됨)
        if not font_dir.exists():
            return
        
        # 폰트 파일이 있으면 Pretendard 폰트로 변경
        font_files = list(font_dir.glob("*.ttf"))
        if font_files:
            for font_file in font_files:
                QFontDatabase.addApplicationFont(str(font_file))
            
            # Pretendard 폰트로 변경
            OvisStyle.Fonts.PRIMARY = QFont("Pretendard", OvisStyle.Sizes.FONT_MEDIUM)
            OvisStyle.Fonts.SECONDARY = QFont("Pretendard", OvisStyle.Sizes.FONT_MEDIUM)


class OvisButton(QPushButton):
    """오비스 스타일 버튼"""
    
    def __init__(
        self, 
        text: str = "", 
        parent: Optional[QWidget] = None,
        primary: bool = True, 
        icon: Optional[QIcon] = None,
        icon_name: Optional[str] = None,
        button_type: str = "primary"  # primary, secondary, danger
    ):
        super().__init__(text, parent)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFont(OvisStyle.Fonts.button())
        
        # 사이즈 정책 설정
        self.setSizePolicy(QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Fixed)
        self.setMinimumHeight(36)
        
        # 스타일
        self.primary = primary if button_type == "primary" else False
        self.button_type = button_type
        
        # 아이콘
        if icon:
            self.setIcon(icon)
            self.setIconSize(QSize(OvisStyle.Sizes.ICON_MEDIUM, OvisStyle.Sizes.ICON_MEDIUM))
        elif icon_name:
            # TODO: 실제 구현에서는 아이콘 로드 로직 구현
            pass
        
        self.update_style()
    
    def update_style(self):
        """버튼 스타일 업데이트"""
        if self.button_type == "primary" or self.primary:
            self.setStyleSheet(f"""
                QPushButton {{
                    background-color: {OvisStyle.PRIMARY_COLOR};
                    color: {OvisStyle.TEXT_ON_PRIMARY_COLOR};
                    border: none;
                    border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                    padding: {OvisStyle.Sizes.PADDING_SMALL}px {OvisStyle.Sizes.PADDING_MEDIUM}px;
                }}
                QPushButton:hover {{
                    background-color: {OvisStyle.PRIMARY_COLOR_LIGHT};
                }}
                QPushButton:pressed {{
                    background-color: {OvisStyle.PRIMARY_COLOR_DARK};
                }}
                QPushButton:disabled {{
                    background-color: {OvisStyle.TEXT_COLOR_LIGHT};
                    color: {OvisStyle.TEXT_ON_PRIMARY_COLOR};
                }}
            """)
        elif self.button_type == "secondary" or not self.primary:
            self.setStyleSheet(f"""
                QPushButton {{
                    background-color: transparent;
                    color: {OvisStyle.PRIMARY_COLOR};
                    border: 1px solid {OvisStyle.PRIMARY_COLOR};
                    border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                    padding: {OvisStyle.Sizes.PADDING_SMALL}px {OvisStyle.Sizes.PADDING_MEDIUM}px;
                }}
                QPushButton:hover {{
                    background-color: {OvisStyle.HOVER_COLOR};
                }}
                QPushButton:pressed {{
                    background-color: {OvisStyle.BG_COLOR_DARK};
                }}
                QPushButton:disabled {{
                    border: 1px solid {OvisStyle.TEXT_COLOR_LIGHT};
                    color: {OvisStyle.TEXT_COLOR_LIGHT};
                }}
            """)
        elif self.button_type == "danger":
            self.setStyleSheet(f"""
                QPushButton {{
                    background-color: {OvisStyle.ERROR_COLOR};
                    color: {OvisStyle.TEXT_ON_PRIMARY_COLOR};
                    border: none;
                    border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                    padding: {OvisStyle.Sizes.PADDING_SMALL}px {OvisStyle.Sizes.PADDING_MEDIUM}px;
                }}
                QPushButton:hover {{
                    background-color: #ff6b6b;
                }}
                QPushButton:pressed {{
                    background-color: #e03131;
                }}
                QPushButton:disabled {{
                    background-color: {OvisStyle.TEXT_COLOR_LIGHT};
                    color: {OvisStyle.TEXT_ON_PRIMARY_COLOR};
                }}
            """)


class OvisIconButton(QToolButton):
    """아이콘 버튼"""
    
    def __init__(
        self, 
        icon: QIcon, 
        parent: Optional[QWidget] = None,
        size: int = OvisStyle.Sizes.ICON_MEDIUM,
        tooltip: str = ""
    ):
        super().__init__(parent)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setIcon(icon)
        self.setIconSize(QSize(size, size))
        
        if tooltip:
            self.setToolTip(tooltip)
        
        # 스타일
        self.setStyleSheet(f"""
            QToolButton {{
                background-color: transparent;
                border: none;
                border-radius: {size // 2}px;
                padding: 4px;
            }}
            QToolButton:hover {{
                background-color: {OvisStyle.HOVER_COLOR};
            }}
            QToolButton:pressed {{
                background-color: {OvisStyle.BG_COLOR_DARK};
            }}
        """)


class OvisLabel(QLabel):
    """오비스 스타일 레이블"""
    
    def __init__(
        self, 
        text: str = "", 
        parent: Optional[QWidget] = None,
        type: str = "body",  # 'title', 'subtitle', 'body', 'caption'
        alignment: Qt.AlignmentFlag = Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
        size: Optional[int] = None
    ):
        super().__init__(text, parent)
        self.setAlignment(alignment)
        
        # 폰트 설정
        if size is not None:
            # 크기가 직접 지정된 경우
            font = QFont(OvisStyle.Fonts.PRIMARY.family(), size)
            self.setFont(font)
            self.setStyleSheet(f"color: {OvisStyle.TEXT_COLOR};")
        elif type == "title":
            self.setFont(OvisStyle.Fonts.title())
            self.setStyleSheet(f"color: {OvisStyle.TEXT_COLOR};")
        elif type == "subtitle":
            self.setFont(OvisStyle.Fonts.subtitle())
            self.setStyleSheet(f"color: {OvisStyle.TEXT_COLOR};")
        elif type == "body":
            self.setFont(OvisStyle.Fonts.body())
            self.setStyleSheet(f"color: {OvisStyle.TEXT_COLOR};")
        elif type == "caption":
            self.setFont(OvisStyle.Fonts.caption())
            self.setStyleSheet(f"color: {OvisStyle.TEXT_COLOR_SECONDARY};")
        
        # 줄바꿈 설정
        self.setWordWrap(True)


class OvisTextField(QLineEdit):
    """오비스 스타일 텍스트 필드"""
    
    def __init__(
        self, 
        placeholder: str = "", 
        parent: Optional[QWidget] = None,
        icon: Optional[QIcon] = None
    ):
        super().__init__(parent)
        self.setFont(OvisStyle.Fonts.body())
        self.setPlaceholderText(placeholder)
        
        # 사이즈 정책 설정
        self.setMinimumHeight(36)
        
        # 아이콘
        self.icon = icon
        if icon:
            self.setTextMargins(36, 0, 0, 0)
        
        # 스타일
        self.setStyleSheet(f"""
            QLineEdit {{
                background-color: {OvisStyle.BG_COLOR};
                color: {OvisStyle.TEXT_COLOR};
                border: 1px solid {OvisStyle.BORDER_COLOR};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                padding: {OvisStyle.Sizes.PADDING_SMALL}px {OvisStyle.Sizes.PADDING_MEDIUM}px;
            }}
            QLineEdit:focus {{
                border: 1px solid {OvisStyle.PRIMARY_COLOR};
            }}
            QLineEdit:disabled {{
                background-color: {OvisStyle.BG_COLOR_DARK};
                color: {OvisStyle.TEXT_COLOR_LIGHT};
            }}
        """)
    
    def paintEvent(self, event):
        """아이콘 렌더링"""
        super().paintEvent(event)
        
        if self.icon:
            painter = QPainter(self)
            pixmap = self.icon.pixmap(OvisStyle.Sizes.ICON_MEDIUM, OvisStyle.Sizes.ICON_MEDIUM)
            painter.drawPixmap(8, (self.height() - OvisStyle.Sizes.ICON_MEDIUM) // 2, pixmap)


class OvisTextArea(QTextEdit):
    """오비스 스타일 텍스트 영역"""
    
    def __init__(
        self, 
        parent: Optional[QWidget] = None,
        placeholder: str = ""
    ):
        super().__init__(parent)
        self.setFont(OvisStyle.Fonts.body())
        
        # 스타일
        self.setStyleSheet(f"""
            QTextEdit {{
                background-color: {OvisStyle.BG_COLOR};
                color: {OvisStyle.TEXT_COLOR};
                border: 1px solid {OvisStyle.BORDER_COLOR};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                padding: {OvisStyle.Sizes.PADDING_MEDIUM}px;
            }}
            QTextEdit:focus {{
                border: 1px solid {OvisStyle.PRIMARY_COLOR};
            }}
            QTextEdit:disabled {{
                background-color: {OvisStyle.BG_COLOR_DARK};
                color: {OvisStyle.TEXT_COLOR_LIGHT};
            }}
        """)
        
        # 플레이스홀더 설정
        if placeholder:
            self.setPlaceholderText(placeholder)


class OvisCard(QFrame):
    """오비스 스타일 카드"""
    
    def __init__(
        self, 
        parent: Optional[QWidget] = None,
        title: str = "",
        elevation: int = 1  # 0, 1, 2, 3 (높을수록 더 큰 그림자)
    ):
        super().__init__(parent)
        
        self.elevation = elevation
        
        # 레이아웃 설정
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM, 
            OvisStyle.Sizes.PADDING_MEDIUM
        )
        self.layout.setSpacing(OvisStyle.Sizes.PADDING_MEDIUM)
        
        # 제목 설정
        if title:
            self.title_label = OvisLabel(title, self, "subtitle")
            self.title_label.setFont(OvisStyle.Fonts.subtitle())
            self.layout.addWidget(self.title_label)
        
        # 스타일 설정
        self.setStyleSheet(f"""
            OvisCard {{
                background-color: {OvisStyle.CARD_BG};
                border-radius: {OvisStyle.Sizes.BORDER_RADIUS_MEDIUM}px;
                border: 1px solid {OvisStyle.BORDER_COLOR};
            }}
        """)
        
        # 그림자 효과 설정
        if elevation > 0:
            shadow = QGraphicsDropShadowEffect(self)
            shadow.setBlurRadius(elevation * 4)
            shadow.setColor(QColor(0, 0, 0, 30))
            shadow.setOffset(0, elevation * 2)
            self.setGraphicsEffect(shadow)
    
    def add_widget(self, widget: QWidget):
        """위젯 추가"""
        self.layout.addWidget(widget)


class OvisSwitch(QWidget):
    """오비스 스타일 스위치 (토글 버튼)"""
    
    toggled = pyqtSignal(bool)
    
    def __init__(
        self, 
        parent: Optional[QWidget] = None,
        checked: bool = False
    ):
        super().__init__(parent)
        
        self.checked = checked
        self._progress = 1.0 if checked else 0.0
        
        # 사이즈 정책
        self.setFixedSize(50, 24)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
    
    # 프로퍼티 애니메이션을 위한 속성 정의
    @pyqtProperty(float)
    def progress(self):
        return self._progress
    
    @progress.setter
    def progress(self, value):
        self._progress = value
        self.update()
    
    def paintEvent(self, event):
        """스위치 그리기"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 트랙 그리기
        track_rectf = QRectF(0, 4, 50, 16)
        track_path = QPainterPath()
        track_path.addRoundedRect(track_rectf, 8, 8)
        
        if self.checked:
            track_color = QColor(OvisStyle.PRIMARY_COLOR)
            track_color.setAlpha(200)
        else:
            track_color = QColor(OvisStyle.TEXT_COLOR_LIGHT)
        
        painter.fillPath(track_path, track_color)
        
        # 핸들 그리기
        handle_position = 4 + (self._progress * 26)
        handle_rect = QRectF(handle_position, 0, 24, 24)
        handle_path = QPainterPath()
        handle_path.addEllipse(handle_rect)
        
        handle_color = QColor(OvisStyle.PRIMARY_COLOR) if self.checked else QColor(OvisStyle.BG_COLOR)
        
        # 그림자 효과
        shadow = QPainterPath()
        shadow.addEllipse(handle_rect.adjusted(-1, -1, 1, 1))
        painter.fillPath(shadow, QColor(0, 0, 0, 30))
        
        painter.fillPath(handle_path, handle_color)
    
    def mousePressEvent(self, event):
        """마우스 클릭 이벤트"""
        self.checked = not self.checked
        
        # 애니메이션 설정
        self.anim = QPropertyAnimation(self, b"progress")
        self.anim.setDuration(150)
        self.anim.setStartValue(0.0 if self.checked else 1.0)
        self.anim.setEndValue(1.0 if self.checked else 0.0)
        self.anim.start()
        
        self.update()
        self.toggled.emit(self.checked)
    
    def setChecked(self, checked: bool):
        """체크 상태 설정"""
        if self.checked == checked:
            return
        
        self.checked = checked
        self._progress = 1.0 if checked else 0.0
        self.update()


class OvisLoadingIndicator(QWidget):
    """로딩 인디케이터"""
    
    def __init__(
        self, 
        parent: Optional[QWidget] = None,
        size: int = 40,
        color: str = OvisStyle.PRIMARY_COLOR
    ):
        super().__init__(parent)
        
        self.angle = 0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.rotate)
        self.size = size
        self.color = QColor(color)
        
        self.setFixedSize(size, size)
        self.hide()  # 기본적으로 숨겨진 상태
    
    def rotate(self):
        """회전 애니메이션"""
        self.angle = (self.angle + 10) % 360
        self.update()
    
    def paintEvent(self, event):
        """로딩 인디케이터 그리기"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        painter.translate(self.width() / 2, self.height() / 2)
        painter.rotate(self.angle)
        
        for i in range(8):
            painter.save()
            painter.rotate(i * 45)
            painter.translate(self.size / 3, 0)
            
            alpha = 255 - ((i * 255) // 8)
            color = QColor(self.color)
            color.setAlpha(alpha)
            
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(color)
            painter.drawEllipse(-self.size / 10, -self.size / 10, 
                               self.size / 5, self.size / 5)
            
            painter.restore()
    
    def start(self):
        """로딩 시작"""
        self.show()
        self.timer.start(50)
    
    def stop(self):
        """로딩 종료"""
        self.timer.stop()
        self.hide()


# 폰트 초기화
OvisStyle.initialize_fonts() 