"""Locate and load the seed YAML files under infra/seed/."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


def _find_seed_dir() -> Path:
    env = os.environ.get("PLANETAI_SEED_DIR")
    if env:
        return Path(env)
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "infra" / "seed"
        if candidate.is_dir():
            return candidate
    raise FileNotFoundError("infra/seed not found; set PLANETAI_SEED_DIR")


SEED_DIR = _find_seed_dir()


def _load(name: str) -> Any:
    with open(SEED_DIR / name, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


@lru_cache
def sources() -> list[dict]:
    return _load("sources.yaml")


@lru_cache
def entities() -> dict:
    return _load("entities.yaml")


@lru_cache
def entity_relations() -> list[list[str]]:
    return _load("entity_relations.yaml")


@lru_cache
def topics() -> list[dict]:
    return _load("topics.yaml")


@lru_cache
def category_rules() -> dict:
    return _load("category_rules.yaml")


@lru_cache
def editorial() -> dict:
    return _load("editorial.yaml")


@lru_cache
def marketplace() -> dict:
    return _load("marketplace.yaml")


@lru_cache
def turkiye() -> dict:
    return _load("turkiye.yaml")


@lru_cache
def stories() -> dict:
    path = SEED_DIR / "stories.yaml"
    if not path.exists():
        return {"stories": []}
    return _load("stories.yaml") or {"stories": []}


@lru_cache
def llm_developers() -> dict:
    path = SEED_DIR / "llm_developers.yaml"
    if not path.exists():
        return {"developers": []}
    return _load("llm_developers.yaml") or {"developers": []}
