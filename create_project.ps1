# Create directory structure
$directories = @(
    "ovis",
    "ovis\ovis",
    "ovis\ovis\ui",
    "ovis\ovis\core",
    "ovis\ovis\api",
    "ovis\ovis\data",
    "ovis\ovis\workflow",
    "ovis\apps",
    "ovis\apps\news_manager",
    "ovis\apps\content_creator",
    "ovis\data",
    "ovis\config",
    "ovis\config\prompts"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "Created directory: $dir"
    }
}

# Create __init__.py files
$init_files = @(
    "ovis\ovis\__init__.py",
    "ovis\ovis\ui\__init__.py",
    "ovis\ovis\core\__init__.py",
    "ovis\ovis\api\__init__.py",
    "ovis\ovis\data\__init__.py",
    "ovis\ovis\workflow\__init__.py",
    "ovis\apps\news_manager\__init__.py",
    "ovis\apps\content_creator\__init__.py"
)

foreach ($file in $init_files) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file -Force
        Write-Host "Created file: $file"
    }
}

# Create main.py
$main_file = "ovis\main.py"
if (-not (Test-Path $main_file)) {
    $main_content = @"
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Ovis - Personal Automation Agent System
"""

def main():
    print("Ovis Personal Automation Agent System")
    # Add your main application logic here
    
if __name__ == "__main__":
    main()
"@
    Set-Content -Path $main_file -Value $main_content -Encoding UTF8
    Write-Host "Created file: $main_file"
}

# Create requirements.txt
$req_file = "ovis\requirements.txt"
if (-not (Test-Path $req_file)) {
    $req_content = @"
PyQt6==6.5.0
requests==2.28.2
aiohttp==3.8.4
PyYAML==6.0
SQLAlchemy==2.0.19
google-api-python-client==2.86.0
google-auth==2.18.0
feedparser==6.0.10
beautifulsoup4==4.12.2
markdown==3.4.3
pydantic==2.0.2
python-dotenv==1.0.0
Pillow==9.5.0
fastapi==0.99.1
uvicorn==0.22.0
"@
    Set-Content -Path $req_file -Value $req_content -Encoding UTF8
    Write-Host "Created file: $req_file"
}

# Create settings.json
$settings_file = "ovis\config\settings.json"
if (-not (Test-Path $settings_file)) {
    $settings_content = @"
{
  "api_keys": {
    "gemini": "",
    "brave_search": ""
  },
  "storage": {
    "local_path": "./data",
    "nas": {
      "enabled": false,
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
    "auto_save": true
  }
}
"@
    Set-Content -Path $settings_file -Value $settings_content -Encoding UTF8
    Write-Host "Created file: $settings_file"
}

Write-Host "Project structure created successfully!" 