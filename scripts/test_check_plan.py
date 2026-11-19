"""Synthetic regression tests: passing these is not a generated-video test."""
import copy
import unittest
from check_plan import check


def nine_shots():
    state = {"lamp.count": 1, "lamp.holder": "woman", "woman.position": "left"}
    shots = []
    for i in range(9):
        before = dict(state)
        changes = []
        if i == 4:
            changes = [{"key": "lamp.holder", "from": "woman", "to": "bench", "event": "contact then release"}]
            state["lamp.holder"] = "bench"
        shots.append({"id": f"S{i+1:02}", "start": i*5, "end": (i+1)*5,
                      "refs": ["image1"], "source_facts": ["F1"] if i == 4 else [],
                      "pre": before, "post": dict(state), "changes": changes,
                      "camera": {"start": "shore", "path": "locked", "end": "same frame"},
                      "transition": "end" if i == 8 else "cut"})
    return {"duration": 45, "shot_count": 9, "mode": "independent", "reference_ids": ["image1"],
            "initial_state": shots[0]["pre"], "required_facts": ["F1"], "shots": shots}


class Invariants(unittest.TestCase):
    def test_valid_nine(self):
        self.assertEqual(check(nine_shots()), [])

    def test_bad_cases(self):
        mutations = {
            "gap": lambda p: p["shots"][2].update(start=11),
            "overlap": lambda p: p["shots"][2].update(start=9),
            "prop_reset": lambda p: p["shots"][5]["pre"].update({"lamp.holder": "woman"}),
            "missing_event": lambda p: p["shots"][4].update(changes=[]),
            "missing_fact": lambda p: p["shots"][4].update(source_facts=[]),
            "unbound_ref": lambda p: p["shots"][0].update(refs=["image99"]),
            "single_take_cut": lambda p: p.update(mode="single_take"),
            "missing_camera_end": lambda p: p["shots"][0]["camera"].update(end=""),
            "count_mismatch": lambda p: p.update(shot_count=8),
            "total_mismatch": lambda p: p.update(duration=40),
            "negative_count": lambda p: p["shots"][8]["post"].update({"lamp.count": -1}),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                plan = copy.deepcopy(nine_shots())
                mutate(plan)
                self.assertTrue(check(plan), label)


if __name__ == "__main__":
    unittest.main(verbosity=2)
