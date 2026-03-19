"""File I/O utility helpers."""

from __future__ import annotations

from pathlib import Path


def ensure_dir(path: str | Path) -> Path:
    """Create directory (and parents) if it does not exist. Returns Path."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def read_text(filepath: str | Path, encoding: str = "utf-8") -> str:
    """Read and return the full text content of a file."""
    return Path(filepath).read_text(encoding=encoding)


def write_text(content: str, filepath: str | Path, encoding: str = "utf-8") -> Path:
    """Write text content to a file, creating parent directories as needed."""
    p = Path(filepath)
    ensure_dir(p.parent)
    p.write_text(content, encoding=encoding)
    return p


def get_transcript_files(input_dir: str | Path, extensions: tuple[str, ...] = (".txt",)) -> list[Path]:
    """Return all transcript files in input_dir matching the given extensions."""
    d = Path(input_dir)
    if not d.exists():
        return []
    return sorted(f for f in d.iterdir() if f.is_file() and f.suffix.lower() in extensions)


def sanitize_filename(name: str) -> str:
    """Replace characters unsafe for filenames with underscores."""
    unsafe = r'\/:*?"<>| '
    return "".join("_" if c in unsafe else c for c in name)
