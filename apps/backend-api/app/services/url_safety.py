from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

_BLOCKED_HOSTS = frozenset({"localhost", "metadata.google.internal"})


def is_safe_fetch_url(url: str | None) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    host = (parsed.hostname or "").lower()
    if not host or host in _BLOCKED_HOSTS:
        return False
    if host.endswith(".internal") or host.endswith(".local"):
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return True
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
    )
