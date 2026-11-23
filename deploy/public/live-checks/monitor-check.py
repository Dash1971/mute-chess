"""CRITICAL: active release fingerprint, control hashes and isolation.
Committed from the 23 November live checks (#383)."""
from pathlib import Path
import argparse,importlib.util,json


def verify_planned_paths(actual,expected):
 assert '/opt/nosweatchess/current/RELEASE.json' in expected
 assert sorted(actual)==sorted(expected),(actual,expected)


def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--expected-path',action='append',required=True,help='Repeat for every planned path declared before maintenance')
 args=parser.parse_args()
 p=Path.home()/'.local/libexec/nosweatchess-monitor/nosweat_host_monitor.py';spec=importlib.util.spec_from_file_location('mon',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 s=m.load_state();v=m.fetch('status');b=s['candidate_baseline'];d=m.critical_drift(v,b)
 result={'allControlHashesMatch':all(v['integrity_sha256'].get(p)==h for p,h in b['integrity_sha256'].items()),'isolationUnchanged':v['isolation_present'] and v['isolation_shape_sha256']==b['isolation_shape_sha256'],'containment':v['containment_latched'],'expectedReleaseFingerprint':b['integrity_sha256']['/opt/nosweatchess/current/RELEASE.json'],'plannedPaths':s['last_planned_maintenance']['paths'],'criticalDrift':d}
 print(json.dumps(result));assert result['allControlHashesMatch'] and result['isolationUnchanged'] and not result['containment'] and not d
 verify_planned_paths(result['plannedPaths'],args.expected_path)


if __name__=='__main__':main()
