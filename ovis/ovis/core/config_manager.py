import os
import json

class ConfigManager:
    """애플리케이션 설정 관리 클래스"""
    
    _instance = None
    
    def __new__(cls, config_path=None):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, config_path=None):
        if self._initialized:
            return
            
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "config", "config.json"
        )
        self.config = self._load_config()
        self._initialized = True
    
    def _load_config(self):
        """설정 파일 로드, 없으면 기본 설정 생성"""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"설정 파일 {self.config_path}이 손상되었습니다. 기본 설정을 사용합니다.")
                return self._create_default_config()
        return self._create_default_config()
    
    def _create_default_config(self):
        """기본 설정 생성"""
        default_config = {
            "api_keys": {
                "gemini": "",
                "brave_search": ""
            },
            "storage": {
                "local_path": "./data",
                "nas": {
                    "enabled": False,
                    "host": "",
                    "user": "",
                    "password": "",
                    "share_path": ""
                }
            },
            "ui": {
                "theme": "light",
                "language": "ko",
                "window_size": {
                    "width": 1200,
                    "height": 800
                }
            },
            "workflow": {
                "default_workflows_path": "./config/workflows",
                "auto_save": True
            }
        }
        
        # 설정 저장
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
            
        return default_config
    
    def get(self, section, key=None, default=None):
        """설정값 가져오기"""
        if key is None:
            return self.config.get(section, default)
        
        section_data = self.config.get(section, {})
        return section_data.get(key, default)
    
    def set(self, section, key, value):
        """설정값 변경"""
        if section not in self.config:
            self.config[section] = {}
            
        self.config[section][key] = value
        self.save()
    
    def save(self):
        """현재 설정을 파일로 저장"""
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def get_config(self):
        """전체 설정 반환"""
        return self.config 