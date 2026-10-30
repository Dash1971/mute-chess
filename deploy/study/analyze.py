#!/usr/bin/env python3
"""Summarize the public native trial's saved evidence; no rating calculation."""
import argparse
import csv
import datetime as dt
import json
from pathlib import Path
import statistics


def distribution(values):
    values = sorted(values)
    if not values:
        return {'count': 0}
    def quantile(p):
        return values[min(len(values)-1, max(0, int(__import__('math').ceil(len(values)*p))-1))]
    return {'count': len(values), 'min': values[0], 'median': statistics.median(values),
            'p95': quantile(.95), 'p99': quantile(.99), 'max': values[-1]}


def epoch(text):
    return dt.datetime.fromisoformat(text.replace('Z', '+00:00')).timestamp()


def integer(value):
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0


def analyze(root):
    events = [json.loads(line) for line in (root/'events.jsonl').read_text().splitlines()]
    resources = [json.loads(line) for line in (root/'resources.jsonl').read_text().splitlines()]
    checkpoint = json.loads((root/'checkpoint.json').read_text())
    supervisor = json.loads((root/'supervisor.json').read_text()) if (root/'supervisor.json').exists() else None
    initial = checkpoint['initial']['ratings']
    latest = checkpoint['latest']['ratings']
    admitted = [e for e in events if e['type']=='admission']
    finished = [e for e in events if e['type']=='finish']
    moves = [e for e in events if e['type']=='move']
    rated = [e for e in finished if e['result']['ratedUpdate']]
    assert len({e['id'] for e in admitted}) == len(admitted) <= 100
    assert len({e['id'] for e in finished}) == len(finished)
    assert {e['id'] for e in finished} <= {e['id'] for e in admitted}
    assert all(e['policies'][color]['runId'] == checkpoint['run'] for e in admitted for color in ('white','black'))
    assert all(e['policies'][color]['addedHumanWait'] is False for e in admitted for color in ('white','black'))
    rows = []
    for bot in sorted(initial):
        for speed in ('blitz', 'rapid'):
            a,b = initial[bot][speed], latest[bot][speed]
            rows.append({'bot':bot, 'speed':speed, 'initial_rating':a['rating'], 'final_rating':b['rating'],
                         'rating_change':b['rating']-a['rating'], 'initial_rd':a['rd'], 'final_rd':b['rd'],
                         'initial_games':a['games'], 'final_games':b['games'], 'games_added':b['games']-a['games'],
                         'initial_provisional':a['provisional'], 'final_provisional':b['provisional']})
    with (root/'ratings.csv').open('w',newline='') as output:
        writer=csv.DictWriter(output,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    stages = {}
    completed = 0
    for event in events:
        if event['type']=='finish':
            completed += 1
        if event['type']!='move':
            continue
        target=[p['concurrency'] for p in checkpoint['initial']['stages'] if completed>=p['completed']][-1]
        stage=stages.setdefault(str(target),{'moves':[],'first':epoch(event['at']),'last':epoch(event['at'])})
        stage['moves'].append(event); stage['last']=epoch(event['at'])
    stage_stats={}
    for key,s in stages.items():
        duration=s['last']-s['first']
        stage_stats[key]={'moves':len(s['moves']), 'observed_seconds':duration,
                         'plies_per_second':len(s['moves'])/duration if duration else None,
                         'inference_ms':distribution([m['inferenceMs'] for m in s['moves']]),
                         'request_commit_ms':distribution([m['totalMs'] for m in s['moves']]),
                         'turn_commit_ms':distribution([m['turnToCommitMs'] for m in s['moves']]),
                         'max_observed_active_games':max(m['concurrency'] for m in s['moves'])}
    memory=[];cpu=[]
    for i,s in enumerate(resources):
        current={'worker':s['worker'],**s['services']}
        memory.append(sum(integer(p.get('MemoryCurrent')) for p in current.values()))
        if i:
            previous={'worker':resources[i-1]['worker'],**resources[i-1]['services']}
            elapsed=(s['at']-resources[i-1]['at'])/1000
            used=sum(max(0,integer(p.get('CPUUsageNSec'))-integer(previous[name].get('CPUUsageNSec'))) for name,p in current.items())
            if elapsed>0:cpu.append(used/1e9/elapsed)
    mongo=[s['mongo'] for s in resources if 'mongo' in s]
    storage_growth=mongo[-1]['storage']-mongo[0]['storage'] if mongo else None
    op_deltas={k:integer(mongo[-1]['ops'][k])-integer(mongo[0]['ops'][k]) for k in mongo[0]['ops']} if mongo else {}
    started=epoch(next(e for e in events if e['type']=='start')['at'])
    ended=epoch(next(e for e in reversed(events) if e['type']=='end')['at'])
    played_components = {}
    for speed in ('blitz','rapid'):
        parent = {bot:bot for bot in initial}
        def find(bot):
            while parent[bot] != bot:
                parent[bot] = parent[parent[bot]]
                bot = parent[bot]
            return bot
        for game in finished:
            if game['speed']==speed:
                parent[find(game['white'])] = find(game['black'])
        groups = {}
        for bot in parent:
            groups.setdefault(find(bot), []).append(bot)
        played_components[speed] = sorted([len(g) for g in groups.values()],reverse=True)
    summary={'run':checkpoint['run'],'main':checkpoint['main'],'public_ratings':checkpoint['publicRatings'],'profile':checkpoint['initial'].get('profile','pilot-10-v1'),
        'worker_count':checkpoint['initial'].get('workerCount',1), 'played_graph_component_sizes':played_components,
        'supervisor':supervisor,'worker_elapsed_seconds':ended-started,'admitted':len(admitted),
        'completed':len(finished),'native_rated_updates':len(rated),
        'aborted_records':sum(r['state']=='aborted' for r in checkpoint['latest']['records']),
        'completed_by_speed':{k:sum(f['speed']==k for f in finished) for k in ['blitz','rapid']},
        'finish_statuses':{k:sum(f['result']['status']==k for f in finished) for k in sorted({f['result']['status'] for f in finished})},
        'bots_played':len({r['bot'] for r in rows if r['games_added']>0}),
        'bot_speed_pairs_played':sum(r['games_added']>0 for r in rows),
        'native_player_results_added':sum(r['games_added'] for r in rows),
        'player_results_agree_with_rated_game_count':sum(r['games_added'] for r in rows)==2*len(rated),
        'bot_speed_pairs_established_before':sum(not r['initial_provisional'] for r in rows),
        'bot_speed_pairs_established_after':sum(not r['final_provisional'] for r in rows),
        'games_added_per_bot_speed':distribution([r['games_added'] for r in rows]),
        'initial_rd':distribution([r['initial_rd'] for r in rows]),'final_rd':distribution([r['final_rd'] for r in rows]),
        'absolute_rating_change':distribution([abs(r['rating_change']) for r in rows]),
        'biggest_rating_changes':sorted(rows,key=lambda r:abs(r['rating_change']),reverse=True)[:10],
        'moves':len(moves),'stages':stage_stats,
        'max_observed_active_games':max(m['concurrency'] for m in moves),
        'all_added_waits_zero':all(m['addedWaitMs']==0 for m in moves),
        'health_ms':distribution([s['health']['ms'] for s in resources if s['health'].get('status')==200]),
        'health_failures':sum(s['health'].get('status')!=200 for s in resources),
        'sampled_combined_worker_native_memory_bytes':distribution(memory),
        'sampled_combined_worker_native_cpu_cores':distribution(cpu),
        'observed_mongo_storage_growth_bytes':storage_growth,'observed_mongo_operation_deltas':op_deltas,
        'errors':[e for e in events if e['type'] in ('failure','stop-error','checkpoint-error')],
        'pgn_files':len(list(root.glob('*.pgn')))}
    (root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    return summary


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('directory',type=Path);args=parser.parse_args()
    print(json.dumps(analyze(args.directory),indent=2))
