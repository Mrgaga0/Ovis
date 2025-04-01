#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis: AI 기반 워크플로우 자동화 시스템
"""

import os
import sys
import logging
import argparse
import json
from pathlib import Path
from PyQt6.QtWidgets import QApplication
import asyncio

from ovis.ui.main_window import MainWindow
from ovis.core.config_manager import ConfigManager
from ovis.core.prompt_manager import PromptManager
from ovis.api.gemini_client import GeminiClient
from ovis.api.brave_search import BraveSearchClient
from ovis.workflow.engine import WorkflowEngine
from ovis.workflow.manager import WorkflowManager
from ovis.workflow import register_default_handlers

def setup_logging(level=logging.INFO):
    """로깅 설정"""
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def ensure_config():
    """설정 파일 존재 확인 및 생성"""
    home_dir = os.path.expanduser('~')
    ovis_dir = os.path.join(home_dir, '.ovis')
    config_path = os.path.join(ovis_dir, 'config.json')
    
    if not os.path.exists(ovis_dir):
        os.makedirs(ovis_dir)
    
    if not os.path.exists(config_path):
        default_config = {
            "api_keys": {
                "gemini": "",
                "brave_search": ""
            },
            "ui": {
                "theme": "dark",
                "font_size": "medium"
            },
            "workflow": {
                "default_output_dir": os.path.join(home_dir, "ovis_outputs")
            }
        }
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2)
            
        print(f"기본 설정 파일이 생성되었습니다: {config_path}")
        print("편집하여 API 키와 기본 설정을 구성하세요.")
    
    return config_path

def main():
    """애플리케이션 메인 엔트리 포인트"""
    parser = argparse.ArgumentParser(description='Ovis: AI 기반 워크플로우 자동화 시스템')
    parser.add_argument('--config', help='설정 파일 경로')
    parser.add_argument('--debug', action='store_true', help='디버그 모드 활성화')
    args = parser.parse_args()
    
    # 로깅 설정
    log_level = logging.DEBUG if args.debug else logging.INFO
    setup_logging(log_level)
    
    # 설정 파일 확인
    config_path = args.config if args.config else ensure_config()
    
    try:
        # 애플리케이션 초기화
        app = QApplication(sys.argv)
        
        # 설정 및 프롬프트 관리자 초기화
        config_manager = ConfigManager(config_path)
        prompt_manager = PromptManager("config/prompts")
        
        # 워크플로우 엔진 초기화 및 핸들러 등록
        workflow_engine = WorkflowEngine()
        register_default_handlers(workflow_engine)
        
        # 워크플로우 관리자 초기화
        workflow_manager = WorkflowManager(config_manager)
        workflow_manager.engine = workflow_engine
        
        # 메인 윈도우 생성 및 표시
        window = MainWindow(config_manager, prompt_manager, workflow_manager)
        window.show()
        
        # 애플리케이션 실행
        sys.exit(app.exec())
        
    except ImportError as e:
        print(f"오류: 필요한 모듈을 가져올 수 없습니다. {e}")
        print("필요한 모든 패키지가 설치되어 있는지 확인하세요.")
        print("pip install -r requirements.txt")
        return 1
        
    except Exception as e:
        logging.error(f"애플리케이션 실행 오류: {e}", exc_info=True)
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
