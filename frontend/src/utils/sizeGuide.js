const NIKE_UNISEX_ROWS = [
  ["3.5", "5", "3", "22.5", "35.5", "21.6"],
  ["4", "5.5", "3.5", "23", "36", "22"],
  ["4.5", "6", "4", "23.5", "36.5", "22.4"],
  ["5", "6.5", "4.5", "23.5", "37.5", "22.9"],
  ["5.5", "7", "5", "24", "38", "23.3"],
  ["6", "7.5", "5.5", "24", "38.5", "23.7"],
  ["6.5", "8", "6", "24.5", "39", "24.1"],
  ["7", "8.5", "6", "25", "40", "24.5"],
  ["7.5", "9", "6.5", "25.5", "40.5", "25"],
  ["8", "9.5", "7", "26", "41", "25.4"],
  ["8.5", "10", "7.5", "26.5", "42", "25.8"],
  ["9", "10.5", "8", "27", "42.5", "26.2"],
  ["9.5", "11", "8.5", "27.5", "43", "26.7"],
  ["10", "11.5", "9", "28", "44", "27.1"],
  ["10.5", "12", "9.5", "28.5", "44.5", "27.5"],
  ["11", "12.5", "10", "29", "45", "27.9"],
  ["11.5", "13", "10.5", "29.5", "45.5", "28.3"],
  ["12", "13.5", "11", "30", "46", "28.8"],
  ["12.5", "14", "11.5", "30.5", "47", "29.2"],
  ["13", "14.5", "12", "31", "47.5", "29.6"],
  ["13.5", "15", "12.5", "31.5", "48", "30"],
  ["14", "15.5", "13", "32", "48.5", "30.5"],
  ["14.5", "16", "13.5", "32.5", "49", "30.9"],
  ["15", "16.5", "14", "33", "49.5", "31.3"],
  ["15.5", "17", "14.5", "33.5", "50", "31.7"],
  ["16", "17.5", "15", "34", "50.5", "32.2"],
  ["16.5", "18", "15.5", "34.5", "51", "32.6"],
  ["17", "18.5", "16", "35", "51.5", "33"],
  ["17.5", "19", "16.5", "35.5", "52", "33.4"],
  ["18", "19.5", "17", "36", "52.5", "33.9"],
  ["18.5", "20", "17.5", "36.5", "53", "34.3"],
  ["19", "20.5", "18", "37", "53.5", "34.7"],
  ["19.5", "21", "18.5", "37.5", "54", "35.1"],
  ["20", "21.5", "19", "38", "54.5", "35.5"],
  ["20.5", "22", "19.5", "38.5", "55", "36"],
  ["21", "22.5", "20", "39", "55.5", "36.4"],
  ["21.5", "23", "20.5", "39.5", "56", "36.8"],
  ["22", "23.5", "21", "40", "56.5", "37.2"]
].map(([usMen, usWomen, uk, cmJp, eu, footLengthCm]) => ({
  usMen,
  usWomen,
  uk,
  cmJp,
  eu,
  footLengthCm,
  matchMen: usMen,
  matchWomen: usWomen
}));

const ADIDAS_UNISEX_ROWS = [
  ["8.7\"", "4", "5", "36", "3.5", "220", "22.1 cm"],
  ["8.9\"", "4.5", "5.5", "36 2/3", "4", "225", "22.5 cm"],
  ["9.0\"", "5", "6", "37 1/3", "4.5", "230", "22.9 cm"],
  ["9.2\"", "5.5", "6.5", "38", "5", "235", "23.3 cm"],
  ["9.4\"", "6", "7", "38 2/3", "5.5", "240", "23.8 cm"],
  ["9.5\"", "6.5", "7.5", "39 1/3", "6", "245", "24.2 cm"],
  ["9.7\"", "7", "8", "40", "6.5", "250", "24.6 cm"],
  ["9.8\"", "7.5", "8.5", "40 2/3", "7", "255", "25.0 cm"],
  ["10.0\"", "8", "9", "41 1/3", "7.5", "260", "25.5 cm"],
  ["10.2\"", "8.5", "9.5", "42", "8", "265", "25.9 cm"],
  ["10.4\"", "9", "10", "42 2/3", "8.5", "270", "26.3 cm"],
  ["10.5\"", "9.5", "10.5", "43 1/3", "9", "275", "26.7 cm"],
  ["10.7\"", "10", "11", "44", "9.5", "280", "27.1 cm"],
  ["10.9\"", "10.5", "11.5", "44 2/3", "10", "285", "27.6 cm"],
  ["11.0\"", "11", "12", "45 1/3", "10.5", "290", "28.0 cm"],
  ["11.2\"", "11.5", "12.5", "46", "11", "295", "28.4 cm"],
  ["11.3\"", "12", "13", "46 2/3", "11.5", "300", "28.8 cm"],
  ["11.5\"", "12.5", "13.5", "47 1/3", "12", "305", "29.3 cm"],
  ["11.7\"", "13", "14", "48", "12.5", "310", "29.7 cm"],
  ["11.9\"", "13.5", "14.5", "48 2/3", "13", "315", "30.1 cm"],
  ["12.0\"", "14", "15", "49 1/3", "13.5", "320", "30.5 cm"],
  ["12.2\"", "14.5", "15.5", "50", "14", "325", "31.0 cm"],
  ["12.4\"", "15", "--", "50 2/3", "14.5", "--", "31.4 cm"],
  ["12.7\"", "16", "--", "51 1/3", "15", "--", "31.8 cm"],
  ["13.0\"", "17", "--", "52 2/3", "16", "--", "32.6 cm"],
  ["13.3\"", "18", "--", "53 1/3", "17", "--", "33.5 cm"],
  ["13.7\"", "19", "--", "54 2/3", "18", "--", "34.3 cm"],
  ["14.0\"", "20", "--", "55 2/3", "19", "--", "35.2 cm"]
].map(([heelToeInch, usMen, usWomen, eu, uk, jp, heelToeCm]) => ({
  heelToeInch,
  usMen,
  usWomen,
  eu,
  uk,
  jp,
  heelToeCm,
  matchMen: usMen,
  matchWomen: usWomen !== "--" ? usWomen : ""
}));

const CROCS_UNISEX_ROWS = [
  ["4", "2", "2", "1", "33-34", "20", "210mm", "7 5/8\""],
  ["5", "3", "3", "2", "34-35", "21", "220mm", "8\""],
  ["6", "4", "4", "3", "36-37", "22", "230mm", "8 3/8\""],
  ["7", "5", "5", "4", "37-38", "23", "240mm", "8 5/8\""],
  ["8", "6", "6", "5", "38-39", "24", "250mm", "9\""],
  ["9", "7", "7", "6", "39-40", "25", "260mm", "9 3/8\""],
  ["10", "8", "8", "7", "41-42", "26", "270mm", "9 5/8\""],
  ["11", "9", "9", "8", "42-43", "27", "280mm", "10\""],
  ["12", "10", "10", "9", "43-44", "28", "290mm", "10 3/8\""],
  ["13", "11", "11", "10", "45-46", "29", "300mm", "10 5/8\""],
  ["14", "12", "12", "11", "46-47", "30", "310mm", "11\""],
  ["15", "13", "13", "12", "48-49", "31", "320mm", "11 3/8\""],
  ["16", "14", "14", "13", "49-50", "32", "330mm", "11 5/8\""],
  ["17", "15", "15", "14", "50-51", "33", "340mm", "12\""],
  ["18", "16", "16", "15", "51-52", "34", "350mm", "12 3/8\""],
  ["19", "17", "17", "16", "52-53", "35", "360mm", "12 5/8\""]
].map(([usWomen, usMen, ukWomen, ukMen, eu, japan, korea, heelToToeLength]) => ({
  usWomen,
  usMen,
  ukWomen,
  ukMen,
  eu,
  japan,
  korea,
  heelToToeLength,
  matchMen: usMen,
  matchWomen: usWomen
}));

const BRAND_SIZE_GUIDES = {
  NIKE: {
    brandLabel: "Nike",
    sourceLabel: "Nike official size conversion chart",
    sections: {
      UNISEX: {
        label: "Unisex conversion",
        columns: [
          { key: "usMen", label: "US - Men's" },
          { key: "usWomen", label: "US - Women's" },
          { key: "uk", label: "UK" },
          { key: "cmJp", label: "CM/JP" },
          { key: "eu", label: "EU" },
          { key: "footLengthCm", label: "Foot length (cm)" }
        ],
        rows: NIKE_UNISEX_ROWS
      }
    }
  },
  ADIDAS: {
    brandLabel: "Adidas",
    sourceLabel: "Adidas official size conversion chart",
    sections: {
      UNISEX: {
        label: "Unisex conversion",
        columns: [
          { key: "heelToeInch", label: "Heel-toe (INCH)" },
          { key: "usMen", label: "US - Men" },
          { key: "usWomen", label: "US - Women" },
          { key: "eu", label: "EU" },
          { key: "uk", label: "UK" },
          { key: "jp", label: "JP" },
          { key: "heelToeCm", label: "Heel-toe (cm)" }
        ],
        rows: ADIDAS_UNISEX_ROWS
      }
    }
  },
  CROCS: {
    brandLabel: "Crocs",
    sourceLabel: "Crocs official size conversion chart",
    fitNote: "Crocs come in whole sizes only and may run large or small depending on the style. Check each style page for size-up/size-down recommendations.",
    sections: {
      UNISEX: {
        label: "Unisex conversion",
        columns: [
          { key: "usWomen", label: "US - Women" },
          { key: "usMen", label: "US - Men" },
          { key: "ukWomen", label: "UK - Women" },
          { key: "ukMen", label: "UK - Men" },
          { key: "eu", label: "EU" },
          { key: "japan", label: "Japan" },
          { key: "korea", label: "Korea" },
          { key: "heelToToeLength", label: "Heel to Toe Length" }
        ],
        rows: CROCS_UNISEX_ROWS
      }
    }
  },
  ON: {
    brandLabel: "On",
    sourceLabel: "On official size conversion chart",
    sections: {
      UNISEX: {
        label: "Unisex conversion",
        columns: [
          { key: "us", label: "US" },
          { key: "br", label: "BR" },
          { key: "eu", label: "EU" },
          { key: "jp", label: "JP" },
          { key: "uk", label: "UK" }
        ],
        rows: [
          { us: "W5 / M3.5", br: "N/A", eu: "36", jp: "W22", uk: "3", matchMen: "3.5", matchWomen: "5" },
          { us: "W5.5 / M4", br: "W34 / M33", eu: "36.5", jp: "W22.5", uk: "3.5", matchMen: "4", matchWomen: "5.5" },
          { us: "W6 / M4.5", br: "W34.5 / M33.5", eu: "37", jp: "W23", uk: "4", matchMen: "4.5", matchWomen: "6" },
          { us: "W6.5 / M5", br: "W35 / M34.5", eu: "37.5", jp: "W23.5", uk: "4.5", matchMen: "5", matchWomen: "6.5" },
          { us: "W7 / M5.5", br: "W36 / M35", eu: "38", jp: "W24", uk: "5", matchMen: "5.5", matchWomen: "7" },
          { us: "W7.5 / M6", br: "W37 / M36", eu: "38.5", jp: "W24.5", uk: "5.5", matchMen: "6", matchWomen: "7.5" },
          { us: "W8 / M6.5", br: "W37.5 / M36.5", eu: "39", jp: "W25", uk: "6", matchMen: "6.5", matchWomen: "8" },
          { us: "W8.5 / M7", br: "W38 / M37", eu: "40", jp: "M25 / W25.5", uk: "6.5", matchMen: "7", matchWomen: "8.5" },
          { us: "W9 / M7.5", br: "W39 / M38", eu: "40.5", jp: "M25.5 / W26", uk: "7", matchMen: "7.5", matchWomen: "9" },
          { us: "W9.5 / M8", br: "W39.5 / M39", eu: "41", jp: "M26 / W26.5", uk: "7.5", matchMen: "8", matchWomen: "9.5" },
          { us: "W10 / M8.5", br: "W40 / M39.5", eu: "42", jp: "M26.5 / W27", uk: "8", matchMen: "8.5", matchWomen: "10" },
          { us: "W10.5 / M9", br: "W41 / M40", eu: "42.5", jp: "M27 / W27.5", uk: "8.5", matchMen: "9", matchWomen: "10.5" },
          { us: "W11 / M9.5", br: "W42 / M41", eu: "43", jp: "M27.5 / W28", uk: "9", matchMen: "9.5", matchWomen: "11" },
          { us: "W11.5 / M10", br: "W42.5 / M41.5", eu: "44", jp: "M28", uk: "9.5", matchMen: "10", matchWomen: "11.5" },
          { us: "W12 / M10.5", br: "W43 / M42", eu: "44.5", jp: "M28.5", uk: "10", matchMen: "10.5", matchWomen: "12" },
          { us: "W12.5 / M11", br: "W43.5 / M42.5", eu: "45", jp: "M29", uk: "10.5", matchMen: "11", matchWomen: "12.5" },
          { us: "W13 / M11.5", br: "W44 / M43", eu: "46", jp: "M29.5", uk: "11", matchMen: "11.5", matchWomen: "13" },
          { us: "W13.5 / M12", br: "W45 / M44", eu: "47", jp: "M30", uk: "11.5", matchMen: "12", matchWomen: "13.5" },
          { us: "W14 / M12.5", br: "W46 / M45", eu: "47.5", jp: "M30.5", uk: "12", matchMen: "12.5", matchWomen: "14" },
          { us: "W14.5 / M13", br: "W47 / M46", eu: "48", jp: "M31", uk: "12.5", matchMen: "13", matchWomen: "14.5" },
          { us: "W15.5 / M14", br: "W48 / M47", eu: "49", jp: "M31.5", uk: "13.5", matchMen: "14", matchWomen: "15.5" }
        ]
      }
    }
  },
  ONITSUKA: {
    brandLabel: "Onitsuka Tiger",
    sourceLabel: "Onitsuka Tiger official size conversion chart",
    sections: {
      MEN: {
        label: "Men's conversion",
        columns: [
          { key: "uk", label: "UK" },
          { key: "us", label: "US" },
          { key: "women", label: "Women" },
          { key: "euro", label: "EURO" },
          { key: "cm", label: "CM" }
        ],
        rows: [
          { uk: "3", us: "4", women: "5H", euro: "36", cm: "22.5", matchMen: "4", matchWomen: "5.5" },
          { uk: "3.5", us: "4H", women: "6", euro: "37", cm: "23", matchMen: "4.5", matchWomen: "6" },
          { uk: "4", us: "5", women: "6H", euro: "37.5", cm: "23.5", matchMen: "5", matchWomen: "6.5" },
          { uk: "4.5", us: "5H", women: "7", euro: "38", cm: "24", matchMen: "5.5", matchWomen: "7" },
          { uk: "5", us: "6", women: "7H", euro: "39", cm: "24.5", matchMen: "6", matchWomen: "7.5" },
          { uk: "5.5", us: "6H", women: "8", euro: "39.5", cm: "25", matchMen: "6.5", matchWomen: "8" },
          { uk: "6", us: "7", women: "8H", euro: "40", cm: "25.25", matchMen: "7", matchWomen: "8.5" },
          { uk: "6.5", us: "7H", women: "9", euro: "40.5", cm: "25.5", matchMen: "7.5", matchWomen: "9" },
          { uk: "7", us: "8", women: "9H", euro: "41.5", cm: "26", matchMen: "8", matchWomen: "9.5" },
          { uk: "7.5", us: "8H", women: "10", euro: "42", cm: "26.5", matchMen: "8.5", matchWomen: "10" },
          { uk: "8", us: "9", women: "10H", euro: "42.5", cm: "27", matchMen: "9", matchWomen: "10.5" },
          { uk: "8.5", us: "9H", women: "11", euro: "43.5", cm: "27.5", matchMen: "9.5", matchWomen: "11" },
          { uk: "9", us: "10", women: "11H", euro: "44", cm: "28", matchMen: "10", matchWomen: "11.5" },
          { uk: "9.5", us: "10H", women: "12", euro: "44.5", cm: "28.25", matchMen: "10.5", matchWomen: "12" },
          { uk: "10", us: "11", women: "12H", euro: "45", cm: "28.5", matchMen: "11", matchWomen: "12.5" },
          { uk: "10.5", us: "11H", women: "13", euro: "46", cm: "29", matchMen: "11.5", matchWomen: "13" },
          { uk: "11", us: "12", women: "13H", euro: "46.5", cm: "29.5", matchMen: "12", matchWomen: "13.5" },
          { uk: "11.5", us: "12H", women: "14", euro: "47", cm: "30", matchMen: "12.5", matchWomen: "14" },
          { uk: "12", us: "13", women: "14H", euro: "48", cm: "30.5", matchMen: "13", matchWomen: "14.5" },
          { uk: "12.5", us: "13H", women: "15", euro: "48.5", cm: "30.75", matchMen: "13.5", matchWomen: "15" },
          { uk: "13", us: "14", women: "15H", euro: "49", cm: "31", matchMen: "14", matchWomen: "15.5" }
        ]
      },
      WOMEN: {
        label: "Women's conversion",
        columns: [
          { key: "uk", label: "UK" },
          { key: "us", label: "US" },
          { key: "euro", label: "EURO" },
          { key: "cm", label: "CM" }
        ],
        rows: [
          { uk: "2", us: "4", euro: "34.5", cm: "21.5", matchWomen: "4" },
          { uk: "2.5", us: "4H", euro: "35", cm: "22", matchWomen: "4.5" },
          { uk: "3", us: "5", euro: "35.5", cm: "22.5", matchWomen: "5" },
          { uk: "3.5", us: "5H", euro: "36", cm: "22.75", matchWomen: "5.5" },
          { uk: "4", us: "6", euro: "37", cm: "23", matchWomen: "6" },
          { uk: "4.5", us: "6H", euro: "37.5", cm: "23.5", matchWomen: "6.5" },
          { uk: "5", us: "7", euro: "38", cm: "24.0", matchWomen: "7" },
          { uk: "5.5", us: "7H", euro: "39", cm: "24.5", matchWomen: "7.5" },
          { uk: "6", us: "8", euro: "39.5", cm: "25.0", matchWomen: "8" },
          { uk: "6.5", us: "8H", euro: "40", cm: "25.5", matchWomen: "8.5" },
          { uk: "7", us: "9", euro: "40.5", cm: "25.75", matchWomen: "9" },
          { uk: "7.5", us: "9H", euro: "41.5", cm: "26", matchWomen: "9.5" },
          { uk: "8", us: "10", euro: "42", cm: "26.5", matchWomen: "10" },
          { uk: "8.5", us: "10H", euro: "42.5", cm: "27.0", matchWomen: "10.5" },
          { uk: "9", us: "11", euro: "43.5", cm: "27.5", matchWomen: "11" },
          { uk: "9.5", us: "11H", euro: "44", cm: "28.0", matchWomen: "11.5" },
          { uk: "10", us: "12", euro: "44.5", cm: "28.5", matchWomen: "12" },
          { uk: "10.5", us: "12H", euro: "45", cm: "28.75", matchWomen: "12.5" },
          { uk: "11", us: "13", euro: "46", cm: "29.0", matchWomen: "13" },
          { uk: "11.5", us: "13H", euro: "46.5", cm: "29.5", matchWomen: "13.5" },
          { uk: "12", us: "14", euro: "47", cm: "30.0", matchWomen: "14" }
        ]
      },
      KIDS: {
        label: "Kids conversion",
        columns: [
          { key: "uk", label: "UK" },
          { key: "us", label: "US" },
          { key: "euro", label: "EURO" },
          { key: "cm", label: "CM" }
        ],
        rows: [
          { uk: "K3", us: "K4", euro: "19.5", cm: "12" },
          { uk: "K4", us: "K5", euro: "21", cm: "13" },
          { uk: "K5", us: "K6", euro: "22.5", cm: "13.5" },
          { uk: "K6", us: "K7", euro: "23.5", cm: "14.5" },
          { uk: "K7", us: "K8", euro: "25", cm: "15" },
          { uk: "K8", us: "K9", euro: "26", cm: "16" },
          { uk: "K9", us: "K10", euro: "27", cm: "17" },
          { uk: "K10", us: "K11", euro: "28.5", cm: "17.5" },
          { uk: "K11", us: "K12", euro: "30", cm: "18.5" },
          { uk: "K12", us: "K13", euro: "31.5", cm: "19.5" },
          { uk: "K13", us: "1", euro: "32.5", cm: "20" },
          { uk: "1", us: "2", euro: "33.5", cm: "21" },
          { uk: "2", us: "3", euro: "35", cm: "22" },
          { uk: "3", us: "4", euro: "36", cm: "22.5" }
        ]
      }
    }
  },
  PUMA: {
    brandLabel: "Puma",
    sourceLabel: "Puma official size conversion chart",
    sections: {
      UNISEX: {
        label: "Unisex conversion",
        columns: [
          { key: "usMen", label: "US (Men)" },
          { key: "usWomen", label: "US (Women)" },
          { key: "uk", label: "UK" },
          { key: "fr", label: "FR" }
        ],
        rows: [
          { usMen: "4", usWomen: "5.5", uk: "3", fr: "35.5", matchMen: "4", matchWomen: "5.5" },
          { usMen: "4.5", usWomen: "6", uk: "3.5", fr: "36", matchMen: "4.5", matchWomen: "6" },
          { usMen: "5", usWomen: "6.5", uk: "4", fr: "37", matchMen: "5", matchWomen: "6.5" },
          { usMen: "5.5", usWomen: "7", uk: "4.5", fr: "37.5", matchMen: "5.5", matchWomen: "7" },
          { usMen: "6", usWomen: "7.5", uk: "5", fr: "38", matchMen: "6", matchWomen: "7.5" },
          { usMen: "6.5", usWomen: "8", uk: "5.5", fr: "38.5", matchMen: "6.5", matchWomen: "8" },
          { usMen: "7", usWomen: "8.5", uk: "6", fr: "39", matchMen: "7", matchWomen: "8.5" },
          { usMen: "7.5", usWomen: "9", uk: "6.5", fr: "40", matchMen: "7.5", matchWomen: "9" },
          { usMen: "8", usWomen: "9.5", uk: "7", fr: "40.5", matchMen: "8", matchWomen: "9.5" },
          { usMen: "8.5", usWomen: "10", uk: "7.5", fr: "41", matchMen: "8.5", matchWomen: "10" },
          { usMen: "9", usWomen: "10.5", uk: "8", fr: "42", matchMen: "9", matchWomen: "10.5" },
          { usMen: "9.5", usWomen: "11", uk: "8.5", fr: "42.5", matchMen: "9.5", matchWomen: "11" },
          { usMen: "10", usWomen: "11.5", uk: "9", fr: "43", matchMen: "10", matchWomen: "11.5" },
          { usMen: "10.5", usWomen: "12", uk: "9.5", fr: "44", matchMen: "10.5", matchWomen: "12" },
          { usMen: "11", usWomen: "12.5", uk: "10", fr: "44.5", matchMen: "11", matchWomen: "12.5" },
          { usMen: "11.5", usWomen: "13", uk: "10.5", fr: "45", matchMen: "11.5", matchWomen: "13" },
          { usMen: "12", usWomen: "13.5", uk: "11", fr: "46", matchMen: "12", matchWomen: "13.5" },
          { usMen: "12.5", usWomen: "14", uk: "11.5", fr: "46.5", matchMen: "12.5", matchWomen: "14" },
          { usMen: "13", usWomen: "14.5", uk: "12", fr: "47", matchMen: "13", matchWomen: "14.5" },
          { usMen: "14", usWomen: "15.5", uk: "13", fr: "48.5", matchMen: "14", matchWomen: "15.5" },
          { usMen: "15", usWomen: "16.5", uk: "14", fr: "49.5", matchMen: "15", matchWomen: "16.5" },
          { usMen: "16", usWomen: "17.5", uk: "15", fr: "51", matchMen: "16", matchWomen: "17.5" }
        ]
      },
      MEN: {
        label: "Men's conversion",
        columns: [
          { key: "us", label: "US" },
          { key: "uk", label: "UK" },
          { key: "it", label: "IT" },
          { key: "fr", label: "FR" }
        ],
        rows: [
          { us: "4", uk: "3", it: "35.5", fr: "35.5", matchMen: "4" },
          { us: "4.5", uk: "3.5", it: "36", fr: "36", matchMen: "4.5" },
          { us: "5", uk: "4", it: "37", fr: "37", matchMen: "5" },
          { us: "5.5", uk: "4.5", it: "37.5", fr: "37.5", matchMen: "5.5" },
          { us: "6", uk: "5", it: "38", fr: "38", matchMen: "6" },
          { us: "6.5", uk: "5.5", it: "38.5", fr: "38.5", matchMen: "6.5" },
          { us: "7", uk: "6", it: "39", fr: "39", matchMen: "7" },
          { us: "7.5", uk: "6.5", it: "40", fr: "40", matchMen: "7.5" },
          { us: "8", uk: "7", it: "40.5", fr: "40.5", matchMen: "8" },
          { us: "8.5", uk: "7.5", it: "41", fr: "41", matchMen: "8.5" },
          { us: "9", uk: "8", it: "42", fr: "42", matchMen: "9" },
          { us: "9.5", uk: "8.5", it: "42.5", fr: "42.5", matchMen: "9.5" },
          { us: "10", uk: "9", it: "43", fr: "43", matchMen: "10" },
          { us: "10.5", uk: "9.5", it: "44", fr: "44", matchMen: "10.5" },
          { us: "11", uk: "10", it: "44.5", fr: "44.5", matchMen: "11" },
          { us: "11.5", uk: "10.5", it: "45", fr: "45", matchMen: "11.5" },
          { us: "12", uk: "11", it: "46", fr: "46", matchMen: "12" },
          { us: "12.5", uk: "11.5", it: "46.5", fr: "46.5", matchMen: "12.5" },
          { us: "13", uk: "12", it: "47", fr: "47", matchMen: "13" },
          { us: "14", uk: "13", it: "48.5", fr: "48.5", matchMen: "14" },
          { us: "15", uk: "14", it: "49.5", fr: "49.5", matchMen: "15" },
          { us: "16", uk: "15", it: "51", fr: "51", matchMen: "16" }
        ]
      },
      WOMEN: {
        label: "Women's conversion",
        columns: [
          { key: "us", label: "US" },
          { key: "uk", label: "UK" },
          { key: "it", label: "IT" },
          { key: "fr", label: "FR" }
        ],
        rows: [
          { us: "5.5", uk: "3", it: "35.5", fr: "35.5", matchWomen: "5.5" },
          { us: "6", uk: "3.5", it: "36", fr: "36", matchWomen: "6" },
          { us: "6.5", uk: "4", it: "37", fr: "37", matchWomen: "6.5" },
          { us: "7", uk: "4.5", it: "37.5", fr: "37.5", matchWomen: "7" },
          { us: "7.5", uk: "5", it: "38", fr: "38", matchWomen: "7.5" },
          { us: "8", uk: "5.5", it: "38.5", fr: "38.5", matchWomen: "8" },
          { us: "8.5", uk: "6", it: "39", fr: "39", matchWomen: "8.5" },
          { us: "9", uk: "6.5", it: "40", fr: "40", matchWomen: "9" },
          { us: "9.5", uk: "7", it: "40.5", fr: "40.5", matchWomen: "9.5" },
          { us: "10", uk: "7.5", it: "41", fr: "41", matchWomen: "10" },
          { us: "10.5", uk: "8", it: "42", fr: "42", matchWomen: "10.5" },
          { us: "11", uk: "8.5", it: "42.5", fr: "42.5", matchWomen: "11" }
        ]
      }
    }
  },
  NEW_BALANCE: {
    brandLabel: "New Balance",
    sourceLabel: "New Balance official size conversion chart",
    sections: {
      MEN: {
        label: "Men's / Unisex",
        columns: [
          { key: "usMen", label: "Men's US Size" },
          { key: "usWomen", label: "Women's US Size" },
          { key: "cm", label: "Length (cm)" },
          { key: "inches", label: "Length (in)" },
          { key: "uk", label: "UK size" },
          { key: "eu", label: "EU size" }
        ],
        rows: [
          { usMen: "2.5", usWomen: "4", cm: "20.5", inches: "8 1/8", uk: "2", eu: "34", matchMen: "2.5", matchWomen: "4" },
          { usMen: "3", usWomen: "4.5", cm: "21", inches: "8 1/4", uk: "2.5", eu: "35", matchMen: "3", matchWomen: "4.5" },
          { usMen: "3.5", usWomen: "5", cm: "21.5", inches: "8 1/2", uk: "3", eu: "35.5", matchMen: "3.5", matchWomen: "5" },
          { usMen: "4", usWomen: "5.5", cm: "22", inches: "8 5/8", uk: "3.5", eu: "36", matchMen: "4", matchWomen: "5.5" },
          { usMen: "4.5", usWomen: "6", cm: "22.5", inches: "8 7/8", uk: "4", eu: "37", matchMen: "4.5", matchWomen: "6" },
          { usMen: "5", usWomen: "6.5", cm: "23", inches: "9", uk: "4.5", eu: "37.5", matchMen: "5", matchWomen: "6.5" },
          { usMen: "5.5", usWomen: "7", cm: "23.5", inches: "9 1/4", uk: "5", eu: "38", matchMen: "5.5", matchWomen: "7" },
          { usMen: "6", usWomen: "7.5", cm: "24", inches: "9 1/2", uk: "5.5", eu: "38.5", matchMen: "6", matchWomen: "7.5" },
          { usMen: "6.5", usWomen: "8", cm: "24.5", inches: "9 5/8", uk: "6", eu: "39.5", matchMen: "6.5", matchWomen: "8" },
          { usMen: "7", usWomen: "8.5", cm: "25", inches: "9 7/8", uk: "6.5", eu: "40", matchMen: "7", matchWomen: "8.5" },
          { usMen: "7.5", usWomen: "9", cm: "25.5", inches: "10", uk: "7", eu: "40.5", matchMen: "7.5", matchWomen: "9" },
          { usMen: "8", usWomen: "9.5", cm: "26", inches: "10 1/4", uk: "7.5", eu: "41.5", matchMen: "8", matchWomen: "9.5" },
          { usMen: "8.5", usWomen: "10", cm: "26.5", inches: "10 3/8", uk: "8", eu: "42", matchMen: "8.5", matchWomen: "10" },
          { usMen: "9", usWomen: "10.5", cm: "27", inches: "10 5/8", uk: "8.5", eu: "42.5", matchMen: "9", matchWomen: "10.5" },
          { usMen: "9.5", usWomen: "11", cm: "27.5", inches: "10 7/8", uk: "9", eu: "43", matchMen: "9.5", matchWomen: "11" },
          { usMen: "10", usWomen: "11.5", cm: "28", inches: "11", uk: "9.5", eu: "44", matchMen: "10", matchWomen: "11.5" },
          { usMen: "10.5", usWomen: "12", cm: "28.5", inches: "11 1/4", uk: "10", eu: "44.5", matchMen: "10.5", matchWomen: "12" },
          { usMen: "11", usWomen: "12.5", cm: "29", inches: "11 3/8", uk: "10.5", eu: "45", matchMen: "11", matchWomen: "12.5" },
          { usMen: "11.5", usWomen: "13", cm: "29.5", inches: "11 5/8", uk: "11", eu: "45.5", matchMen: "11.5", matchWomen: "13" },
          { usMen: "12", usWomen: "13.5", cm: "30", inches: "11 3/4", uk: "11.5", eu: "46.5", matchMen: "12", matchWomen: "13.5" },
          { usMen: "12.5", usWomen: "14", cm: "30.5", inches: "12", uk: "12", eu: "47", matchMen: "12.5", matchWomen: "14" },
          { usMen: "13", usWomen: "14.5", cm: "31", inches: "12 1/4", uk: "12.5", eu: "47.5", matchMen: "13", matchWomen: "14.5" },
          { usMen: "13.5", usWomen: "15", cm: "31.5", inches: "12 3/8", uk: "13", eu: "48.5", matchMen: "13.5", matchWomen: "15" },
          { usMen: "14", usWomen: "15.5", cm: "32", inches: "12 5/8", uk: "13.5", eu: "49", matchMen: "14", matchWomen: "15.5" },
          { usMen: "15", usWomen: "16.5", cm: "33", inches: "13", uk: "14.5", eu: "50", matchMen: "15", matchWomen: "16.5" },
          { usMen: "16", usWomen: "17.5", cm: "34", inches: "13 3/8", uk: "15.5", eu: "51", matchMen: "16", matchWomen: "17.5" },
          { usMen: "17", usWomen: "18.5", cm: "35", inches: "13 3/4", uk: "16.5", eu: "52", matchMen: "17", matchWomen: "18.5" },
          { usMen: "18", usWomen: "19.5", cm: "36", inches: "14 1/8", uk: "17.5", eu: "53", matchMen: "18", matchWomen: "19.5" },
          { usMen: "19", usWomen: "-", cm: "37", inches: "14 5/8", uk: "18.5", eu: "54", matchMen: "19", matchWomen: "" },
          { usMen: "20", usWomen: "-", cm: "38", inches: "15", uk: "19.5", eu: "55", matchMen: "20", matchWomen: "" }
        ]
      },
      WOMEN: {
        label: "Women's",
        columns: [
          { key: "usWomen", label: "Women's US Size" },
          { key: "usMen", label: "Men's US Size" },
          { key: "cm", label: "Length (cm)" },
          { key: "inches", label: "Length (in)" },
          { key: "uk", label: "UK size" },
          { key: "eu", label: "EU size" }
        ],
        rows: [
          { usWomen: "3", usMen: "1.5", cm: "20", inches: "7 7/8", uk: "1", eu: "33", matchWomen: "3", matchMen: "1.5" },
          { usWomen: "3.5", usMen: "2", cm: "20.5", inches: "8 1/8", uk: "1.5", eu: "33.5", matchWomen: "3.5", matchMen: "2" },
          { usWomen: "4", usMen: "2.5", cm: "21", inches: "8 1/4", uk: "2", eu: "34", matchWomen: "4", matchMen: "2.5" },
          { usWomen: "4.5", usMen: "3", cm: "21.5", inches: "8 1/2", uk: "2.5", eu: "34.5", matchWomen: "4.5", matchMen: "3" },
          { usWomen: "5", usMen: "3.5", cm: "22", inches: "8 5/8", uk: "3", eu: "35", matchWomen: "5", matchMen: "3.5" },
          { usWomen: "5.5", usMen: "4", cm: "22.5", inches: "8 7/8", uk: "3.5", eu: "36", matchWomen: "5.5", matchMen: "4" },
          { usWomen: "6", usMen: "4.5", cm: "23", inches: "9", uk: "4", eu: "36.5", matchWomen: "6", matchMen: "4.5" },
          { usWomen: "6.5", usMen: "5", cm: "23.5", inches: "9 1/4", uk: "4.5", eu: "37", matchWomen: "6.5", matchMen: "5" },
          { usWomen: "7", usMen: "5.5", cm: "24", inches: "9 1/2", uk: "5", eu: "37.5", matchWomen: "7", matchMen: "5.5" },
          { usWomen: "7.5", usMen: "6", cm: "24.5", inches: "9 5/8", uk: "5.5", eu: "38", matchWomen: "7.5", matchMen: "6" },
          { usWomen: "8", usMen: "6.5", cm: "25", inches: "9 7/8", uk: "6", eu: "39", matchWomen: "8", matchMen: "6.5" },
          { usWomen: "8.5", usMen: "7", cm: "25.5", inches: "10", uk: "6.5", eu: "40", matchWomen: "8.5", matchMen: "7" },
          { usWomen: "9", usMen: "7.5", cm: "26", inches: "10 1/4", uk: "7", eu: "40.5", matchWomen: "9", matchMen: "7.5" },
          { usWomen: "9.5", usMen: "8", cm: "26.5", inches: "10 3/8", uk: "7.5", eu: "41", matchWomen: "9.5", matchMen: "8" },
          { usWomen: "10", usMen: "8.5", cm: "27", inches: "10 5/8", uk: "8", eu: "41.5", matchWomen: "10", matchMen: "8.5" },
          { usWomen: "10.5", usMen: "9", cm: "27.5", inches: "10 7/8", uk: "8.5", eu: "42.5", matchWomen: "10.5", matchMen: "9" },
          { usWomen: "11", usMen: "9.5", cm: "28", inches: "11", uk: "9", eu: "43", matchWomen: "11", matchMen: "9.5" },
          { usWomen: "11.5", usMen: "10", cm: "28.5", inches: "11 1/4", uk: "9.5", eu: "43.5", matchWomen: "11.5", matchMen: "10" },
          { usWomen: "12", usMen: "10.5", cm: "29", inches: "11 3/8", uk: "10", eu: "44", matchWomen: "12", matchMen: "10.5" },
          { usWomen: "12.5", usMen: "11", cm: "29.5", inches: "11 5/8", uk: "10.5", eu: "45", matchWomen: "12.5", matchMen: "11" },
          { usWomen: "13", usMen: "11.5", cm: "30", inches: "11 3/4", uk: "11", eu: "45.5", matchWomen: "13", matchMen: "11.5" },
          { usWomen: "13.5", usMen: "12", cm: "30.5", inches: "12", uk: "11.5", eu: "46", matchWomen: "13.5", matchMen: "12" },
          { usWomen: "14", usMen: "12.5", cm: "31", inches: "12 1/4", uk: "12", eu: "46.5", matchWomen: "14", matchMen: "12.5" },
          { usWomen: "15", usMen: "13.5", cm: "32", inches: "12 5/8", uk: "13", eu: "48", matchWomen: "15", matchMen: "13.5" },
          { usWomen: "16", usMen: "14.5", cm: "32.5", inches: "12 3/4", uk: "14", eu: "49", matchWomen: "16", matchMen: "14.5" }
        ]
      }
    }
  }
};

function normalizeBrandKey(brand = "") {
  const value = brand.trim().toUpperCase();
  if (!value) return "";
  if (value.includes("CROCS")) return "CROCS";
  if (value.includes("ONITSUKA")) return "ONITSUKA";
  if (value.includes("NEW BALANCE") || value === "NB") return "NEW_BALANCE";
  if (value.includes("NIKE")) return "NIKE";
  if (value.includes("ADIDAS")) return "ADIDAS";
  if (value.includes("PUMA")) return "PUMA";
  if (value.includes("ON RUNNING") || /\bON\b/.test(value)) return "ON";
  return "";
}

function normalizeUsSizeToken(value = "") {
  const token = String(value).trim().toUpperCase();
  if (!token) return "";
  if (token.includes("H")) {
    return token.replace(/H/g, ".5");
  }
  const numeric = Number(token);
  if (!Number.isNaN(numeric)) {
    return Number.isInteger(numeric) ? String(numeric) : String(numeric);
  }
  return token;
}

export function getGuideSizeValues(guideSection, sizeGroup = "MEN") {
  if (!guideSection?.rows?.length) return [];

  const prefersWomen = String(sizeGroup || "MEN").toUpperCase() === "WOMEN";
  const values = guideSection.rows
    .map((row) => normalizeUsSizeToken(prefersWomen ? (row.matchWomen || row.match || row.usWomen || row.us) : (row.matchMen || row.match || row.usMen || row.us)))
    .filter(Boolean);

  return [...new Set(values)];
}

export function getBrandSizeGuide(brand) {
  const key = normalizeBrandKey(brand);
  return BRAND_SIZE_GUIDES[key] || null;
}

export function getGuideSectionForContext(guide, { sizeGroup = "MEN", department = "" } = {}) {
  if (!guide?.sections) return null;

  const departmentKey = String(department || "").toUpperCase();
  const prefersWomen = String(sizeGroup || "MEN").toUpperCase() === "WOMEN";

  if ((departmentKey.includes("KID") || departmentKey.includes("GS")) && guide.sections.KIDS) {
    return guide.sections.KIDS;
  }

  if (departmentKey.includes("UNISEX") && guide.sections.UNISEX) {
    return guide.sections.UNISEX;
  }

  if (prefersWomen && guide.sections.WOMEN) {
    return guide.sections.WOMEN;
  }

  if (!prefersWomen && guide.sections.MEN) {
    return guide.sections.MEN;
  }

  if (guide.sections.UNISEX) {
    return guide.sections.UNISEX;
  }

  return guide.sections.MEN || guide.sections.WOMEN || guide.sections.KIDS || Object.values(guide.sections)[0] || null;
}

export function isGuideRowMatch(row, selectedSize, sizeGroup = "MEN") {
  const normalizedSelected = normalizeUsSizeToken(selectedSize);
  if (!normalizedSelected || !row) return false;

  const prefersWomen = String(sizeGroup || "MEN").toUpperCase() === "WOMEN";
  const primaryToken = normalizeUsSizeToken(prefersWomen ? row.matchWomen : row.matchMen);
  if (primaryToken && primaryToken === normalizedSelected) {
    return true;
  }

  if (row.match && normalizeUsSizeToken(row.match) === normalizedSelected) {
    return true;
  }

  return false;
}

export function getGuideSizeBounds(guideSection, sizeGroup = "MEN") {
  if (!guideSection?.rows?.length) return null;

  const prefersWomen = String(sizeGroup || "MEN").toUpperCase() === "WOMEN";
  const values = guideSection.rows
    .map((row) => normalizeUsSizeToken(prefersWomen ? row.matchWomen : row.matchMen))
    .map((token) => Number(token))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

