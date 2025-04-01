#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis 애플리케이션 실행기
"""

import sys
from PyQt6.QtWidgets import QApplication

from ovis.ui.components import OvisStyle
from ovis.ui.main_window import MainWindow


def launch():
    """Ovis UI 애플리케이션 실행"""
    app = QApplication(sys.argv)
    
    # 애플리케이션 스타일 설정
    app.setStyle("Fusion")
    
    # 폰트 초기화
    OvisStyle.initialize_fonts()
    
    # 메인 윈도우 생성 및 표시
    window = MainWindow()
    window.show()
    
    # 애플리케이션 실행
    sys.exit(app.exec())


if __name__ == "__main__":
    launch() 