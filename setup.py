from setuptools import setup, find_packages

setup(
    name="ovis",
    version="0.1.0",
    description="Ovis - Personal Automation Agent System",
    author="Ovis Team",
    author_email="info@ovis.example.com",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "google-generativeai>=0.3.1",
        "python-dotenv>=1.0.0",
        "requests>=2.31.0",
        "PyYAML>=6.0",
        "Jinja2>=3.1.2",
        "loguru>=0.7.2",
        "pydantic>=2.5.2",
        "PyQt6>=6.6.1",
        "PyQt6-QScintilla>=2.14.1",
        "beautifulsoup4>=4.12.2"
    ],
    entry_points={
        'console_scripts': [
            'ovis=ovis.main:main',
        ],
    },
) 