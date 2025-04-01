#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis 애플리케이션 실행 스크립트
"""

import os
import sys

# 현재 스크립트 경로를 기준으로 모듈 경로 추가
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

def main():
    """애플리케이션 실행"""
    try:
        from main import main as app_main
        return app_main()
    except ImportError as e:
        print(f"오류: 필요한 모듈을 가져올 수 없습니다: {e}")
        print("필요한 모든 패키지가 설치되어 있는지 확인하세요.")
        print("pip install -r requirements.txt")
        return 1
    except Exception as e:
        print(f"애플리케이션 실행 오류: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main()) 