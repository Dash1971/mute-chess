import json,os,pathlib,unittest
import chess,numpy as np
from maia_worker import Engine,encode,tokenize,MOVE_INDEX,mirror
class WorkerTests(unittest.TestCase):
    def test_history_and_black_orientation(self):
        b,x=encode(['e2e4','e7e5','g1f3'],True)
        self.assertEqual(x.shape,(1,64,97))
        np.testing.assert_array_equal(x[0,:,:12],tokenize(chess.Board()))
        np.testing.assert_array_equal(x[0,:,-13:-1],tokenize(b))
        self.assertEqual(float(x[0,:,-1].sum()),0)
        _,off=encode(['e2e4','e7e5','g1f3'],False)
        np.testing.assert_array_equal(off[0,:,:12],off[0,:,84:96])
        self.assertEqual(mirror('b2b1q'),'b7b8q')
        with self.assertRaises(ValueError):encode(['e2e5'])
    def test_reference_logits_and_promotion(self):
        engine=Engine(os.environ['MAIA_MODEL'])
        refs=json.loads((pathlib.Path(__file__).resolve().parents[1]/'test/maia-reference.json').read_text())
        for case in refs:
            b=chess.Board(case['fen']);tokens=np.concatenate([tokenize(b)]*8+[np.zeros((64,1),np.float32)],axis=1)[None]
            out=engine.session.run(None,{'tokens':tokens,'self_elo':np.array([case['selfElo']],np.int64),'opponent_elo':np.array([case['opponentElo']],np.int64)})
            got={m.uci():float(out[0][0,MOVE_INDEX[m.uci() if b.turn else mirror(m.uci())]]) for m in b.legal_moves}
            self.assertEqual(max(got,key=got.get),case['topMove'])
            self.assertLess(max(abs(v-case['logits'][u]) for u,v in got.items()),.001)
        for history in (False,True):
            for temp,top_p in ((0,1),(1,1),(1,.95),(1,.8)):
                r=engine.predict({'moves':['e2e4'],'history':history,'selfElo':1600,'opponentElo':1600,'temperature':temp,'topP':top_p})
                b=chess.Board();b.push_uci('e2e4');self.assertIn(chess.Move.from_uci(r['move']),b.legal_moves)
if __name__=='__main__':unittest.main()
