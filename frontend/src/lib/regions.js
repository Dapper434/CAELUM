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
  {
    code: "coast",
    name: "Coast Region",
    counties: ["Mombasa", "Kilifi", "Kwale", "Lamu", "Taita-Taveta", "Tana River"],
  },
  {
    code: "nyanza",
    name: "Nyanza Region",
    counties: ["Kisumu", "Siaya", "Homa Bay", "Migori", "Kisii", "Nyamira"],
  },
  {
    code: "western",
    name: "Western Region",
    counties: ["Kakamega", "Bungoma", "Busia", "Vihiga"],
  },
];

export function regionByCode(code) {
  return REGIONS.find((region) => region.code === code) || null;
}
