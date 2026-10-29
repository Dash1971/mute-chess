#!/usr/bin/env python3
"""Build the chosen Quiet Signal identity; external checkout writes are opt-in."""

import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / "quiet-signal/build.py"), run_name="__main__")
