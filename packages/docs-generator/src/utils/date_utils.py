"""Date formatting utilities."""

from __future__ import annotations

from datetime import datetime, timezone


def today_str(fmt: str = "%Y-%m-%d") -> str:
    """Return today's date as a formatted string (local time)."""
    return datetime.now().strftime(fmt)


def now_str(fmt: str = "%Y-%m-%d %H:%M") -> str:
    """Return current datetime as a formatted string (local time)."""
    return datetime.now().strftime(fmt)


def format_jira_date(iso_string: str | None, fmt: str = "%d %b %Y") -> str:
    """
    Format an ISO 8601 date string from JIRA into a human-readable form.
    Returns the original string if parsing fails, or 'N/A' if None.
    """
    if not iso_string:
        return "N/A"
    for pattern in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(iso_string[:len(pattern)], pattern)
            return dt.strftime(fmt)
        except ValueError:
            continue
    return iso_string
