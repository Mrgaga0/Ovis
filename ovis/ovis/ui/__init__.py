#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis UI 패키지
"""

# 공통 구성 요소 가져오기
from ovis.ui.components import (
    OvisStyle,
    OvisButton,
    OvisIconButton,
    OvisLabel,
    OvisTextField,
    OvisTextArea,
    OvisCard,
    OvisSwitch,
    OvisLoadingIndicator
)

# 메인 윈도우 가져오기
from ovis.ui.main_window import MainWindow, run_app

# 공개 인터페이스 정의
__all__ = [
    # 스타일
    'OvisStyle',
    
    # 공통 컴포넌트
    'OvisButton',
    'OvisIconButton',
    'OvisLabel',
    'OvisTextField',
    'OvisTextArea',
    'OvisCard',
    'OvisSwitch',
    'OvisLoadingIndicator',
    
    # 메인 윈도우
    'MainWindow',
    'run_app',
]
