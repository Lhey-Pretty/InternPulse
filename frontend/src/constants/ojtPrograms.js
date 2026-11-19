export const OJT_PROGRAMS = [
  { code: 'BSIT', label: 'BSIT — Information Technology' },
  { code: 'BSCPE', label: 'BSCPE — Computer Engineering' },
  { code: 'BSED_ENGLISH', label: 'BSED Major in English' },
  { code: 'BSED_SCIENCE', label: 'BSED Major in Science' },
  { code: 'BSED_MATH', label: 'BSED Major in Mathematics' },
  { code: 'BEED', label: 'BEED — Elementary Education' },
  { code: 'POLSCI', label: 'Political Science' },
  { code: 'FISHERIES', label: 'Fisheries' },
  { code: 'BSHM', label: 'HM — Hospitality Management' },
  { code: 'BSTM', label: 'TM — Tourism Management' },
  { code: 'BSCRIM', label: 'Criminology' },
];

export const OJT_PROGRAM_CODES = OJT_PROGRAMS.map(({ code }) => code);
export const OJT_PROGRAM_LABELS = Object.fromEntries(OJT_PROGRAMS.map(({ code, label }) => [code, label]));
