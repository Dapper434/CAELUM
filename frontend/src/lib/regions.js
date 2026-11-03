/** Operating catchments used to filter facilities by `region_code`. Codes match the CAELUM API's facility data. */

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

export function regionByCode(code) {
  return REGIONS.find((region) => region.code === code) || null;
}
