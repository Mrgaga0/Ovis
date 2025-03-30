# Ovis - AI 기반 워크플로우 자동화 시스템

Ovis는 AI를 활용한 워크플로우 자동화 시스템으로, 콘텐츠 생성, 정보 수집, 데이터 처리 등 다양한 작업을 자동화할 수 있습니다.

## 주요 기능

- **워크플로우 관리**: 다양한 작업을 연결하여 복잡한 워크플로우 생성 및 관리
- **AI 통합**: Google Gemini API를 활용한 텍스트 생성 및 처리
- **정보 수집**: RSS 피드 크롤링 및 Brave 검색 API를 활용한 웹 검색
- **유연한 확장성**: 새로운 작업 유형 및 핸들러 추가 가능
- **사용자 친화적 UI**: PyQt6 기반의 직관적인 사용자 인터페이스

## 시작하기

### 필수 요구사항

- Python 3.9 이상
- pip (Python 패키지 관리자)

### 설치 방법

1. 저장소 클론
```bash
git clone https://github.com/Mrgaga0/Ovis.git
cd Ovis
```

2. 가상 환경 생성 및 활성화
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. 필요한 패키지 설치
```bash
pip install -r requirements.txt
pip install aiohttp feedparser
pip install -e .
```

4. 설정 파일 생성
```bash
cp ovis/config/config.example.json ovis/config/config.json
```

5. API 키 설정
   - ovis/config/config.json 파일을 열고 API 키 설정:
     - `gemini`: [Google AI Studio](https://aistudio.google.com/)에서 API 키 발급
     - `brave_search`: [Brave Search API](https://brave.com/search/api/)에서 API 키 발급

### 실행 방법

```bash
python ovis/main.py
```

## 워크플로우 템플릿

Ovis는 다음과 같은 워크플로우 템플릿을 제공합니다:

- **뉴스 크롤링**: RSS 피드에서 최신 뉴스 수집
- **기사 작성**: 특정 주제에 대한 기사 자동 작성
- **유튜브 스크립트 작성**: 유튜브 영상 스크립트 생성
- **번역**: 텍스트 번역
- **웹 검색**: 특정 주제에 대한 웹 검색 및 정보 수집

## 프로젝트 구조

```
ovis/
├── config/              # 설정 파일 및 워크플로우 템플릿
│   ├── prompts/         # AI 프롬프트 템플릿
│   └── workflows/       # 워크플로우 템플릿
├── ovis/                # 메인 소스 코드
│   ├── api/             # API 클라이언트 (Gemini, Brave 등)
│   ├── core/            # 코어 기능 (설정, 프롬프트 관리 등)
│   ├── ui/              # 사용자 인터페이스 컴포넌트
│   └── workflow/        # 워크플로우 엔진 및 핸들러
└── setup.py             # 패키지 설정
```

## 라이선스

MIT 라이선스로 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 기여하기

프로젝트에 기여하고 싶으시다면:
1. 이슈를 생성하여 문제점이나 기능 제안을 논의하세요.
2. 변경사항을 위한 브랜치를 생성하세요.
3. 변경사항을 커밋하고 푸시하세요.
4. Pull Request를 생성하여 검토를 요청하세요. 