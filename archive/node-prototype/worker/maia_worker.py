# SPDX-License-Identifier: AGPL-3.0-only
# Encoding and move vocabulary adapted from CSSLab/maia3 dataset.py, utils.py
# and uci.py, source revision 1e13597c42d4858b7cfd7cfdae01e297263364b2.
# Upstream attribution and license: third-party/MAIA3-LICENSE, THIRD_PARTY.md.
"""Private JSON-lines worker; stdin/stdout only. One resident FP32 79M session."""
import hashlib, json, os, pathlib, sys, time, traceback
import chess
import numpy as np
import onnxruntime as ort
ort.disable_telemetry_events()
EXPECTED='3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010'

def tokenize(board):
    if not board.turn: board=board.mirror()
    tokens=np.zeros((64,12),dtype=np.float32)
    for square,piece in board.piece_map().items():
        tokens[square,piece.piece_type-1+(0 if piece.color else 6)]=1
    return tokens

VOCAB=[chess.square_name(a)+chess.square_name(b) for a in range(64) for b in range(64)]+[f'{a}7{b}8{p}' for a in 'abcdefgh' for b in 'abcdefgh' for p in 'qrbn']
MOVE_INDEX={u:i for i,u in enumerate(VOCAB)}
def mirror(move):
    return move[0]+str(9-int(move[1]))+move[2]+str(9-int(move[3]))+move[4:]

def encode(moves, history=True):
    board=chess.Board(); tokens=[tokenize(board)]
    if len(moves)>10000: raise ValueError('Ply limit exceeded')
    for move in moves:
        board.push_uci(move); tokens.append(tokenize(board));tokens=tokens[-8:]
    if not history: tokens=[tokens[-1]]
    tokens=[tokens[0]]*(8-len(tokens))+tokens
    feed=np.concatenate(tokens+[np.zeros((64,1),np.float32)],axis=1)[None]
    return board,feed

class Engine:
    def __init__(self,path):
        h=hashlib.sha256()
        with open(path,'rb') as f:
            for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
        if h.hexdigest()!=EXPECTED:raise ValueError('79M model SHA-256 mismatch')
        opt=ort.SessionOptions();opt.intra_op_num_threads=2;opt.inter_op_num_threads=1
        opt.execution_mode=ort.ExecutionMode.ORT_SEQUENTIAL
        opt.add_session_config_entry('session.intra_op.allow_spinning','0')
        self.session=ort.InferenceSession(str(path),opt,providers=['CPUExecutionProvider'])
    def predict(self,r):
        started=time.perf_counter();board,tokens=encode(r['moves'],r['history'])
        policy,value,ponder=self.session.run(None,{'tokens':tokens,'self_elo':np.array([r['selfElo']],np.int64),'opponent_elo':np.array([r['opponentElo']],np.int64)})
        if not all(np.isfinite(x).all() for x in (policy,value,ponder)):raise ValueError('Non-finite model output')
        legal=list(board.legal_moves)
        if not legal:raise ValueError('No legal moves')
        indices=[MOVE_INDEX[m.uci() if board.turn else mirror(m.uci())] for m in legal]
        logits=policy[0,indices].astype(np.float64)
        temp=r['temperature'];top_p=r['topP']
        if not 0<=temp<=2 or not 0<top_p<=1:raise ValueError('Invalid sampling policy')
        if temp==0:pick=int(np.argmax(logits))
        else:
            logits/=temp;logits-=logits.max();prob=np.exp(logits);prob/=prob.sum()
            order=np.argsort(-prob);keep=np.cumsum(prob[order])-prob[order]<top_p
            prob[order[~keep]]=0;prob/=prob.sum()
            pick=int(np.random.default_rng().choice(len(legal),p=prob))
        return {'move':legal[pick].uci(),'inferenceMs':(time.perf_counter()-started)*1000,'modelSha256':EXPECTED}

def main():
    engine=Engine(os.environ['MAIA_MODEL'])
    print(json.dumps({'ready':True,'modelSha256':EXPECTED,'runtime':ort.__version__,'threads':2}),flush=True)
    for line in sys.stdin:
        request={}
        try:
            if len(line)>131072:raise ValueError('Oversized request')
            request=json.loads(line);result=engine.predict(request)
            print(json.dumps({'id':request['id'],**result}),flush=True)
        except Exception:
            traceback.print_exc(file=sys.stderr)
            print(json.dumps({'id':request.get('id'),'error':'inference_failed'}),flush=True)
if __name__=='__main__':main()
