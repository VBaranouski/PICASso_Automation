"""
Figma REST API client.
Authentication: X-Figma-Token header with a personal access token.
Used to fetch file metadata, node details, and export screenshots (PNG/SVG).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse, unquote

import requests

from src.config.settings import FigmaConfig
from src.utils.file_utils import ensure_dir


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

@dataclass
class FigmaFileInfo:
    key: str
    name: str
    last_modified: str
    version: str
    thumbnail_url: str


@dataclass
class FigmaNode:
    id: str
    name: str
    node_type: str


@dataclass
class FigmaParsedUrl:
    file_key: str
    node_id: Optional[str] = None
    file_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class FigmaClient:
    """Thin wrapper around the Figma REST API."""

    def __init__(self, config: FigmaConfig) -> None:
        self._config = config
        self._base = config.base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({
            "X-Figma-Token": config.api_token,
            "Accept": "application/json",
        })

    # ------------------------------------------------------------------
    # Connection test
    # ------------------------------------------------------------------

    def test_connection(self) -> dict:
        """Test API connection by fetching the authenticated user's info."""
        return self._get("/v1/me")

    # ------------------------------------------------------------------
    # File operations
    # ------------------------------------------------------------------

    def get_file(self, file_key: str) -> FigmaFileInfo:
        """Fetch metadata for a Figma file."""
        data = self._get(f"/v1/files/{file_key}", params={"depth": 1})
        return FigmaFileInfo(
            key=file_key,
            name=data.get("name", ""),
            last_modified=data.get("lastModified", ""),
            version=data.get("version", ""),
            thumbnail_url=data.get("thumbnailUrl", ""),
        )

    def get_file_nodes(self, file_key: str, node_ids: list[str]) -> dict:
        """Fetch specific nodes from a Figma file."""
        ids_param = ",".join(node_ids)
        return self._get(f"/v1/files/{file_key}/nodes", params={"ids": ids_param})

    # ------------------------------------------------------------------
    # Image export (screenshots)
    # ------------------------------------------------------------------

    def get_image_urls(
        self,
        file_key: str,
        node_ids: list[str],
        fmt: str = "png",
        scale: float = 2.0,
    ) -> dict[str, str]:
        """
        Request rendered images for specific nodes.
        Returns a dict mapping node_id -> image_url.
        """
        params = {
            "ids": ",".join(node_ids),
            "format": fmt,
            "scale": scale,
        }
        data = self._get(f"/v1/images/{file_key}", params=params)
        return data.get("images", {})

    def export_screenshot(
        self,
        file_key: str,
        node_ids: list[str],
        output_dir: str | Path,
        fmt: str = "png",
        scale: float = 2.0,
        filename_prefix: str = "figma",
    ) -> list[Path]:
        """
        Export screenshots for given nodes and save to output_dir.
        Returns list of saved file paths.
        """
        image_urls = self.get_image_urls(file_key, node_ids, fmt=fmt, scale=scale)
        out = ensure_dir(output_dir)
        saved: list[Path] = []

        for node_id, url in image_urls.items():
            if not url:
                continue
            safe_id = node_id.replace(":", "-")
            filepath = out / f"{filename_prefix}_{safe_id}.{fmt}"
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            filepath.write_bytes(resp.content)
            saved.append(filepath)

        return saved

    def screenshot_from_url(
        self,
        figma_url: str,
        output_dir: str | Path,
        fmt: str = "png",
        scale: float = 2.0,
        filename_prefix: str = "figma",
    ) -> list[Path]:
        """
        Convenience: parse a Figma URL and export screenshot(s).
        If the URL has a node-id, exports that node; otherwise exports
        the first page of the file.
        """
        parsed = self.parse_figma_url(figma_url)

        if parsed.node_id:
            node_ids = [parsed.node_id]
        else:
            # No node specified — get the first page (top-level child)
            file_data = self._get(f"/v1/files/{parsed.file_key}", params={"depth": 1})
            pages = file_data.get("document", {}).get("children", [])
            if not pages:
                raise ValueError(f"No pages found in Figma file '{parsed.file_key}'")
            node_ids = [pages[0]["id"]]

        prefix = filename_prefix
        if parsed.file_name:
            prefix = parsed.file_name

        return self.export_screenshot(
            parsed.file_key, node_ids, output_dir,
            fmt=fmt, scale=scale, filename_prefix=prefix,
        )

    # ------------------------------------------------------------------
    # URL parsing
    # ------------------------------------------------------------------

    @staticmethod
    def parse_figma_url(url: str) -> FigmaParsedUrl:
        """
        Parse a Figma URL and extract file_key and optional node_id.

        Supports formats:
          https://www.figma.com/file/ABC123/FileName?node-id=1-2
          https://www.figma.com/design/ABC123/FileName?node-id=1-2
          https://www.figma.com/design/ABC123/FileName?node-id=1%3A2
          https://www.figma.com/proto/ABC123/...
        """
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split("/") if p]

        # Expected: ['file'|'design'|'proto', '<file_key>', '<file_name>']
        if len(path_parts) < 2:
            raise ValueError(f"Cannot parse Figma URL: {url}")

        file_key = path_parts[1]
        file_name = path_parts[2] if len(path_parts) > 2 else None
        if file_name:
            file_name = unquote(file_name).replace("-", "_")

        # Extract node-id from query params
        qs = parse_qs(parsed.query)
        node_id = None
        if "node-id" in qs:
            raw = qs["node-id"][0]
            # Figma uses "1:2" or "1-2" format; API expects "1:2"
            node_id = raw.replace("-", ":")

        return FigmaParsedUrl(file_key=file_key, node_id=node_id, file_name=file_name)

    # ------------------------------------------------------------------
    # Internal HTTP helpers
    # ------------------------------------------------------------------

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        url = self._base + endpoint
        resp = self._session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
