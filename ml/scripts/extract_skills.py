"""
Extract and Curate Skills for InternPulse OJT Programs (11 Programs)
Programs:
1. BSIT (Information Technology)
2. BSCPE (Computer Engineering)
3. BSTM (Tourism Management)
4. BSHM (Hospitality Management)
5. BSCRIM (Criminology)
6. FISHERIES (Fisheries & Aquatic Resources)
7. POLSCI (Political Science)
8. BEED (Elementary Education)
9. BSED_ENGLISH (Secondary Education - English Major)
10. BSED_SCIENCE (Secondary Education - Science Major)
11. BSED_MATH (Secondary Education - Math Major)
"""

import csv
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ONET_DIR = os.path.join(BASE_DIR, "datasets", "onet")
HF_DIR = os.path.join(BASE_DIR, "datasets", "huggingface")
OUTPUT_PATH = os.path.join(BASE_DIR, "datasets", "curated_skills.json")
PROCESSED_DIR = os.path.join(BASE_DIR, "datasets", "processed")
TAXONOMY_PATH = os.path.join(PROCESSED_DIR, "onet_taxonomy.json")

COURSE_SOC_MAP = {
    "BSIT": [
        "15-1252.00", "15-1254.00", "15-1242.00", "15-1243.00", 
        "15-1241.00", "15-1212.00", "15-1211.00", "15-1231.00"
    ],
    "BSCPE": [
        "17-2061.00", "17-2199.08", "17-2072.00", "17-3023.00", 
        "17-3024.01", "17-3012.00"
    ],
    "BSTM": [
        "41-3041.00", "39-7011.00", "39-7012.00", "43-4181.00", 
        "39-6012.00", "11-9072.00"
    ],
    "BSHM": [
        "11-9081.00", "11-9051.00", "35-1011.00", "35-1012.00"
    ],
    "BSCRIM": [
        "33-3021.00", "33-3021.02", "19-4092.00", "11-3013.01", 
        "33-1012.00", "33-3012.00"
    ],
    "FISHERIES": [
        "45-2093.00", "45-3031.00", "33-3031.00", "19-1023.00", 
        "17-2121.00"
    ],
    "POLSCI": [
        "19-3094.00", "23-2011.00", "23-2099.00", "11-2032.00", 
        "25-1065.00"
    ],
    "BEED": [
        "25-2021.00", "25-2012.00"
    ],
    "BSED_ENGLISH": [
        "25-2031.00"
    ],
    "BSED_SCIENCE": [
        "25-2031.00"
    ],
    "BSED_MATH": [
        "25-2031.00"
    ]
}

EXCLUSIONS = {
    "BEED": ["autocad", "programming", "drafting", "cad", "c++", "welding", "civil 3d"],
    "BSED_ENGLISH": ["autocad", "programming", "drafting", "cad", "c++", "welding", "civil 3d", "desmos", "geogebra", "calculus", "chemical", "physics"],
    "BSED_SCIENCE": ["autocad", "programming", "drafting", "cad", "c++", "welding", "civil 3d", "literature", "desmos", "geogebra"],
    "BSED_MATH": ["autocad", "programming", "drafting", "cad", "c++", "welding", "civil 3d", "literature", "chemical", "biology", "microscope"],
    "POLSCI": ["autocad", "drafting", "welding"]
}

def read_xlsx_rows(filepath):
    with zipfile.ZipFile(filepath) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            with z.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                strings = [elem.text or '' for elem in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
        
        with z.open('xl/worksheets/sheet1.xml') as f:
            tree = ET.parse(f)
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for r in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                cells = []
                for c in r.findall('ns:c', ns):
                    t = c.get('t')
                    v = c.find('ns:v', ns)
                    if v is not None and v.text is not None:
                        if t == 's':
                            idx = int(v.text)
                            cells.append(strings[idx] if idx < len(strings) else '')
                        else:
                            cells.append(v.text)
                    else:
                        cells.append('')
                if any(cells):
                    yield cells

def extract_huggingface_skills():
    hf_path = os.path.join(HF_DIR, "Top_207_IT_Job_Roles_Skills_Dataset.csv")
    it_skills = set()
    if os.path.exists(hf_path):
        with open(hf_path, mode='r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_skills = row.get("Skills", "")
                if raw_skills:
                    for s in raw_skills.split(','):
                        clean = s.strip()
                        if clean and len(clean) > 1 and len(clean) < 60:
                            it_skills.add(clean)
    return it_skills

def extract_onet_software_skills():
    path = os.path.join(ONET_DIR, "Software Skills.xlsx")
    soc_to_software = {}
    if not os.path.exists(path):
        return soc_to_software
    rows = read_xlsx_rows(path)
    header = next(rows, None)
    for row in rows:
        if len(row) >= 3:
            soc = row[0].strip()
            software_example = row[2].strip()
            hot = row[5].strip() if len(row) > 5 else 'N'
            if soc and software_example:
                if soc not in soc_to_software:
                    soc_to_software[soc] = []
                soc_to_software[soc].append({
                    "skill": software_example,
                    "hot": hot == 'Y'
                })
    return soc_to_software

def canonicalize_skill_name(value):
    """Create a stable display key while preserving the source label."""
    value = re.sub(r'\s+', ' ', value.strip())
    return value.casefold()

def is_matchable_skill(name, category):
    """Exclude obvious catalog/product noise while retaining it as reference data."""
    if category != 'software':
        return True
    return not (
        name[:1].isdigit()
        or name[:1] in {'!', '@', '#', '$', '%'}
        or len(name) > 80
        or re.search(r'[!?]{2,}', name)
    )

def extract_onet_taxonomy():
    """Build a provenance-preserving taxonomy from the raw O*NET workbooks."""
    records = {}

    def add_skill(name, category, source_file, soc=None, occupation=None):
        name = re.sub(r'\s+', ' ', str(name).strip())
        if len(name) < 2 or len(name) > 120:
            return
        if name.casefold() in {'none', 'not available', 'n/a'}:
            return
        key = canonicalize_skill_name(name)
        record = records.setdefault(key, {
            'name': name,
            'category': category,
            'matchable': is_matchable_skill(name, category),
            'aliases': [],
            'onet_sources': [],
            'occupations': [],
        })
        if source_file not in record['onet_sources']:
            record['onet_sources'].append(source_file)
        if soc and soc not in record['occupations']:
            record['occupations'].append(soc)
        if occupation and occupation not in record['aliases']:
            record['aliases'].append(occupation)

    source_specs = [
        ('Essential Skills.xlsx', 'essential_skill', 3),
        ('Transferable Skills.xlsx', 'transferable_skill', 3),
        ('Knowledge.xlsx', 'knowledge', 3),
    ]
    for filename, category, name_index in source_specs:
        path = os.path.join(ONET_DIR, filename)
        if not os.path.exists(path):
            continue
        rows = read_xlsx_rows(path)
        next(rows, None)
        for row in rows:
            if len(row) >= name_index + 2:
                add_skill(row[name_index], category, filename, row[0], row[1])

    software_path = os.path.join(ONET_DIR, 'Software Skills.xlsx')
    if os.path.exists(software_path):
        rows = read_xlsx_rows(software_path)
        next(rows, None)
        for row in rows:
            if len(row) >= 3:
                add_skill(row[2], 'software', 'Software Skills.xlsx', row[0], row[1])

    taxonomy = sorted(records.values(), key=lambda item: item['name'].casefold())
    for item in taxonomy:
        item['aliases'] = sorted(item['aliases'])[:20]
        item['occupations'] = sorted(item['occupations'])[:50]
        item['source_count'] = len(item['onet_sources'])

    return {
        'schema_version': 1,
        'source': 'O*NET 31.0',
        'source_release': 'August 2026',
        'license': 'CC BY 4.0',
        'generated_by': 'ml/scripts/extract_skills.py',
        'skills': taxonomy,
    }

def main():
    print("1. Extracting O*NET taxonomy...")
    onet_taxonomy = extract_onet_taxonomy()
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    with open(TAXONOMY_PATH, 'w', encoding='utf-8') as f:
        json.dump(onet_taxonomy, f, indent=2, ensure_ascii=False)
    print(f"[SUCCESS] O*NET taxonomy saved to {TAXONOMY_PATH} ({len(onet_taxonomy['skills'])} skills)")

    print("2. Extracting HuggingFace IT Skills...")
    hf_it_skills = extract_huggingface_skills()

    print("3. Extracting O*NET Software Skills...")
    onet_software = extract_onet_software_skills()

    domain_competencies = {
        "BSIT": [
            "Web Development", "Mobile App Development", "Database Administration", 
            "Network Administration", "Cybersecurity", "RESTful API Integration", 
            "Object-Oriented Programming", "Cloud Deployment", "Version Control (Git)"
        ],
        "BSCPE": [
            "Embedded Systems", "Circuit Design", "PCB Layout & Prototyping", 
            "Microcontroller Programming", "Hardware Troubleshooting", "IoT Architecture", 
            "VHDL/Verilog", "Robotics Integration", "Digital Logic Design"
        ],
        "BSTM": [
            "Tour Guiding & Escorting", "Travel Itinerary Planning", "Global Distribution Systems (GDS)", 
            "Customer Service & Relations", "Travel Documentation & Visa Processing", 
            "Airline Ticketing", "Tourism Marketing", "Cross-Cultural Communication", 
            "Event & Convention Planning", "Destination Management"
        ],
        "BSHM": [
            "Front Office Operations", "Food & Beverage (F&B) Service", "HACCP Food Safety & Sanitation", 
            "Hotel Property Management Systems", "Housekeeping Operations", "Culinary Preparation", 
            "Menu Planning & Costing", "Guest Relations Management", "Banquet & Catering Operations", 
            "Bar & Beverage Operations"
        ],
        "BSCRIM": [
            "Crime Scene Investigation (CSI)", "Evidence Collection & Chain of Custody", 
            "Fingerprint Classification (Dactyloscopy)", "Forensic Photography", 
            "Criminal Investigation Report Writing", "Philippine Criminal Law & Procedure", 
            "Interview & Interrogation Techniques", "Security & Safety Risk Assessment", 
            "Traffic Accident Investigation", "Ballistics & Firearms Safety"
        ],
        "FISHERIES": [
            "Aquaculture Farm Management", "Fish Hatchery Operations & Breeding", 
            "Water Quality Analysis & Monitoring (pH, Salinity, DO)", "Fish Health & Aquatic Disease Diagnosis", 
            "Post-Harvest Fish Processing & Preservation", "Feed Formulation & Nutrition Management", 
            "Aquatic Ecology & Marine Conservation", "Fish Taxonomy & Species Identification", 
            "Coastal Resource Management & Fishery Laws"
        ],
        "POLSCI": [
            "Legal Research & Case Briefing", "Public Policy Analysis & Formulation", 
            "Legislative Drafting & Resolution Writing", "Local Government Unit (LGU) Governance & Administration", 
            "Philippine Constitutional Law & Jurisprudence", "Administrative Law & Public Compliance", 
            "Political Campaign Strategy & Public Relations", "Electoral Systems & Voter Demographics Analysis", 
            "International Relations & Diplomatic Protocols", "Community Organizing & Civic Advocacy", 
            "Qualitative & Quantitative Political Research", "Document Review & Court Filing Procedures", 
            "Public Speaking & Debate Moderation", "Westlaw / LexisNexis / Supreme Court E-Library"
        ],
        "BEED": [
            "Early Childhood Literacy & Phonics Instruction", "Foundational Numeracy & Basic Math Concepts", 
            "Child Psychology & Developmental Milestones", "Positive Classroom Discipline & Management", 
            "Interactive Storytelling & Educational Play", "Instructional Media & Flashcard Preparation", 
            "Remedial Reading Strategies", "Parent-Teacher Communication & Reporting", 
            "Learning Management Systems (Google Classroom, Seesaw)", "Lesson Planning for Primary Grades"
        ],
        "BSED_ENGLISH": [
            "English Literature & Literary Criticism", "Reading Comprehension Assessment & Strategies", 
            "Grammar & Syntax Evaluation (Grammarly/LanguageTool)", "Academic & Creative Essay Writing Rubrics", 
            "Plagiarism Detection & Academic Integrity (Turnitin)", "Speech, Diction & Oral Communication Coaching", 
            "Public Speaking & Debate Moderation", "English as a Second Language (ESL) Pedagogy", 
            "Linguistics & Phonetics Fundamentals", "Remedial Reading Coaching for High School", 
            "Lesson Planning & Table of Specifications (TOS)", "Classroom Management & Student Discipline", 
            "Curriculum Mapping & Syllabus Design", "Formative & Summative Student Assessment", 
            "Interactive Educational Quizzes (Kahoot, Quizizz)", "Learning Management Systems (Google Classroom, Moodle)"
        ],
        "BSED_SCIENCE": [
            "PhET Interactive Science Simulations", "Science Laboratory Safety & Chemical Reagent Protocols", 
            "Scientific Inquiry & Experimental Method Instruction", "Microscope Handling & Biological Specimen Preparation", 
            "Physics Mechanics & Energy Demonstration Planning", "General Chemistry Lab Experiments & Reagents", 
            "Cell Biology & Ecology Fieldwork Pedagogy", "Science Apparatus Calibration & Inventory", 
            "Hypothesis Testing & Lab Report Assessment", "Science Fair Project Mentoring & Advising", 
            "Lesson Planning & Table of Specifications (TOS)", "Classroom Management & Student Discipline", 
            "Curriculum Mapping & Syllabus Design", "Formative & Summative Student Assessment", 
            "Interactive Educational Quizzes (Kahoot, Quizizz)", "Learning Management Systems (Google Classroom, Moodle)"
        ],
        "BSED_MATH": [
            "GeoGebra Dynamic Mathematics", "Desmos Graphing Calculator", 
            "Mathematical Problem-Solving & Heuristics", "Algebra & Trigonometric Function Pedagogy", 
            "Geometry Proofs & Geometric Constructions", "Calculus Instruction & Rate of Change Concepts", 
            "Statistical Data Analysis & Probability Teaching", "Number Theory & Arithmetic Sequences", 
            "Math Modeling & Word Problem Breakdown", "Rubric Evaluation for Step-by-Step Math Solutions", 
            "Math Competition Coaching & Problem Sets", "Lesson Planning & Table of Specifications (TOS)", 
            "Classroom Management & Student Discipline", "Curriculum Mapping & Syllabus Design", 
            "Formative & Summative Student Assessment", "Interactive Educational Quizzes (Kahoot, Quizizz)", 
            "Learning Management Systems (Google Classroom, Moodle)"
        ]
    }

    course_skills = {}

    for course, soc_list in COURSE_SOC_MAP.items():
        skills_set = set(domain_competencies.get(course, []))
        exclusions = EXCLUSIONS.get(course, [])
        
        for soc in soc_list:
            if soc in onet_software:
                for item in onet_software[soc]:
                    skill_name = item["skill"].strip()
                    lower_name = skill_name.lower()
                    
                    if any(exc in lower_name for exc in exclusions):
                        continue
                    
                    if len(skill_name) <= 45 and not re.search(r'[0-9]{4,}', skill_name):
                        skills_set.add(skill_name)
        
        if course == "BSIT":
            for s in list(hf_it_skills)[:120]:
                skills_set.add(s)
        
        course_skills[course] = sorted(list(skills_set))
        print(f"Program {course:14s}: {len(course_skills[course]):3d} curated skills")

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(course_skills, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Curated skills saved to {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
