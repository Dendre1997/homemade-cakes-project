/** Aggregation stage resolving a product's assigned catalog sets into `availableSets`. */
export const AVAILABLE_SETS_LOOKUP = {
  $lookup: {
    from: "sets",
    localField: "availableSetConfigs.setId",
    foreignField: "_id",
    pipeline: [
      { $project: { name: 1, pieceCount: 1, maxFlavors: 1, imageUrl: 1 } },
      { $sort: { pieceCount: 1 } },
    ],
    as: "availableSets",
  },
} as const;
