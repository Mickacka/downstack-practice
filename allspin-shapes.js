// All-Spin Practice: spin slots shaped like the ones strong players use. The shapes
// come from three TETR.IO replays (a Tetra League match, a Quick Play and an Expert
// Quick Play game; 569 spins): for each spin, its slot and the cells that make it a
// spin (what touches it on the left, right, below and above: filled or open) and
// which of its columns are roofed, and the most common neighbourhood it had in the
// games (w: 2 columns each side, its rows and 3 above, top row first: '@' the slot,
// '#' filled, '.' open), so the way in is a real one. 70 shapes cover 94% of those
// spins. They are
// written as S, L, T and I spins; Z and J use mirrored S and L shapes, T and I either
// way. A map is built around one of them (shape_setup) instead of searching random
// boards: the slot is placed (more often in the middle than at a wall, as in the
// games), its rows are filled so the spin clears the right number of lines, the
// roofs and walls go up, and the cells that can't be stack (overhangs) are the setup
// the player builds. Used by allspin.js (and its background planner).
const SPIN_SHAPES = [
    {p: 'T', l: 2, n: 77, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[2,0],[2,2],[3,1]], e: [[0,2],[1,-1],[1,2]], s: '^^r',
        w: [".....##","#...###","##..###","##@@@##","###@###"]},
    {p: 'T', l: 2, n: 59, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[0,2],[2,0],[3,1]], e: [[1,-1],[1,2],[2,2]], s: 'r^^',
        w: ["##.....","###....","###..##","##@@@##","###@###"]},
    {p: 'T', l: 2, n: 53, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[1,-1],[2,0],[2,2],[3,1]], e: [[0,2],[1,2]], s: '^^r',
        w: ["#......","#...###","##..###","##@@@##","###@###"]},
    {p: 'T', l: 2, n: 51, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[0,2],[1,-1],[2,0],[3,1]], e: [[1,2],[2,2]], s: 'r^^',
        w: ["##.....","###....","###..#.","##@@@##","###@###"]},
    {p: 'S', l: 1, n: 22, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[3,1]], e: [[1,2],[2,0],[2,2]], s: 'r^^',
        w: [".......",".......","##.....","###@@##","##@@.##"]},
    {p: 'T', l: 1, n: 17, c: [[0,0],[0,1],[0,2],[1,1]], f: [[-1,0],[0,-1],[1,0],[1,2],[2,1]], e: [[-1,1],[-1,2],[0,3]], s: '^r',
        w: [".....#",".....#","...###","..@###","..@@##","##@###"]},
    {p: 'S', l: 1, n: 16, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[1,-1],[2,0],[2,2],[3,1]], e: [[0,1],[1,2]], s: '^^r',
        w: [".......","....###","....###","#..@@##","##@@###"]},
    {p: 'T', l: 1, n: 15, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[0,2],[1,-1],[2,0]], e: [[1,2],[2,2],[3,1]], s: 'r^^',
        w: ["#......","#.#....","###....","##@@@..","###@###"]},
    {p: 'L', l: 1, n: 13, c: [[0,0],[1,0],[2,0],[2,1]], f: [[-1,0],[0,-1],[0,1],[2,-1],[3,0],[3,1]], e: [[1,-1],[1,1],[2,2]], s: 'r^^',
        w: [".......","###...#","##...##","###.@##","##@@@##"]},
    {p: 'S', l: 1, n: 13, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[3,1]], e: [[1,-1],[1,2],[2,0],[2,2]], s: 'r^^',
        w: [".....##",".....##","###...#","###@@##","##@@.##"]},
    {p: 'S', l: 1, n: 13, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[1,-1],[2,0],[2,2],[3,1]], e: [[0,-1],[0,1],[1,2]], s: '^^r',
        w: [".......","#......","##..###","##.@@##","##@@###"]},
    {p: 'S', l: 2, n: 12, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[2,0],[3,1]], e: [[1,2],[2,2]], s: 'r^^',
        w: [".....##",".....##",".#...##","###@@##","##@@###"]},
    {p: 'S', l: 1, n: 10, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[2,0],[2,2],[3,1]], e: [[0,-1],[0,1],[1,-1],[1,2]], s: '^^r',
        w: ["##...##","##..###","##..###","#..@@##","##@@###"]},
    {p: 'L', l: 2, n: 10, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[1,0],[2,0],[2,2],[3,1]], e: [[0,2],[1,2]], s: '^^r',
        w: ["....##.","....##.",".#..##.","##@@@##","##@####"]},
    {p: 'T', l: 1, n: 9, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[0,2],[1,-1],[2,0],[3,1]], e: [[1,2],[2,2]], s: 'r^^',
        w: [".....##",".....##",".##..##","##@@@##","###@###"]},
    {p: 'T', l: 1, n: 9, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[1,-1],[2,0],[2,2],[3,1]], e: [[0,2],[1,2]], s: '^^r',
        w: [".......","......#","....###","##@@@##","###@###"]},
    {p: 'T', l: 1, n: 8, c: [[0,1],[1,0],[1,1],[1,2]], f: [[-1,1],[0,0],[0,2],[1,-1],[2,0]], e: [[1,3],[2,1],[2,2]], s: 'r^',
        w: ["#.....","##....","###...","###@..","##@@..","###@##"]},
    {p: 'L', l: 1, n: 7, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[0,-1],[1,-1],[1,1],[1,2],[2,0]], e: [[-1,1],[-1,2],[0,3]], s: '^r',
        w: ["......","......","....#.","..@##.","..@###","##@@##"]},
    {p: 'S', l: 2, n: 6, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,1],[1,-1],[2,0],[3,1]], e: [[0,-1],[1,2],[2,2]], s: 'r^^',
        w: ["......#","#....##","#....##","###@@##","##@@###"]},
    {p: 'L', l: 2, n: 6, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[0,2],[1,0],[2,0],[3,1]], e: [[1,2],[2,2]], s: 'r^^',
        w: [".......","..#...#","###..##","##@@@##","##@####"]},
    {p: 'T', l: 1, n: 5, c: [[0,1],[1,0],[1,1],[2,1]], f: [[0,0],[1,-1],[2,0],[2,2],[3,1]], e: [[-1,1],[0,2],[1,2]], s: '^^r',
        w: [".......","....#..","....###","#.@@@##","###@###"]},
    {p: 'S', l: 2, n: 5, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[2,0],[3,1]], e: [[1,-1],[1,2],[2,2]], s: 'r^^',
        w: [".....##",".....##","##...##","###@@##","##@@###"]},
    {p: 'T', l: 1, n: 4, c: [[0,0],[1,0],[1,1],[2,0]], f: [[-1,0],[0,-1],[0,1],[1,-1],[2,-1],[3,0]], e: [[1,2],[2,1]], s: 'r^^',
        w: ["#......","##....#","##....#","###@.##","##@@@##"]},
    {p: 'L', l: 1, n: 4, c: [[0,0],[1,0],[2,0],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[2,-1],[3,0],[3,1]], e: [[1,1],[2,2]], s: 'r^^',
        w: ["#......","###....","##...##","###.@##","##@@@##"]},
    {p: 'T', l: 3, n: 4, c: [[0,1],[1,0],[1,1],[1,2]], f: [[-1,1],[0,0],[0,2],[1,-1],[2,0],[2,1],[2,2]], e: [[1,3]], s: 'rr',
        w: ["...#..","...###","....##","###@##","##@@##","###@##"]},
    {p: 'T', l: 1, n: 3, c: [[0,1],[1,0],[1,1],[2,1]], f: [[0,0],[2,0],[2,2],[3,1]], e: [[-1,1],[0,2],[1,-1],[1,2]], s: '^^r',
        w: [".....##","....###","....###","#.@@@##","###@###"]},
    {p: 'T', l: 1, n: 3, c: [[0,1],[1,0],[1,1],[1,2]], f: [[-1,1],[0,0],[0,2],[2,0]], e: [[1,-1],[1,3],[2,1],[2,2]], s: 'r^',
        w: ["#.....","#.....","###...","###@..","##@@..","###@##"]},
    {p: 'T', l: 1, n: 3, c: [[0,1],[1,0],[1,1],[2,1]], f: [[-1,1],[0,0],[0,2],[2,0],[3,1]], e: [[1,-1],[1,2],[2,2]], s: 'r^^',
        w: [".....##",".....##",".##..##","##@@@##","###@###"]},
    {p: 'L', l: 1, n: 3, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[2,0],[2,2],[3,1]], e: [[0,2],[1,0],[1,2]], s: '^^r',
        w: ["#...###","##..###","#...###","##@@@##","##@.###"]},
    {p: 'L', l: 1, n: 3, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[-1,1],[0,-1],[1,-1],[1,1],[1,2],[2,0]], e: [[-1,2],[0,3]], s: '^r',
        w: ["......","......","......","..@#..",".#@###","##@@##"]},
    {p: 'S', l: 1, n: 3, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[0,3],[1,-1],[2,0]], e: [[1,2],[2,1]], s: 'r^',
        w: ["......","......",".##...","##@...","##@@..","###@##"]},
    {p: 'S', l: 2, n: 3, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,1],[2,0],[3,1]], e: [[0,-1],[1,-1],[1,2],[2,2]], s: 'r^^',
        w: [".......",".......",".......","###@@##","##@@###"]},
    {p: 'L', l: 2, n: 3, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[0,2],[1,0],[1,2],[2,0],[3,1]], e: [[2,2]], s: 'rr^',
        w: [".......","###....","####.##","##@@@##","##@####"]},
    {p: 'T', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,0]], f: [[-1,0],[1,-1],[2,-1],[2,1],[3,0]], e: [[0,-1],[0,1],[1,2]], s: '^^r',
        w: ["......#","......#","....###","...@###","##@@@##"]},
    {p: 'T', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,0]], f: [[-1,0],[0,-1],[0,1],[1,-1],[3,0]], e: [[1,2],[2,-1],[2,1]], s: 'r^^',
        w: [".......",".......","#......","###@..#","##@@@##"]},
    {p: 'T', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,0]], f: [[-1,0],[0,-1],[0,1],[2,-1],[3,0]], e: [[1,-1],[1,2],[2,1]], s: 'r^^',
        w: [".....#.","#....##","#.....#","###@.##","##@@@##"]},
    {p: 'T', l: 1, n: 2, c: [[0,1],[1,0],[1,1],[1,2]], f: [[0,0],[1,-1],[1,3],[2,0],[2,1],[2,2]], e: [[-1,1],[0,2]], s: '^r',
        w: ["......","...#..","...###","...@##","..@@##","###@##"]},
    {p: 'L', l: 1, n: 2, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[0,-1],[1,-1],[1,1],[2,0]], e: [[-1,1],[-1,2],[0,3],[1,2]], s: '^r',
        w: ["......","......","......","..@.#.","#.@###","##@@##"]},
    {p: 'L', l: 1, n: 2, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[1,0],[2,0],[2,2],[3,1]], e: [[0,2],[1,2]], s: '^^r',
        w: ["##.....","##..#..","##..###","##@@@##","##@####"]},
    {p: 'L', l: 1, n: 2, c: [[0,0],[0,1],[1,1],[2,1]], f: [[-1,0],[-1,1],[0,-1],[0,2],[1,0],[2,0]], e: [[1,2],[2,2],[3,1]], s: 'r^^',
        w: ["###...#","###..##","###..##","##@@@.#","##@####"]},
    {p: 'L', l: 1, n: 2, c: [[0,2],[1,0],[1,1],[1,2]], f: [[0,0],[1,-1],[1,3],[2,0],[2,1],[2,2]], e: [[-1,2],[0,1],[0,3]], s: '^r',
        w: ["......","....#.","...###","..@@##","...@##","###@##"]},
    {p: 'S', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[2,0],[3,1]], e: [[1,2],[2,2]], s: 'r^^',
        w: ["#......","##.....","##.....","###@@#.","##@@###"]},
    {p: 'S', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[1,-1],[2,0],[2,2],[3,1]], e: [[0,-1],[0,1],[1,2]], s: '^rr',
        w: ["...##.#","#..##.#","#...###","##.@@##","##@@###"]},
    {p: 'S', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[1,-1],[1,2],[2,0],[2,2],[3,1]], e: [[0,1]], s: '^rr',
        w: [".....##","...####","...####","...@@##","##@@###"]},
    {p: 'S', l: 1, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[2,0]], e: [[1,2],[2,2],[3,1]], s: 'r^^',
        w: [".......","##.....","##.....","###@@.#","##@@###"]},
    {p: 'T', l: 2, n: 2, c: [[0,0],[0,1],[0,2],[1,1]], f: [[-1,0],[-1,1],[-1,2],[0,-1],[1,2],[2,1]], e: [[0,3],[1,0]], s: 'rr',
        w: [".##...","###...","##....","##@###","##@@##","##@.##"]},
    {p: 'S', l: 2, n: 2, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[0,3],[1,-1],[2,0],[2,1]], e: [[1,2]], s: 'r^',
        w: ["......","..#...",".##...","##@...","##@@##","###@##"]},
    {p: 'S', l: 2, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,1],[1,-1],[2,0],[2,2],[3,1]], e: [[0,-1],[1,2]], s: 'r^r',
        w: ["#...###","##..###","##..###","###@@##","##@@###"]},
    {p: 'S', l: 2, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[2,0],[2,2],[3,1]], e: [[1,-1],[1,2]], s: 'r^r',
        w: ["....###","#...###","##..###","###@@##","##@@###"]},
    {p: 'S', l: 2, n: 2, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[1,-1],[1,2],[2,0],[2,1]], e: [[0,3]], s: '^r',
        w: ["##....","##....","#...##","##@###","##@@##","###@##"]},
    {p: 'S', l: 2, n: 2, c: [[0,0],[1,0],[1,1],[2,1]], f: [[-1,0],[0,-1],[0,1],[2,0],[3,1]], e: [[1,-1],[1,2],[2,2]], s: 'r^r',
        w: [".......","....##.","##...##","###@@##","##@@###"]},
    {p: 'L', l: 2, n: 2, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[-1,1],[0,-1],[1,-1],[1,1],[1,2],[2,0]], e: [[-1,2],[0,3]], s: '^r',
        w: ["......","......","......","#.@###","##@###","##@@##"]},
    {p: 'L', l: 2, n: 2, c: [[0,0],[1,0],[2,0],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[1,1],[3,0],[3,1]], e: [[2,-1],[2,2]], s: 'rr^',
        w: [".....##",".....##",".....##","####@##","##@@@##"]},
    {p: 'L', l: 2, n: 2, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[-1,1],[1,-1],[1,1],[2,0]], e: [[-1,2],[0,-1],[0,3],[1,2]], s: '^r',
        w: ["......","......","#....#","#.@..#","##@###","##@@##"]},
    {p: 'L', l: 2, n: 2, c: [[0,0],[1,0],[2,0],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,-1],[1,1],[2,-1],[3,0],[3,1]], e: [[2,2]], s: 'rr^',
        w: [".......",".......","###...#","####@##","##@@@##"]},
    {p: 'L', l: 2, n: 2, c: [[0,0],[1,0],[2,0],[2,1]], f: [[-1,0],[0,-1],[0,1],[1,1],[2,-1],[3,0],[3,1]], e: [[1,-1],[2,2]], s: 'rr^',
        w: [".......",".......",".......","####@##","##@@@##"]},
    {p: 'S', l: 3, n: 2, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[1,2],[2,0],[2,1]], e: [[0,3],[1,-1]], s: '^r',
        w: ["......","......","##..##","##@###","##@@##","###@##"]},
    {p: 'T', l: 3, n: 1, c: [[0,0],[0,1],[0,2],[1,1]], f: [[-1,0],[-1,1],[-1,2],[0,-1],[1,0],[1,2],[2,1]], e: [[0,3]], s: 'rr',
        w: ["##....","###..#","##...#","##@###","##@@##","##@###"]},
    {p: 'S', l: 3, n: 1, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[1,-1],[1,2],[2,0],[2,1]], e: [[0,3]], s: 'rr',
        w: ["..#...",".##...","##....","##@###","##@@##","###@##"]},
    {p: 'S', l: 3, n: 1, c: [[0,1],[0,2],[1,0],[1,1]], f: [[-1,1],[-1,2],[0,0],[1,-1],[1,2],[2,0],[2,1]], e: [[0,3]], s: '^r',
        w: ["......","......","#...##","##@###","##@@##","###@##"]},
    {p: 'L', l: 3, n: 1, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[-1,1],[-1,2],[0,-1],[1,-1],[1,1],[1,2],[2,0]], e: [[0,3]], s: 'rr',
        w: ["###..#","###..#","##....","##@###","##@###","##@@##"]},
    {p: 'L', l: 3, n: 1, c: [[0,0],[0,1],[0,2],[1,0]], f: [[-1,0],[-1,1],[-1,2],[0,-1],[1,1],[1,2],[2,0]], e: [[0,3],[1,-1]], s: 'rr',
        w: ["..#...",".##..#","##...#","##@###","##@###","##@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[0,1],[0,2],[0,3]], f: [[-1,0],[-1,2],[0,-1],[0,4],[1,0],[1,1],[1,2],[1,3]], e: [[-1,1],[-1,3]], s: 'r',
        w: [".##.#",".####",".####","..@##","##@##","#.@##","##@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,-1],[0,1],[4,0]], e: [[1,-1],[1,1],[2,-1],[2,1],[3,-1],[3,1]], s: 'r^^^',
        w: ["##......","##......","###.....","##@@@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,1],[3,-1],[4,0]], e: [[0,-1],[1,-1],[1,1],[2,-1],[2,1],[3,1]], s: 'rr^^',
        w: ["......##","..##..##","###...##","##@@@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,-1],[3,1],[4,0]], e: [[0,1],[1,-1],[1,1],[2,-1],[2,1],[3,-1]], s: '^^^r',
        w: ["#.....##","#....###","##...###","##@@@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,-1],[1,-1],[3,1],[4,0]], e: [[0,1],[1,1],[2,-1],[2,1],[3,-1]], s: '^^^r',
        w: ["........","......##","##...###","##@@@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,-1],[1,-1],[3,-1],[3,1],[4,0]], e: [[0,1],[1,1],[2,-1],[2,1]], s: '^^^r',
        w: ["......##",".....###","#....###","##@@@@##"]},
    {p: 'I', l: 1, n: 1, c: [[0,0],[1,0],[2,0],[3,0]], f: [[-1,0],[0,-1],[3,-1],[3,1],[4,0]], e: [[0,1],[1,-1],[1,1],[2,-1],[2,1]], s: '^^^r',
        w: [".......#",".......#",".....###","##@@@@##"]},
    {p: 'I', l: 2, n: 1, c: [[0,0],[0,1],[0,2],[0,3]], f: [[-1,0],[-1,1],[0,-1],[0,4],[1,0],[1,1],[1,2],[1,3]], e: [[-1,2],[-1,3]], s: 'r',
        w: [".....",".....","..##.","..@#.","..@##","##@##","##@##"]},
]

// Shapes this trainer can't build (tried 400-500 times each: never a spin the piece can
// get into here; most likely they need TETR.IO's own 180-degree kicks): watch only,
// on the Shapes page. Rare ones (1-4 in the games).
for (var i of [23, 39, 40, 43, 49, 69]) SPIN_SHAPES[i].watch_only = true

// How often each spin piece came up in those games, and how often as a single (the
// "Like real games" mix)
const REAL_SPIN_SHARE = {T: 0.594, S: 0.112, Z: 0.121, L: 0.088, J: 0.070, I: 0.014}
const REAL_SINGLE_RATE = {T: 0.26, S: 0.72, Z: 0.61, L: 0.56, J: 0.55, I: 0.88}

// One of the shapes for this piece, drawn by how often it was used, as it sits on
// the board (mirrored for Z and J, and half the time for T and I): {lines, cells,
// fill, empty, sky} with cells from the slot's bottom left
function pick_shape(piece, single){
    var base = {Z: 'S', J: 'L'}[piece] || piece
    // (a shape drill, from the Shapes page: that shape only, whatever the line clears)
    var drill = typeof Record != 'undefined' && Record.drill != null? SPIN_SHAPES[Record.drill]: null
    var list = drill? [drill]: SPIN_SHAPES.filter(s => s.p == base && (single? s.l == 1: s.l >= 2))
    if (!list.length || list[0].p != base) return null
    var total = list.reduce((a, s) => a + s.n, 0), r = Math.random() * total, s = list[0]
    for (var item of list){ if (r < item.n){ s = item; break } r -= item.n }
    var mirror = piece == 'Z' || piece == 'J' || ((piece == 'T' || piece == 'I') && random_int(2) == 1)
    var width = Math.max(...s.c.map(c => c[0])) + 1
    var flip = ([x, y]) => [mirror? width - 1 - x: x, y]
    return {lines: s.l, cells: s.c.map(flip), fill: s.f.map(flip), empty: s.e.map(flip), index: SPIN_SHAPES.indexOf(s),
        window: mirror? s.w.map(row => [...row].reverse().join('')): s.w,
        sky: mirror? [...s.s].reverse(): [...s.s], width: width, height: Math.max(...s.c.map(c => c[1])) + 1}
}

// The spin pieces a shape is for: S shapes are also Z's mirrored, L shapes J's
const shape_pieces = s => ({S: 'SZ', L: 'LJ'})[s.p] || s.p

// A shape in words: "S/Z-Spin Single: flat, roofed on the left, open on the right"
function shape_name(s){
    var LINES = ['', 'Single', 'Double', 'Triple']
    var piece = ({S: 'S/Z', L: 'L/J'})[s.p] || s.p
    var xs = s.c.map(c => c[0]), ys = s.c.map(c => c[1])
    var width = Math.max(...xs) + 1, height = Math.max(...ys) + 1
    var bits = []
    if (s.p == 'T'){
        if (width == 3){
            var tip = s.c.find(([x, y]) => s.c.filter(c => c[1] == y).length == 1)
            bits.push(tip[1] == 0? 'pointing down': 'pointing up')
        }
        else bits.push('from the side')
    }
    else bits.push(width > height? 'flat': 'upright')
    var roofs = [...s.s].map((k, i) => k == 'r'? i: -1).filter(i => i >= 0)
    if (roofs.length == s.s.length) bits.push('roofed over')
    else if (roofs.length){
        var side = i => i == 0? 'left': i == s.s.length - 1? 'right': 'middle'
        bits.push('roofed on the ' + [...new Set(roofs.map(side))].join(' and '))
    }
    // open cells: under the slot, or beside it in its rows (what a single keeps)
    if (s.e.some(([x, y]) => y < 0)) bits.push('open under')
    var beside = s.e.filter(([x, y]) => y >= 0 && y < height)
    if (beside.length){
        var left = beside.some(([x]) => x < width / 2), right = beside.some(([x]) => x >= width / 2)
        bits.push('open on the ' + (left && right? 'left and right': left? 'left': 'right'))
    }
    return {title: piece + '-Spin ' + LINES[s.l], text: bits.join(', ')}
}

// A spin built around a real shape, on the board R (the board the previous spin
// leaves; none for the first spin): a setup like try_spin_setup's, or null.
// What is already on R stays (a roof already there counts: players often spin under
// what's left of earlier pieces). Each cell added is stack if it rests on stack, or
// part of the setup the player builds (an overhang, or anything over one or over
// pieces). `in_play` (continuous mode, planned from the board in play): no new
// stack, the player builds everything added. `stack_ok(col, row)`: whether a cell of R
// could be stack (for a later spin: on stack all the way down on the starting board).
function shape_build(R, piece, n_build, in_play, stack_ok){
    var t = pick_shape(piece, wants_single(piece))
    if (!t) return null
    var base = R? R.map(row => row.map(c => c == 'N'? 'N': c)): empty_board()
    var height = col => { for (var row=19; row>=0; row--) if (base[row][col] != 'N') return row + 1; return 0 }
    // where: in the middle more often than at a wall (half the spins in those games
    // were 3 or more columns from both walls)
    var spots = []
    for (var x0=0; x0<=10-t.width; x0++){
        var wall = Math.min(x0, 10 - t.width - x0)
        for (var k=0; k<[1, 3, 6, 10][Math.min(3, wall)]; k++) spots.push(x0)
    }
    var x0, y0
    if (!R){
        // the first spin: on 0-4 rows of stack
        x0 = spots[random_int(spots.length)]
        y0 = random_int(5)
    }
    else{
        // on a board: where it fits with the fewest cells to add under it and beside it
        // in its rows (where the board nearly has the slot already, as players find
        // them), the middle more often than the walls
        var options = []
        for (var x=0; x<=10-t.width; x++){
            var slot_cols0 = [...new Set(t.cells.map(c => x + c[0]))]
            var lowest = Math.max(0, Math.min(...slot_cols0.map(height)) - 1)
            for (var y=lowest; y<=lowest+3 && y+t.height<=16; y++){
                var cells = t.cells.map(([dx, dy]) => [x + dx, y + dy]), opens = t.empty.map(([dx, dy]) => [x + dx, y + dy])
                if (!cells.every(([c, r]) => base[r][c] == 'N')) continue
                if (!opens.every(([c, r]) => c >= 0 && c < 10 && r >= 0 && base[r][c] == 'N')) continue
                var skip = new Set(cells.concat(opens).map(([c, r]) => cell_key(c, r)))
                var cost = 0
                for (var row=0; row<y+t.height; row++)
                    for (var col=0; col<10; col++) if (base[row][col] == 'N' && !skip.has(cell_key(col, row))) cost++
                if (cost > 4 * 5) continue
                var wall = Math.min(x, 10 - t.width - x)
                options.push({x: x, y: y, w: [1, 3, 6, 10][Math.min(3, wall)] / (1 + cost)})
            }
        }
        if (!options.length) return null
        var total = options.reduce((a, o) => a + o.w, 0), r = Math.random() * total, pick = options[0]
        for (var o of options){ if (r < o.w){ pick = o; break } r -= o.w }
        x0 = pick.x
        y0 = pick.y
    }
    var at = ([dx, dy]) => [x0 + dx, y0 + dy]
    var slot = t.cells.map(at)
    var top = y0 + t.height - 1
    var on_board = ([c, r]) => c >= 0 && c < 10 && r >= 0 && r < 20
    var is_slot = new Set(slot.map(([c, r]) => cell_key(c, r)))
    // the shape's open cells must be on the board (not a wall or the floor), and open
    var empty = t.empty.map(at)
    if (!empty.every(on_board) || empty.some(([c, r]) => base[r][c] != 'N')) return null
    var keep_open = new Set(empty.map(([c, r]) => cell_key(c, r)))
    // the neighbourhood it had in the game: its open cells stay open, its filled ones
    // are filled (the window starts 2 columns left of the slot, 3 rows over its top)
    var must_fill = []
    t.window.forEach((line, j) => [...line].forEach((v, i) => {
        var c = x0 + i - 2, r = top + 3 - j
        if (!on_board([c, r])) return
        if (v == '.') keep_open.add(cell_key(c, r))
        if (v == '#') must_fill.push([c, r])
    }))
    if ([...keep_open].some(k => { var [c, r] = k.split(',').map(Number); return base[r][c] != 'N' })) return null
    // open cells under the slot rows: the columns of the garbage hole (a shaft each)
    var hole_cols = [...new Set(empty.filter(([c, r]) => r < y0).map(c => c[0]))]
    var slot_cols = [...new Set(slot.map(c => c[0]))].sort((p, q) => p - q)
    // 2. the spin clears just its lines: a row of the slot with no open cell of the
    // shape is full once the spin is in; more of them than the lines, and some keep a
    // gap in a column away from the slot, open to the top (where the row's other hole
    // was in the game)
    var fill_cells = new Set(t.fill.map(at).map(([c, r]) => cell_key(c, r)))
    var rows_full = []
    for (var row=y0; row<=top; row++) if (!empty.some(([c, r]) => r == row)) rows_full.push(row)
    if (rows_full.length < t.lines) return null
    for (var row of shuffle(rows_full).slice(0, rows_full.length - t.lines)){
        var away = shuffle([...Array(10).keys()].filter(c => slot_cols.every(s => Math.abs(s - c) >= 2)))
        var gap = away.find(c => { for (var r=row; r<20; r++){ var k = cell_key(c, r); if (fill_cells.has(k) || is_slot.has(k) || base[r][c] != 'N') return false } return true })
        if (gap === undefined) return null
        for (var r=row; r<20; r++) keep_open.add(cell_key(gap, r))
    }

    // b: what's there plus what's added ('A')
    var b = base.map(row => [...row])
    var add = (c, r) => { if (on_board([c, r]) && b[r][c] == 'N' && !is_slot.has(cell_key(c, r)) && !keep_open.has(cell_key(c, r))) b[r][c] = 'A' }
    var filled = (c, r) => c < 0 || c > 9 || r < 0 || b[r][c] != 'N'
    // under the slot and the slot rows: filled but for the slot and the open cells
    for (var row=0; row<=top; row++) for (var col=0; col<10; col++) add(col, row)
    // the spin clears just its lines
    var full = 0
    for (var row=y0; row<=top; row++)
        if (b[row].every((c, col) => c != 'N' || is_slot.has(cell_key(col, row)))) full++
    if (full != t.lines) return null
    // the shape's cells above the slot rows (walls over its sides, roofs)
    for (var [c, r] of t.fill.map(at)) if (r > top) add(c, r)
    for (var [c, r] of must_fill) if (r > top) add(c, r)
    // a roofed column whose cell right over the slot is open has its roof one higher
    var roof_at = {}
    slot_cols.forEach((col, i) => {
        if (t.sky[i] != 'r') return
        var high = Math.max(...slot.filter(c => c[0] == col).map(c => c[1]))
        for (var row=high+1; row<20; row++) if (filled(col, row)) return
        // (2 or 3 rows up: the shapes only say the cell right over is open)
        var up = high + 2 + random_int(2)
        if (up <= 16 && !keep_open.has(cell_key(col, up)) && !keep_open.has(cell_key(col, up - 1))){ add(col, up); roof_at[col] = up }
        else return
        // the way in under a roof higher up: the piece slides in sideways (as into a
        // T-spin triple), so the rows between the slot and the roof stay open out to one
        // side, 1-2 columns, to a column open to the top
        var sides = shuffle([-1, 1])
        for (var d of sides){
            var reach = 1 + random_int(2), cells = [], ok = true
            for (var k=1; k<=reach && ok; k++){
                var c = col + d * k
                if (c < 0 || c > 9 || slot_cols.includes(c)){ ok = false; break }
                var rows = k < reach? [...Array(up - high - 1).keys()].map(i => high + 1 + i): [...Array(20 - high - 1).keys()].map(i => high + 1 + i)
                for (var r of rows){
                    if (fill_cells.has(cell_key(c, r)) || is_slot.has(cell_key(c, r)) || (r < 20 && b[r][c] != 'N')){ ok = false; break }
                    cells.push(cell_key(c, r))
                }
            }
            if (!ok) continue
            for (var k of cells) keep_open.add(k)
            break
        }
    })
    var open_cols = slot_cols.filter((col, i) => t.sky[i] == '^')
    // (an open column stays open to the top)
    for (var col of open_cols){
        var high = Math.max(...slot.filter(c => c[0] == col).map(c => c[1]))
        for (var row=high+1; row<20; row++) if (b[row][col] != 'N') return null
    }
    // the stack beside: each other column up to the slot's top, or 1-2 above, not over
    // an open cell of the shape (not on the board in play: nothing added there)
    if (!in_play)
        for (var col=0; col<10; col++){
            if (slot_cols.includes(col)) continue
            var up = top + random_int(3)
            // (next to a roof higher up, up to it half the time: the roof rests on
            // something; otherwise the way in from that side stays open)
            for (var rc in roof_at) if (Math.abs(rc - col) == 1 && random_int(2)) up = Math.max(up, roof_at[rc])
            for (var row=top+1; row<=Math.min(up, 16); row++){
                if (keep_open.has(cell_key(col, row)) || b[row-1][col] == 'N') break
                if (b[row][col] == 'N') b[row][col] = 'A'
            }
        }
    // no full row over the spin's, and room to spawn (under it: once the hole is made)
    for (var row=top+1; row<20; row++) if (b[row].every(c => c != 'N')) return null
    if (b.slice(17).some(row => row.some(c => c != 'N'))) return null

    // The garbage hole under the slot rows: the rows there that would be full keep one
    // column open (cells added there are left out), in the shape's open column under
    // the slot, or one of the slot's open columns, or the shaft the spin before left
    var needs = []
    for (var row=0; row<y0; row++) if (b[row].every(c => c != 'N')) needs.push(row)
    if (hole_cols.length){
        for (var hc of hole_cols) for (var row=0; row<y0; row++) if (b[row][hc] == 'A') b[row][hc] = 'N'
    }
    else if (needs.length){
        var cols = shuffle(open_cols).concat(shuffle(slot_cols.filter(c => !open_cols.includes(c))),
            shuffle([...Array(10).keys()].filter(c => !slot_cols.includes(c))))
        var hole = cols.find(col => needs.every(row => base[row][col] == 'N') && base.slice(y0).every(row => row[col] == 'N'))
        if (hole === undefined) return null
        for (var row=0; row<y0; row++) if (b[row][hole] == 'A') b[row][hole] = 'N'
    }

    // stack or setup: an added cell is stack when it rests on stack (all the way down);
    // on the board in play, everything added is the player's
    for (var col=0; col<10; col++)
        for (var row=0; row<20; row++)
            if (b[row][col] == 'A') b[row][col] = !in_play && (row == 0 || b[row-1][col] == 'G' || b[row-1][col] == 'g') && (!stack_ok || stack_ok(col, row))? 'g': 'A'
    // ('g': added stack, 'A': added, built by the player)
    var forced = new Set()
    for (var row=0; row<20; row++) for (var col=0; col<10; col++) if (b[row][col] == 'A') forced.add(cell_key(col, row))
    // a cell already there can't sit over the setup
    for (var k of forced){
        var [c, r] = k.split(',').map(Number)
        for (var rr=r+1; rr<20; rr++) if (base[rr][c] != 'N') return null
    }

    // The setup: the added cells that can't be stack, plus added stack next to them,
    // up to the number of pieces asked, peeled a whole tetromino at a time off the top
    // (the overhangs first), so it always splits into pieces
    var build = new Set(), peeled = [], used = {}
    var near = (c, r) => Math.abs(c - (x0 + t.width / 2)) + Math.abs(r - top) * 0.7
    var removable = k => { var v = b[+k.split(',')[1]][+k.split(',')[0]]; return v == 'A' || v == 'g' }
    for (var n=0; n < 6 && (n < n_build || [...forced].some(k => !build.has(k))); n++){
        var best = null, best_score = Infinity
        // (a varied queue: at most 2 of a piece, 1 of the spin piece)
        // (the pieces over a cell that can go: each of its cells at that cell)
        var free = []
        for (var row=0; row<20; row++) for (var col=0; col<10; col++) if (removable(cell_key(col, row)) && !build.has(cell_key(col, row))) free.push([col, row])
        var seen = new Set()
        for (var p of [...'IOTJLSZ'].filter(p => (used[p] || 0) < (p == piece? 1: 2)))
            for (var o=0; o<4; o++)
                for (var [fc, fr] of free)
                    for (var [dx, dy] of shape_table[p][o]){
                        var x = fc - dx, y = fr - dy, id = p + o + ',' + x + ',' + y
                        if (seen.has(id)) continue
                        seen.add(id)
                        var pc = piece_cells(p, o, x, y)
                        if (!pc.every(([c, r]) => on_board([c, r]) && removable(cell_key(c, r)) && !build.has(cell_key(c, r)))) continue
                        // nothing but setup (or this piece) over it
                        var mine = new Set(pc.map(([c, r]) => cell_key(c, r)))
                        if (!pc.every(([c, r]) => { for (var rr=r+1; rr<20; rr++) if (b[rr][c] != 'N' && !build.has(cell_key(c, rr)) && !mine.has(cell_key(c, rr))) return false; return true })) continue
                        var takes = pc.filter(([c, r]) => forced.has(cell_key(c, r))).length
                        var touching = pc.some(([c, r]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => build.has(cell_key(c + dc, r + dr))))
                        var score = pc.reduce((a, [c, r]) => a + near(c, r), 0) / 4 - 20 * takes - (touching? 4: 0) + Math.random() * 3
                        if (score < best_score){ best_score = score; best = {piece: p, cells: pc} }
                    }
        // (fewer pieces when the board needs fewer: what must be built is built)
        if (!best){ if (R && [...forced].every(k => build.has(k))) break; return null }
        for (var [c, r] of best.cells) build.add(cell_key(c, r))
        used[best.piece] = (used[best.piece] || 0) + 1
        peeled.push(best)
    }
    if ([...forced].some(k => !build.has(k))) return null

    // the board: what was there, added stack 'G', the setup's pieces in their colours;
    // the last peeled is placed first, and each must rest on something when it goes
    // down (chain_works checks it can get there)
    var finished = b.map(row => row.map(c => c == 'g'? 'G': c == 'A'? 'G': c))
    for (var k of build){ var [c, r] = k.split(',').map(Number); finished[r][c] = 'N' }
    var now = finished.map(row => [...row])
    for (var {piece: p, cells: pc} of [...peeled].reverse()){
        if (!pc.some(([c, r]) => r == 0 || (now[r-1][c] != 'N' && !pc.some(q => q[0] == c && q[1] == r - 1)))) return null
        for (var [c, r] of pc){ now[r][c] = p; finished[r][c] = p }
    }
    var left = Math.max(0, slot_cols[0] - 1), right = Math.min(9, slot_cols[slot_cols.length - 1] + 1)
    return {board: finished, lines: t.lines, cells: slot, build: peeled, piece: piece,
        left: left, right: right, bottom: y0, top: top, shaped: true, shape: t.index,
        // (a slot open under, or roofed over: the spin may leave a hole covered, as in
        // the games)
        leaves_holes: hole_cols.length > 0 || !t.sky.includes('^')}
}

// The first spin of a map, around a real shape (checked: every piece reachable, a
// real spin, the board clean after), or null
function shape_setup(piece, n_build){
    var setup = shape_build(null, piece, n_build, false)
    if (!setup || !clean_start(setup.board) || !chain_works(setup.board, [setup])) return null
    return setup
}
