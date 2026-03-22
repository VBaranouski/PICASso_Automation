"""
SE-DevTools - Schneider Electric Developer Productivity CLI
============================================================

Commands:
  release-notes-short    Simple issue table release notes from a JIRA version
  release-notes-detailed Full AI-generated document (PICASso format) from a JIRA version
  pptx-release-notes   SE-branded PPTX presentation from a JSON spec file
  meeting-notes        Meeting notes from transcript files (Claude AI)
  test-cases           Test cases from JIRA user stories (Claude AI)
  user-stories         User Stories from Confluence spec + Figma mockups (Claude AI)

Usage:
  python main.py release-notes-short --version "2.4.1" [--project PROJ] [--publish]
  python main.py release-notes-detailed --version "2.4.1" [--project PROJ] [--spec "spec.txt"] [--publish]
  python main.py pptx-release-notes --spec "spec.json"
  python main.py meeting-notes --file "standup.txt" | --all
  python main.py test-cases --story PROJ-452 [--story PROJ-453 ...]
  python main.py user-stories --confluence-url "https://..." [--fetch-only]
  python main.py user-stories --spec-data PATH --stories-json PATH
"""

from __future__ import annotations

import sys
from pathlib import Path

import click

from src.clients.confluence_client import ConfluenceClient
from src.clients.figma_client import FigmaClient
from src.clients.jira_client import JiraClient
from src.config.settings import load_settings
from src.generators.bug_report import BugReportGenerator
from src.generators.email_summary import EmailSummaryGenerator
from src.generators.story_coverage import StoryCoverageGenerator
from src.generators.release_notes_detailed import FullReleaseNotesGenerator
from src.generators.pptx_release_notes import PptxReleaseNotesGenerator
from src.generators.meeting_notes import MeetingNotesGenerator
from src.generators.release_notes_short import ReleaseNotesGenerator
from src.generators.test_cases import TestCasesGenerator
from src.generators.user_stories import UserStoriesGenerator


# ---------------------------------------------------------------------------
# CLI group
# ---------------------------------------------------------------------------

@click.group()
@click.version_option(version="1.0.0", prog_name="SE-DevTools")
@click.pass_context
def cli(ctx: click.Context) -> None:
    """SE-DevTools: Schneider Electric Automated Documentation & Testing CLI."""
    ctx.ensure_object(dict)
    try:
        ctx.obj["settings"] = load_settings()
    except (FileNotFoundError, ValueError) as exc:
        click.echo(click.style(f"\n[ERROR] {exc}\n", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# release-notes command
# ---------------------------------------------------------------------------

@cli.command("release-notes-short")
@click.option(
    "--version", "-v",
    default=None,
    help="JIRA version / release name (e.g. '2.4.1' or 'Sprint 42').",
)
@click.option(
    "--version-id",
    default=None,
    help="JIRA version numeric ID (alternative to --version name).",
)
@click.option(
    "--project", "-p",
    default=None,
    show_default=True,
    help="JIRA project key. Overrides the value in config.yaml.",
)
@click.option(
    "--publish",
    is_flag=True,
    default=False,
    help="Publish generated HTML to Confluence after creation.",
)
@click.option(
    "--release-date",
    default=None,
    help="Override the release date shown in the output (e.g. '28 March 2026').",
)
@click.option(
    "--style",
    default="default",
    show_default=True,
    type=click.Choice(["default", "hacker"], case_sensitive=False),
    help="Visual style for the HTML output.",
)
@click.pass_context
def release_notes_cmd(
    ctx: click.Context,
    version: str | None,
    version_id: str | None,
    project: str | None,
    publish: bool,
    release_date: str | None,
    style: str,
) -> None:
    """Generate release notes from a JIRA version/release."""
    if not version and not version_id:
        raise click.UsageError("Provide either --version or --version-id.")

    settings = ctx.obj["settings"]
    label = version_id or version
    click.echo(click.style(f"\n[SE-DevTools] Generating Release Notes for version '{label}'", bold=True))

    jira = JiraClient(settings.jira)
    confluence = ConfluenceClient(settings.confluence) if publish else None
    generator = ReleaseNotesGenerator(jira, settings, confluence=confluence, style=style)

    try:
        txt_path, html_path = generator.generate(
            version_name=version,
            version_id=version_id,
            project_key=project,
            publish_to_confluence=publish,
            release_date_override=release_date,
        )
        click.echo(click.style("\n  Done!", fg="green", bold=True))
        click.echo(f"  TXT  -> {txt_path}")
        click.echo(f"  HTML -> {html_path}")
    except Exception as exc:
        click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# meeting-notes command
# ---------------------------------------------------------------------------

@cli.command("meeting-notes")
@click.option("--file", "-f", "filename", default=None, help="Transcript filename in input/transcripts/ (e.g. 'standup.txt').")
@click.option("--all", "process_all", is_flag=True, default=False, help="Fetch ALL transcripts in input/transcripts/.")
@click.option("--fetch-only", is_flag=True, default=False, help="Read transcript(s) and write transcript_data JSON. No AI, no HTML.")
@click.option("--summary-json", default=None, help="Path to summary JSON (render mode, single transcript).")
@click.option("--stem", default=None, help="Transcript stem used for output filename (required with --summary-json).")
@click.pass_context
def meeting_notes_cmd(
    ctx: click.Context,
    filename: str | None,
    process_all: bool,
    fetch_only: bool,
    summary_json: str | None,
    stem: str | None,
) -> None:
    """Read transcript(s) (--fetch-only) or render HTML/TXT from summary (--summary-json)."""
    import json as _json
    from src.utils.file_utils import ensure_dir
    from src.utils.date_utils import today_str

    settings = ctx.obj["settings"]
    generator = MeetingNotesGenerator(settings)

    # ------------------------------------------------------------------ #
    # Mode 1: --fetch-only — read transcript(s), write JSON               #
    # ------------------------------------------------------------------ #
    if fetch_only:
        click.echo(click.style("\n[SE-DevTools] Reading Transcript(s)", bold=True))
        try:
            if process_all:
                transcripts = generator.read_all_transcripts()
            elif filename:
                transcripts = [generator.read_transcript(filename)]
            else:
                click.echo(click.style("  [ERROR] Provide --file or --all with --fetch-only", fg="red"), err=True)
                sys.exit(1)

            out_dir = ensure_dir(settings.paths.output_meeting_notes)
            date_str = today_str(settings.output.date_format)
            paths = []
            for t in transcripts:
                data_path = out_dir / f"transcript_data_{t['stem']}_{date_str}.json"
                data_path.write_text(_json.dumps(t, ensure_ascii=False, indent=2), encoding="utf-8")
                paths.append(str(data_path))
            click.echo(click.style(f"\n  Done! {len(paths)} transcript(s) ready.", fg="green", bold=True))
            for p in paths:
                click.echo(f"  TRANSCRIPT_DATA -> {p}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    # ------------------------------------------------------------------ #
    # Mode 2: --summary-json — render HTML + TXT                          #
    # ------------------------------------------------------------------ #
    if summary_json:
        if not stem:
            click.echo(click.style("  [ERROR] --stem is required with --summary-json", fg="red"), err=True)
            sys.exit(1)
        click.echo(click.style("\n[SE-DevTools] Rendering Meeting Notes", bold=True))
        try:
            summary_data = _json.loads(Path(summary_json).read_text(encoding="utf-8"))
            txt_path, html_path = generator.render_from_summary(summary_data, stem)
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  TXT  -> {txt_path}")
            click.echo(f"  HTML -> {html_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    click.echo(click.style(
        "\n  [ERROR] Use --fetch-only [--file|--all] to read transcripts, "
        "or --summary-json PATH --stem STEM to render HTML.", fg="red",
    ), err=True)
    sys.exit(1)


# ---------------------------------------------------------------------------
# test-cases command
# ---------------------------------------------------------------------------

@cli.command("test-cases")
@click.option("--story", "-s", "story_ids", multiple=True, help="JIRA story ID (repeatable). Required for --fetch-only.")
@click.option("--fetch-only", is_flag=True, default=False, help="Fetch story data and write story_data JSON. No AI, no HTML.")
@click.option("--story-data", default=None, help="Path to story_data JSON (render mode, single story).")
@click.option("--test-cases-json", default=None, help="Path to test cases JSON array (render mode).")
@click.pass_context
def test_cases_cmd(
    ctx: click.Context,
    story_ids: tuple[str, ...],
    fetch_only: bool,
    story_data: str | None,
    test_cases_json: str | None,
) -> None:
    """Fetch story data (--fetch-only) or render HTML from test cases (--story-data + --test-cases-json)."""
    import json as _json
    from src.utils.date_utils import today_str
    from src.utils.file_utils import ensure_dir

    settings = ctx.obj["settings"]
    generator = TestCasesGenerator(JiraClient(settings.jira), settings)

    # ------------------------------------------------------------------ #
    # Mode 1: --fetch-only — fetch JIRA stories, write JSON               #
    # ------------------------------------------------------------------ #
    if fetch_only:
        if not story_ids:
            click.echo(click.style("  [ERROR] --story is required with --fetch-only", fg="red"), err=True)
            sys.exit(1)
        click.echo(click.style(f"\n[SE-DevTools] Fetching story data for: {', '.join(story_ids)}", bold=True))
        try:
            out_dir = ensure_dir(settings.paths.output_test_cases)
            date_str = today_str(settings.output.date_format)
            paths = []
            for sid in story_ids:
                data = generator.fetch_story(sid)
                data_path = out_dir / f"story_data_{sid}_{date_str}.json"
                data_path.write_text(_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
                paths.append(str(data_path))
            click.echo(click.style(f"\n  Done! {len(paths)} story(s) fetched.", fg="green", bold=True))
            for p in paths:
                click.echo(f"  STORY_DATA -> {p}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    # ------------------------------------------------------------------ #
    # Mode 2: --story-data + --test-cases-json — render HTML              #
    # ------------------------------------------------------------------ #
    if story_data and test_cases_json:
        click.echo(click.style("\n[SE-DevTools] Rendering Test Cases HTML", bold=True))
        try:
            sd = _json.loads(Path(story_data).read_text(encoding="utf-8"))
            tc = _json.loads(Path(test_cases_json).read_text(encoding="utf-8"))
            html_path = generator.render_from_test_cases(sd, tc)
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  HTML -> {html_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    click.echo(click.style(
        "\n  [ERROR] Use --fetch-only --story PROJ-123 to fetch story data, "
        "or --story-data PATH --test-cases-json PATH to render HTML.",
        fg="red",
    ), err=True)
    sys.exit(1)


# ---------------------------------------------------------------------------
# release-notes-detailed command
# ---------------------------------------------------------------------------

@cli.command("release-notes-detailed")
@click.option("--version", "-v", default=None, help="JIRA version name. Required for --fetch-only.")
@click.option("--project", "-p", default=None, help="JIRA project key. Overrides the value in config.yaml.")
@click.option("--spec", "-s", "spec_filename", default=None, help="Spec file in input/release_notes_detailed/ (auto-detected if omitted).")
@click.option("--fetch-only", is_flag=True, default=False, help="Fetch JIRA data and write release_data JSON. No AI, no HTML.")
@click.option("--release-data", default=None, help="Path to release_data JSON (render mode).")
@click.option("--html-body", default=None, help="Path to .html file with AI-generated body content (render mode).")
@click.option("--publish", is_flag=True, default=False, help="Publish generated HTML to Confluence after creation.")
@click.pass_context
def full_release_notes_cmd(
    ctx: click.Context,
    version: str | None,
    project: str | None,
    spec_filename: str | None,
    fetch_only: bool,
    release_data: str | None,
    html_body: str | None,
    publish: bool,
) -> None:
    """Fetch JIRA data (--fetch-only) or render HTML from AI body (--release-data + --html-body)."""
    import json as _json
    from src.utils.date_utils import today_str
    from src.utils.file_utils import ensure_dir, sanitize_filename

    settings = ctx.obj["settings"]

    # ------------------------------------------------------------------ #
    # Mode 1: --fetch-only — fetch JIRA version + issues, write JSON      #
    # ------------------------------------------------------------------ #
    if fetch_only:
        if not version:
            click.echo(click.style("  [ERROR] --version is required with --fetch-only", fg="red"), err=True)
            sys.exit(1)
        click.echo(click.style(f"\n[SE-DevTools] Fetching release data for version '{version}'", bold=True))
        try:
            confluence = ConfluenceClient(settings.confluence) if publish else None
            generator = FullReleaseNotesGenerator(JiraClient(settings.jira), settings, confluence=confluence)
            data = generator.fetch_data(version_name=version, project_key=project, spec_filename=spec_filename)
            out_dir = ensure_dir(settings.paths.output_release_notes_detailed)
            date_str = today_str(settings.output.date_format)
            safe_ver = sanitize_filename(version)
            data_path = out_dir / f"release_data_{safe_ver}_{date_str}.json"
            data_path.write_text(_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  RELEASE_DATA -> {data_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    # ------------------------------------------------------------------ #
    # Mode 2: --release-data + --html-body — render HTML shell            #
    # ------------------------------------------------------------------ #
    if release_data and html_body:
        click.echo(click.style("\n[SE-DevTools] Rendering Full Release Notes HTML", bold=True))
        try:
            rd = _json.loads(Path(release_data).read_text(encoding="utf-8"))
            body = Path(html_body).read_text(encoding="utf-8")
            confluence = ConfluenceClient(settings.confluence) if publish else None
            generator = FullReleaseNotesGenerator(JiraClient(settings.jira), settings, confluence=confluence)
            html_path = generator.render_from_body(rd, body, publish_to_confluence=publish)
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  HTML -> {html_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    click.echo(click.style(
        "\n  [ERROR] Use --fetch-only --version NAME to fetch release data, "
        "or --release-data PATH --html-body PATH to render HTML.",
        fg="red",
    ), err=True)
    sys.exit(1)


# ---------------------------------------------------------------------------
# pptx-release-notes command
# ---------------------------------------------------------------------------

@cli.command("pptx-release-notes")
@click.option(
    "--spec", "-s",
    "spec_path",
    required=True,
    help="Path to JSON spec file with presentation content (see output/full_release_notes/template/pptx_spec_template.json).",
)
@click.pass_context
def pptx_release_notes_cmd(ctx: click.Context, spec_path: str) -> None:
    """Generate SE-branded PPTX release notes from a JSON spec file."""
    settings = ctx.obj["settings"]

    click.echo(click.style(f"\n[SE-DevTools] Generating PPTX Release Notes from '{spec_path}'", bold=True))

    generator = PptxReleaseNotesGenerator(settings)

    try:
        pptx_path = generator.generate(spec_path)
        click.echo(click.style("\n  Done!", fg="green", bold=True))
        click.echo(f"  PPTX -> {pptx_path}")
    except Exception as exc:
        click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# bug-report command
# ---------------------------------------------------------------------------

@cli.command("bug-report")
@click.option("--style", type=click.Choice(["default", "hacker"], case_sensitive=False), default="default", help="Visual style for the report.")
@click.option("--since", default=None, help="Only include defects created on or after this date (ISO format, e.g. '2026-03-01').")
@click.pass_context
def bug_report_cmd(ctx: click.Context, style: str, since: str | None) -> None:
    """Generate a SIT / UAT / Production bug & defect report from JIRA."""
    settings = ctx.obj["settings"]

    click.echo(click.style("\n[SE-DevTools] Generating Bug & Defect Report", bold=True))
    click.echo(f"  Style: {style}")
    if since:
        click.echo(f"  Since: {since}")
    click.echo("  Querying JIRA for three reporter groups...")

    jira = JiraClient(settings.jira)
    generator = BugReportGenerator(jira, settings, style=style)

    try:
        html_path = generator.generate(since=since)
        click.echo(click.style("\n  Done!", fg="green", bold=True))
        click.echo(f"  HTML -> {html_path}")
    except Exception as exc:
        click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# email-summary command
# ---------------------------------------------------------------------------

@cli.command("email-summary")
@click.pass_context
def email_summary_cmd(ctx: click.Context) -> None:
    """Generate a short executive email summary (SVP/VP level) from the bug/defect data."""
    settings = ctx.obj["settings"]

    click.echo(click.style("\n[SE-DevTools] Generating Executive Email Summary", bold=True))

    jira = JiraClient(settings.jira)
    generator = EmailSummaryGenerator(jira, settings)

    try:
        html_path = generator.generate()
        click.echo(click.style("\n  Done!", fg="green", bold=True))
        click.echo(f"  HTML -> {html_path}")
    except Exception as exc:
        click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# story-coverage command
# ---------------------------------------------------------------------------

@cli.command("story-coverage")
@click.pass_context
def story_coverage_cmd(ctx: click.Context) -> None:
    """Generate a story-coverage summary: how many user stories were tested via defects."""
    settings = ctx.obj["settings"]

    click.echo(click.style("\n[SE-DevTools] Generating Story Coverage Summary", bold=True))
    click.echo("  Fetching defects and resolving parent story links...")

    jira = JiraClient(settings.jira)
    generator = StoryCoverageGenerator(jira, settings)

    try:
        html_path = generator.generate()
        click.echo(click.style("\n  Done!", fg="green", bold=True))
        click.echo(f"  HTML -> {html_path}")
    except Exception as exc:
        click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
        sys.exit(1)


# ---------------------------------------------------------------------------
# user-stories command
# ---------------------------------------------------------------------------

@cli.command("user-stories")
@click.option("--confluence-url", default=None, help="Confluence page URL (required for --fetch-only).")
@click.option("--figma-url", default=None, help="Figma design URL (optional, used with --fetch-only).")
@click.option("--example-story", "example_stories", multiple=True, help="JIRA story ID for format reference (repeatable).")
@click.option("--epic", default=None, help="Parent Epic/Feature JIRA key for context (e.g. PIC-8802).")
@click.option("--project", "-p", default=None, help="JIRA project key. Overrides config.yaml default.")
@click.option("--fetch-only", is_flag=True, default=False, help="Fetch spec data and write spec_data.json. No AI, no HTML.")
@click.option("--spec-data", default=None, help="Path to spec_data.json (render mode).")
@click.option("--stories-json", default=None, help="Path to stories JSON array (render mode).")
@click.option(
    "--style",
    default="default",
    show_default=True,
    type=click.Choice(["default", "hacker"], case_sensitive=False),
    help="Visual style for the HTML output.",
)
@click.pass_context
def user_stories_cmd(
    ctx: click.Context,
    confluence_url: str | None,
    figma_url: str | None,
    example_stories: tuple[str, ...],
    epic: str | None,
    project: str | None,
    fetch_only: bool,
    spec_data: str | None,
    stories_json: str | None,
    style: str,
) -> None:
    """Fetch spec data (--fetch-only) or render HTML from stories (--spec-data + --stories-json)."""
    import json as _json
    from src.utils.date_utils import today_str
    from src.utils.file_utils import ensure_dir

    settings = ctx.obj["settings"]

    # ------------------------------------------------------------------ #
    # Mode 1: --fetch-only — fetch Confluence/JIRA/Figma, write JSON      #
    # ------------------------------------------------------------------ #
    if fetch_only:
        if not confluence_url:
            click.echo(click.style("  [ERROR] --confluence-url is required with --fetch-only", fg="red"), err=True)
            sys.exit(1)

        click.echo(click.style("\n[SE-DevTools] Fetching User Stories spec data", bold=True))
        click.echo(f"  Spec:  {confluence_url}")

        confluence = ConfluenceClient(settings.confluence)
        figma = FigmaClient(settings.figma) if (figma_url and settings.figma.api_token) else None
        jira = JiraClient(settings.jira) if (example_stories or epic) else None

        generator = UserStoriesGenerator(confluence, figma, jira, settings)
        try:
            data = generator.fetch_data(
                confluence_url=confluence_url,
                figma_url=figma_url,
                example_story_ids=list(example_stories) if example_stories else None,
                epic_key=epic,
            )
            out_dir = ensure_dir(settings.paths.output_user_stories)
            date_str = today_str(settings.output.date_format)
            from src.utils.file_utils import sanitize_filename
            safe_title = sanitize_filename(data["page_title"])[:40]
            spec_data_path = out_dir / f"spec_data_{safe_title}_{date_str}.json"
            spec_data_path.write_text(_json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  SPEC_DATA -> {spec_data_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    # ------------------------------------------------------------------ #
    # Mode 2: --spec-data + --stories-json — render HTML                  #
    # ------------------------------------------------------------------ #
    if spec_data and stories_json:
        click.echo(click.style("\n[SE-DevTools] Rendering User Stories HTML", bold=True))
        try:
            spec = _json.loads(Path(spec_data).read_text(encoding="utf-8"))
            stories = _json.loads(Path(stories_json).read_text(encoding="utf-8"))
            confluence = ConfluenceClient(settings.confluence)
            generator = UserStoriesGenerator(confluence, None, None, settings)
            html_path = generator.render_from_stories(spec, stories, style=style)
            click.echo(click.style("\n  Done!", fg="green", bold=True))
            click.echo(f"  HTML -> {html_path}")
        except Exception as exc:
            click.echo(click.style(f"\n  [ERROR] {exc}", fg="red"), err=True)
            sys.exit(1)
        return

    click.echo(click.style(
        "\n  [ERROR] Use --fetch-only to fetch spec data, "
        "or --spec-data + --stories-json to render HTML.",
        fg="red",
    ), err=True)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cli()
