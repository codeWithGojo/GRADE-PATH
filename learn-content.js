/* GradePath learning library content.
   Structured, reviewable records for Nigerian History, the Nigerian-language roadmap and the
   Formula library. UI code (learn.js) renders these records and never hard-codes lesson text.

   Review workflow: every record carries review.status. Only "reviewed" records may be described
   as reviewed in the interface or marketing. "draft" records are shown with a visible Draft label.
   rights: who wrote the text and what permissions apply. No third-party images, audio or oral
   recordings are bundled; any added later must record permission and credit here. */
(function (root) {
  "use strict";

  const draft = { status: "draft", reviewer: null, lastReviewed: null, note: "Written for GradePath from the cited sources. Awaiting review by a historian." };
  const draftTeacher = { status: "draft", reviewer: null, lastReviewed: null, note: "Checked against the cited textbook. Awaiting review by a subject teacher or lecturer." };
  const ownText = "Original GradePath text. No third-party images, recordings or quotations beyond short titles.";

  const history = {
    evidenceTypes: {
      archaeology: { label: "Archaeology", detail: "Excavated objects, sites and scientific dating." },
      documentary: { label: "Written records", detail: "Chronicles, letters, treaties and government papers written at or near the time." },
      oral: { label: "Oral tradition", detail: "Histories kept and retold by families, guilds and royal courts." },
      interpretation: { label: "Interpretation", detail: "Historians' readings of the evidence, where views can differ." }
    },
    eras: [
      { id: "early", label: "Early societies", span: "c. 1500 BCE – 1000 CE" },
      { id: "states", label: "Kingdoms, cities and trade", span: "c. 1000 – 1800" },
      { id: "nineteenth", label: "Reform and upheaval", span: "1800 – 1900" },
      { id: "colonial", label: "Colonial rule", span: "1861 – 1960" },
      { id: "nation", label: "Independent Nigeria", span: "1960 – today" }
    ],
    regions: [
      { id: "north-west", label: "North-west", x: 92, y: 74 },
      { id: "north-east", label: "North-east", x: 300, y: 70 },
      { id: "north-central", label: "North-central", x: 214, y: 150 },
      { id: "south-west", label: "South-west", x: 70, y: 232 },
      { id: "south-south", label: "South-south", x: 150, y: 292 },
      { id: "south-east", label: "South-east", x: 236, y: 270 },
      { id: "national", label: "Whole country", x: 190, y: 196 }
    ],
    stories: [
      {
        id: "nok", era: "early", region: "north-central", period: "c. 900 BCE – c. 1 CE (terracotta tradition)",
        title: "Nok: faces in fired clay",
        people: "Farming communities of the central Nigerian hills, between the Jos Plateau and the Niger–Benue valleys",
        summary: "Nok communities made some of the oldest large terracotta sculptures known in sub-Saharan Africa: human heads and figures with carefully styled hair, pierced eyes and jewellery. The same sites hold evidence of iron smelting, one of the earliest iron-working traditions in West Africa.",
        evidence: [
          { type: "archaeology", note: "Excavated sculptures, furnaces, pottery and radiocarbon/luminescence dates from sites in Kaduna, Nasarawa and Plateau states." },
          { type: "interpretation", note: "What the figures were for (ancestors, rulers, burial or shrine use) is still debated." }
        ],
        viewpoints: ["Looting has taken many figures from the ground without records, so a large share of the Nok sculptures in collections lack the context that would explain their use and age. Archaeologists stress studying excavated pieces first."],
        artifact: { name: "Terracotta heads and figures", note: "Held by the National Commission for Museums and Monuments and museums worldwide." },
        sources: [
          { title: "Nok: African Sculpture in Archaeological Context", author: "Peter Breunig (ed.)", year: 2014, publisher: "Africa Magna Verlag" },
          { title: "An Outline of Recent Studies on the Nigerian Nok Culture", author: "Peter Breunig and Nicole Rupp", year: 2016, publisher: "Journal of African Archaeology" }
        ],
        activity: "Why does it matter whether a sculpture was excavated or bought on the art market? List two things an excavation can tell us that the object alone cannot.",
        review: draft, rights: ownText
      },
      {
        id: "igbo-ukwu", era: "early", region: "south-east", period: "c. 9th – 10th century CE",
        title: "Igbo-Ukwu: bronzes from a buried shrine",
        people: "Igbo-speaking communities of present-day Anambra State",
        summary: "In 1938 a man digging a cistern at Igbo-Ukwu found bronze objects. Later excavations by the archaeologist Thurstan Shaw uncovered a richly furnished burial, a store of ritual objects and finely detailed cast bronzes made by the lost-wax method, alongside tens of thousands of glass and stone beads.",
        evidence: [
          { type: "archaeology", note: "Excavations in 1959–60 and 1964; radiocarbon dates; metal and bead analysis." },
          { type: "interpretation", note: "The beads point to long-distance trade, and the burial is often read as that of a ritual leader. Both readings rest on interpretation of the finds." }
        ],
        viewpoints: ["The early dates surprised many scholars when published. Later analysis of the metal supports local ore sources, countering older assumptions that the skill or materials must have come from elsewhere."],
        artifact: { name: "Bronze roped pot and shell-shaped vessels", note: "Held by the National Museum, Lagos." },
        sources: [
          { title: "Igbo-Ukwu: An Account of Archaeological Discoveries in Eastern Nigeria", author: "Thurstan Shaw", year: 1970, publisher: "Faber and Faber" },
          { title: "Unearthing Igbo-Ukwu", author: "Thurstan Shaw", year: 1977, publisher: "Oxford University Press (Ibadan)" }
        ],
        activity: "The Igbo-Ukwu beads came from far away. Sketch the kinds of trade route that could connect a ninth-century town in the forest to distant markets.",
        review: draft, rights: ownText
      },
      {
        id: "ife", era: "states", region: "south-west", period: "c. 12th – 15th century",
        title: "Ife: the sculptor's city",
        people: "Yoruba city of Ile-Ife",
        summary: "Ile-Ife produced naturalistic heads in copper alloy and terracotta of striking realism, many linked to its rulers, the Ooni. In Yoruba tradition Ife is the place where the world was created and from which many ruling houses trace their origins.",
        evidence: [
          { type: "archaeology", note: "Sculptures, glass-bead workshops and potsherd pavements excavated in and around the city." },
          { type: "oral", note: "Yoruba creation and dynastic traditions that place Ife at the centre." }
        ],
        viewpoints: ["When the heads first reached Europe in the early twentieth century, some writers refused to credit African artists. Historians now treat that reaction as evidence of colonial prejudice, not of the art's origin."],
        artifact: { name: "Copper-alloy heads", note: "Held by the National Museum, Ife, and other collections." },
        sources: [
          { title: "Ife in the History of West African Sculpture", author: "Frank Willett", year: 1967, publisher: "Thames and Hudson" },
          { title: "Dynasty and Divinity: Ife Art in Ancient Nigeria", author: "Henry John Drewal and Enid Schildkrout", year: 2009, publisher: "Museum for African Art" }
        ],
        activity: "Oral traditions and excavated objects both describe Ife. Write one question each kind of evidence can answer well, and one it cannot.",
        review: draft, rights: ownText
      },
      {
        id: "kanem-bornu", era: "states", region: "north-east", period: "c. 11th – 19th century",
        title: "Kanem–Bornu: a thousand-year state by Lake Chad",
        people: "Kanuri-speaking peoples and the Sayfawa dynasty",
        summary: "Kanem, east of Lake Chad, became one of Africa's longest-lasting states. Its rulers, the mais, adopted Islam around the eleventh century and later moved their centre west to Bornu. Mai Idris Alooma (late sixteenth century) is remembered for military reforms and links across the Sahara to North Africa.",
        evidence: [
          { type: "documentary", note: "Arabic writing, including the chronicle of Idris Alooma's reign by his imam Ahmad ibn Furtu, and royal king-lists." },
          { type: "oral", note: "Court and community histories of the Kanuri." }
        ],
        viewpoints: [],
        artifact: null,
        sources: [
          { title: "General History of Africa, Vol. IV: Africa from the Twelfth to the Sixteenth Century", author: "D. T. Niane (ed.)", year: 1984, publisher: "UNESCO" },
          { title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" }
        ],
        activity: "Trace on a map how goods and ideas could travel from Bornu across the Sahara. What would a trader have carried in each direction?",
        review: draft, rights: ownText
      },
      {
        id: "benin", era: "states", region: "south-south", period: "c. 13th century – 1897",
        title: "Benin: a kingdom recorded in brass",
        people: "Edo kingdom ruled by the Oba",
        summary: "The Benin kingdom built a powerful court whose guilds of brass-casters made plaques, heads and figures recording rulers, battles and ceremonies. Portuguese visitors arrived in the late fifteenth century and trade with Europeans followed. In 1897 a British force sacked Benin City and took thousands of objects, now spread across museums worldwide.",
        evidence: [
          { type: "oral", note: "Histories held by the royal court and the Edo guilds." },
          { type: "documentary", note: "European travellers' accounts from the 1480s onward, and British records of 1897." },
          { type: "archaeology", note: "The objects themselves, and excavations of the city's walls and earthworks." }
        ],
        viewpoints: ["How and when looted objects should return is debated between museums, governments and the Benin royal court. Several institutions have returned objects since 2021, while others have not."],
        artifact: { name: "Brass plaques of the royal palace", note: "Many were taken in 1897; some have been returned to Nigeria." },
        sources: [
          { title: "Benin Kings and Rituals: Court Arts from Nigeria", author: "Barbara Plankensteiner (ed.)", year: 2007, publisher: "Snoeck Publishers" },
          { title: "The Brutish Museums", author: "Dan Hicks", year: 2020, publisher: "Pluto Press" }
        ],
        activity: "A plaque shows an Oba with attendants. Who made it, for whom, and why might the image show what it shows? Answer from the maker's point of view.",
        review: draft, rights: ownText
      },
      {
        id: "oyo", era: "states", region: "south-west", period: "c. 1600 – 1836",
        title: "Oyo: cavalry, councils and collapse",
        people: "Yoruba empire ruled by the Alaafin",
        summary: "Old Oyo grew into the largest Yoruba state, using cavalry on the savanna and collecting tribute from a wide area. The Alaafin's power was balanced by a council of chiefs, the Oyo Mesi. Civil conflict, the revolt at Ilorin and pressure from the north brought the empire down in the early nineteenth century, and the old capital was abandoned.",
        evidence: [
          { type: "oral", note: "Yoruba royal histories, recorded in writing from the nineteenth century." },
          { type: "documentary", note: "European traders' and missionaries' accounts." },
          { type: "interpretation", note: "Historians weigh internal politics against outside pressure when explaining the collapse." }
        ],
        viewpoints: [],
        artifact: null,
        sources: [
          { title: "The Oyo Empire c.1600–c.1836", author: "Robin Law", year: 1977, publisher: "Clarendon Press" },
          { title: "The History of the Yorubas", author: "Samuel Johnson", year: 1921, publisher: "Routledge (London)" }
        ],
        activity: "List the checks on the Alaafin's power. Compare them with the checks on a Nigerian president today.",
        review: draft, rights: ownText
      },
      {
        id: "sokoto", era: "nineteenth", region: "north-west", period: "1804 – 1903",
        title: "The Sokoto Caliphate and Nana Asma'u",
        people: "Fulani and Hausa communities; scholars of the Fodiyo family",
        summary: "From 1804 the scholar Usman dan Fodio led a movement that overthrew Hausa rulers and built the Sokoto Caliphate, one of the largest states in nineteenth-century Africa. His daughter Nana Asma'u wrote poetry and history in Arabic, Fulfulde and Hausa, and organised a network of women teachers known as the 'Yan Taru.",
        evidence: [
          { type: "documentary", note: "Books, letters and poems written by the caliphate's leaders themselves." },
          { type: "interpretation", note: "Historians describe the movement as religious reform, political revolution, or both." }
        ],
        viewpoints: ["Supporters saw a jihad of reform against unjust rulers. Many who were conquered experienced it as war and subjugation. Both views appear in the sources."],
        artifact: null,
        sources: [
          { title: "The Sokoto Caliphate", author: "Murray Last", year: 1967, publisher: "Longmans" },
          { title: "The Collected Works of Nana Asma'u", author: "Jean Boyd and Beverly B. Mack (eds.)", year: 1997, publisher: "Michigan State University Press" }
        ],
        activity: "Nana Asma'u taught through poems that women memorised and carried home. Why might verse work better than prose for teaching in that setting?",
        review: draft, rights: ownText
      },
      {
        id: "amalgamation", era: "colonial", region: "national", period: "1861 – 1914",
        title: "From Lagos Colony to the 1914 amalgamation",
        people: "British colonial administration and the peoples it brought together",
        summary: "Britain annexed Lagos in 1861 and extended control inland through treaties, trading companies and military campaigns. In 1914 Frederick Lugard merged the Northern and Southern Protectorates into one colony named Nigeria, governed largely through existing rulers, a system called indirect rule.",
        evidence: [
          { type: "documentary", note: "Treaties, colonial reports and the amalgamation records." },
          { type: "interpretation", note: "Historians debate how far amalgamation shaped later regional tensions." }
        ],
        viewpoints: ["Some see 1914 as the start of a shared nation; others argue it joined territories for administrative convenience without the consent of the people living in them."],
        artifact: null,
        sources: [{ title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" }],
        activity: "Indirect rule worked differently in the north and the south-east. Find one reason why.",
        review: draft, rights: ownText
      },
      {
        id: "womens-war", era: "colonial", region: "south-east", period: "1929",
        title: "The Women's War of 1929",
        people: "Igbo and Ibibio women of Owerri and Calabar provinces",
        summary: "Rumours that women would be taxed set off a mass protest. Thousands of women used a customary practice of collective protest, 'sitting on' warrant chiefs, against colonial-appointed authorities. Colonial troops fired on crowds, killing dozens. The British called it the 'Aba Riots'; the women and later historians call it the Women's War.",
        evidence: [
          { type: "documentary", note: "Commissions of inquiry that recorded women's own testimony." },
          { type: "oral", note: "Community memory in the south-east." },
          { type: "interpretation", note: "The choice of name, 'riot' or 'war', is itself an interpretation." }
        ],
        viewpoints: ["The colonial name framed the event as disorder. The women's name frames it as organised political action."],
        artifact: null,
        sources: [
          { title: "'Aba Riots' or Igbo 'Women's War'? Ideology, Stratification, and the Invisibility of Women", author: "Judith Van Allen", year: 1976, publisher: "In Women in Africa, ed. Hafkin and Bay, Stanford University Press" },
          { title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" }
        ],
        activity: "Rewrite one sentence about 1929 twice: once as a colonial official might, once as a protester might. What changed?",
        review: draft, rights: ownText
      },
      {
        id: "independence", era: "nation", region: "national", period: "1 October 1960",
        title: "Independence",
        people: "Leaders including Nnamdi Azikiwe, Tafawa Balewa, Ahmadu Bello and Obafemi Awolowo",
        summary: "Nigeria became independent on 1 October 1960 as a federation of three regions, with Tafawa Balewa as prime minister. It became a republic in 1963, with Nnamdi Azikiwe as president. Regional parties dominated politics in each region.",
        evidence: [{ type: "documentary", note: "Constitutional documents, parliamentary records and newspapers." }],
        viewpoints: [],
        artifact: null,
        sources: [{ title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" }],
        activity: "Why might a federation of strong regions be both a strength and a risk for a new country?",
        review: draft, rights: ownText
      },
      {
        id: "civil-war", era: "nation", region: "south-east", period: "1967 – 1970",
        title: "The Nigerian Civil War",
        people: "The Federal Military Government and the secessionist Republic of Biafra",
        summary: "After two coups in 1966 and killings of Igbo people in the north, the Eastern Region declared independence as Biafra on 30 May 1967. Thirty months of war followed, including a blockade and famine that killed very large numbers of civilians. The war ended in January 1970.",
        evidence: [
          { type: "documentary", note: "Government records, international reports and press coverage." },
          { type: "oral", note: "Survivors' testimony, much of it collected decades later." },
          { type: "interpretation", note: "Estimates of deaths vary widely, and the war's causes and naming remain sensitive." }
        ],
        viewpoints: ["Memoirs from leaders on both sides tell very different stories. Reading them side by side, and alongside survivors' accounts, is part of studying this period."],
        artifact: null,
        sources: [
          { title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" },
          { title: "My Command: An Account of the Nigerian Civil War 1967–1970", author: "Olusegun Obasanjo", year: 1980, publisher: "Heinemann (memoir, federal perspective)" },
          { title: "There Was a Country: A Personal History of Biafra", author: "Chinua Achebe", year: 2012, publisher: "Allen Lane (memoir, Biafran perspective)" }
        ],
        activity: "Two memoirs describe the same war. Choose one event and explain how a writer's position could shape what they include or leave out.",
        review: draft, rights: ownText
      },
      {
        id: "fourth-republic", era: "nation", region: "national", period: "1993 – 1999",
        title: "June 12 and the return to civilian rule",
        people: "Nigerian voters, civil-society groups and military governments",
        summary: "A presidential election on 12 June 1993 was annulled by the military government. Years of protest and repression followed. After General Sani Abacha's death in 1998, a transition led to elections, and civilian rule returned on 29 May 1999 with Olusegun Obasanjo as president.",
        evidence: [{ type: "documentary", note: "Election records, court cases, press reporting and human-rights reports." }],
        viewpoints: [],
        artifact: null,
        sources: [{ title: "A History of Nigeria", author: "Toyin Falola and Matthew M. Heaton", year: 2008, publisher: "Cambridge University Press" }],
        activity: "What is the difference between a transition to civilian rule and a transition to democracy? Use 1999 as your example.",
        review: draft, rights: ownText
      }
    ]
  };

  /* Nigerian-language courses. A language opens only after every requirement below is met.
     status: "open" | "in-preparation" | "planned". Nothing is open yet. */
  const languages = {
    requirements: [
      "A curriculum reviewed by a qualified teacher of the language",
      "Lesson text validated by at least two native speakers",
      "A stated orthography, with dialect and variant handling",
      "Tested typing and display of every special character and tone mark",
      "Speech features only after checking recognition and synthesis quality for that language, with text always available"
    ],
    registry: [
      { code: "ha", name: "Hausa", status: "planned", phase: 1, script: "Latin (Boko) with hooked letters ɓ ɗ ƙ ƴ; also written in Ajami (Arabic script)" },
      { code: "ig", name: "Igbo", status: "planned", phase: 1, script: "Latin (Ọnwụ orthography) with dotted vowels ị ọ ụ and ṅ; tone marks optional in everyday writing" },
      { code: "yo", name: "Yorùbá", status: "planned", phase: 1, script: "Latin with subdotted letters ẹ ọ ṣ and tone marks" },
      { code: "pcm", name: "Nigerian Pidgin", status: "planned", phase: 2, script: "Latin; spelling conventions vary" },
      { code: "ff", name: "Fulfulde", status: "planned", phase: 2, script: "Latin with hooked letters; also Ajami" },
      { code: "kr", name: "Kanuri", status: "planned", phase: 2, script: "Latin; also Ajami" }
    ]
  };

  const engineering = {
    levels: { secondary: "Secondary school", university: "University" },
    topics: [
      {
        id: "ohms-law", level: "secondary", discipline: "Electricity", principle: "Ohm's law",
        title: "Voltage, current and resistance", display: "V = I R",
        symbols: [{ symbol: "V", name: "Potential difference (voltage)", unit: "V", unitName: "volt" }, { symbol: "I", name: "Current", unit: "A", unitName: "ampere" }, { symbol: "R", name: "Resistance", unit: "Ω", unitName: "ohm" }],
        assumptions: ["The conductor is ohmic: its resistance stays constant as current changes.", "Temperature stays roughly constant."],
        explanation: "For many metal conductors, the current through them is proportional to the voltage across them. The constant of proportionality is the resistance.",
        example: { prompt: "A 6 Ω resistor carries a current of 2 A. Find the voltage across it.", target: "V", given: { I: 2, R: 6 } },
        practice: { question: "A torch bulb has resistance 15 Ω and the battery supplies 3 V. What current flows?", answer: "0.2 A", explanation: "I = V ÷ R = 3 ÷ 15 = 0.2 A." },
        solveFor: ["V", "I", "R"],
        sources: [{ title: "Fundamentals of Physics", author: "Halliday, Resnick and Walker", publisher: "Wiley" }, { title: "WAEC e-Learning: Physics", url: "https://waeconline.org.ng/e-learning/" }],
        review: draftTeacher
      },
      {
        id: "newton-second", level: "secondary", discipline: "Mechanics", principle: "Newton's second law",
        title: "Force, mass and acceleration", display: "F = m a",
        symbols: [{ symbol: "F", name: "Resultant force", unit: "N", unitName: "newton" }, { symbol: "m", name: "Mass", unit: "kg", unitName: "kilogram" }, { symbol: "a", name: "Acceleration", unit: "m/s²", unitName: "metre per second squared" }],
        assumptions: ["F is the resultant (net) force, after adding all forces.", "The mass does not change during the motion."],
        explanation: "The resultant force on a body equals its mass multiplied by its acceleration. A larger force gives more acceleration; a larger mass gives less.",
        example: { prompt: "A 1200 kg car accelerates at 2.5 m/s². What resultant force acts on it?", target: "F", given: { m: 1200, a: 2.5 } },
        practice: { question: "A resultant force of 50 N acts on a 10 kg box. Find its acceleration.", answer: "5 m/s²", explanation: "a = F ÷ m = 50 ÷ 10 = 5 m/s²." },
        solveFor: ["F", "m", "a"],
        sources: [{ title: "Fundamentals of Physics", author: "Halliday, Resnick and Walker", publisher: "Wiley" }],
        review: draftTeacher
      },
      {
        id: "pressure", level: "secondary", discipline: "Mechanics", principle: "Pressure",
        title: "Pressure on a surface", display: "p = F ÷ A",
        symbols: [{ symbol: "p", name: "Pressure", unit: "Pa", unitName: "pascal (N/m²)" }, { symbol: "F", name: "Force acting at right angles to the surface", unit: "N", unitName: "newton" }, { symbol: "A", name: "Area", unit: "m²", unitName: "square metre" }],
        assumptions: ["The force acts perpendicular to the surface.", "The force is spread evenly over the area."],
        explanation: "The same force produces more pressure on a smaller area. This is why a sharp knife cuts better than a blunt one.",
        example: { prompt: "A box weighing 600 N rests on a base of area 0.03 m². Find the pressure on the floor.", target: "p", given: { F: 600, A: 0.03 } },
        practice: { question: "A force of 200 N acts on an area of 0.5 m². Find the pressure.", answer: "400 Pa", explanation: "p = F ÷ A = 200 ÷ 0.5 = 400 Pa." },
        solveFor: ["p", "F", "A"],
        sources: [{ title: "Fundamentals of Physics", author: "Halliday, Resnick and Walker", publisher: "Wiley" }],
        review: draftTeacher
      },
      {
        id: "density", level: "secondary", discipline: "Properties of matter", principle: "Density",
        title: "Mass per unit volume", display: "ρ = m ÷ V",
        symbols: [{ symbol: "ρ", name: "Density (rho)", unit: "kg/m³", unitName: "kilogram per cubic metre" }, { symbol: "m", name: "Mass", unit: "kg", unitName: "kilogram" }, { symbol: "V", name: "Volume", unit: "m³", unitName: "cubic metre" }],
        assumptions: ["The material is uniform throughout.", "Convert grams and cm³ to kg and m³ first (1 g/cm³ = 1000 kg/m³)."],
        explanation: "Density tells you how much mass is packed into each cubic metre. Whether an object floats in water depends on comparing its density with water's (about 1000 kg/m³).",
        example: { prompt: "A block has mass 0.54 kg and volume 0.0002 m³. Find its density.", target: "ρ", given: { m: 0.54, V: 0.0002 } },
        practice: { question: "Water has density 1000 kg/m³. What is the mass of 0.002 m³ of water?", answer: "2 kg", explanation: "m = ρ × V = 1000 × 0.002 = 2 kg." },
        solveFor: ["ρ", "m", "V"],
        sources: [{ title: "Fundamentals of Physics", author: "Halliday, Resnick and Walker", publisher: "Wiley" }],
        review: draftTeacher
      },
      {
        id: "motion-first", level: "secondary", discipline: "Mechanics", principle: "Equations of uniformly accelerated motion",
        title: "Final velocity", display: "v = u + a t",
        symbols: [{ symbol: "v", name: "Final velocity", unit: "m/s", unitName: "metre per second" }, { symbol: "u", name: "Initial velocity", unit: "m/s", unitName: "metre per second" }, { symbol: "a", name: "Acceleration", unit: "m/s²", unitName: "metre per second squared" }, { symbol: "t", name: "Time", unit: "s", unitName: "second" }],
        assumptions: ["Acceleration is constant.", "Motion is in a straight line; choose one direction as positive."],
        explanation: "With constant acceleration, velocity changes by the same amount every second. After t seconds it has changed by a × t.",
        example: { prompt: "A cyclist moving at 5 m/s accelerates at 2 m/s² for 4 s. Find the final velocity.", target: "v", given: { u: 5, a: 2, t: 4 } },
        practice: { question: "A car slows from 20 m/s to 0 in 5 s. Find its acceleration.", answer: "−4 m/s²", explanation: "a = (v − u) ÷ t = (0 − 20) ÷ 5 = −4 m/s². The negative sign means it is slowing down." },
        solveFor: ["v", "u", "a", "t"],
        sources: [{ title: "Fundamentals of Physics", author: "Halliday, Resnick and Walker", publisher: "Wiley" }],
        review: draftTeacher
      },
      {
        id: "axial-stress", level: "university", discipline: "Mechanics of materials", principle: "Hooke's law in axial loading",
        title: "Stress, strain and Young's modulus", display: "σ = F ÷ A,  ε = ΔL ÷ L₀,  E = σ ÷ ε",
        symbols: [{ symbol: "σ", name: "Normal stress", unit: "Pa", unitName: "pascal" }, { symbol: "F", name: "Axial force", unit: "N", unitName: "newton" }, { symbol: "A", name: "Cross-sectional area", unit: "m²", unitName: "square metre" }, { symbol: "ε", name: "Normal strain", unit: "—", unitName: "dimensionless" }, { symbol: "ΔL", name: "Change in length", unit: "m", unitName: "metre" }, { symbol: "L₀", name: "Original length", unit: "m", unitName: "metre" }, { symbol: "E", name: "Young's modulus", unit: "Pa", unitName: "pascal" }],
        assumptions: ["The bar is prismatic and the load acts through the centroid, so stress is uniform over the section.", "The material is homogeneous, isotropic and linear-elastic (below the proportional limit).", "Deformations are small."],
        explanation: "Stress measures internal force intensity, strain measures relative deformation. In the linear-elastic range they are proportional, and the slope of the stress–strain line is Young's modulus.",
        derivation: ["Cut the bar perpendicular to its axis. Equilibrium of either part requires ∫σ dA = F.", "With uniform stress over the section, σA = F, so σ = F ÷ A.", "Define strain as elongation per unit length: ε = ΔL ÷ L₀.", "Experiments on linear-elastic materials show σ ∝ ε. Writing the constant as E gives Hooke's law σ = E ε.", "Combining: ΔL = F L₀ ÷ (A E), the axial deformation formula."],
        example: { prompt: "A steel rod of diameter 20 mm (A = π × 0.01² = 3.1416 × 10⁻⁴ m²) and length 2 m carries 50 kN in tension and stretches 1.5 mm. Find E.", target: "E", given: { F: 50000, A: 0.00031416, "ΔL": 0.0015, "L₀": 2 } },
        practice: { question: "A 1 m aluminium bar with A = 4 × 10⁻⁴ m² carries 20 kN. With E = 70 GPa, how much does it stretch?", answer: "≈ 0.714 mm", explanation: "ΔL = F L₀ ÷ (A E) = 20000 × 1 ÷ (4 × 10⁻⁴ × 70 × 10⁹) = 7.14 × 10⁻⁴ m." },
        solveFor: ["σ", "ε", "E"],
        sources: [{ title: "Mechanics of Materials", author: "R. C. Hibbeler", publisher: "Pearson" }],
        review: draftTeacher
      },
      {
        id: "flexure", level: "university", discipline: "Structural mechanics", principle: "The flexure formula",
        title: "Bending stress in a beam", display: "σ = M y ÷ I",
        symbols: [{ symbol: "σ", name: "Bending (normal) stress at distance y", unit: "Pa", unitName: "pascal" }, { symbol: "M", name: "Internal bending moment at the section", unit: "N·m", unitName: "newton metre" }, { symbol: "y", name: "Distance from the neutral axis", unit: "m", unitName: "metre" }, { symbol: "I", name: "Second moment of area about the neutral axis", unit: "m⁴", unitName: "metre to the fourth" }],
        assumptions: ["Plane sections remain plane and perpendicular to the neutral axis after bending.", "The material is homogeneous and linear-elastic, with the same E in tension and compression.", "The beam is straight, bends about a principal axis, and deflections are small."],
        explanation: "Bending stretches fibres on one side of a beam and shortens them on the other. Stress is zero at the neutral axis and grows linearly to a maximum at the outer fibre.",
        derivation: ["With plane sections, strain varies linearly with distance from the neutral axis: ε = −y ÷ ρ, where ρ is the radius of curvature.", "Hooke's law gives σ = E ε = −E y ÷ ρ.", "Force balance ∫σ dA = 0 places the neutral axis through the centroid.", "Moment balance: M = −∫σ y dA = (E ÷ ρ) ∫y² dA = E I ÷ ρ.", "Eliminating E ÷ ρ gives σ = −M y ÷ I. In magnitude, σ = M y ÷ I, largest at the outer fibre y = c."],
        example: { prompt: "A rectangular beam 100 mm wide and 200 mm deep (I = b h³ ÷ 12 = 6.667 × 10⁻⁵ m⁴) carries M = 20 kN·m. Find the stress at the outer fibre, y = 0.1 m.", target: "σ", given: { M: 20000, y: 0.1, I: 0.00006667 } },
        practice: { question: "For the same beam, what moment would produce an outer-fibre stress of 15 MPa?", answer: "10 kN·m", explanation: "M = σ I ÷ y = 15 × 10⁶ × 6.667 × 10⁻⁵ ÷ 0.1 ≈ 10 000 N·m." },
        solveFor: ["σ", "M"],
        sources: [{ title: "Mechanics of Materials", author: "R. C. Hibbeler", publisher: "Pearson" }],
        review: draftTeacher
      },
      {
        id: "continuity", level: "university", discipline: "Fluid mechanics", principle: "Conservation of mass",
        title: "The continuity equation", display: "A₁ v₁ = A₂ v₂",
        symbols: [{ symbol: "A₁", name: "Area at section 1", unit: "m²", unitName: "square metre" }, { symbol: "v₁", name: "Mean velocity at section 1", unit: "m/s", unitName: "metre per second" }, { symbol: "A₂", name: "Area at section 2", unit: "m²", unitName: "square metre" }, { symbol: "v₂", name: "Mean velocity at section 2", unit: "m/s", unitName: "metre per second" }],
        assumptions: ["Steady flow: nothing changes with time at a given point.", "Incompressible fluid: density is constant.", "One inlet and one outlet, with no leaks between them."],
        explanation: "In steady flow, the mass entering a pipe each second must equal the mass leaving. If the pipe narrows, the fluid must speed up.",
        derivation: ["Mass flow rate through a section is ṁ = ρ A v.", "For steady flow with no accumulation, ṁ in = ṁ out: ρ₁ A₁ v₁ = ρ₂ A₂ v₂.", "For an incompressible fluid ρ₁ = ρ₂, so A₁ v₁ = A₂ v₂ = Q, the volume flow rate."],
        example: { prompt: "Water flows at 2 m/s through a pipe of area 0.01 m², which narrows to 0.004 m². Find the velocity in the narrow part.", target: "v₂", given: { "A₁": 0.01, "v₁": 2, "A₂": 0.004 } },
        practice: { question: "A hose of area 3 × 10⁻⁴ m² carries water at 1.5 m/s into a nozzle of area 5 × 10⁻⁵ m². Find the jet speed.", answer: "9 m/s", explanation: "v₂ = A₁ v₁ ÷ A₂ = 3 × 10⁻⁴ × 1.5 ÷ 5 × 10⁻⁵ = 9 m/s." },
        solveFor: ["A₁", "v₁", "A₂", "v₂"],
        sources: [{ title: "Fluid Mechanics: Fundamentals and Applications", author: "Yunus A. Çengel and John M. Cimbala", publisher: "McGraw-Hill" }],
        review: draftTeacher
      }
    ]
  };

  root.GradePathLearn = { schemaVersion: 1, history, languages, engineering };
})(typeof window === "undefined" ? globalThis : window);
