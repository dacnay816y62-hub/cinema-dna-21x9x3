"""Validate declared storyboard invariants, not prose meaning or rendered quality."""
import argparse
import json
import math
from pathlib import Path


def check(plan):
    errors = []
    if not isinstance(plan, dict):
        return ["plan must be an object"]
    shots = plan.get("shots")
    if not isinstance(shots, list) or not shots:
        return ["shots must be a nonempty list"]
    if plan.get("shot_count") != len(shots):
        errors.append("shot_count mismatch")
    mode = plan.get("mode")
    if mode not in {"edited", "single_take", "independent"}:
        errors.append("unknown mode")
    refs = set(plan.get("reference_ids", []))
    facts = set()
    previous = plan.get("initial_state")
    if not isinstance(previous, dict):
        return errors + ["initial_state must be an object"]
    cursor = 0.0
    ids = set()
    for index, shot in enumerate(shots):
        label = f"shot {index + 1}"
        if not isinstance(shot, dict):
            errors.append(f"{label}: must be an object")
            continue
        sid = shot.get("id")
        if not isinstance(sid, str) or not sid or sid in ids:
            errors.append(f"{label}: missing/duplicate id")
        else:
            ids.add(sid)
        start, end = shot.get("start"), shot.get("end")
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (start, end)):
            errors.append(f"{label}: invalid time")
        else:
            if abs(start - cursor) > 1e-6:
                errors.append(f"{label}: timing gap/overlap")
            if end <= start:
                errors.append(f"{label}: nonpositive duration")
            cursor = end
        if not set(shot.get("refs", [])).issubset(refs):
            errors.append(f"{label}: unbound reference")
        facts.update(shot.get("source_facts", []))
        pre, post = shot.get("pre"), shot.get("post")
        if not isinstance(pre, dict) or not isinstance(post, dict):
            errors.append(f"{label}: pre/post must be objects")
            continue
        if pre != previous:
            errors.append(f"{label}: state reset or missing continuity event")
        expected = dict(pre)
        changed = set()
        changes = shot.get("changes", [])
        if not isinstance(changes, list):
            errors.append(f"{label}: changes must be a list")
            changes = []
        for change in changes:
            if not isinstance(change, dict):
                errors.append(f"{label}: invalid change")
                continue
            key = change.get("key")
            if not isinstance(key, str) or key not in pre or key in changed:
                errors.append(f"{label}: unknown/duplicate changed key")
                continue
            changed.add(key)
            if pre[key] != change.get("from") or not change.get("event"):
                errors.append(f"{label}: change missing source state/event")
            expected[key] = change.get("to")
        if expected != post:
            errors.append(f"{label}: post-state lacks matching change")
        for key, value in post.items():
            if key.endswith(".count") and (isinstance(value, bool) or not isinstance(value, int) or value < 0):
                errors.append(f"{label}: invalid entity count")
        previous = post
        camera = shot.get("camera", {})
        if not isinstance(camera, dict) or any(not camera.get(k) for k in ("start", "path", "end")):
            errors.append(f"{label}: incomplete camera start/path/end")
        transition = shot.get("transition")
        if index == len(shots) - 1:
            if transition != "end":
                errors.append(f"{label}: final transition must be end")
        elif transition not in {"cut", "continuous", "match_cut", "time_jump", "reestablish"}:
            errors.append(f"{label}: invalid transition")
        elif mode == "single_take" and transition != "continuous":
            errors.append(f"{label}: cut inside single take")
    duration = plan.get("duration")
    if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or abs(cursor - duration) > 1e-6:
        errors.append("total duration mismatch")
    missing = set(plan.get("required_facts", [])) - facts
    if missing:
        errors.append("missing source facts: " + ", ".join(sorted(missing)))
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path)
    args = parser.parse_args()
    try:
        issues = check(json.loads(args.plan.read_text(encoding="utf-8-sig")))
    except (OSError, ValueError, TypeError) as exc:
        issues = [str(exc)]
    print(json.dumps({"declared_structure_passed": not issues, "errors": issues,
                      "not_tested": ["prompt semantics", "visual continuity", "video motion", "audio"]}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if issues else 0)
