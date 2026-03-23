"""
Configuration loader — merges .env secrets with config.yaml settings.
Must be initialized first; all other modules depend on Settings.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv


# ---------------------------------------------------------------------------
# Domain config dataclasses
# ---------------------------------------------------------------------------

@dataclass
class JiraConfig:
    base_url: str
    email: str
    api_token: str
    project_key: str
    issue_types: list[str]
    fields_to_fetch: list[str]


@dataclass
class ConfluenceConfig:
    base_url: str
    email: str
    api_token: str
    space_key: str
    release_notes_parent_page_id: str


@dataclass
class FigmaConfig:
    api_token: str
    base_url: str


@dataclass
class AIConfig:
    model: str
    max_tokens: int


@dataclass
class PathConfig:
    input_transcripts: str
    input_release_notes_detailed: str
    output_release_notes_short: str
    output_meeting_notes: str
    output_test_cases: str
    output_release_notes_detailed: str
    output_bug_reports: str
    output_user_stories: str
    templates_dir: str


@dataclass
class OutputConfig:
    date_format: str
    release_notes_short_filename_pattern: str
    meeting_notes_filename_pattern: str
    test_cases_filename_pattern: str
    user_stories_filename_pattern: str


@dataclass
class BrandingConfig:
    company_name: str
    primary_color: str
    dark_color: str
    text_color: str
    border_color: str
    row_alt_color: str
    hover_color: str
    font_family: str


@dataclass
class Settings:
    jira: JiraConfig
    confluence: ConfluenceConfig
    figma: FigmaConfig
    ai: AIConfig
    paths: PathConfig
    output: OutputConfig
    branding: BrandingConfig


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_settings(config_path: str = "config.yaml", env_path: str = None) -> Settings:
    """
    Load .env via python-dotenv and config.yaml via pyyaml.
    Raises ValueError if required secrets are missing.
    """
    # Resolve .env path: local → parent → grandparent (monorepo root)
    if env_path is None:
        for candidate in [".env", "../.env", "../../.env"]:
            if Path(candidate).exists():
                env_path = candidate
                break
        else:
            env_path = ".env"
    load_dotenv(dotenv_path=env_path, override=False)

    # Load YAML config
    yaml_path = Path(config_path)
    if not yaml_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with yaml_path.open("r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    required = {
        "JIRA_BASE_URL": os.getenv("JIRA_BASE_URL"),
        "JIRA_EMAIL": os.getenv("JIRA_EMAIL"),
        "JIRA_API_TOKEN": os.getenv("JIRA_API_TOKEN"),
        "CONFLUENCE_BASE_URL": os.getenv("CONFLUENCE_BASE_URL"),
        "CONFLUENCE_EMAIL": os.getenv("CONFLUENCE_EMAIL"),
        "CONFLUENCE_API_TOKEN": os.getenv("CONFLUENCE_API_TOKEN"),
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Copy .env.example to .env and fill in your API tokens."
        )

    jira_cfg = cfg.get("jira", {})
    confluence_cfg = cfg.get("confluence", {})
    ai_cfg = cfg.get("ai", {})
    paths_cfg = cfg.get("paths", {})
    output_cfg = cfg.get("output", {})
    branding_cfg = cfg.get("branding", {})

    return Settings(
        jira=JiraConfig(
            base_url=required["JIRA_BASE_URL"].rstrip("/"),
            email=required["JIRA_EMAIL"],
            api_token=required["JIRA_API_TOKEN"],
            project_key=jira_cfg.get("project_key", "PROJ"),
            issue_types=jira_cfg.get("issue_types", ["Bug", "Story", "Task", "Improvement"]),
            fields_to_fetch=jira_cfg.get("fields_to_fetch", [
                "summary", "description", "issuetype", "status", "assignee", "fixVersions"
            ]),
        ),
        confluence=ConfluenceConfig(
            base_url=required["CONFLUENCE_BASE_URL"].rstrip("/"),
            email=required["CONFLUENCE_EMAIL"],
            api_token=required["CONFLUENCE_API_TOKEN"],
            space_key=confluence_cfg.get("space_key", "SE"),
            release_notes_parent_page_id=confluence_cfg.get("release_notes_parent_page_id", ""),
        ),
        figma=FigmaConfig(
            api_token=os.getenv("FIGMA_API_TOKEN", ""),
            base_url="https://api.figma.com",
        ),
        ai=AIConfig(
            model=ai_cfg.get("model", "claude-sonnet-4-6"),
            max_tokens=ai_cfg.get("max_tokens", 4096),
        ),
        paths=PathConfig(
            input_transcripts=paths_cfg.get("input_transcripts", "input/transcripts"),
            input_release_notes_detailed=paths_cfg.get("input_release_notes_detailed", "input/release_notes_detailed"),
            output_release_notes_short=paths_cfg.get("output_release_notes_short", "output/release_notes_short"),
            output_meeting_notes=paths_cfg.get("output_meeting_notes", "output/meeting_notes"),
            output_test_cases=paths_cfg.get("output_test_cases", "output/test_cases"),
            output_release_notes_detailed=paths_cfg.get("output_release_notes_detailed", "output/release_notes_detailed"),
            output_bug_reports=paths_cfg.get("output_bug_reports", "output/bug_reports"),
            output_user_stories=paths_cfg.get("output_user_stories", "output/user_stories"),
            templates_dir=paths_cfg.get("templates_dir", "src/templates"),
        ),
        output=OutputConfig(
            date_format=output_cfg.get("date_format", "%Y-%m-%d"),
            release_notes_short_filename_pattern=output_cfg.get(
                "release_notes_short_filename_pattern", "{project}_{version}_{date}"
            ),
            meeting_notes_filename_pattern=output_cfg.get(
                "meeting_notes_filename_pattern", "{transcript_stem}_{date}"
            ),
            test_cases_filename_pattern=output_cfg.get(
                "test_cases_filename_pattern", "{story_id}_test_cases_{date}"
            ),
            user_stories_filename_pattern=output_cfg.get(
                "user_stories_filename_pattern", "user_stories_{title}_{date}"
            ),
        ),
        branding=BrandingConfig(
            company_name=branding_cfg.get("company_name", "Schneider Electric"),
            primary_color=branding_cfg.get("primary_color", "#3DCD58"),
            dark_color=branding_cfg.get("dark_color", "#009530"),
            text_color=branding_cfg.get("text_color", "#333333"),
            border_color=branding_cfg.get("border_color", "#C8E6C9"),
            row_alt_color=branding_cfg.get("row_alt_color", "#F0FBF2"),
            hover_color=branding_cfg.get("hover_color", "#E8F5E9"),
            font_family=branding_cfg.get("font_family", "'Nunito Sans', Arial, sans-serif"),
        ),
    )
