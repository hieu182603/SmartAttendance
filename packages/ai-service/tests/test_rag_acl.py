import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault("API_KEY", "test-api-key-secret")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("ALLOW_INSECURE_AUTH", "false")

from app.routers.rag_router import RegulationIngestRequest
from app.services.rag.documents import DocumentManager


def make_manager():
    return DocumentManager(vector_store=None)


def test_public_document_accessible_to_employee():
    manager = make_manager()

    assert manager._check_document_access(
        {"access_level": "public"},
        user_role="employee",
        department_id=None,
    )


def test_restricted_document_denies_employee_with_empty_acl():
    manager = make_manager()

    assert not manager._check_document_access(
        {"access_level": "restricted", "allowed_roles": [], "allowed_department_ids": []},
        user_role="employee",
        department_id=None,
    )


def test_restricted_document_allows_privileged_roles():
    manager = make_manager()

    for role in ["hr_manager", "admin", "super_admin", "HR_MANAGER"]:
        assert manager._check_document_access(
            {"access_level": "restricted", "allowed_roles": [], "allowed_department_ids": []},
            user_role=role,
            department_id=None,
        )


def test_restricted_document_allows_explicit_role_or_department():
    manager = make_manager()

    assert manager._check_document_access(
        {"access_level": "restricted", "allowed_roles": ["EMPLOYEE"], "allowed_department_ids": []},
        user_role="employee",
        department_id=None,
    )
    assert manager._check_document_access(
        {"access_level": "restricted", "allowed_roles": [], "allowed_department_ids": ["dept-1"]},
        user_role="manager",
        department_id="dept-1",
    )


def test_regulation_ingest_request_preserves_acl_metadata_fields():
    request = RegulationIngestRequest(
        regulation_id="reg-1",
        title="Restricted contract",
        content="Contract content",
        doc_type="hr_policy",
        access_level="restricted",
        allowed_roles=["MANAGER"],
        allowed_department_ids=["dept-1"],
    )

    assert request.access_level == "restricted"
    assert request.allowed_roles == ["MANAGER"]
    assert request.allowed_department_ids == ["dept-1"]

