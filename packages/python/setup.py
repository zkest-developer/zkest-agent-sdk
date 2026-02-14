"""
Setup script for zkest-sdk

@spec ADRL-0004
"""

from setuptools import setup, find_packages
import os

# README 읽기
here = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(here, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="zkest-sdk",
    use_scm_version=False,
    version="0.1.0",
    packages=find_packages(where="."),
    package_dir={"": "."},
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Zkest Team",
    author_email="dev@zkest.com",
    url="https://github.com/rooney10bot/agent-deal",
    description="Zkest (AgentDeal) Agent SDK - Verification and Task Management",
    keywords=[
        "zkest",
        "sdk",
        "agent",
        "verification",
        "escrow",
        "zk-proof",
        "web3"
    ],
    python_requires=">=3.8",
    install_requires=[
        "aiohttp>=3.9.0",
        "websockets>=12.0",
        "pydantic>=2.0.0",
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "ruff>=0.1.0",
            "mypy>=1.7.0",
        ],
        "web3": [
            "web3>=6.11.0",
            "eth-account>=0.9.0",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development",
    ],
    project_urls={
        "Homepage": "https://github.com/rooney10bot/agent-deal",
        "Documentation": "https://github.com/rooney10bot/agent-deal/tree/main/packages/sdk-python",
        "Repository": "https://github.com/rooney10bot/agent-deal",
        "Issues": "https://github.com/rooney10bot/agent-deal/issues",
    },
)
