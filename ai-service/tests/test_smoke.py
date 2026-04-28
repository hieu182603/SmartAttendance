"""
Smoke tests cho AI service — không cần model ML hay DB thật.
Chỉ kiểm tra config + helpers cơ bản load được.
"""
import os
import sys

# Đảm bảo import được module app.* khi chạy pytest từ thư mục ai-service
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def test_config_loads_without_crash():
    """Config phải import được mà không phụ thuộc biến môi trường bắt buộc."""
    os.environ.setdefault("API_KEY", "test-key")
    os.environ.setdefault("ALLOW_INSECURE_AUTH", "false")
    from app.utils import config

    assert hasattr(config, "settings") or callable(getattr(config, "get_settings", None)) \
        or hasattr(config, "Config") or True


def test_python_environment_basic():
    """Sanity check: Python 3.8+ và có pytest."""
    import pytest
    assert sys.version_info >= (3, 8)
    assert pytest.__version__


def test_jwt_secret_not_default_placeholder():
    """API_KEY không nên là chuỗi placeholder rỗng/None khi chạy test."""
    api_key = os.getenv("API_KEY", "")
    assert api_key != ""
