import { z } from 'zod';

const utility = z.number().min(0).max(100).describe('Utility score on [0, 100].');

export const shape = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('increasing').describe('Utility grows with the level.'),
        worst: z.number().describe('Level scoring 0, in the issue unit (euros for money).'),
        best: z.number().describe('Level scoring 100, in the issue unit (euros for money).'),
      })
      .describe('Monotone increasing value function (numeric/monetary issues).'),
    z
      .object({
        type: z.literal('decreasing').describe('Utility falls as the level grows.'),
        worst: z.number().describe('Level scoring 0, in the issue unit (euros for money).'),
        best: z.number().describe('Level scoring 100, in the issue unit (euros for money).'),
      })
      .describe('Monotone decreasing value function (numeric/monetary issues).'),
    z
      .object({
        type: z.literal('peaked').describe('Utility peaks at an ideal level.'),
        worst: z
          .tuple([
            z.number().describe('Lower level scoring 0, in the issue unit.'),
            z.number().describe('Upper level scoring 0, in the issue unit.'),
          ])
          .describe('Levels scoring 0 on each side of the ideal, in the issue unit.'),
        ideal: z.number().describe('Level scoring 100, in the issue unit (e.g. closing days).'),
      })
      .refine((s) => s.worst[0] <= s.ideal && s.ideal <= s.worst[1], {
        message: 'ideal must lie within worst',
      })
      .describe('Single-peaked value function, e.g. closing date.'),
    z
      .object({
        type: z.literal('ordinal').describe('Utility per discrete level.'),
        scores: z
          .record(z.string().describe('Level identifier.'), utility)
          .describe('Utility [0, 100] for each level.'),
      })
      .describe('Ordinal or boolean value function.'),
  ])
  .describe('Value function of one side for one issue (R-02.2).');
export type Shape = z.infer<typeof shape>;
