/** Operating catchments. Keep codes aligned with backend/app/regions.py. */

export const REGIONS = [
  {
    code: "nairobi",
    name: "Nairobi Region",
    counties: ["Nairobi", "Kiambu", "Machakos", "Kajiado"],
  },
  {
    code: "south_rift",
    name: "South Rift Region",
    counties: ["Nakuru", "Narok", "Baringo"],
  },
  {
    code: "north_rift",
    name: "North Rift Region",
    counties: ["Uasin Gishu", "Nandi", "Trans Nzoia", "Elgeyo-Marakwet"],
  },
];

export const DEFAULT_REGION = "nairobi";

export function regionByCode(code) {
  return REGIONS.find((region) => region.code === code) || REGIONS[0];
}
