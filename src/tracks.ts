/*
 * Copyright (c) 2024 - 2025 Tero Jäntti, Sami Heikkinen
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { random } from "./random";
import { TT } from "./TrackElement";

const simpleTrack1: readonly TT[] = [
    TT.FullWidthWithObstacles,
    TT.FullWidth,
    TT.FullWidth,
    TT.FullWidth,
];
const simpleTrack2: readonly TT[] = [
    TT.Basic,
    TT.SlopeEmptyPassage,
    TT.SlopeEmptyPassage,
    TT.DualPassage,
    TT.Basic,
    TT.RightPassage,
    TT.RightPassage,
    TT.Basic,
    TT.Basic,
    TT.Raft,
    TT.Chasm,
    TT.FullWidth,
];
const simpleTrack3: readonly TT[] = [
    TT.BasicSteepSlope,
    TT.BasicSlope,
    TT.FullWidthWithObstacles,
    TT.FullWidthWithMoreObstacles,
    TT.FullWidthWithObstacles,
    TT.DualPassage,
    TT.DualPassage,
    TT.DualPassage,
    TT.FullWidth,
];

export function getFirstTrack(): readonly TT[] {
    const randomizer = random(1);
    return [
        TT.Checkpoint,
        ...(randomizer < 0.5 ? simpleTrack1 : simpleTrack2),
        TT.Checkpoint,
        ...(randomizer < 0.5 ? simpleTrack2 : simpleTrack1),
        TT.Checkpoint,
        ...simpleTrack3,
        TT.Finish,
    ];
}

const secondTrack1: readonly TT[] = [
    TT.FullWidth,
    TT.BasicSteepSlope,
    TT.BasicSlope,
    TT.BasicSlope,
    TT.Basic,
    TT.Basic,
    TT.Basic,
    TT.Narrow,
    TT.VeryNarrow,
    TT.VeryNarrow,
    TT.Basic,
    TT.FullWidthWithObstacles,
    TT.SlopeObstacleSlope,
    TT.PassageEmptySlope,
    TT.PassageEmptySlope,
    TT.DualPassage,
    TT.DualPassage,
    TT.FullWidth,
    TT.FullWidthWithObstaclesOnRight,
    TT.FullWidthWithObstaclesOnRight2,
    TT.FullWidthWithObstaclesOnRight,
    TT.FullWidth,
    TT.Raft,
    TT.Chasm,
];

const secondTrack2: readonly TT[] = [
    TT.FullWidth,
    TT.VeryNarrow,
    TT.FullWidth,
    TT.BasicSteepSlope,
    TT.BasicSlope,
    TT.BasicSlope,
    TT.Basic,
    TT.Basic,
    TT.Basic,
    TT.Basic,
    TT.TwoRafts,
    TT.Chasm,
];

export function getSecondTrack(): readonly TT[] {
    const randomizer = random(1);
    return [
        TT.Checkpoint,
        ...(randomizer < 0.5 ? secondTrack1 : secondTrack2),
        TT.Checkpoint,
        ...(randomizer < 0.5 ? secondTrack2 : secondTrack1),
        TT.Finish,
    ];
}

const thirdTrack1: readonly TT[] = [
    TT.FullWidth,
    TT.Basic,
    TT.Narrow,
    TT.VeryNarrow,
    TT.Basic,
    TT.SlopeEmptySlope,
    TT.SlopeEmptySlope,
    TT.SlopeEmptySlope,
    TT.DualPassage,
    TT.DualPassage,
    TT.Basic,
    TT.FullWidthWithObstacles,
    TT.VeryNarrow,
    TT.Basic,
];

const thirdTrack2: readonly TT[] = [
    TT.FullWidth,
    TT.SlopeEmptySlope,
    TT.PassageEmptySlope,
    TT.PassageEmptySlope,
    TT.DualPassage,
    TT.SlopeEmptyPassage,
    TT.DualPassageExt,
    TT.TriplePassage,
    TT.TriplePassage,
    TT.TriplePassage,
    TT.FullWidth,
];

const thirdTrack3: readonly TT[] = [
    TT.FullWidthWithObstacles,
    TT.FullWidthWithMoreObstacles,
    TT.FullWidth,
    TT.TwoRafts,
    TT.Chasm,
    TT.Basic,
    TT.FullWidth,
];

const thirdTrack4: readonly TT[] = [
    TT.BasicSteepSlope,
    TT.BasicSlope,
    TT.BasicSlope,
    TT.Basic,
    TT.Basic,
    TT.Basic,
    TT.DualPassage,
    TT.DualPassageExt,
    TT.TriplePassage,
    TT.TriplePassage,
    TT.DualPassageExt,
    TT.PassageEmptySlope,
    TT.PassageEmptySlope,
    TT.Basic,
    TT.Basic,
    TT.Narrow,
    TT.VeryNarrow,
    TT.FullWidth,
    TT.RightPassage,
    TT.FullWidth,
    TT.TwoRafts,
    TT.Chasm,
];

export function getThirdTrack(): readonly TT[] {
    const randomizer = random(1);
    return [
        TT.Checkpoint,
        ...(randomizer < 0.5 ? thirdTrack1 : thirdTrack2),
        TT.Checkpoint,
        ...(randomizer < 0.5 ? thirdTrack2 : thirdTrack1),
        TT.Checkpoint,
        ...(randomizer < 0.5 ? thirdTrack3 : thirdTrack4),
        TT.Checkpoint,
        ...(randomizer < 0.5 ? thirdTrack4 : thirdTrack3),
        TT.Finish,
    ];
}
