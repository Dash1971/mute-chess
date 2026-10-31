#!/usr/bin/env python3
"""Replay saved PGNs and match native results and every acknowledged final ply.

Offline only: no model, network, inference, database writes or rating calculation.
"""
import argparse
import io
import json
from pathlib import Path

import chess
import chess.pgn

from continuation import FILES, canonical, digest, records_by_id, require

AUDIT_VERSION = 'strength137-integrity-v1'
CHESS_VERSION = '1.11.2'


class StrictGameBuilder(chess.pgn.GameBuilder):
    def handle_error(self, error):
        raise ValueError('Illegal or malformed PGN: '+str(error))


def audit_predecessor(directory):
    require(chess.__version__ == CHESS_VERSION, 'Audit requires pinned chess=='+CHESS_VERSION)
    directory = Path(directory)
    inputs = {}
    payloads = {}
    for name in FILES:
        path = directory/name
        require(path.is_file() and not path.is_symlink(), 'Missing/linked audit input: '+name)
        payloads[name] = path.read_bytes()
        inputs[name] = digest(payloads[name])
    checkpoint = json.loads(payloads['checkpoint.json'])
    records = records_by_id(checkpoint['latest']['records'])
    require(checkpoint['latest']['admitted'] == len(records), 'Incomplete native checkpoint records')
    moves = {}
    for line in payloads['events.jsonl'].splitlines():
        event = json.loads(line)
        if event['type'] != 'move':
            continue
        game_id, ply, uci = event['id'], event['ply'], event['move']
        require(game_id in records and isinstance(ply, int) and not isinstance(ply, bool) and ply >= 0,
                'Unknown game or invalid acknowledged ply')
        game_moves = moves.setdefault(game_id, {})
        require(ply not in game_moves, 'Duplicate or conflicting acknowledged ply: '+game_id+':'+str(ply))
        game_moves[ply] = uci
    pgn_hashes = {}
    unique_plies = 0
    for game_id, record in records.items():
        require(len(game_id) == 8 and game_id.isascii() and game_id.isalnum(), 'Invalid native game ID')
        path = directory/(game_id+'.pgn')
        require(path.is_file() and not path.is_symlink(), 'Missing final PGN: '+game_id)
        raw = path.read_bytes()
        pgn_hashes[game_id] = digest(raw)
        stream = io.StringIO(raw.decode('utf-8'))
        game = chess.pgn.read_game(stream, Visitor=StrictGameBuilder)
        require(game is not None and not game.errors, 'Missing/invalid PGN game: '+game_id)
        require(chess.pgn.read_game(stream, Visitor=StrictGameBuilder) is None,
                'More than one game in PGN: '+game_id)
        board = game.board()
        require(not board.chess960 and board.fen() == chess.STARTING_FEN,
                'Study PGN must start from standard initial position: '+game_id)
        uci_moves = []
        for move in game.mainline_moves():
            require(move in board.legal_moves, 'Illegal PGN move: '+game_id)
            uci_moves.append(move.uci())
            board.push(move)
        result = record['result']
        require(isinstance(result.get('plies'), int) and not isinstance(result['plies'], bool) and
                result['plies'] == len(uci_moves),
                'Truncated PGN/native ply mismatch: '+game_id)
        require(result.get('winner') in (None, 'white', 'black'), 'Invalid native winner: '+game_id)
        expected = {'white': '1-0', 'black': '0-1', None: '1/2-1/2'}[result.get('winner')]
        require(game.headers.get('Result') == expected, 'PGN/native result mismatch: '+game_id)
        if result.get('status') == 'mate' or board.is_checkmate():
            winner = 'black' if board.turn == chess.WHITE else 'white'
            require(board.is_checkmate() and result.get('status') == 'mate' and result.get('winner') == winner,
                    'Native mate/PGN position mismatch: '+game_id)
        if result.get('status') == 'stalemate' or board.is_stalemate():
            require(board.is_stalemate() and result.get('status') == 'stalemate' and result.get('winner') is None,
                    'Native stalemate/PGN position mismatch: '+game_id)
        acknowledged = moves.get(game_id, {})
        require(len(acknowledged) == len(uci_moves) and set(acknowledged) == set(range(len(uci_moves))),
                'Missing/extra acknowledged final ply: '+game_id)
        require(all(acknowledged[ply] == move for ply, move in enumerate(uci_moves)),
                'Acknowledged move/PGN mismatch: '+game_id)
        unique_plies += len(uci_moves)
    sources = {name: digest(Path(__file__).with_name(name).read_bytes())
               for name in ('audit.py', 'continuation.py')}
    return {'version': AUDIT_VERSION, 'readOnly': True, 'run': checkpoint['run'],
            'sourceMain': checkpoint['main'], 'dependencies': {'chess': CHESS_VERSION},
            'sourceSha256': sources, 'inputSha256': inputs, 'pgnSha256': pgn_hashes,
            'recordsSha256': digest(canonical([records[k] for k in sorted(records)]).encode()),
            'checkedFinishedGames': len(records), 'uniqueVerifiedPlies': unique_plies,
            'acknowledgedPlies': sum(len(game) for game in moves.values()), 'errors': []}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(audit_predecessor(args.directory), indent=2))
