# config/role_mapper.py

"""
Map backend-ai roles to Agent1 permission roles.
"""

# Backend-AI roles (from User.Role enum)
BACKEND_ROLES = {
    "STUDENT": "student",
    "ADMIN": "admin",
    "FACULTY": "teacher",
    "LIBRARIAN": "librarian",
    "MODERATOR": "moderator"
}


def map_backend_role_to_permission_role(backend_role: str) -> str:
    """
    Map backend-ai role to Agent1 permission role.
    
    Args:
        backend_role: Role from backend-ai (STUDENT, ADMIN, FACULTY, LIBRARIAN, MODERATOR)
    
    Returns:
        Permission role name (student, admin, teacher, librarian, moderator)
    """
    return BACKEND_ROLES.get(backend_role.upper(), "student")


def get_role_permissions(backend_role: str, permissions_config: dict) -> dict:
    """
    Get permissions for a backend role.
    
    Args:
        backend_role: Role from backend-ai
        permissions_config: Loaded permissions.yaml config
    
    Returns:
        Permission dict for the role
    """
    permission_role = map_backend_role_to_permission_role(backend_role)
    return permissions_config.get("roles", {}).get(permission_role, {})

