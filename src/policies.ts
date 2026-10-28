export const MODEL_SHA256 =
  "3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010";
const bands = [800, 1200, 1600, 2000, 2400, 2600];
const names = [
  "Quiet Knight",
  "Cedar Rook",
  "Moon Bishop",
  "Amber Pawn",
  "River Knight",
  "Silver Rook",
  "Moss Bishop",
  "Maple Pawn",
  "Cloud Knight",
  "Willow Rook",
  "Dawn Bishop",
  "Coral Pawn",
  "Night Knight",
  "Copper Rook",
  "Pine Bishop",
  "Pearl Pawn",
  "Ocean Knight",
  "Stone Rook",
  "Sun Bishop",
  "Opal Pawn",
  "Rain Knight",
  "Birch Rook",
  "Star Bishop",
  "Ivory Pawn",
];
export const bots = names.map((name, i) => ({
  id: name.toLowerCase().replaceAll(" ", "-"),
  name,
  policy: {
    version: `maia79-fp32-history-sample-v1-${bands[Math.floor(i / 4)]}`,
    model: "Maia3-79M",
    modelSha256: MODEL_SHA256,
    encoderRevision: "CSSLab-1e13597c-numpy-history-v1",
    samplingAlgorithm: "softmax-categorical-numpy-pcg64-v1",
    selfElo: bands[Math.floor(i / 4)]!,
    opponentElo: bands[Math.floor(i / 4)]!,
    history: true,
    temperature: 1,
    topP: 1,
    timing: { version: "uniform-500-1200ms-v1", minMs: 500, maxMs: 1200 },
  },
  rating: null,
  calibration: "unvalidated",
  rated: false,
}));
export type Bot = (typeof bots)[number];
export const controls = {
  blitz: { initialMs: 300_000, incrementMs: 3000 },
  rapid: { initialMs: 600_000, incrementMs: 5000 },
} as const;
