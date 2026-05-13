/**
 * Helix Health Pre-Onboarding Portal — Field Schema
 *
 * Replaces the legacy multi-tab Excel-style schema. This portal now
 * collects the Facility Pre-Onboarding Checklist used by the Helix
 * onboarding team before a facility is provisioned in Helix.
 *
 * The schema is organised into visually-grouped sections, renders
 * directly off `SECTIONS` below, and every field carries the meaning
 * and guidance that appears inline and inside the floating tooltip.
 */

/* -------------------------------------------------------------------
 * Countries — ISO code, international dial code and the maximum
 * national (significant) number length for validation.
 *
 * `iso` is used both for flag imagery (via flagcdn.com) and for the
 * IP-based default lookup so that e.g. a user in Ghana sees +233 pre-
 * selected. `maxLen` is the largest acceptable number of digits after
 * the dial code — the phone input enforces this as a hard cap.
 * ---------------------------------------------------------------- */
const COUNTRIES = [
  { iso: "AF", code: "+93",   name: "Afghanistan",                     maxLen: 9  },
  { iso: "AL", code: "+355",  name: "Albania",                         maxLen: 9  },
  { iso: "DZ", code: "+213",  name: "Algeria",                         maxLen: 9  },
  { iso: "AD", code: "+376",  name: "Andorra",                         maxLen: 8  },
  { iso: "AO", code: "+244",  name: "Angola",                          maxLen: 9  },
  { iso: "AG", code: "+1",    name: "Antigua and Barbuda",             maxLen: 10 },
  { iso: "AR", code: "+54",   name: "Argentina",                       maxLen: 10 },
  { iso: "AM", code: "+374",  name: "Armenia",                         maxLen: 8  },
  { iso: "AU", code: "+61",   name: "Australia",                       maxLen: 9  },
  { iso: "AT", code: "+43",   name: "Austria",                         maxLen: 13 },
  { iso: "AZ", code: "+994",  name: "Azerbaijan",                      maxLen: 9  },
  { iso: "BS", code: "+1",    name: "Bahamas",                         maxLen: 10 },
  { iso: "BH", code: "+973",  name: "Bahrain",                         maxLen: 8  },
  { iso: "BD", code: "+880",  name: "Bangladesh",                      maxLen: 10 },
  { iso: "BB", code: "+1",    name: "Barbados",                        maxLen: 10 },
  { iso: "BY", code: "+375",  name: "Belarus",                         maxLen: 9  },
  { iso: "BE", code: "+32",   name: "Belgium",                         maxLen: 9  },
  { iso: "BZ", code: "+501",  name: "Belize",                          maxLen: 7  },
  { iso: "BJ", code: "+229",  name: "Benin",                           maxLen: 8  },
  { iso: "BT", code: "+975",  name: "Bhutan",                          maxLen: 8  },
  { iso: "BO", code: "+591",  name: "Bolivia",                         maxLen: 8  },
  { iso: "BA", code: "+387",  name: "Bosnia and Herzegovina",          maxLen: 9  },
  { iso: "BW", code: "+267",  name: "Botswana",                        maxLen: 8  },
  { iso: "BR", code: "+55",   name: "Brazil",                          maxLen: 11 },
  { iso: "BN", code: "+673",  name: "Brunei",                          maxLen: 7  },
  { iso: "BG", code: "+359",  name: "Bulgaria",                        maxLen: 9  },
  { iso: "BF", code: "+226",  name: "Burkina Faso",                    maxLen: 8  },
  { iso: "BI", code: "+257",  name: "Burundi",                         maxLen: 8  },
  { iso: "KH", code: "+855",  name: "Cambodia",                        maxLen: 9  },
  { iso: "CM", code: "+237",  name: "Cameroon",                        maxLen: 9  },
  { iso: "CA", code: "+1",    name: "Canada",                          maxLen: 10 },
  { iso: "CV", code: "+238",  name: "Cape Verde",                      maxLen: 7  },
  { iso: "CF", code: "+236",  name: "Central African Republic",        maxLen: 8  },
  { iso: "TD", code: "+235",  name: "Chad",                            maxLen: 8  },
  { iso: "CL", code: "+56",   name: "Chile",                           maxLen: 9  },
  { iso: "CN", code: "+86",   name: "China",                           maxLen: 11 },
  { iso: "CO", code: "+57",   name: "Colombia",                        maxLen: 10 },
  { iso: "KM", code: "+269",  name: "Comoros",                         maxLen: 7  },
  { iso: "CG", code: "+242",  name: "Congo",                           maxLen: 9  },
  { iso: "CD", code: "+243",  name: "Congo, DR",                       maxLen: 9  },
  { iso: "CR", code: "+506",  name: "Costa Rica",                      maxLen: 8  },
  { iso: "CI", code: "+225",  name: "Côte d'Ivoire",                   maxLen: 10 },
  { iso: "HR", code: "+385",  name: "Croatia",                         maxLen: 9  },
  { iso: "CU", code: "+53",   name: "Cuba",                            maxLen: 8  },
  { iso: "CY", code: "+357",  name: "Cyprus",                          maxLen: 8  },
  { iso: "CZ", code: "+420",  name: "Czechia",                         maxLen: 9  },
  { iso: "DK", code: "+45",   name: "Denmark",                         maxLen: 8  },
  { iso: "DJ", code: "+253",  name: "Djibouti",                        maxLen: 8  },
  { iso: "DM", code: "+1",    name: "Dominica",                        maxLen: 10 },
  { iso: "DO", code: "+1",    name: "Dominican Republic",              maxLen: 10 },
  { iso: "EC", code: "+593",  name: "Ecuador",                         maxLen: 9  },
  { iso: "EG", code: "+20",   name: "Egypt",                           maxLen: 10 },
  { iso: "SV", code: "+503",  name: "El Salvador",                     maxLen: 8  },
  { iso: "GQ", code: "+240",  name: "Equatorial Guinea",               maxLen: 9  },
  { iso: "ER", code: "+291",  name: "Eritrea",                         maxLen: 7  },
  { iso: "EE", code: "+372",  name: "Estonia",                         maxLen: 8  },
  { iso: "SZ", code: "+268",  name: "Eswatini",                        maxLen: 8  },
  { iso: "ET", code: "+251",  name: "Ethiopia",                        maxLen: 9  },
  { iso: "FJ", code: "+679",  name: "Fiji",                            maxLen: 7  },
  { iso: "FI", code: "+358",  name: "Finland",                         maxLen: 10 },
  { iso: "FR", code: "+33",   name: "France",                          maxLen: 9  },
  { iso: "GA", code: "+241",  name: "Gabon",                           maxLen: 8  },
  { iso: "GM", code: "+220",  name: "Gambia",                          maxLen: 7  },
  { iso: "GE", code: "+995",  name: "Georgia",                         maxLen: 9  },
  { iso: "DE", code: "+49",   name: "Germany",                         maxLen: 11 },
  { iso: "GH", code: "+233",  name: "Ghana",                           maxLen: 9  },
  { iso: "GR", code: "+30",   name: "Greece",                          maxLen: 10 },
  { iso: "GD", code: "+1",    name: "Grenada",                         maxLen: 10 },
  { iso: "GT", code: "+502",  name: "Guatemala",                       maxLen: 8  },
  { iso: "GN", code: "+224",  name: "Guinea",                          maxLen: 9  },
  { iso: "GW", code: "+245",  name: "Guinea-Bissau",                   maxLen: 9  },
  { iso: "GY", code: "+592",  name: "Guyana",                          maxLen: 7  },
  { iso: "HT", code: "+509",  name: "Haiti",                           maxLen: 8  },
  { iso: "HN", code: "+504",  name: "Honduras",                        maxLen: 8  },
  { iso: "HK", code: "+852",  name: "Hong Kong",                       maxLen: 8  },
  { iso: "HU", code: "+36",   name: "Hungary",                         maxLen: 9  },
  { iso: "IS", code: "+354",  name: "Iceland",                         maxLen: 7  },
  { iso: "IN", code: "+91",   name: "India",                           maxLen: 10 },
  { iso: "ID", code: "+62",   name: "Indonesia",                       maxLen: 12 },
  { iso: "IR", code: "+98",   name: "Iran",                            maxLen: 10 },
  { iso: "IQ", code: "+964",  name: "Iraq",                            maxLen: 10 },
  { iso: "IE", code: "+353",  name: "Ireland",                         maxLen: 9  },
  { iso: "IL", code: "+972",  name: "Israel",                          maxLen: 9  },
  { iso: "IT", code: "+39",   name: "Italy",                           maxLen: 11 },
  { iso: "JM", code: "+1",    name: "Jamaica",                         maxLen: 10 },
  { iso: "JP", code: "+81",   name: "Japan",                           maxLen: 10 },
  { iso: "JO", code: "+962",  name: "Jordan",                          maxLen: 9  },
  { iso: "KZ", code: "+7",    name: "Kazakhstan",                      maxLen: 10 },
  { iso: "KE", code: "+254",  name: "Kenya",                           maxLen: 9  },
  { iso: "KW", code: "+965",  name: "Kuwait",                          maxLen: 8  },
  { iso: "KG", code: "+996",  name: "Kyrgyzstan",                      maxLen: 9  },
  { iso: "LA", code: "+856",  name: "Laos",                            maxLen: 10 },
  { iso: "LV", code: "+371",  name: "Latvia",                          maxLen: 8  },
  { iso: "LB", code: "+961",  name: "Lebanon",                         maxLen: 8  },
  { iso: "LS", code: "+266",  name: "Lesotho",                         maxLen: 8  },
  { iso: "LR", code: "+231",  name: "Liberia",                         maxLen: 9  },
  { iso: "LY", code: "+218",  name: "Libya",                           maxLen: 9  },
  { iso: "LI", code: "+423",  name: "Liechtenstein",                   maxLen: 7  },
  { iso: "LT", code: "+370",  name: "Lithuania",                       maxLen: 8  },
  { iso: "LU", code: "+352",  name: "Luxembourg",                      maxLen: 9  },
  { iso: "MO", code: "+853",  name: "Macao",                           maxLen: 8  },
  { iso: "MG", code: "+261",  name: "Madagascar",                      maxLen: 9  },
  { iso: "MW", code: "+265",  name: "Malawi",                          maxLen: 9  },
  { iso: "MY", code: "+60",   name: "Malaysia",                        maxLen: 10 },
  { iso: "MV", code: "+960",  name: "Maldives",                        maxLen: 7  },
  { iso: "ML", code: "+223",  name: "Mali",                            maxLen: 8  },
  { iso: "MT", code: "+356",  name: "Malta",                           maxLen: 8  },
  { iso: "MR", code: "+222",  name: "Mauritania",                      maxLen: 8  },
  { iso: "MU", code: "+230",  name: "Mauritius",                       maxLen: 8  },
  { iso: "MX", code: "+52",   name: "Mexico",                          maxLen: 10 },
  { iso: "MD", code: "+373",  name: "Moldova",                         maxLen: 8  },
  { iso: "MC", code: "+377",  name: "Monaco",                          maxLen: 8  },
  { iso: "MN", code: "+976",  name: "Mongolia",                        maxLen: 8  },
  { iso: "ME", code: "+382",  name: "Montenegro",                      maxLen: 8  },
  { iso: "MA", code: "+212",  name: "Morocco",                         maxLen: 9  },
  { iso: "MZ", code: "+258",  name: "Mozambique",                      maxLen: 9  },
  { iso: "MM", code: "+95",   name: "Myanmar",                         maxLen: 10 },
  { iso: "NA", code: "+264",  name: "Namibia",                         maxLen: 9  },
  { iso: "NP", code: "+977",  name: "Nepal",                           maxLen: 10 },
  { iso: "NL", code: "+31",   name: "Netherlands",                     maxLen: 9  },
  { iso: "NZ", code: "+64",   name: "New Zealand",                     maxLen: 10 },
  { iso: "NI", code: "+505",  name: "Nicaragua",                       maxLen: 8  },
  { iso: "NE", code: "+227",  name: "Niger",                           maxLen: 8  },
  { iso: "NG", code: "+234",  name: "Nigeria",                         maxLen: 10 },
  { iso: "KP", code: "+850",  name: "North Korea",                     maxLen: 10 },
  { iso: "MK", code: "+389",  name: "North Macedonia",                 maxLen: 8  },
  { iso: "NO", code: "+47",   name: "Norway",                          maxLen: 8  },
  { iso: "OM", code: "+968",  name: "Oman",                            maxLen: 8  },
  { iso: "PK", code: "+92",   name: "Pakistan",                        maxLen: 10 },
  { iso: "PS", code: "+970",  name: "Palestine",                       maxLen: 9  },
  { iso: "PA", code: "+507",  name: "Panama",                          maxLen: 8  },
  { iso: "PG", code: "+675",  name: "Papua New Guinea",                maxLen: 8  },
  { iso: "PY", code: "+595",  name: "Paraguay",                        maxLen: 9  },
  { iso: "PE", code: "+51",   name: "Peru",                            maxLen: 9  },
  { iso: "PH", code: "+63",   name: "Philippines",                     maxLen: 10 },
  { iso: "PL", code: "+48",   name: "Poland",                          maxLen: 9  },
  { iso: "PT", code: "+351",  name: "Portugal",                        maxLen: 9  },
  { iso: "PR", code: "+1",    name: "Puerto Rico",                     maxLen: 10 },
  { iso: "QA", code: "+974",  name: "Qatar",                           maxLen: 8  },
  { iso: "RO", code: "+40",   name: "Romania",                         maxLen: 9  },
  { iso: "RU", code: "+7",    name: "Russia",                          maxLen: 10 },
  { iso: "RW", code: "+250",  name: "Rwanda",                          maxLen: 9  },
  { iso: "LC", code: "+1",    name: "Saint Lucia",                     maxLen: 10 },
  { iso: "SM", code: "+378",  name: "San Marino",                      maxLen: 10 },
  { iso: "ST", code: "+239",  name: "Sao Tome and Principe",           maxLen: 7  },
  { iso: "SA", code: "+966",  name: "Saudi Arabia",                    maxLen: 9  },
  { iso: "SN", code: "+221",  name: "Senegal",                         maxLen: 9  },
  { iso: "RS", code: "+381",  name: "Serbia",                          maxLen: 9  },
  { iso: "SC", code: "+248",  name: "Seychelles",                      maxLen: 7  },
  { iso: "SL", code: "+232",  name: "Sierra Leone",                    maxLen: 8  },
  { iso: "SG", code: "+65",   name: "Singapore",                       maxLen: 8  },
  { iso: "SK", code: "+421",  name: "Slovakia",                        maxLen: 9  },
  { iso: "SI", code: "+386",  name: "Slovenia",                        maxLen: 8  },
  { iso: "SO", code: "+252",  name: "Somalia",                         maxLen: 8  },
  { iso: "ZA", code: "+27",   name: "South Africa",                    maxLen: 9  },
  { iso: "KR", code: "+82",   name: "South Korea",                     maxLen: 10 },
  { iso: "SS", code: "+211",  name: "South Sudan",                     maxLen: 9  },
  { iso: "ES", code: "+34",   name: "Spain",                           maxLen: 9  },
  { iso: "LK", code: "+94",   name: "Sri Lanka",                       maxLen: 9  },
  { iso: "SD", code: "+249",  name: "Sudan",                           maxLen: 9  },
  { iso: "SR", code: "+597",  name: "Suriname",                        maxLen: 7  },
  { iso: "SE", code: "+46",   name: "Sweden",                          maxLen: 9  },
  { iso: "CH", code: "+41",   name: "Switzerland",                     maxLen: 9  },
  { iso: "SY", code: "+963",  name: "Syria",                           maxLen: 9  },
  { iso: "TW", code: "+886",  name: "Taiwan",                          maxLen: 9  },
  { iso: "TJ", code: "+992",  name: "Tajikistan",                      maxLen: 9  },
  { iso: "TZ", code: "+255",  name: "Tanzania",                        maxLen: 9  },
  { iso: "TH", code: "+66",   name: "Thailand",                        maxLen: 9  },
  { iso: "TL", code: "+670",  name: "Timor-Leste",                     maxLen: 8  },
  { iso: "TG", code: "+228",  name: "Togo",                            maxLen: 8  },
  { iso: "TT", code: "+1",    name: "Trinidad and Tobago",             maxLen: 10 },
  { iso: "TN", code: "+216",  name: "Tunisia",                         maxLen: 8  },
  { iso: "TR", code: "+90",   name: "Turkey",                          maxLen: 10 },
  { iso: "TM", code: "+993",  name: "Turkmenistan",                    maxLen: 8  },
  { iso: "UG", code: "+256",  name: "Uganda",                          maxLen: 9  },
  { iso: "UA", code: "+380",  name: "Ukraine",                         maxLen: 9  },
  { iso: "AE", code: "+971",  name: "United Arab Emirates",            maxLen: 9  },
  { iso: "GB", code: "+44",   name: "United Kingdom",                  maxLen: 10 },
  { iso: "US", code: "+1",    name: "United States",                   maxLen: 10 },
  { iso: "UY", code: "+598",  name: "Uruguay",                         maxLen: 8  },
  { iso: "UZ", code: "+998",  name: "Uzbekistan",                      maxLen: 9  },
  { iso: "VE", code: "+58",   name: "Venezuela",                       maxLen: 10 },
  { iso: "VN", code: "+84",   name: "Vietnam",                         maxLen: 10 },
  { iso: "YE", code: "+967",  name: "Yemen",                           maxLen: 9  },
  { iso: "ZM", code: "+260",  name: "Zambia",                          maxLen: 9  },
  { iso: "ZW", code: "+263",  name: "Zimbabwe",                        maxLen: 9  },
];

/* Countries surfaced at the top of the picker for quick access. */
const COUNTRIES_POPULAR_ISO = ["GH", "NG", "KE", "UG", "ZA", "GB", "US", "CA"];

/* Ghana's 16 administrative regions, in alphabetical order. Used for the
 * Facility Information → Region dropdown. */
const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

const FACILITY_TYPES = [
  "Teaching Hospital",
  "Regional Hospital",
  "District Hospital",
  "Municipal Hospital",
  "Polyclinic",
  "Health Centre",
  "CHPS Compound",
  "Specialist Centre / Clinic",
  "Private Hospital",
  "Private Clinic",
  "Diagnostic / Imaging Centre",
  "Maternity Home",
  "Dental Clinic",
  "Eye Clinic",
  "Other",
];

/* Yes / No answer set used by every boolean-style question. */
const YES_NO = ["Yes", "No"];

/* -------------------------------------------------------------------
 * Section-based schema. Every field can declare:
 *   - type: text | email | number | textarea | select | yesno | phone-intl
 *   - required: boolean
 *   - meaning / guidance: surfaced inline and inside the floating tooltip
 *   - placeholder: optional input placeholder override
 *   - conditional: { field, equals } — only show when another field
 *     matches a given answer (used for the IT staff / inpatient beds
 *     follow-up questions)
 * ---------------------------------------------------------------- */
const SECTIONS = [
  {
    id: "facility",
    title: "Facility Information",
    subtitle: "Basic details about the health facility you'd like onboarded.",
    fields: [
      { key: "facility_name", label: "Facility Name", required: true, type: "text",
        placeholder: "e.g. Korle Bu Teaching Hospital",
        meaning: "Official name of the health facility.",
        guidance: "Please answer with the facility's official name — the way it should appear inside Helix." },
      { key: "facility_type", label: "Facility Type", required: true, type: "select",
        options: FACILITY_TYPES,
        meaning: "Classification of the facility.",
        guidance: "Pick the closest category. Choose Other if none of the options fit." },
      { key: "facility_region", label: "Region", required: true, type: "select",
        options: GHANA_REGIONS,
        placeholder: "Select region",
        meaning: "Administrative region where the facility is located.",
        guidance: "Pick the region the facility operates in — matches Ghana's 16 administrative regions." },
      { key: "facility_city", label: "City / Town", required: true, type: "text",
        placeholder: "e.g. Kumasi",
        meaning: "City, town or locality where the facility is located.",
        guidance: "Enter the city or town where the facility sits (e.g. Kumasi, Takoradi, Tamale)." },
      { key: "facility_address", label: "Facility Address", required: true, type: "textarea",
        placeholder: "Street, landmark, district, postal code (if any)",
        meaning: "Physical address of the facility.",
        guidance: "Street, landmark, district, postal code — whatever will help a delivery or onboarding team find you." },
      { key: "facility_email", label: "Facility Email Address", required: true, type: "email",
        placeholder: "admin@facility.org",
        meaning: "Main working email address for the facility.",
        guidance: "Please provide a valid, working email address. This email will be used to register your facility on the Helix app." },
      { key: "facility_phone", label: "Facility Phone Number", required: true, type: "phone-intl",
        meaning: "Main switchboard or reception line for the facility.",
        guidance: "Pick the country from the flag picker; the field caps the number of digits to match your country." },
    ],
  },

  {
    id: "primary_contact",
    title: "Primary Contact Person",
    subtitle: "The person our team should coordinate with for onboarding.",
    fields: [
      { key: "primary_name", label: "Name of Primary Contact Person", required: true, type: "text",
        placeholder: "Full name",
        meaning: "Staff member responsible for coordinating this onboarding.",
        guidance: "This is the person our team will reach out to with follow-up questions." },
      { key: "primary_phone", label: "Primary Contact's Phone Number", required: true, type: "phone-intl",
        meaning: "Best phone number for the primary contact.",
        guidance: "Pick the country and enter the local number. The field caps digits to match the country." },
      { key: "primary_email", label: "Primary Contact's Email Address", required: true, type: "email",
        placeholder: "name@facility.org",
        meaning: "Best email address for the primary contact.",
        guidance: "Must include an @. Used for onboarding communication and account setup." },
    ],
  },

  {
    id: "secondary_contact",
    title: "Secondary Contact",
    subtitle: "Optional backup in case the primary contact is unavailable.",
    optional: true,
    fields: [
      { key: "secondary_name", label: "Name of Secondary Contact", required: false, type: "text",
        placeholder: "Full name",
        meaning: "Backup contact person.",
        guidance: "Optional. Someone we can reach if the primary contact is unavailable." },
      { key: "secondary_phone", label: "Secondary Contact Phone Number", required: false, type: "phone-intl",
        meaning: "Backup phone number.",
        guidance: "Optional. Same country-picker rules apply." },
      { key: "secondary_email", label: "Secondary Contact Email Address", required: false, type: "email",
        placeholder: "name@facility.org",
        meaning: "Backup email address.",
        guidance: "Optional. Must include an @." },
    ],
  },

  {
    id: "staffing",
    title: "Staffing",
    subtitle: "A rough headcount helps us right-size your Helix deployment.",
    fields: [
      { key: "total_employees", label: "Total Number of Employees", required: true, type: "number",
        placeholder: "e.g. 280",
        meaning: "Total number of people working at the facility.",
        guidance: "Include clinical, non-clinical and admin staff, full-time and part-time." },
      { key: "total_clinical_staff", label: "Total Number of Clinical Staff", required: true, type: "number",
        placeholder: "e.g. 180",
        meaning: "Doctors, nurses, midwives, pharmacists, lab, imaging, allied clinical staff.",
        guidance: "Anyone directly involved in patient care." },
      { key: "total_nonclinical_staff", label: "Total Number of Non-Clinical / Admin Staff", required: true, type: "number",
        placeholder: "e.g. 100",
        meaning: "Admin, finance, records, HR, housekeeping, security, drivers.",
        guidance: "Everyone who isn't directly involved in clinical care." },
      { key: "has_it_team", label: "Does the Facility Have an IT Team?", required: true, type: "yesno",
        meaning: "Is there a dedicated IT / information systems team on-site?",
        guidance: 'Choose "Yes" if there is at least one person officially responsible for IT.' },
      { key: "total_it_staff", label: "Total Number of IT Staff", required: true, type: "number",
        placeholder: "e.g. 3",
        meaning: "How many people sit on the IT team.",
        guidance: 'Enter 0 if there is no dedicated IT team.',
        conditional: { field: "has_it_team", equals: "Yes" } },
    ],
  },

  {
    id: "services",
    title: "Services & Infrastructure",
    subtitle: "Helps us tailor Helix to the way your facility operates.",
    fields: [
      { key: "has_emergency", label: "Does the Facility Have an Emergency Department?", required: true, type: "yesno",
        meaning: "Walk-in emergency / A&E department.",
        guidance: 'Choose "Yes" only if the facility has a dedicated emergency department.' },
      { key: "has_inpatient_wards", label: "Does the Facility Have Inpatient Wards?", required: true, type: "yesno",
        meaning: "Wards where patients are admitted overnight.",
        guidance: 'Choose "Yes" if patients are ever admitted for overnight stays.' },
      { key: "total_inpatient_beds", label: "Total Number of Inpatient Beds", required: true, type: "number",
        placeholder: "e.g. 60",
        meaning: "Total inpatient beds across all wards.",
        guidance: "Include all admission beds across all wards, excluding day-case chairs.",
        conditional: { field: "has_inpatient_wards", equals: "Yes" } },
      { key: "has_ambulance", label: "Does the Facility Have Ambulance / Transfer Coordination?", required: true, type: "yesno",
        meaning: "Ambulance or inter-facility transfer coordination capability.",
        guidance: 'Choose "Yes" if the facility can coordinate ambulance pickups or patient transfers.' },
      { key: "has_medical_director", label: "Does the Facility Have a Medical Director?", required: true, type: "yesno",
        meaning: "Senior clinician accountable for medical operations.",
        guidance: 'Choose "Yes" if there is an officially appointed medical director.' },
    ],
  },

  {
    id: "staff_systems",
    title: "Staff Systems & Directory",
    subtitle: "How your staff are currently identified and contacted.",
    fields: [
      { key: "staff_has_id", label: "Do Staff Have Official Staff IDs?", required: true, type: "yesno",
        meaning: "Is a unique staff / employee ID issued to each person?",
        guidance: 'Choose "Yes" if every staff member receives a unique identifier.' },
      { key: "staff_has_work_email", label: "Do All Staff Have a Designated Work Email Address?", required: true, type: "yesno",
        meaning: "Facility-issued email (e.g. name@facility.org).",
        guidance: 'Choose "Yes" if every staff member has an official facility email.' },
      { key: "staff_uses_personal_email", label: "Do All Staff Mainly Use Personal Email Addresses?", required: true, type: "yesno",
        meaning: "Whether staff typically use personal addresses (Gmail, Yahoo, etc.) for work.",
        guidance: 'Choose "Yes" if personal email is the norm for day-to-day work communication.' },
      { key: "has_employee_directory", label: "Does the Facility Have an Employee Directory?", required: true, type: "yesno",
        meaning: "A single list of all staff — digital or physical.",
        guidance: 'Choose "Yes" if the facility maintains a single, up-to-date list of all employees.' },
      { key: "staff_list_by_department", label: "Is There a List of Staff by Departments?", required: true, type: "yesno",
        meaning: "Are staff grouped/listed per department?",
        guidance: 'Choose "Yes" if you can currently produce a list of staff grouped by department.' },
      { key: "staff_list_by_role", label: "Is There a List of Staff by Roles?", required: true, type: "yesno",
        meaning: "Are staff grouped/listed by role or job title?",
        guidance: 'Choose "Yes" if you can currently produce a list of staff grouped by role or job title.' },
    ],
  },
];

/* Flat list of every field for quick lookup (validation, submission). */
const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);

/* -------------------------------------------------------------------
 * Phone number formatting patterns.
 *
 * Keys are ISO codes. Values use `N` as a digit placeholder — every
 * other character is a literal separator. `formatPhone(iso, digits)`
 * in app.js looks up the pattern here first and otherwise falls back
 * to a generic group-of-3 layout for the country's maxLen.
 * ---------------------------------------------------------------- */
const PHONE_FORMATS = {
  US: "(NNN) NNN-NNNN",
  CA: "(NNN) NNN-NNNN",
  GH: "NN NNN NNNN",
  NG: "NNN NNN NNNN",
  KE: "NNN NNN NNN",
  UG: "NNN NNN NNN",
  ZA: "NN NNN NNNN",
  GB: "NNNN NNNNNN",
  IN: "NNNNN NNNNN",
  AU: "NNN NNN NNN",
  FR: "N NN NN NN NN",
  DE: "NNN NNNNNNN",
  ES: "NNN NN NN NN",
  IT: "NNN NNN NNNN",
  NL: "N NNNN NNNN",
  BR: "NN NNNNN NNNN",
  MX: "NNN NNN NNNN",
  AR: "NN NNNN NNNN",
  CN: "NNN NNNN NNNN",
  JP: "NN NNNN NNNN",
  KR: "NN NNNN NNNN",
  AE: "NN NNN NNNN",
  SA: "NN NNN NNNN",
  EG: "NNN NNN NNNN",
  MA: "NNN NNN NNN",
  TN: "NN NNN NNN",
};

/* ISO codes treated as the North American Numbering Plan. These all
 * share +1 and the same 10-digit national length so they reuse the US
 * formatting pattern. */
const NANP_ISO_CODES = ["US", "CA", "AG", "BS", "BB", "BZ", "DM", "DO", "GD", "JM", "KN", "LC", "VC", "TT"];

const GLOBAL_RULES = [
  "All required fields are marked with a red asterisk (*).",
  "Phone numbers auto-detect your country and cap digits to the correct length.",
  "Some follow-up questions only appear based on earlier answers.",
  "Your progress is saved locally as you type — you can close the tab and return later.",
  "Steps 2–6 (Departments, Units, Staff, Roles, Patients files): attach each when that dataset is ready; they never block submitting Step 1.",
  "Post-submit confirmation (email or in-app) depends on how Helix connects this portal — not simulated in this prototype.",
];

/* -------------------------------------------------------------------
 * Data Templates.
 *
 * Mirror of the "Helix App Required Templates.xlsx" workbook used by
 * the onboarding team today. Each template corresponds to one sheet
 * from that workbook. Column order, column names and required/optional
 * flags are taken verbatim from the workbook so facilities learn the
 * exact shape their data must land in for Helix ingestion.
 *
 * Hovering a column header in the Templates view surfaces the Meaning
 * and Guidance text from the workbook's Guide sheet.
 * ---------------------------------------------------------------- */
const TEMPLATES_INTRO = {
  headline: "Data templates",
  description:
    "Once your facility is onboarded, you'll submit departments, units, staff, roles and patients using these datasets. Column names must match exactly — Helix reads headers verbatim. Hover a column to see what it means.",
  legend: [
    { tone: "required", label: "Required", note: "Must be submitted for every row." },
    { tone: "optional", label: "Optional", note: "Leave blank if not applicable." },
  ],
  rules: [
    "Use one row per record.",
    "Keep naming consistent across sheets — department names in Staff and Patients should match Departments; building_block and floor labels should match between Departments and Units.",
    "Where multiple values are needed in one field, separate them with a semicolon (;).",
    "Use proper date values for date columns such as dob (YYYY-MM-DD).",
    "Do not rename column headers, delete columns, merge cells, or insert notes inside data rows.",
  ],
};

const TEMPLATES = [
  {
    id: "departments",
    name: "Departments",
    sheet: "Department",
    tagline: "Facility structure — buildings, floors, departments and wards.",
    description:
      "Use this tab to define the facility structure. Enter one row per department / subspecialty / floor combination. If the same department exists on more than one floor, create a separate row for each floor.",
    rules: [
      'If a facility has only one building or block, enter "Main" under building_block.',
      "If there are multiple floors, each floor should be entered on a different row.",
      "Use ward_list to show all wards for that row, separated by semicolons (;).",
    ],
    columns: [
      { name: "building_block", required: true,  meaning: "Name of building or block where the department/ward is located.",   guidance: 'Enter "Main" if the facility has only one block/building.' },
      { name: "department",     required: true,  meaning: "Department name.",                                                  guidance: "Use the official department name as it should appear on the Helix app. Example: Surgery" },
      { name: "department_description", required: false, meaning: "Short description of the department.",                       guidance: "Briefly describe what the department does. Example: Surgical care & consultancy services" },
      { name: "subspecialty",   required: false, meaning: "Subspecialty under the department.",                                 guidance: "Use when a department has distinct specialty areas. Example: Plastic Surgery" },
      { name: "subspecialty_description", required: false, meaning: "Short description of the subspecialty.",                    guidance: "Add a short explanation of the subspecialty if needed. Example: Specialized reconstructive services" },
      { name: "floor",          required: true,  meaning: "Floor where the department/ward is located.",                        guidance: "If the same department exists on multiple floors, enter info about each floor on a separate row." },
      { name: "ward_list",      required: true,  meaning: "List of wards under that department / subspecialty / floor.",        guidance: "Separate multiple wards with a semicolon (;). Example: Ward A; Ward B; Ward C" },
    ],
    examples: [
      ["Main", "Surgery", "Surgical care & consultancy services", "Plastic Surgery", "Specialized reconstructive services", "Level 3", "Ward A; Ward B; Ward C"],
      ["Main", "Surgery", "Surgical care & consultancy services", "Plastic Surgery", "Specialized reconstructive services", "Level 4", "Ward D; Ward E; Ward F"],
      ["Main", "Surgery", "Surgical care & consultancy services", "Cardiothoracic Surgery", "", "Level 5", "Ward A; Ward B; Ward C"],
      ["Maternity", "Obstetrics & Gynaecology", "Women's care & health", "", "", "Level 1 (Ground floor)", "Postnatal; Labor"],
      ["Main", "Pharmacy", "", "", "", "Level 1 (Ground floor)", "Room 1"],
    ],
  },

  {
    id: "units",
    name: "Units",
    sheet: "Units",
    tagline: "Discrete clinical or operational units within a building block.",
    description:
      "Use this sheet to list individual units — ICUs, theatres, high-dependency areas, pharmacies, labs, or ward-level areas Helix should treat separately from the broader department row. Each row is one named unit at a location within a building block.",
    rules: [
      'Use the same building_block labels as on the Departments sheet (e.g. "Main", or your named blocks).',
      "The unit name should match how staff refer to it on the floor (e.g. ICU, Theatre 2, Central Pharmacy).",
      "Keep floor labels identical to how they appear on Departments so routing and bed boards stay consistent.",
      "Use one row per unit per floor — if the same logical unit spans floors, use separate rows.",
    ],
    columns: [
      { name: "building_block", required: true,  meaning: "Building or block where this unit is located.", guidance: 'Enter "Main" if the facility has only one physical block. Must match building_block values used in Departments.' },
      { name: "unit",             required: true,  meaning: "Name of the unit as it should appear in Helix.", guidance: "The operational unit — not the whole department. Examples: ICU, HDU, Main Operating Theatre, NICU, Lab — Histology." },
      { name: "floor",            required: false, meaning: "Floor or level where the unit is primarily situated.", guidance: "Optional if your facility does not label floors. Use the same wording as in Departments (e.g. Level 3, Ground floor)." },
    ],
    examples: [
      ["Main", "ICU", "Level 2"],
      ["Main", "HDU", "Level 2"],
      ["Main", "Main Operating Theatre", "Level 1"],
      ["Maternity", "Labour Ward", "Ground floor"],
    ],
  },

  {
    id: "staff",
    name: "Staff",
    sheet: "Staff",
    tagline: "Staff roster — one row per staff member.",
    description:
      "Use this tab to upload staff records. Each row should represent one staff member.",
    rules: [
      "Use a unique employee_id for each staff member.",
      "The department value should match a department already entered on the Departments tab.",
      "patient_access should be entered as Yes or No.",
    ],
    columns: [
      { name: "email",                  required: true,  meaning: "Staff email address.",                                                guidance: "Primary email to be used for the account. Example: dr.kwame.mensah@gmail.com" },
      { name: "first_name",             required: true,  meaning: "First name.",                                                         guidance: "Staff member's first / given name. Example: Kwame" },
      { name: "last_name",              required: true,  meaning: "Last name.",                                                          guidance: "Staff member's surname / family name. Example: Mensah" },
      { name: "job_title",              required: false, meaning: "General job title.",                                                  guidance: "May differ from the app role. Example: Physician" },
      { name: "rank",                   required: false, meaning: "Professional rank or grade.",                                         guidance: "Use for rank, level or designation. Example: Consultant" },
      { name: "middle_name",            required: false, meaning: "Middle name.",                                                        guidance: "Leave blank if not available. Example: Abena" },
      { name: "phone",                  required: true,  meaning: "Primary phone number.",                                               guidance: "Valid phone number in international format. Example: 233209182633" },
      { name: "gender",                 required: true,  meaning: "Gender.",                                                             guidance: "Use a consistent value such as Male, Female or Other." },
      { name: "department",             required: true,  meaning: "Department the staff member belongs to.",                             guidance: "Must match a department on the Departments tab. Example: Medicine" },
      { name: "subspecialty",           required: false, meaning: "Subspecialty or unit under the department.",                          guidance: "Use where relevant. Example: Cardiology" },
      { name: "patient_access",         required: true,  meaning: "Indicates whether the staff member should have patient access.",      guidance: 'Choose "Yes" or "No".' },
      { name: "employee_id",            required: true,  meaning: "Facility employee ID or staff ID.",                                   guidance: "Unique identifier for each staff member. Example: EMP-1001" },
      { name: "highest_qualifications", required: true,  meaning: "Highest qualification attained.",                                     guidance: 'Enter the highest relevant qualification. Use "Other" if none apply. Example: MBChB' },
    ],
    examples: [
      ["dr.kwame.mensah@gmail.com", "Kwame", "Mensah", "Physician", "Consultant", "", "233209182633", "Male",   "Medicine",            "Cardiology", "Yes", "EMP-1001", "MBChB"],
      ["abena.osei@yahoo.com",      "Grace", "Osei",   "Manager",   "",           "Abena", "233542092784", "Female", "Hospital Management", "",           "No",  "EMP-1002", "PhD"],
      ["ofosu1971@gmail.com",       "Joyce", "Ofosu",  "Nurse",     "Nursing Officer", "", "233246286382", "Female", "Nursing",            "",           "Yes", "EMP-1263", "Other"],
    ],
  },

  {
    id: "roles",
    name: "Roles",
    sheet: "Roles",
    tagline: "Operational roles — workflow & communication, not just job titles.",
    description:
      "Use this tab to define the operational roles that will exist in the platform. These are communication and workflow roles, not just job titles.",
    rules: [
      "If priority is Critical, the role is expected to be fillable at all times.",
      "Only complete permitted_signin_emails when restricted_signin is Yes.",
      "Where escalation has multiple steps, list the next roles in order separated by semicolons (;).",
    ],
    columns: [
      { name: "role_name",               required: true,  meaning: "Name of the role as it should appear in the Helix app.",               guidance: "Use a clear operational role name, not a person's name. Example: Medical Director" },
      { name: "role_description",        required: false, meaning: "Short description of the role.",                                       guidance: "Describe the function of the role. Example: Lead for all IT services in the facility" },
      { name: "department",              required: true,  meaning: "Department this role belongs to.",                                     guidance: "Use a department name that also exists in the Departments tab. Example: Information Technology" },
      { name: "subspecialty",            required: false, meaning: "Subspecialty this role belongs to, if applicable.",                    guidance: "Use only where relevant. Example: Plastic Surgery" },
      { name: "priority",                required: true,  meaning: "Indicates whether a role should be filled at all times.",              guidance: 'Choose "Critical" if the role needs to be filled at all times. Choose "Standard" if it does not.' },
      { name: "restricted_signin",       required: true,  meaning: "Controls whether only specific email addresses can sign into this role.", guidance: 'Choose "Yes" to restrict sign-in, or "No" to allow broader assignment.' },
      { name: "permitted_signin_emails", required: false, meaning: "Emails allowed to sign into the role when sign-in is restricted.",     guidance: 'Required only if restricted_signin is "Yes". Separate multiple emails with a semicolon (;).' },
      { name: "external_communication",  required: true,  meaning: "Indicates whether this role can communicate externally.",              guidance: 'Choose "Yes" or "No".' },
      { name: "escalation",              required: false, meaning: "Escalation path for this role.",                                       guidance: "Next role(s) in the escalation ladder. Critical alerts escalate here if unacknowledged. Separate multiple roles with a semicolon (;)." },
    ],
    examples: [
      ["Medical Director", "", "Management", "", "Critical", "Yes", "baddae@gmail.com; gyeboah@yahoo.com", "Yes", "CEO"],
      ["Head of IT", "Lead for all IT services in the facility", "Information Technology", "", "Standard", "No", "", "No", ""],
      ["Senior Consultant on call, Plastic Surgery", "Senior consultant for reconstructive services", "Surgery", "Plastic Surgery", "Critical", "No", "", "Yes", "Head of Department, Plastic Surgery; Medical Director"],
      ["Head of Finance", "", "Administration", "Finance", "Standard", "Yes", "godwinowusu.1984@gmail.com", "No", ""],
      ["Junior Consultant on call, Plastic Surgery", "Junior consultant for reconstructive services", "Surgery", "", "Critical", "No", "", "Yes", "Senior Consultant on call, Plastic Surgery; Head of Department, Plastic Surgery"],
    ],
  },

  {
    id: "patients",
    name: "Patients",
    sheet: "Patients",
    tagline: "Patient roster — one row per patient.",
    description:
      "Use this tab to upload patient records. Each row should represent one patient.",
    rules: [
      "Use a unique medical_record_number for each patient.",
      "The department, floor, and ward should align with the facility structure defined in the Departments tab.",
      "Use the bed column only if the facility tracks bed-level placement.",
    ],
    columns: [
      { name: "first_name",            required: true,  meaning: "First name.",                                                         guidance: "Patient's first / given name. Example: Ama" },
      { name: "last_name",             required: true,  meaning: "Last name.",                                                          guidance: "Patient's surname / family name. Example: Mensah" },
      { name: "middle_name",           required: false, meaning: "Middle name.",                                                        guidance: "Enter the patient's middle name if available." },
      { name: "dob",                   required: true,  meaning: "Date of birth.",                                                      guidance: "Enter in a proper date format (YYYY-MM-DD). Example: 1985-03-12" },
      { name: "medical_record_number", required: true,  meaning: "Patient medical record number (MRN) or unique hospital number.",      guidance: "Each patient should have a unique record number. Example: MRN-BULK-FULL-001" },
      { name: "gender",                required: true,  meaning: "Gender.",                                                             guidance: "Use a consistent value such as Male, Female or Other." },
      { name: "department",            required: true,  meaning: "Department currently responsible for the patient.",                   guidance: "Must match a department on the Departments tab. Example: Surgery" },
      { name: "subspecialty",          required: false, meaning: "Subspecialty or clinical service associated with the patient.",       guidance: "Use when applicable. Example: Neurosurgery" },
      { name: "floor",                 required: true,  meaning: "Floor where the patient is located.",                                 guidance: "Use the same naming convention used in the Departments tab. Example: Level 3" },
      { name: "ward",                  required: true,  meaning: "Ward the patient is currently assigned to.",                          guidance: "Use ward names that match the Departments tab where possible. Example: Surgical Ward A" },
      { name: "bed",                   required: false, meaning: "Bed number or bed label.",                                            guidance: "Use if the facility tracks beds. Example: 2" },
    ],
    examples: [
      ["Ama",   "Mensah",   "", "1985-03-12", "MRN-BULK-FULL-001", "Female", "Surgery",   "Neurosurgery", "Level 3", "Surgical Ward A", ""],
      ["Kwesi", "Boateng",  "", "1992-07-22", "MRN-BULK-FULL-002", "Male",   "Medicine",  "Cardiology",   "Level 4", "Male Ward",       "2"],
      ["Efua",  "Asante",   "", "1978-10-12", "MRN-BULK-FULL-003", "Female", "Neurology", "",             "Level 5", "Ward C",          ""],
    ],
  },
];

/* -------------------------------------------------------------------
 * Portal phases — Step 1 is the facility checklist (required fields
 * must be complete before submit). Steps 2–6 are file uploads that can
 * be finished gradually; each maps to a template id above.
 * ---------------------------------------------------------------- */
const PHASE_CHECKLIST = "checklist";

const DATA_UPLOAD_STEPS = [
  {
    uploadKey: "departments",
    templateId: "departments",
    stepLabel: "Departments file",
    shortLabel: "Departments",
    intro:
      "Attach the Departments dataset — one row per department / subspecialty / floor from your Helix template. Complete this whenever your facility roster is ready; it does not block submitting Step 1.",
  },
  {
    uploadKey: "units",
    templateId: "units",
    stepLabel: "Units file",
    shortLabel: "Units",
    intro:
      "Attach the Units sheet listing ICU, theatres, wards-as-units, labs, and other discrete operational units with building_block and floor aligned to Departments.",
  },
  {
    uploadKey: "staff",
    templateId: "staff",
    stepLabel: "Staff file",
    shortLabel: "Staff",
    intro:
      "Attach your staff roster export. Department names must match the Departments sheet; each row is one team member.",
  },
  {
    uploadKey: "roles",
    templateId: "roles",
    stepLabel: "Roles file",
    shortLabel: "Roles",
    intro:
      "Attach operational roles — escalation paths, sign-in restrictions, and priorities — as defined in the Roles template.",
  },
  {
    uploadKey: "patients",
    templateId: "patients",
    stepLabel: "Patients file",
    shortLabel: "Patients",
    intro:
      "Attach the Patients roster — one row per patient with MRN, location (department, floor, ward), and demographics aligned to your Departments sheet.",
  },
];

const UPLOAD_SIDEBAR_RULES = [
  "These uploads never block submitting Step 1 — attach each file when that dataset is ready.",
  "CSV exports validate instantly against template headers. Excel files are accepted but only checked on the Helix side.",
  "Upload again any time to replace a file — we keep only the latest attachment metadata in this browser.",
];

window.HELIX_SCHEMA = {
  SECTIONS,
  ALL_FIELDS,
  GLOBAL_RULES,
  COUNTRIES,
  COUNTRIES_POPULAR_ISO,
  PHONE_FORMATS,
  NANP_ISO_CODES,
  GHANA_REGIONS,
  TEMPLATES,
  TEMPLATES_INTRO,
  DATA_UPLOAD_STEPS,
  PHASE_CHECKLIST,
  UPLOAD_SIDEBAR_RULES,
  FACILITY_TYPES,
  YES_NO,
};
