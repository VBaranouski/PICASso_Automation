"""
Confluence REST API client (Server / Data Center).
Authentication: Authorization: Bearer <PAT>
  — the token stored in .env is a Personal Access Token used directly.
SSL verification disabled for internal corporate certificate.
Confluence API base path: /rest/api  (no /wiki prefix on this instance).
"""

from __future__ import annotations

import warnings
from typing import Optional

import requests
from urllib3.exceptions import InsecureRequestWarning

from src.config.settings import ConfluenceConfig

warnings.filterwarnings("ignore", category=InsecureRequestWarning)


class ConfluenceClient:
    """Thin wrapper around the Confluence REST API (Server / Data Center)."""

    def __init__(self, config: ConfluenceConfig) -> None:
        self._config = config
        # This instance exposes the API directly at /rest/api (no /wiki prefix)
        self._base = f"{config.base_url}/rest/api"
        self._session = requests.Session()
        # Bearer PAT authentication
        self._session.headers.update({
            "Accept": "application/json",
            "Authorization": f"Bearer {config.api_token}",
            "Content-Type": "application/json",
        })

    # ------------------------------------------------------------------
    # Page operations
    # ------------------------------------------------------------------

    def get_page(self, page_id: str) -> dict:
        """Fetch page metadata including current version number."""
        return self._get(f"/content/{page_id}", params={"expand": "version,body.storage"})

    def find_page_by_title(self, title: str, space_key: Optional[str] = None) -> Optional[dict]:
        """Search for a page by title in a space. Returns None if not found."""
        key = space_key or self._config.space_key
        params = {
            "title": title,
            "spaceKey": key,
            "expand": "version",
        }
        data = self._get("/content", params=params)
        results = data.get("results", [])
        return results[0] if results else None

    def create_page(
        self,
        title: str,
        html_content: str,
        space_key: Optional[str] = None,
        parent_page_id: Optional[str] = None,
    ) -> dict:
        """Create a new Confluence page with HTML storage format content."""
        key = space_key or self._config.space_key
        body: dict = {
            "type": "page",
            "title": title,
            "space": {"key": key},
            "body": {
                "storage": {
                    "value": html_content,
                    "representation": "storage",
                }
            },
        }
        if parent_page_id:
            body["ancestors"] = [{"id": parent_page_id}]

        return self._post("/content", json=body)

    def update_page(
        self,
        page_id: str,
        title: str,
        html_content: str,
        version_number: int,
    ) -> dict:
        """Update an existing Confluence page to a new version."""
        body = {
            "type": "page",
            "title": title,
            "version": {"number": version_number},
            "body": {
                "storage": {
                    "value": html_content,
                    "representation": "storage",
                }
            },
        }
        return self._put(f"/content/{page_id}", json=body)

    def publish_release_notes(
        self,
        title: str,
        html_content: str,
        parent_page_id: Optional[str] = None,
    ) -> str:
        """
        Create or update a Confluence page for release notes.
        Returns the URL of the published page.
        """
        parent = parent_page_id or self._config.release_notes_parent_page_id or None
        existing = self.find_page_by_title(title)

        if existing:
            page_id = existing["id"]
            current_version = existing["version"]["number"]
            result = self.update_page(page_id, title, html_content, current_version + 1)
        else:
            result = self.create_page(title, html_content, parent_page_id=parent)

        page_id = result["id"]
        page_url = f"{self._config.base_url}/wiki/spaces/{self._config.space_key}/pages/{page_id}"
        return page_url

    # ------------------------------------------------------------------
    # Internal HTTP helpers
    # ------------------------------------------------------------------

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        url = self._base + endpoint
        resp = self._session.get(url, params=params, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json()

    def _post(self, endpoint: str, json: dict) -> dict:
        url = self._base + endpoint
        resp = self._session.post(url, json=json, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json()

    def _put(self, endpoint: str, json: dict) -> dict:
        url = self._base + endpoint
        resp = self._session.put(url, json=json, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json()
